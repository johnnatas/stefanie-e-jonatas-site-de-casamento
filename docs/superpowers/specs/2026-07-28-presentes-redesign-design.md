# Presentes Page Redesign — Design

**Data:** 2026-07-28
**Autor:** Jonatas (via Claude Code)

## Contexto e problema

The public Presentes (gift list) page currently opens with a `SplitPanel` intro (text + placeholder photo) above the gift grid, and each `GiftCard` hosts its full interaction inline: a description line, a status badge, two action buttons ("Presentear agora" / "Reservar para depois"), and — once one is clicked — an inline form (name/email, or name/email/date for the later flow) directly inside the card. Reserving for later also renders a confirmation modal inline in the card.

The user wants this simplified to match a reference layout: the intro panel is dropped entirely, cards show only image + name + price + a "Ver detalhes" button, and all the interactive flow (buttons, forms, confirmation) moves into a modal opened by that button — matching a reference site's card-grid + detail-modal pattern, in both desktop (image left half / details right half) and mobile (image on top, details stacked below) layouts.

## Decisions (confirmed with the user)

1. **Reservation flow is kept in full**, just relocated: the "Presentear agora" / "Reservar para depois" buttons, their inline forms, and the reservation confirmation view all move from the card into the new modal. No business logic changes — `createGiftContributionAction` and `reserveGiftForLaterAction` (`src/app/presentes/actions.ts`) are reused as-is.
2. **Already-reserved/paid gifts**: the card shows the existing status badge ("Reservado"/"Presenteado") in place of the button, exactly as today — no modal for these (matches current `GiftCard` behavior, just without the now-removed inline forms).
3. **Description is dropped from display** — the reference shows neither the card nor the modal displaying `gift.description`. The field stays in the schema/DTO (not removed), simply unused in this page's rendering.
4. **Payment method icons**: the user supplied 4 real icon files (`boleto.webp`, `pix.webp`, `mastercard.webp`, `visa.webp`), already copied to `public/images/payment-icons/`. The modal's payment view shows these four icons in a row beneath the primary action button, plus an italic "Parcelamento disponível" caption — matching the reference.
5. **Intro panel removed entirely** — the page starts directly with the grid below the nav (only an `sr-only` `<h1>` remains for accessibility, matching the pattern already used for the Dicas e Instruções `TipsPage`).

## Architecture

### Page (`src/app/presentes/page.tsx`)

- Drop the `SplitPanel`/`PlaceholderImage` intro block entirely.
- Keep the `sr-only` `<h1>Lista de Presentes</h1>`.
- Keep the existing `status` query-param banner (`STATUS_MESSAGES`) — unrelated to this redesign, still relevant after a Mercado Pago redirect back to the site.
- Keep the `ConfigurationNotice` fallback when the backend isn't configured, and the `gifts`/`allowReserveForLater` data fetching — unchanged.
- Renders `<GiftGrid gifts={gifts} canReserveForLater={allowReserveForLater} />` directly under the banner, no wrapping intro.

### `GiftGrid` (`src/components/gifts/GiftGrid.tsx`)

- Same responsibility (empty-state message, map over gifts), only the grid's column classes change: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (was `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), to match the reference's denser desktop layout.

### `GiftCard` (`src/components/gifts/GiftCard.tsx`) — simplified

Reduced to a presentational card:
- `PhotoOrPlaceholder` image (top, rounded corners).
- `gift.name` (uppercase, serif, centered).
- Formatted price (centered).
- If `gift.status === "available"`: a single "Ver detalhes" pill button (outlined, matching the reference's style) that opens `GiftDetailsModal` (local `isModalOpen` state).
- If `gift.status !== "available"`: the existing status badge (`STATUS_LABEL` map), no button.
- No more inline forms, no more `activeForm`/`modalDismissed` state, no more `useActionState` calls — all of that moves to the new modal component.

### `GiftDetailsModal` (new: `src/components/gifts/GiftDetailsModal.tsx`)

Client component, rendered by `GiftCard` only when `isModalOpen` is true (and only ever mounted for `status === "available"` gifts, since that's the only case with a "Ver detalhes" button). Owns exactly the state machine and JSX currently inline in `GiftCard`:

- `activeForm: "none" | "now" | "later"`, `modalDismissed`, the two `useActionState` hooks (`createGiftContributionAction`, `reserveGiftForLaterAction`), and the reservation confirmation sub-view — all moved here verbatim (same action imports, same field names/ids, same validation messages), just re-hosted inside the new modal shell instead of inline in the card.
- **Layout**: `role="dialog"` `aria-modal="true"`, focus-trapped (reuse `useFocusTrap`, same pattern as the current reservation-confirmation dialog), closes on backdrop click, `Esc`, or an explicit close control — consistent with how `MobileMenu` already closes.
  - Desktop (`sm:` and up): two-column panel — image fills the left half (full modal height), content (name, price, buttons/forms, payment icons) fills the right half with padding.
  - Mobile: single column — image on top (fixed aspect ratio, full width), content stacked below, scrollable if it overflows the viewport.
- **Payment icons row**: shown only in the "none" (initial) state, directly under the "Presentear agora"/"Reservar para depois" buttons — four `<img>` tags pointing at `/images/payment-icons/{visa,mastercard,pix,boleto}.webp`, plus the "Parcelamento disponível" italic caption below them. Hidden once a form (`now`/`later`) or the confirmation view is showing, matching the reference (payment icons only appear alongside the payment CTA, not on the form-filling or confirmation screens).
- **Props**: `{ gift: GiftDto; canReserveForLater: boolean; onClose: () => void }`.

### Data flow / business logic — unchanged

- `src/app/presentes/actions.ts` (`createGiftContributionAction`, `reserveGiftForLaterAction`): untouched.
- `GiftDto`, `mapGiftToDto`, `formatCurrency`, `useFocusTrap`, `canReserveForLater`/`giftReservationWindow`: untouched, all reused as-is.
- Cache revalidation (`revalidatePath` calls inside the actions): untouched.

## Constraints (from the project's global rules)

- No `box-shadow` — modal and cards use `border border-line` for edge definition, consistent with the rest of the site ("Regra do Chapado").
- Only existing design tokens (`moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`) and fonts (`font-serif`, `font-sans`, `font-script`) — no new colors/fonts introduced.
- Payment icon images are static assets in `public/images/payment-icons/` (`boleto.webp`, `pix.webp`, `mastercard.webp`, `visa.webp`) — already placed; referenced via plain `<img>` (matches the codebase's existing convention for non-optimized static/external images, e.g. `Monogram`, `PhotoOrPlaceholder`).
- No server-action or schema changes — this is a pure presentation-layer refactor of already-working functionality.

## Testing

- `GiftCard.test.tsx`: update to assert the simplified rendering (image, name, price, "Ver detalhes" button for available gifts; status badge for reserved/paid gifts; no more inline form assertions — those move to the new modal's test file). Clicking "Ver detalhes" opens the modal (assert `GiftDetailsModal` content appears, e.g. via a mocked/rendered dialog role).
- New `GiftDetailsModal.test.tsx`: covers what today's `GiftCard.test.tsx` covers for the interactive flow — showing both buttons when `canReserveForLater`, hiding "Reservar para depois" when not, submitting the "now" form, submitting the "later" form and reaching the confirmation view, closing the modal (backdrop/Esc/close control), and that the payment icons row is present in the initial view and absent once a form is active.
- `GiftGrid.test.tsx` (if one exists) or a quick manual check: confirm the new column classes.

## Arquivos afetados (resumo)

**Modificar:** `src/app/presentes/page.tsx` (remove intro panel), `src/components/gifts/GiftGrid.tsx` (grid columns), `src/components/gifts/GiftCard.tsx` (simplify to image+name+price+button/badge), `src/components/gifts/GiftCard.test.tsx`.
**Criar:** `src/components/gifts/GiftDetailsModal.tsx`, `src/components/gifts/GiftDetailsModal.test.tsx`.
**Já adicionado (fora do código):** `public/images/payment-icons/{boleto,pix,mastercard,visa}.webp`.
**Sem alteração:** `src/app/presentes/actions.ts`, `GiftDto.ts`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`.
