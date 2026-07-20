# Mercado Pago Fixed Payment Links (Phase 1)

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

The site already has a working Mercado Pago integration for the gift
registry: when a guest clicks "Presentear" on `/presentes`, the app
creates a Mercado Pago Preference *at that moment*, reserves the gift,
and redirects the guest to checkout. A webhook confirms payment
afterward.

The couple wants payment links created earlier — when a gift is
registered (via the admin form or CSV/XLSX import) — rather than lazily
per attempt. This is phase 1 of a two-phase effort. Phase 2 (payment
confirmation / consuming Mercado Pago's webhook data against the new
link model) is explicitly out of scope here and is called out below.

Alongside this, the couple asked for two related, admin-controlled
safeguards: Mercado Pago credentials editable from the admin panel
(so they can be rotated without a redeploy), and a secret key gating
any change to a gift's price or to the Mercado Pago Access Token
itself, to prevent a compromised or careless admin session from
silently altering money-related values.

## Goal

Every gift has a durable Mercado Pago checkout link, created when the
gift is registered (form or spreadsheet import) and regenerated when
its name or price changes. The public "Presentear" flow reuses this
link instead of creating a new preference per attempt, with a
server-side re-check that the gift is still available before handing
out the link. Mercado Pago credentials and a price-change secret key
are both admin-editable from a new "Integrações" section, and any
change to a gift's price (or to the Access Token) requires that secret
key.

## 1. Data model

### `Gift` entity

Two new optional fields, alongside the existing ones:

```ts
export interface GiftProps {
  // ...existing fields unchanged...
  mercadoPagoPreferenceId?: string;
  mercadoPagoCheckoutUrl?: string | null;
}
```

`Gift.create()` does not validate these — they're populated by the
application layer after a successful Mercado Pago call, never
user-supplied. `SupabaseGiftRepository` maps them to new nullable
columns `gifts.mercado_pago_preference_id` and
`gifts.mercado_pago_checkout_url` (migration required).

### New table: `admin_security_settings`

A singleton table (always exactly one row, `id = 1`), following this
project's existing pattern of service-role-only access — RLS enabled,
no grants to `anon`/`authenticated`, every read/write goes through
trusted server code via `getSupabaseServiceRoleClient()`:

```sql
create table if not exists admin_security_settings (
  id integer primary key default 1 check (id = 1),
  mercadopago_access_token text,
  price_change_secret_hash text,
  price_change_secret_salt text,
  updated_at timestamptz not null default now()
);

alter table admin_security_settings enable row level security;

insert into admin_security_settings (id) values (1)
  on conflict (id) do nothing;
```

`price_change_secret_hash`/`price_change_secret_salt`: the secret key
is never stored in plaintext. Hashed with Node's built-in
`crypto.scrypt` (no new dependency) — a random salt per key, stored
alongside the hash, verified with `crypto.timingSafeEqual`.

Both `mercadopago_access_token` and `price_change_secret_hash` start
`null` — see "First-time setup" below.

**Acknowledged tradeoff:** this is not a dedicated secrets vault (e.g.
AWS Secrets Manager, Vercel encrypted env vars with audit logging).
It's protected the same way every other piece of business data in this
project already is — a service-role-only Supabase table. For a site
this size, consistent with the project's existing security model, this
is a reasonable tradeoff, but it is a real one: anyone with the
Supabase service-role key (already required for the site to function
at all) can read the Access Token directly from the database.

## 2. Preference creation timing

A new small helper, `createOrRefreshGiftPreference(gift: Gift):
Promise<Gift>`, wraps `PaymentGateway.createPreference()` and returns
the gift with `mercadoPagoPreferenceId`/`mercadoPagoCheckoutUrl` set.
`external_reference` is always `gift.id` — not a contribution id, since
at creation time no contribution exists yet, and reusing the gift's own
id keeps a single stable identifier through the gift's lifetime
regardless of how many times the link is (re)used or regenerated.

Called from:

- **`UpsertGiftUseCase`**, after a successful create, and after an
  update **only when `name` or `price` changed** — comparing against
  the previously-stored gift, not on every save. A stale link keeps its
  old price, which is a real bug (undercharging or overcharging), so
  this must not be skipped.
- **Gift CSV/XLSX import** (`importGiftRows`), for every newly created
  row. If `createOrRefreshGiftPreference` throws, the row is **not**
  treated as an import error — the gift is still created via
  `UpsertGiftUseCase` without a link. Track a `withoutPaymentLink`
  count in `ImportResult` alongside `created`/`skipped`/`errors`, and
  surface it in the import summary ("3 presente(s) importado(s) sem
  link de pagamento — edite e salve para gerar").

## 3. Public purchase flow

`CreateGiftContributionUseCase` changes shape slightly:

1. Re-fetch the gift, confirm `status === "available"` (existing
   check — this is what already prevents double-booking; unchanged).
2. Reserve the gift (existing).
3. Create the `GiftContribution` record (existing — still captures
   guest name/email, per the couple's choice to keep that step).
4. **New:** if `gift.mercadoPagoCheckoutUrl` is already set, reuse it
   directly — skip the Mercado Pago API call entirely. If it's
   missing (import failure, a gift that predates this feature, etc.),
   fall back to creating a preference right now, exactly like the
   current behavior, and persist the result onto the gift so the next
   guest (if this one abandons) reuses it instead of hitting the API
   again.

No changes to `GiftCard`/`GiftGrid`/the public page's rendering — this
is purely a backend change to where the checkout URL comes from.

## 4. Admin: gift price protection

On the **edit** gift page only (`GiftForm` in edit mode — not the
create form, not the CSV/XLSX import path, per the couple's explicit
scope decision): add a "Chave secreta" password-type input, visible
whenever editing, but only *enforced* when the submitted price differs
from the gift's current stored price.

`upsertGiftAction`, before calling `UpsertGiftUseCase`:

```
if (isEditing && parsedPrice !== existingGift.price) {
  if (!secretKeyProvided || !verifySecretKey(secretKeyProvided)) {
    return { status: "error", message: "Chave secreta inválida ou não informada." };
  }
}
```

`verifySecretKey(candidate: string): Promise<boolean>` loads the
stored hash/salt from `admin_security_settings`, hashes the candidate
with the stored salt, and compares with `crypto.timingSafeEqual`. If no
hash is stored yet (secret key never set up), price changes are
**blocked** with a message directing the admin to set up the secret key
first in Integrações — not silently allowed, since an unset key must
never mean "no protection."

Nothing is written to the database if the check fails — the entire
save is rejected, matching the existing `safeParse`-then-reject pattern
already used by every admin form in this codebase.

## 5. Admin: "Integrações" section

New top-level nav item (alongside Dashboard, Convidados, Presentes,
Conteúdo), `/admin/integracoes`, with two independent forms:

**Mercado Pago Access Token**: masked input showing only the last 4
characters of the currently-stored token (or "Não configurado" if
unset). Changing it requires the price-change secret key (same
`verifySecretKey` check as above) — same rationale: this credential
controls where every payment on the site goes.

**Chave secreta de segurança**: a separate form with "Chave atual"
(omitted/ignored on first-time setup — see below), "Nova chave", and
"Confirmar nova chave". Minimum 6 characters, no other complexity
rules (this is an operational PIN shared between the couple, not a
public-facing account password).

### First-time setup

Both fields start empty. The Access Token form, when no token is
stored yet, does **not** require the secret key (there's nothing to
protect yet — bootstrapping). The secret-key form, when no hash is
stored yet, does not require "Chave atual". Once *either* has been set
once, all subsequent changes to *both* require the current secret key.

This means the couple's practical first-time flow is: set the secret
key first (no gate), then set the Access Token (now gated by the key
they just set).

## 6. Error handling

- `verifySecretKey` failures return a generic "Chave secreta inválida"
  message — never reveal whether the issue was a missing key, wrong
  key, or unset configuration in a way that leaks which case applies
  beyond what's already stated above.
- `createOrRefreshGiftPreference` failures during a normal (non-import)
  gift create/edit are **not** silently swallowed the way import
  failures are — the admin sees an error ("Não foi possível gerar o
  link de pagamento agora.") since this is a single, low-volume action
  where retrying immediately is reasonable, unlike a 50-row import.
- The Mercado Pago Access Token is read from `admin_security_settings`
  at request time (not cached at module load), so a rotated token
  takes effect on the next request with no redeploy — this is the
  entire point of the feature.

## 7. Testing

- Domain: no new validation on `Gift` itself (the two new fields are
  application-populated, not user-input-validated).
- `createOrRefreshGiftPreference`: unit tests with a fake
  `PaymentGateway` covering success and failure paths.
- `UpsertGiftUseCase`: tests confirming the preference is regenerated
  when name/price changes, and *not* regenerated when only
  description/category/image change.
- `verifySecretKey`: unit tests for correct key, incorrect key, and
  no-hash-stored (bootstrap) cases, using real `crypto.scrypt` hashing
  (not mocked, since this is the actual security-critical logic).
- `upsertGiftAction`: tests for price-changed-without-key (rejected,
  nothing saved), price-changed-with-correct-key (saved), price-
  unchanged-without-key (saved, key not required).
- Gift import: test the new `withoutPaymentLink` counting path with a
  fake `PaymentGateway` that throws.
- Component test for the Integrações forms' masked-token display and
  first-time-setup (no "Chave atual" field) vs. subsequent (field
  present) states.

## What this does NOT do

- Does not touch payment **confirmation** — `ConfirmGiftPaymentUseCase`
  and the `/api/webhooks/mercadopago` route are unmodified. Once fixed
  links are live, incoming payments will carry `external_reference =
  gift.id`, which the current webhook lookup (by contribution id)
  won't resolve. Real payments still land in the Mercado Pago account;
  the site just won't auto-mark them paid. This is a deliberate,
  explicitly-accepted gap — phase 2's job.
- Does not add a "regenerate link" button independent of editing a
  gift — regeneration only happens as a side effect of a name/price
  change, or the public-flow fallback. If the admin wants to force a
  fresh link with no other change, re-saving with a trivial edit (or a
  future small addition) is the only path for now.
- Does not gate the secret key behind rate limiting or lockout after
  repeated failures — out of scope for this phase, acceptable given
  this is a two-person admin panel, not a public-facing auth surface.
- Does not encrypt the Access Token at rest beyond Supabase's own
  storage-level encryption — see the tradeoff noted in the data model
  section.
- Does not deactivate or cancel the Mercado Pago preference when a
  gift is deleted (`DeleteGiftUseCase` already blocks deletion if the
  gift has contributions, per the earlier admin-overhaul plan). An
  orphaned preference on a gift with no contributions has no cost or
  ongoing effect on Mercado Pago's side, so no cleanup is needed.
