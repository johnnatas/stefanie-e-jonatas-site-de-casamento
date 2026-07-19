# CMS Photo Upload UX Overhaul

Date: 2026-07-19
Status: approved, ready for implementation plan

## Context

The admin content CMS (shipped in the previous sub-project) hit a real bug:
selecting a large photo on the Hero da Home section and saving produces an
error, because `uploadSiteContentPhoto` rejects anything over 5MB — a limit
that's easy for a real phone photo to exceed. The user also asked for a
batch of related UX improvements while fixing this: automatic compression,
a preview after attaching a photo, a less rigid photo-list UI for Hero,
back-navigation on every content edit page, and converting the Presentes
admin's gift photo field from a raw URL text input to a real upload.

## Goal

Fix the size-limit error by compressing photos client-side before upload
(so the effective limit essentially never bites), add a preview immediately
after attaching a photo, replace Hero's 5 fixed photo blocks with a
dynamic add/remove list, add a "back to list" link on every CMS edit page,
and give the Presentes gift form the same real-upload treatment the CMS
already has.

## 1. Shared `PhotoUploadField` component

A new Client Component, `src/components/admin/PhotoUploadField.tsx`,
replaces the "current-photo preview + file input + remove checkbox" block
that's currently hand-duplicated across every admin form with a photo
field (`HomeMilestonePhotosForm`, `HomeTopicsForm`, `TipsContentForm`,
`HomeHeroForm`, and the new `GiftForm`).

```ts
interface PhotoUploadFieldProps {
  name: string;              // base field name, e.g. "photo" or "photo0"
  currentUrl: string | null; // existing saved photo URL, if any
  label: string;             // placeholder label when nothing is set
  showRemoveCheckbox?: boolean; // default true; Hero's dynamic slots set this false (see §3)
}
```

Field names it renders: `${name}File` (file input), `${name}CurrentUrl`
(hidden input carrying `currentUrl`), and — when `showRemoveCheckbox` is
true — `${name}Remove` (checkbox). This is the exact wire format every
existing Server Action already expects via `resolvePhotoField`, so no
Server Action changes are needed for the single-photo sections.

**Behavior:**
- Renders the current photo (via the existing `PhotoOrPlaceholder`) until
  a new file is chosen.
- On file selection: compresses the file (§2), replaces the file input's
  `.files` with the compressed version via the `DataTransfer` API (so
  standard form submission uploads the compressed file, not the original
  — no change to the multipart-form/Server-Action flow), and immediately
  shows a local preview of the compressed file via `URL.createObjectURL`.
  A brief "Comprimindo..." state shows while this runs (compression is
  fast — under a second for typical phone photos — but not instant).
- Selecting a new file un-checks "remover" if it was checked.
- Revokes the created object URL on unmount to avoid leaking memory.

## 2. Client-side compression

A new pure utility, `src/shared/utils/compressImage.ts`:

```ts
interface CompressImageOptions {
  maxDimension: number; // longest side, px
  quality: number;      // 0-1, JPEG encoder quality
}

async function compressImage(file: File, options: CompressImageOptions): Promise<File>
```

Uses an off-screen `<canvas>`: loads the file into an `Image`, computes a
scaled width/height capped at `maxDimension` (preserving aspect ratio),
draws it onto the canvas at that size, and re-encodes via
`canvas.toBlob(..., "image/jpeg", quality)`. Wraps the result in a new
`File`. If the compressed result is somehow larger than the original
(already-optimized source images), the original file is kept instead.
`image/gif` is never compressed (canvas re-encoding would flatten
animation) — GIFs pass through unchanged, still subject to the server-side
cap below.

**Preset** (the "Equilibrado" option): `{ maxDimension: 1920, quality: 0.82 }`,
defined once as a shared constant and used everywhere `PhotoUploadField`
runs — no per-section tuning in this iteration.

**Server-side cap**: `uploadSiteContentPhoto`'s current 5MB hard limit is
raised to 15MB, not removed. Since compression normally lands well under
1MB regardless of source size, this cap should essentially never be hit in
practice — it exists purely as defense-in-depth against a corrupted file,
a bypassed client (JS disabled), or a GIF that's still huge after
skipping compression. The user-visible "no limit" experience comes from
compression handling normal photos transparently, not from removing
server-side validation entirely.

## 3. Hero's dynamic photo list

`HomeHeroForm` changes from 5 always-rendered static blocks to
client-managed array state:

```ts
interface Slot {
  key: string;             // stable React key, generated with crypto.randomUUID()
  currentUrl: string | null;
}
```

- Initial state: one `Slot` per `defaultValues.photos` entry, or a single
  empty slot (`currentUrl: null`) if there are none yet — always at least
  1 slot, matching the existing "at least 1 photo" save-time rule.
- A "+ Adicionar foto" button (hidden once 5 slots exist) appends an empty
  slot.
- Each slot renders a `PhotoUploadField` with `showRemoveCheckbox={false}`
  — removal for slots 2-5 is a dedicated "×" button on the slot itself
  that splices the slot out of the array entirely (slot 1 has no such
  button). Removing a slot this way means it's simply never submitted —
  the field names re-derive from the slots' current array position on
  every render (`photo${index}File` etc.), so the existing
  `updateHomeHeroAction` (which just loops indices 0-4 reading whatever's
  present) needs **no changes** — it already treats a missing slot's
  fields as "nothing to save here."

## 4. Back-to-list link

Every one of the 7 CMS edit pages
(`/admin/conteudo/configuracoes|hero|marcos|carrossel|dicas-cerimonia|dicas-traje|dicas-hospedagem`)
gets a small `← Voltar` link at the top, pointing at `/admin/conteudo`.

## 5. Gift photo upload

`GiftForm`'s "URL da imagem" text input is replaced with a
`PhotoUploadField`. `upsertGiftAction` resolves the photo the same way
every CMS action does (via `resolvePhotoField`), uploading through the
existing `uploadSiteContentPhoto` helper under a `gifts/` path in the
same `site-content` Storage bucket — no new bucket, no new migration.
`giftFormSchema`'s `imageUrl` field stays a required string (the `Gift`
domain entity already requires it); a brand-new gift with no photo
selected and no existing URL to fall back on fails validation with
"Selecione uma foto para o presente," mirroring Hero's "add at least one
photo" pattern. Editing an existing gift without picking a new file keeps
its current photo, same as every other section.

## Testing

- `compressImage`: unit tests using a synthetic canvas-drawn source image
  (jsdom + a minimal canvas polyfill, or skip actual pixel assertions and
  test the size-comparison/fallback and GIF-skip logic directly against
  mocked `Image`/`canvas` behavior) — confirms output stays under the
  original when compression helps, falls back to the original file when
  it doesn't, and that GIFs pass through untouched.
- `PhotoUploadField`: component tests covering — renders current photo
  when nothing new is chosen; shows a preview after a file is selected;
  the remove checkbox is present only when `showRemoveCheckbox` is true
  and a current photo exists.
- `HomeHeroForm`: updated tests covering the add/remove slot interactions
  (starts with N slots for N existing photos, "+" adds up to the 5-slot
  cap, "×" removes a non-first slot, slot 1 has no remove control).
- Existing Server Action tests (`resolvePhotoField`,
  `updateHomeHeroAction`) are unaffected — the wire format they consume
  doesn't change.
- `upsertGiftAction`: new test for the "no photo, no existing URL" error
  case.

## What this does NOT do

- Does not add drag-and-drop upload, multi-file batch selection, or
  cropping/rotation tools.
- Does not add per-section compression tuning — one preset, used
  everywhere.
- Does not change how photos are stored or served once uploaded (same
  `site-content` public bucket, same public-URL scheme).
- Does not touch Milestone Photos, Home Topics, or the 3 Dicas pages'
  *list structure* — those stay fixed-cardinality sections; only their
  existing single-photo fields gain compression/preview via
  `PhotoUploadField`.
