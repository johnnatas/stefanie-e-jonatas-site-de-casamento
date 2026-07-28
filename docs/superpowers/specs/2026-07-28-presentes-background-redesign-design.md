# Presentes Page — Background Image + Translucent Cards — Design

**Data:** 2026-07-28
**Autor:** Jonatas (via Claude Code)

## Contexto e problema

The Presentes page grid (shipped in the prior redesign phase, P17) reads as cramped and flat: a dense 5-column grid of solid, opaque cards on a plain background. The user provided a reference screenshot of another wedding site where gift cards are frosted-glass/translucent panels floating over a full-page background photo, with a wider, more generous grid. The user wants: a wider centered container on desktop, larger cards, single-column full-width cards on mobile, translucent (frosted-glass) card styling matching the reference, and an admin-editable background image for the page.

## Decisions (confirmed with the user)

1. **Container width**: `max-w-6xl` (1152px) → `max-w-7xl` (1280px) for the grid's centering container.
2. **Grid columns**: `grid-cols-1` (mobile, full-width single column) → `sm:grid-cols-2` → `lg:grid-cols-4` (was `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`). Fewer desktop columns make each card meaningfully bigger within the wider container.
3. **Card size**: image height `h-40` → `h-48`; slightly more internal padding.
4. **Card translucency**: `bg-paper` (solid) → `bg-paper/60 backdrop-blur-sm`, so the background image shows through with a frosted-glass blur, matching the reference. Border softens from `border-line` to `border-line/40`.
5. **Background image**: new admin-editable field, "Imagem de fundo", added as a **new content section "Presentes"** under Conteúdo do Site (`/admin/conteudo/presentes`) — not folded into the existing "Configurações" section. Rendered as a full-page `background-image: cover`, sitting behind all page content; the header keeps its existing solid background on top (unchanged — this phase does not touch the header).
6. **Fallback with no image set**: page keeps the current solid `bg-paper` background until an image is chosen in the admin panel. The field is optional (nullable), not required.
7. **No changes** to the reservation/payment flow, `GiftDetailsModal`, or `src/app/presentes/actions.ts` — this is purely the page shell + card visual style + a new content field.

## Architecture

### New content schema (`src/application/content/schemas.ts`)

```ts
export const presentesContentSchema = z.object({
  backgroundImage: z.string().min(1).nullable().default(null),
});
export type PresentesContent = z.output<typeof presentesContentSchema>;
```

Add `"presentes"` to `SITE_CONTENT_SLUGS` and `SITE_CONTENT_SCHEMAS` (mirroring every other slug already there — `settings`, `home-hero`, etc.). Naming note: this is a **site-content slug**, unrelated to and not to be confused with the existing `gifts` domain table — it stores exactly one field (the background image URL).

### New admin section

- **New route**: `/admin/conteudo/presentes` — new `page.tsx` (Server Component, loads `getSiteContentOrDefault("presentes")`, renders `<PresentesForm defaultValues={...} />`) + `actions.ts` (Server Action `updatePresentesAction`, following the exact shape of `updateTipsCerimoniaAction`: resolve the photo field via `resolvePhotoField("presentes", "backgroundImage", formData, currentUrl, "backgroundImageFile", "backgroundImageRemove")`, parse with `presentesContentSchema`, persist via `createUpdateSiteContentUseCase().execute("presentes", parsed.data)`, then `revalidatePath("/presentes")` + `revalidatePath("/admin/conteudo/presentes")` + `redirect("/admin/conteudo")`).
- **New component**: `src/components/admin/PresentesForm.tsx` — a single `PhotoUploadField` for `backgroundImage` (reusing the existing component, same compression pipeline `BALANCED_COMPRESSION`) + the existing Save button/error pattern from `SettingsForm.tsx`.
- **New content-index entry**: add a new group `"Presentes"` to `CONTENT_GROUPS` in `src/app/admin/(protected)/conteudo/page.tsx`, with one section `{ label: "Imagem de fundo", description: "Imagem de fundo exibida atrás da lista de presentes.", href: "/admin/conteudo/presentes" }`.

### Public page (`src/app/presentes/page.tsx`)

- Fetch `getSiteContentOrDefault("presentes")` alongside the existing `gifts`/`settings` fetches (parallelized via the existing `Promise.all`, extended to 3 entries — or a second `Promise.all` if backend isn't configured is irrelevant since content still has a Zod default).
- Render the background as a fixed, full-viewport layer behind the page content: a `<div>` with inline `style={{ backgroundImage: `url(${backgroundImage})` }}` and Tailwind utility classes `fixed inset-0 -z-10 bg-cover bg-center`, rendered only when `backgroundImage` is non-null. When null, no extra element renders and the page keeps its current solid background.
- The grid's centering container's `max-w-6xl` → `max-w-7xl`.

### `GiftGrid` (`src/components/gifts/GiftGrid.tsx`)

- Column classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (was `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`).

### `GiftCard` (`src/components/gifts/GiftCard.tsx`)

- Card wrapper: `bg-paper` → `bg-paper/60 backdrop-blur-sm`; `border-line` → `border-line/40`.
- Image: `h-40` → `h-48`.
- No structural/logic changes — same props, same modal wiring.

### Data flow — unchanged

- `src/app/presentes/actions.ts`, `GiftDetailsModal.tsx`, `GiftDto`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`: untouched.
- Reuses existing infra: `resolvePhotoField`, `createUpdateSiteContentUseCase`, `getSiteContentOrDefault`, `PhotoUploadField`, `compressImage`/`BALANCED_COMPRESSION` — all as-is.

## Constraints (from the project's global rules)

- No `box-shadow` — the frosted-glass effect comes from `bg-paper/60 backdrop-blur-sm` + `border-line/40`, not shadows ("Regra do Chapado").
- Only existing design tokens (`moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`) — no new colors.
- The header's solid background is unrelated and untouched by this phase.
- New admin route follows the exact existing pattern (route group `(protected)`, Server Action + `useActionState` form, `resolvePhotoField` for photo handling) — no new abstractions.

## Testing

- `schemas.test.ts`: add coverage for `presentesContentSchema` (default `backgroundImage: null`, accepts a non-empty string).
- New `PresentesForm.test.tsx`: renders the photo field with the current background image, submits, shows the error state on failure — mirroring `SettingsForm`'s existing test shape (or the closest existing single-photo-field form test, e.g. any tips-* form test that isolates one `PhotoUploadField`).
- `GiftCard.test.tsx`: update/add an assertion for the translucent classes (`bg-paper/60`, `backdrop-blur-sm`) if the existing tests assert on class names; otherwise no behavioral change to test.
- `GiftGrid.test.tsx`: none exists today (confirmed in the prior phase) — no test to update, a quick manual/visual check covers the column-class change same as before.
- `page.tsx`: no dedicated test file exists today; the background-image render path is covered indirectly by the manual browser smoke check (background renders when set, page renders normally when not set).

## Arquivos afetados (resumo)

**Modificar:** `src/application/content/schemas.ts` (+`presentesContentSchema`), `src/application/content/schemas.test.ts`, `src/app/admin/(protected)/conteudo/page.tsx` (+"Presentes" group), `src/app/presentes/page.tsx` (fetch background content, render background layer, widen container), `src/components/gifts/GiftGrid.tsx` (grid columns), `src/components/gifts/GiftCard.tsx` (translucent styling, larger image).
**Criar:** `src/app/admin/(protected)/conteudo/presentes/page.tsx`, `src/app/admin/(protected)/conteudo/presentes/actions.ts`, `src/components/admin/PresentesForm.tsx`, `src/components/admin/PresentesForm.test.tsx`.
**Sem alteração:** `src/app/presentes/actions.ts`, `GiftDetailsModal.tsx`, `GiftDto.ts`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`, `resolvePhotoField`, `PhotoUploadField`.
