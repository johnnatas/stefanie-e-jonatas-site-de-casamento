# Admin Content CMS (Phase 2, Sub-Project 2)

Date: 2026-07-18
Status: approved, ready for implementation plan

## Context

This is the second and final sub-project of the site's "second phase" —
the first (brand color refresh + scroll carousel + nav hover) already
shipped. The user's original request, translated: "I need the admin panel
to let me edit the content of each page and section — mainly photos and
text — to make the content dynamic and set the correct wedding date. Like
WordPress, but simpler."

Today, every page's text and the wedding date are hardcoded in the source
(`src/shared/navigation.ts`, and JSX literals scattered across
`src/components/home/*`, `src/app/dicas-e-instrucoes/*`), and every photo
slot renders a generated `PlaceholderImage` instead of a real photo.

## Goal

Let the couple (the only admin users) edit specific text fields and
upload photos for a fixed, known set of page sections through the
existing admin panel, without touching code — plus fix the wedding date
being hardcoded, since it now feeds a countdown timer that will drift out
of sync with the real date.

This is intentionally **not** a general-purpose page builder. The set of
editable sections and fields is fixed by this spec, not admin-configurable
— that's what keeps it "WordPress but simpler."

## Architecture

### Data model: one generic content table, not one table per section

The alternative — a dedicated Postgres table + Domain entity + repository
per section, mirroring how `Guest`/`Gift` are built today — would mean 4+
migrations and near-duplicate CRUD code for what is fundamentally "edit
some text and swap a photo." Instead:

- **One table**, `site_content`:
  ```sql
  create table site_content (
    slug text primary key,
    content jsonb not null,
    updated_at timestamptz not null default now()
  );
  ```
- **One Domain entity** (`SiteContentSection`), **one repository**
  (`SiteContentRepository`), **two use cases** — `GetSiteContentUseCase(slug)`
  and `UpdateSiteContentUseCase(slug, content)` — reused for every slug.
- Each slug's exact shape (which fields exist, their types, required vs.
  optional) is defined by **one Zod schema per slug**, colocated in the
  application layer. That schema is the single source of truth for: the
  admin form's fields, validation on save, and the shape read back on
  render.
- **Fallback defaults:** if a row doesn't exist yet (fresh install, or an
  admin hasn't saved that section yet), `GetSiteContentUseCase` returns
  today's hardcoded Portuguese copy as the default (each Zod schema
  carries `.default(...)` matching current copy) and photo fields default
  to `null`, which callers render as `PlaceholderImage`. This means
  shipping this feature changes nothing visually until an admin actually
  edits something. Mirrors the existing `isBackendConfigured()` fallback
  pattern already used for Gifts/Guests.

### Photo storage

A new **public Supabase Storage bucket**, `site-content`:
- Public `SELECT` (visitors need to load the images).
- `INSERT`/`UPDATE`/`DELETE` restricted to authenticated users present in
  `admin_users` — the same authorization model already protecting
  Gift/Guest writes.
- Upload path convention: `{slug}/{field-or-index}-{uuid}.{ext}`, e.g.
  `home-hero/photo-3-f0b2.jpg`. Replacing a photo uploads a new object
  under a fresh UUID rather than overwriting in place; the old object is
  left orphaned in storage. Cleaning up orphaned objects is out of scope
  for v1 (noted under "What this does NOT do").
- Server Actions receive the uploaded `File` via `FormData`, validate
  MIME type (`image/*`) and a size cap (5 MB), upload via the
  server-side Supabase client, and store the resulting public URL string
  in the section's `content` JSONB.

### Rendering integration

Pages that render editable content become `async` Server Components that
call the relevant `GetSiteContentUseCase(slug).execute()` calls and pass
the resolved (validated, defaulted) content down as props to the existing
(mostly `"use client"`) presentational components — e.g. `page.tsx` (Home)
fetches `home-hero`, `home-topics`, `home-milestone-photos`, and
`settings`, then passes them into `<HomeHero />`, `<TopicsCarousel />`,
`<SaveTheDateSection />`. Each of those components' props change from
"no props, hardcoded copy" to "content object, hardcoded copy only as the
type's default." `CountdownTimer` receives the wedding date ISO string as
a prop instead of importing `WEDDING_DATE_ISO` directly.

`WEDDING_DATE_LABEL` (`"19 de junho de 2027"`) stops being a separately
hardcoded string — it's derived from the settings' wedding date via a new
pure function (`formatWeddingDateLabel(iso: string): string`, Portuguese
long-form), so the date and its display label can never drift out of
sync again the way the color tokens briefly did in the last sub-project.

### Admin UI

New section under `/admin/(protected)/conteudo`:
- An index page listing all 7 editable slugs (`settings`, `home-hero`,
  `home-milestone-photos`, `home-topics`, `tips-cerimonia`, `tips-traje`,
  `tips-hospedagem`) with a human-readable label and a link to each edit
  page.
- One edit page per slug at `/admin/(protected)/conteudo/[slug]`, each
  rendering a form built from that slug's field list (below), following
  the existing `useActionState` + `"use server"` Server Action pattern
  already used by `GiftForm`/`GuestForm`/`LoginForm` — text inputs for
  short text, a `<textarea>` for Markdown body fields, and a file input
  (with a preview of the current photo, if any) for each photo field.
- Nav link to `/admin/conteudo` added to the existing admin layout nav
  (`src/app/admin/(protected)/layout.tsx`).

## Content inventory (exact fields per slug)

- **`settings`**: `weddingDateIso` (required, ISO datetime string),
  `weddingLocationLabel` (required, text). Feeds the countdown timer, the
  auto-formatted date label, and the Hero subtitle's location text.
- **`home-hero`**: `eyebrow` (required, text, default `"Estamos nos
  casando"`), `tagline` (required, text, default `"nas ditas linhas em
  que nos encontramos"`), `photos` (array of **1 to 5** photo URLs —
  admin can add or remove slides; the Hero carousel renders exactly as
  many slides, and its dot indicators, as photos exist). The logo mark
  and the "Confirme sua presença" CTA button stay fixed — brand identity
  and navigation, not content.
- **`home-milestone-photos`**: exactly 3 optional photo URL fields, one
  per milestone (`beginning`, `proposal`, `wedding` — matching
  `src/shared/milestones.ts`'s existing order). Milestone **text**
  (date/title/description) stays hardcoded in `shared/milestones.ts`,
  unchanged by this feature. Because `SaveTheDateSection` (Home) and the
  Nossa História timeline both render the same `MILESTONES` array, a
  photo uploaded here appears in both places — this is intended, not a
  scope leak, since only the photo (not the out-of-scope text) is shared.
- **`home-topics`**: an array of exactly 5 entries, one per existing
  `TopicsCarousel` card (Cerimônia, Lista de presentes, Traje,
  Hospedagem, Nossa história, in that fixed order) — each with `title`
  (required, text), `description` (required, text), and `photo`
  (optional, photo URL). The `href` for each card stays fixed in code
  (it must keep pointing at a real route).
- **`tips-cerimonia`**, **`tips-traje`**, **`tips-hospedagem`**: each has
  `eyebrow` (optional, text), `title` (required, text), `body` (required,
  Markdown text — rendered through a Markdown-to-JSX step supporting
  `**bold**`, `*italic*`, and paragraph breaks on blank lines), and
  `photo` (optional, photo URL). `tone` (light/dark) and `imageSide`
  stay fixed per page in code — they're a layout decision, not content.

## Testing

- Domain/application: unit tests for `SiteContentSection`'s validation,
  the per-slug Zod schemas (valid input accepted, invalid rejected,
  defaults applied when a field is missing), and both use cases
  (`GetSiteContentUseCase` returns defaults when no row exists;
  `UpdateSiteContentUseCase` persists and round-trips correctly) — same
  pattern as the existing `Gift`/`Guest` domain tests.
- `formatWeddingDateLabel`: unit tests covering the Portuguese long-form
  output for a handful of dates.
- Server Actions: tests following the existing `upsertGiftAction`-style
  pattern — valid submission redirects and persists, invalid submission
  returns an error state, oversized/wrong-type file upload is rejected.
- Component tests: `HeroCarousel` rendering N slides for N photos (1, 3,
  5), `TopicsCarousel` and the 3 Dicas pages rendering supplied content
  instead of hardcoded copy, and confirming `PlaceholderImage` still
  renders when a photo field is absent.
- Markdown rendering: a focused test confirming `**bold**`/`*italic*`/
  paragraph-break input renders the expected safe HTML (and that
  arbitrary HTML in the input is not executed — Markdown output must be
  sanitized/escaped, since this content is admin-authored but still
  worth defending).

## What this does NOT do

- Does not make Nossa História's timeline text, or any of its other
  content, editable — deferred to a future sub-project, as decided
  earlier in this phase.
- Does not make the Save the Date section's milestone **text**, heading
  copy ("Save the date!"), the Hero CTA button, or the logo mark
  editable — see the content inventory above for exactly what is and
  isn't in scope.
- Does not let admins add, remove, or reorder Topics-carousel cards or
  Dicas pages, or change their routes — the set of 5 cards and 3 pages is
  fixed; only their title/description/body/photo text is editable.
- Does not build a general-purpose page/section builder, drag-and-drop
  layout tool, or arbitrary-HTML rich text editor.
- Does not clean up orphaned Storage objects left behind when a photo is
  replaced — acceptable storage bloat for a small personal site; can be
  revisited later if it ever matters.
- Does not add image resizing/optimization beyond what `next/image` (if
  adopted) or the browser already does — uploaded photos are stored and
  served as-is (subject to the 5 MB cap).
