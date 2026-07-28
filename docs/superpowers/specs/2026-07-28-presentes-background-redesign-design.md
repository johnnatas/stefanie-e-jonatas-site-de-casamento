# Presentes Page — Background Image, Translucent Cards, Filters & Sharing — Design

**Data:** 2026-07-28
**Autor:** Jonatas (via Claude Code)

## Contexto e problema

The Presentes page grid (shipped in the prior redesign phase, P17) reads as cramped and flat: a dense 5-column grid of solid, opaque cards on a plain background. The user provided a reference screenshot of another wedding site where gift cards are frosted-glass/translucent panels floating over a full-page background photo, with a wider, more generous grid. The user wants: a wider centered container on desktop, larger cards, single-column full-width cards on mobile, translucent (frosted-glass) card styling matching the reference, and an admin-editable background image for the page.

Additionally, the user wants the page to support filtering (by name, category, status) and sorting (by name or price, both directions), with a "clear filters" control and creation-order as the default sort — plus the ability to share a link to a specific gift or to the currently applied filter/sort combination.

## Decisions (confirmed with the user)

1. **Container width**: `max-w-6xl` (1152px) → `max-w-7xl` (1280px) for the grid's centering container.
2. **Grid columns**: `grid-cols-1` (mobile, full-width single column) → `sm:grid-cols-2` → `lg:grid-cols-4` (was `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`). Fewer desktop columns make each card meaningfully bigger within the wider container.
3. **Card size**: image height `h-40` → `h-48`; slightly more internal padding.
4. **Card translucency**: `bg-paper` (solid) → `bg-paper/60 backdrop-blur-sm`, so the background image shows through with a frosted-glass blur, matching the reference. Border softens from `border-line` to `border-line/40`.
5. **Background image**: new admin-editable field, "Imagem de fundo", added as a **new content section "Presentes"** under Conteúdo do Site (`/admin/conteudo/presentes`) — not folded into the existing "Configurações" section. Rendered as a full-page `background-image: cover`, sitting behind all page content; the header keeps its existing solid background on top (unchanged — this phase does not touch the header).
6. **Fallback with no image set**: page keeps the current solid `bg-paper` background until an image is chosen in the admin panel. The field is optional (nullable), not required.
7. **No changes** to the reservation/payment flow, or `src/app/presentes/actions.ts` — the reserve/pay flow inside `GiftDetailsModal` is untouched by this phase (the modal does gain a "Compartilhar" button — see below — but its existing forms/state machine are unmodified).

### Filtering & sorting (confirmed with the user)

8. **Where filtering happens**: server-side, driven by URL query params, computed inside the existing `GiftsPage` Server Component over the already-fetched `gifts` array (no repository/use-case changes — the full list is still fetched once via `ListGiftsUseCase`, exactly as today).
9. **Query params** (new names chosen to avoid colliding with the existing `status` param already used for the post-payment banner — `sucesso`/`pendente`/`falha`):
   - `q` — free-text search, case-insensitive "contains" match against `gift.name`.
   - `categoria` — repeatable (`?categoria=Cozinha&categoria=Casa`), multi-select. A gift matches if its `category` is in the selected set.
   - `situacao` — single value, one of `available` / `reserved` / `paid`. Absent = all statuses.
   - `ordenar` — one of `recentes` (default — preserves the existing creation-order-ascending array order, no re-sort needed), `nome-asc`, `nome-desc`, `valor-asc`, `valor-desc`.
   - `presente` — see "Sharing" below (not a filter, but also a `page.tsx` searchParam).
10. **Category options**: derived from the distinct `category` values present in the fetched gift list (not a separate hardcoded list) — computed in `page.tsx`, passed to the filter bar as a prop.
11. **Status filter cardinality**: single-select (one situação at a time), unlike category which is multi-select.
12. **Empty state after filtering**: a distinct message ("Nenhum presente encontrado com esses filtros.") from the pre-existing "lista ainda sendo preparada" empty state, shown when `gifts.length > 0` but the filtered result is empty.
13. **Clear filters**: a control that navigates back to `/presentes` with only the `status` (payment banner) param preserved if present — `q`/`categoria`/`situacao`/`ordenar`/`presente` all removed.

### Mobile filters UI (confirmed with the user)

14. **Desktop**: a horizontal bar above the grid with all controls (search input, category multi-select dropdown, status dropdown, sort dropdown, clear-filters button) always visible.
15. **Mobile**: a fixed "Filtros" button (showing a badge with the count of currently-active filter dimensions — `q` set, any `categoria` selected, `situacao` set each count as 1) that opens a full-screen panel. The panel stacks the same controls vertically, focus-trapped and Escape/backdrop-closable exactly like `GiftDetailsModal`/`MobileMenu`, with "Aplicar" and "Limpar filtros" actions. Implemented as a single `GiftFiltersBar` component with both variants toggled by CSS breakpoint (same mounted-both-trees pattern already used for the Dicas e Instruções Ele/Ela toggle), not two separate components.
16. **Search debounce**: the text input updates the URL ~300ms after the user stops typing; every other control (category checkbox, status select, sort select) updates the URL immediately on change.

### Sharing (confirmed with the user)

17. **Scope**: both an individual gift link and the current filtered/sorted view link are shareable.
18. **Individual gift**: a "Compartilhar" button inside `GiftDetailsModal` builds a URL to the current page with `presente=<gift.id>` set (preserving any active `q`/`categoria`/`situacao`/`ordenar` params) and shares/copies it.
19. **Current filters**: a "Compartilhar" button in `GiftFiltersBar` (both desktop bar and mobile panel) shares/copies the current full URL as-is (whatever `q`/`categoria`/`situacao`/`ordenar` are currently applied).
20. **Share mechanism**: a small shared client utility tries `navigator.share({ title, url })` first; if unavailable or the call throws (including user-cancelled `AbortError`, swallowed silently), it falls back to `navigator.clipboard.writeText(url)` and the button shows temporary "Link copiado!" feedback (~2s), mirroring the existing "Copiar link" pattern already used in `src/components/admin/GiftForm.tsx:263`.
21. **Deep link auto-open**: `page.tsx` reads the `presente` searchParam server-side; if it matches a gift's id, that id is passed down as an `openGiftId` prop through `GiftGrid` to `GiftCard`, which initializes its modal-open state to `true` for the matching card instead of the default `false`. No client-side searchParam reading needed.

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
- `searchParams` type expands to include `q?`, `categoria?: string | string[]`, `situacao?`, `ordenar?`, `presente?` alongside the existing `status?`.
- New pure helper module `src/shared/utils/giftFilters.ts`:
  - `filterAndSortGifts(gifts: GiftDto[], params: { q?: string; categoria?: string[]; situacao?: string; ordenar?: string }): GiftDto[]` — applies name substring match, category-set membership, status equality, then sorts (or leaves creation-order intact for `recentes`/default/unrecognized value).
  - `getGiftCategories(gifts: GiftDto[]): string[]` — distinct, sorted category list for the filter dropdown.
  - Pure functions, fully unit-testable in isolation without rendering anything.
- `page.tsx` computes `visibleGifts = filterAndSortGifts(gifts, {...parsed searchParams})`, `categories = getGiftCategories(gifts)` (from the *unfiltered* list, so the dropdown always offers every category regardless of the current filter), and `openGiftId = gifts.some(g => g.id === presente) ? presente : null`.
- Renders `<GiftFiltersBar categories={categories} activeFilters={{...}} />` above `<GiftGrid gifts={visibleGifts} canReserveForLater={allowReserveForLater} openGiftId={openGiftId} />`. When `gifts.length > 0 && visibleGifts.length === 0`, `GiftGrid` shows the "Nenhum presente encontrado com esses filtros." message instead of its current empty-state copy (an `emptyMessage` prop distinguishes the two cases).

### `GiftFiltersBar` (new: `src/components/gifts/GiftFiltersBar.tsx`)

- Client component. Props: `{ categories: string[]; initialQuery: string; initialCategories: string[]; initialSituacao: string | null; initialOrdenar: string }`.
- Uses `useRouter`/`usePathname`/`useSearchParams` (Next.js navigation) to read/update the URL. All URL updates only set/delete this component's own known keys (`q`, `categoria`, `situacao`, `ordenar`) via `URLSearchParams`, leaving any other existing param (notably `status`, the payment banner) untouched.
- Search input: local `useState` mirrors the input value; a `useEffect`-driven `setTimeout` (~300ms, cleared on each keystroke) pushes the `q` param after the user stops typing — same debounce shape as any existing debounced-input pattern in the codebase (none currently exists verbatim, so this is a small self-contained `useEffect`+`setTimeout`, not a new shared utility).
- Category checkboxes, status `<select>`, sort `<select>`: each updates the URL immediately in an `onChange`.
- "Limpar filtros" button: navigates to `pathname` with a `URLSearchParams` built from only the current `status` param (if present), dropping everything else.
- "Compartilhar" button: calls the new `shareOrCopyLink` utility (below) with the current full URL (`window.location.href`).
- Two rendering branches inside the same component, toggled by Tailwind breakpoint classes (`hidden sm:flex` for the desktop bar, `sm:hidden` for the mobile trigger+panel), both driven by the same shared state/handlers — mirrors the existing Ele/Ela toggle pattern (`DressCodeInspiration`).
- Mobile panel: `role="dialog"` `aria-modal="true"`, focus-trapped via the existing `useFocusTrap` hook, closes on Escape/backdrop click/explicit close button, matching `GiftDetailsModal`'s shell conventions.

### `shareOrCopyLink` (new: `src/shared/utils/shareOrCopyLink.ts`)

```ts
export async function shareOrCopyLink(params: { title: string; url: string }): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(params);
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to clipboard copy
    }
  }
  await navigator.clipboard.writeText(params.url);
  return "copied";
}
```

- Pure, framework-agnostic client utility, unit-testable by mocking `navigator.share`/`navigator.clipboard`.
- Consumers (`GiftDetailsModal`, `GiftFiltersBar`) show "Link copiado!" for ~2s only when the result is `"copied"` (a native share sheet already gives its own feedback).

### `GiftGrid` (`src/components/gifts/GiftGrid.tsx`)

- Column classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (was `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`).
- New props: `openGiftId: string | null` (passed through to each `GiftCard` as `autoOpen={gift.id === openGiftId}`), `emptyMessage?: string` (overrides the default "lista sendo preparada" copy for the filtered-empty case — `page.tsx` decides which message to pass).

### `GiftCard` (`src/components/gifts/GiftCard.tsx`)

- Card wrapper: `bg-paper` → `bg-paper/60 backdrop-blur-sm`; `border-line` → `border-line/40`.
- Image: `h-40` → `h-48`.
- New prop `autoOpen?: boolean` (default `false`): `useState(autoOpen)` seeds `isModalOpen`'s initial value instead of always starting `false`. No other structural change.

### `GiftDetailsModal` (`src/components/gifts/GiftDetailsModal.tsx`)

- Adds one "Compartilhar" button (near the close button or below the payment-icons row — implementer's call, following existing spacing conventions) that calls `shareOrCopyLink({ title: gift.name, url: buildShareUrl() })`, where `buildShareUrl()` takes `window.location.href` and sets/replaces the `presente` param to `gift.id` (via `URLSearchParams`), preserving every other existing param.
- No changes to the existing `activeForm`/confirmation state machine, `useActionState` hooks, or focus-trap wiring.

### Data flow — unchanged

- `src/app/presentes/actions.ts`, `GiftDto`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`: untouched.
- Reuses existing infra: `resolvePhotoField`, `createUpdateSiteContentUseCase`, `getSiteContentOrDefault`, `PhotoUploadField`, `compressImage`/`BALANCED_COMPRESSION` — all as-is.

## Constraints (from the project's global rules)

- No `box-shadow` — the frosted-glass effect comes from `bg-paper/60 backdrop-blur-sm` + `border-line/40`, not shadows ("Regra do Chapado").
- Only existing design tokens (`moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`) — no new colors.
- The header's solid background is unrelated and untouched by this phase.
- New admin route follows the exact existing pattern (route group `(protected)`, Server Action + `useActionState` form, `resolvePhotoField` for photo handling) — no new abstractions.

## Testing

- `schemas.test.ts`: add coverage for `presentesContentSchema` (default `backgroundImage: null`, accepts a non-empty string).
- New `PresentesForm.test.tsx`: renders the photo field with the current background image, submits, shows the error state on failure — mirroring `SettingsForm`'s existing test shape (or the closest existing single-photo-field form test, e.g. any tips-* form test that isolates one `PhotoUploadField`).
- `GiftCard.test.tsx`: update/add an assertion for the translucent classes (`bg-paper/60`, `backdrop-blur-sm`) if the existing tests assert on class names; add a case for `autoOpen` seeding the modal open on mount.
- `GiftGrid.test.tsx`: none exists today (confirmed in the prior phase) — no test to update for the column-class change; add minimal coverage for the new `emptyMessage`/`openGiftId` props since those are new behavior, not just styling.
- New `giftFilters.test.ts`: unit tests for `filterAndSortGifts` (name search, category set membership, status equality, each sort direction, `recentes` preserves input order, combinations of multiple filters together) and `getGiftCategories` (dedupes, sorts, empty list).
- New `shareOrCopyLink.test.ts`: mocks `navigator.share` present/absent/throwing, asserts fallback to `navigator.clipboard.writeText` and the returned `"shared"`/`"copied"` result.
- New `GiftFiltersBar.test.tsx`: renders both variants; asserts URL updates for each control (via a mocked `next/navigation` router, same pattern as existing tests that mock it, e.g. `Header.test.tsx`); asserts debounce timing for the search input (using fake timers); asserts "Limpar filtros" preserves an existing `status` param while dropping the rest; asserts the share button calls `shareOrCopyLink`.
- `GiftDetailsModal.test.tsx`: add a case for the new "Compartilhar" button calling `shareOrCopyLink` with a URL containing `presente=<id>`.
- `page.tsx`: no dedicated test file exists today; the background-image render path and the filter/sort/share wiring are covered indirectly by the manual browser smoke check (background renders when set; filtering, sorting, clearing, and both share flows exercised end-to-end; deep link via `?presente=` opens the right modal).

## Arquivos afetados (resumo)

**Modificar:** `src/application/content/schemas.ts` (+`presentesContentSchema`), `src/application/content/schemas.test.ts`, `src/app/admin/(protected)/conteudo/page.tsx` (+"Presentes" group), `src/app/presentes/page.tsx` (fetch background content, render background layer, widen container, compute filters/sort/openGiftId, render `GiftFiltersBar`), `src/components/gifts/GiftGrid.tsx` (grid columns, `openGiftId`/`emptyMessage` props), `src/components/gifts/GiftCard.tsx` (translucent styling, larger image, `autoOpen` prop), `src/components/gifts/GiftCard.test.tsx`, `src/components/gifts/GiftDetailsModal.tsx` (+"Compartilhar" button), `src/components/gifts/GiftDetailsModal.test.tsx`.
**Criar:** `src/app/admin/(protected)/conteudo/presentes/page.tsx`, `src/app/admin/(protected)/conteudo/presentes/actions.ts`, `src/components/admin/PresentesForm.tsx`, `src/components/admin/PresentesForm.test.tsx`, `src/components/gifts/GiftFiltersBar.tsx`, `src/components/gifts/GiftFiltersBar.test.tsx`, `src/shared/utils/giftFilters.ts`, `src/shared/utils/giftFilters.test.ts`, `src/shared/utils/shareOrCopyLink.ts`, `src/shared/utils/shareOrCopyLink.test.ts`.
**Sem alteração:** `src/app/presentes/actions.ts`, `GiftDto.ts`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`, `resolvePhotoField`, `PhotoUploadField`.
