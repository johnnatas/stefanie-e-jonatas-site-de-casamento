# Gift Product-Link Autofill

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

Registering a gift today means manually typing the name, description,
price, and category, and uploading a photo by hand. The couple often
finds a specific product on an online store first (any store — no
fixed set of retailers) and wants to paste that product's URL into the
admin form to save the retyping: pull the title, main image, and price
automatically where possible.

## Goal

On the gift create/edit form, pasting a product URL and clicking
"Buscar dados do link" fills in whatever of name / price / photo the
page reliably exposes, leaving the rest for manual entry. Nothing about
the existing manual-entry flow changes — this is a convenience that
sits alongside it, never replaces it.

## 1. UI

`GiftForm` gains a new field above the existing ones, in both create
and edit mode: a "Link do produto (opcional)" text input plus a
"Buscar dados do link" button (not the form's submit button — this
does not save the gift, only populates the form). Clicking it:

1. Disables the button and shows a pending state ("Buscando...").
2. Calls a Server Action with the pasted URL.
3. On return, sets whichever of the Name input, Price input, and photo
   preview were found — via component state, since these fields are
   currently `defaultValue`-driven (uncontrolled); `GiftForm` needs to
   track name/price/photo as controlled state seeded from
   `defaultValues`, updated either by normal typing or by a successful
   fetch.
4. Shows a one-line status summarizing what was found and what wasn't
   (e.g. "Título e imagem encontrados. Preencha o valor manualmente."),
   or an error message if the fetch itself failed (unreachable URL,
   timeout, blocked by the target site).

The admin can still edit any auto-filled value before saving — nothing
is locked. Saving still goes through the exact same `upsertGiftAction`
Server Action and validation as today.

## 2. Extraction

A new server-side utility fetches the pasted URL and extracts, from
the raw HTML:

- **Title**: `<meta property="og:title" content="...">`, falling back
  to the `<title>` tag if `og:title` is absent.
- **Image**: `<meta property="og:image" content="...">`.
- **Price**: the `offers.price` field inside a `<script
  type="application/ld+json">` block whose parsed JSON has `@type`
  (or one entry of an `@type` array) equal to `"Product"`. No other
  price-detection strategy is used — scanning the raw page text for
  currency-looking numbers is more likely to grab an installment
  value, a "de/por" strikethrough price, or an unrelated number than
  the real price, so a miss here just means the admin types the price
  in by hand, which is the existing, always-correct path.

Extraction is implemented as a pure function taking the HTML string
and returning `{ title?: string; imageUrl?: string; price?: number }`
— parsed via targeted string/regex matching for these specific tags,
not a general HTML parser, so no new dependency is introduced. This
is a deliberate scope limit: it works well for stores whose product
pages embed standard SEO/social-preview metadata (most established
e-commerce platforms do), and will find nothing on heavy
client-side-rendered pages where this data isn't present in the
initial HTML response, or on sites that block non-browser requests
outright (Amazon is a known example). The UI's "nothing found, fill
in manually" fallback is what makes this an acceptable, low-risk
limitation rather than a broken feature.

## 3. Image handling

If an `imageUrl` is found, the server downloads it (subject to the
same fetch timeout as the metadata request) and uploads it through
the existing `uploadSiteContentPhoto("gifts", ...)` helper — the exact
function manual photo uploads already use. The gift's photo therefore
always lives in this project's own Supabase Storage bucket, never as a
hotlink to the source site; if the original product page or image
disappears later, the gift's photo is unaffected. If the image
download or upload fails, the title/price extraction results (if any)
are still returned — a broken image fetch doesn't discard everything
else found.

## 4. Security

This is an admin-only, authenticated feature (behind the existing
admin login), which limits its exposure, but since it makes the server
fetch a URL supplied through a form, baseline hardening applies:

- Only `http`/`https` URLs are accepted; anything else (`file://`,
  `javascript:`, etc.) is rejected before any fetch is attempted.
- A request timeout (a few seconds) applies to both the metadata fetch
  and the image download, so a slow or hanging target doesn't tie up
  the request indefinitely.
- Obviously-internal hosts are rejected before fetching:
  `localhost`, `127.0.0.1`, `0.0.0.0`, and private IP literal ranges
  (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
  This is a pragmatic literal-hostname check, not full DNS-resolution
  SSRF protection (which would need resolving the hostname and
  checking the resolved IP) — proportionate to an admin-only feature,
  not a public-facing one.

## 5. Error handling

- Invalid/unreachable URL, non-2xx response, or timeout on the
  metadata fetch: no fields are filled, a single error message is
  shown ("Não foi possível buscar dados desse link.").
- Metadata fetch succeeds but finds none of the three fields: same
  treatment as a fetch failure — nothing to fill in, message explains
  nothing was found.
- Metadata fetch finds some fields but the image download/upload step
  fails: the found title/price are still filled in; the image is
  simply left for manual upload, noted in the status message.

## 6. Testing

- Pure extractor function: unit tests against static HTML fixtures
  covering — all three fields present via `og:title`/`og:image`/JSON-LD
  price; `og:title` absent, falls back to `<title>`; JSON-LD present
  but `@type` is not `"Product"` (price not extracted); no metadata at
  all (all three fields undefined); malformed/non-JSON content inside
  the JSON-LD script tag (does not throw, price simply not found).
- URL/host validation: unit tests for the scheme check and the
  private-IP/localhost rejection list.
- Server Action: tests using a fake fetch implementation covering
  success (all three found), partial success (title/image found, no
  price), and failure (fetch throws / non-2xx).
- Component test: `GiftForm` — clicking "Buscar dados do link"
  populates the Name/Price fields and photo preview from a mocked
  successful response, and shows the error message on a mocked
  failure, without ever calling `upsertGiftAction` (the button is not
  a submit button).

## What this does NOT do

- Does not guarantee extraction works on any given site — this is a
  best-effort convenience with an explicit "fill in manually" fallback,
  not a scraping guarantee.
- Does not apply to the CSV/XLSX import flow — that already sets
  price/name/description directly from spreadsheet columns; link
  autofill is a manual-entry-form convenience only.
- Does not cache or store the pasted product URL itself — only the
  extracted title/price/photo are used; the source URL is not
  persisted anywhere.
- Does not attempt full SSRF protection via DNS-resolution checks —
  see the Security section's stated scope limit.
