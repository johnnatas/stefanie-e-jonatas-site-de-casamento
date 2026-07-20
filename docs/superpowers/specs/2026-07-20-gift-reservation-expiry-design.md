# Gift Reservation Auto-Expiry + "Reserve for Later" (Subproject 1)

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

Today, clicking "Presentear" on `/presentes` immediately reserves the gift
(`Gift.reserve()`, status `"reserved"`) before redirecting to the Mercado
Pago checkout, and that reservation never expires on its own. If the guest
abandons checkout, the gift stays locked forever — nobody else can give it,
and only a real payment (approved/rejected webhook) or manual admin
intervention releases it.

This is the first of two related subprojects. The second (email
notifications for pending reservations and for confirmed guests who
haven't given a gift yet) depends on the `expectedPaymentDate` field this
subproject introduces, and is designed separately once this ships.

## Goal

No reservation blocks a gift indefinitely. A guest can either pay right
away (short automatic hold while they're on checkout) or explicitly commit
to a future payment date (a longer hold, capped so it can't run past the
point where gift-giving stops making sense before the wedding). Either way,
if the guest doesn't pay in time, the gift releases itself automatically —
no cron job needed for this subproject; the release happens lazily
whenever gifts are listed.

## 1. Domain model changes

**`Gift`** (`src/domain/entities/Gift.ts`) gains `reservedUntil: Date |
null`. It is set whenever the gift transitions to `"reserved"` and cleared
whenever it leaves that status (`releaseToAvailable()`, `markAsPaid()`).
`reserve()` changes signature to `reserve(reservedUntil: Date): Gift` — the
caller decides the hold's length, since it differs by flow (30 minutes for
immediate checkout vs. the guest's chosen date for "reserve for later").

**`GiftContribution`** (`src/domain/entities/GiftContribution.ts`) gains
`expectedPaymentDate: Date | null` — populated only for the "reserve for
later" flow, `null` for immediate checkout. `ContributionStatus` gains a
fourth value, `"expired"`, distinct from `"rejected"` (which remains
reserved for an explicit Mercado Pago decline). A new method `expire():
GiftContribution` sets `status: "expired"`.

## 2. Reservation windows

- **Immediate checkout ("Presentear agora"):** unchanged UX — name + email,
  redirect straight to the Mercado Pago checkout. Internally,
  `CreateGiftContributionUseCase` now reserves the gift with `reservedUntil
  = now + 30 minutes` instead of an unbounded reservation. `expectedPaymentDate`
  stays `null` on the contribution.
- **Reserve for later ("Reservar para depois"):** name + email + a date
  input. `reservedUntil` is set to the end of that day
  (`${date}T23:59:59-03:00`, matching the `-03:00` offset already used by
  `weddingDateIso`), giving the guest the whole day to pay.
  `expectedPaymentDate` is stored on the contribution with the same value.

**Date bounds for "reserve for later"** (validated in the Server Action,
using the site's configured `weddingDateIso`):
- Must not be in the past (`>= today`, compared as an absolute instant
  using the `-03:00` offset).
- Must be no later than 30 days before the wedding date
  (`<= weddingDate - 30 days`). If fewer than 30 days remain before the
  wedding, no valid date exists — the button is hidden in the UI in that
  case (see section 4) rather than showing a form that can never validate.

## 3. Automatic expiry ("sweep")

No cron in this subproject. Instead, `ListGiftsUseCase` — used by both the
public `/presentes` page and the admin `/admin/presentes` page — sweeps
expired reservations as part of every call:

1. Fetch all gifts.
2. For each gift with `status === "reserved"` and `reservedUntil` in the
   past: look up its pending contribution via
   `giftContributionRepository.findPendingByGiftId(gift.id)`, mark it
   `expire()`d and persist, then persist `gift.releaseToAvailable()`.
3. Return the (now up-to-date) gift list.

This means `ListGiftsUseCase` gains a `GiftContributionRepository`
dependency alongside its existing `GiftRepository` one. Every consumer of
`createListGiftsUseCase()` (the public gifts page, the admin gifts page)
gets the sweep for free without changing their own code.

## 4. Public UI (`/presentes`)

`GiftCard` shows two buttons side by side when a gift is available:
"Presentear agora" (opens the existing name+email form, unchanged
behavior) and "Reservar para depois" (opens a name+email+date form) — the
second button is omitted entirely once fewer than 30 days remain before
the wedding, since no valid date would exist.

Submitting "Reservar para depois" does **not** redirect immediately.
Instead, a new Server Action (`reserveGiftForLaterAction`) creates the
contribution/reservation exactly as described above and returns the
checkout URL and a recap (guest name, gift name, chosen date) instead of
calling `redirect()`. The card then shows a confirmation modal: the
recapped data, a "Ir para pagamento" button (links to the checkout URL, in
case the guest wants to pay immediately after all) and a "Voltar" button
(closes the modal, returns to the grid — the reservation itself is already
saved either way).

`GiftsPage` (Server Component) computes whether reservation is still
allowed (`weddingDate - 30 days` is still in the future) from
`getSiteContentOrDefault("settings")` and passes that down through
`GiftGrid` to `GiftCard`.

## 5. Admin visibility

The Pagamentos page (`/admin/pagamentos`) gains a "Data prevista de
pagamento" column — the contribution's `expectedPaymentDate` formatted as
`pt-BR`, or `—` when absent (immediate-checkout contributions, or older
data). The status label map gains `expired: "Expirada"`.

## 6. Data migration

New migration adds `reserved_until timestamptz null` to `gifts` and
`expected_payment_date timestamptz null` to `gift_contributions`, expands
the `gift_contributions.status` check constraint to include `'expired'`,
and — as a one-time cleanup — releases every currently `'reserved'` gift
back to `'available'` (these are exactly the stuck reservations this
subproject exists to stop happening again; there's no `reserved_until` to
honor for them since the column is brand new).

## What this does NOT do

- No email notifications yet (reservation reminders, gift-suggestion
  reminders for confirmed guests, wedding-day notification) — that is
  Subproject 2/3, designed and built after this ships, and depends on
  `expectedPaymentDate` existing.
- No cron job. The sweep is purely lazy (triggered by listing gifts).
  Subproject 2 introduces the first scheduled job in this codebase; this
  subproject deliberately avoids that infrastructure cost.
- No change to how an *approved* or *rejected* Mercado Pago payment is
  handled — `ConfirmGiftPaymentUseCase` (already fixed in the previous
  phase) is untouched here.
