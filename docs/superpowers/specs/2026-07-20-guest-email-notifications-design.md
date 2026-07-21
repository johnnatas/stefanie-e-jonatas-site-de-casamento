# Guest Email Notifications (Subprojects 2+3)

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

Subproject 1 (already shipped) added a `expectedPaymentDate` to gift
reservations and a `reservedUntil` deadline that auto-releases unpaid
reservations. This subproject builds the notification system that was
deferred at the time: reminders for guests who reserved a gift for later,
reminders for confirmed guests who haven't given a gift yet as the wedding
approaches, and a same-day wedding notification. No email infrastructure
exists in this codebase yet — this subproject builds it from scratch.

## Goal

Guests who reserve a gift for a future date get a friendly, low-pressure
trail of reminders (immediate confirmation, then at 10/7/3/1/0 days before
their chosen date) that stops the moment they pay. Confirmed guests who
haven't given anything get gentle nudges as the wedding approaches
(90/60/30/15/3 days before), again stopping once they contribute. Everyone
confirmed gets a warm note on the wedding day itself.

## 1. Email sending

New `EmailGateway` port (`src/application/ports/EmailGateway.ts`):
`sendEmail({ to, subject, html }): Promise<void>`. Implemented by
`ResendEmailGateway` (new dependency: `resend` npm package) in
`src/infrastructure/email/ResendEmailGateway.ts`, mirroring
`MercadoPagoGateway`'s existing shape — it reads its API key from
`AdminSecuritySettingsRepository` (extended with `resendApiKey: string |
null`) rather than an env var, so it can be rotated from
`/admin/integracoes` without a redeploy. Sender address:
`Stéfanie & Jonatas <lembretes@sjcasamento.site>` (the user confirmed DNS
access to verify this domain in Resend).

Following the existing precedent for sensitive credentials (the Mercado
Pago Access Token), changing the Resend API key after first-time setup
requires the same admin secret key used for price changes and the Mercado
Pago token — a new "Resend" card on the Integrações page, structurally
identical to the existing `MercadoPagoTokenForm`.

## 2. Deduplication log

New table `notification_log`:
- `kind text not null` — one of `reservation_confirmation`,
  `reservation_reminder_t10`, `reservation_reminder_t7`,
  `reservation_reminder_t3`, `reservation_reminder_t1`,
  `reservation_reminder_t0`, `gift_suggestion_t90`, `gift_suggestion_t60`,
  `gift_suggestion_t30`, `gift_suggestion_t15`, `gift_suggestion_t3`,
  `wedding_day`.
- `entity_type text not null` — `gift_contribution` or `guest`.
- `entity_id text not null`.
- `sent_at timestamptz not null default now()`.
- Unique constraint on `(kind, entity_type, entity_id)`.

New `NotificationLogRepository` (domain interface):
`hasBeenSent(kind, entityType, entityId): Promise<boolean>`,
`markSent(kind, entityType, entityId): Promise<void>`. Supabase and
in-memory implementations, following the existing repository pattern.
Every send path checks `hasBeenSent` before sending and calls `markSent`
right after a successful send — if sending fails, nothing is marked, so
the next day's cron run retries it naturally (no separate retry queue
needed for this scope).

## 3. Day-counting helper

A new pure helper, `src/shared/utils/brasiliaCalendarDays.ts`, computes
whole calendar-day differences between two instants using the
`America/Sao_Paulo` timezone (via `Intl.DateTimeFormat`), so "10 days
before the 1st" means the same thing regardless of what timezone the
Vercel function happens to run in that day. Exports
`daysBetweenBrasiliaDates(from: Date, to: Date): number`.

## 4. The three notification rules

Each rule is its own use case, all invoked in sequence by one Route
Handler.

**`SendReservationRemindersUseCase`** — for every `GiftContribution` with
`status: "pending"` and `expectedPaymentDate` set: compute
`daysBetweenBrasiliaDates(today, expectedPaymentDate)`. If it equals
exactly one of `10, 7, 3, 1, 0` and that kind/contribution pair hasn't
been sent, send the reminder email (with the gift's name and the gift's
`mercadoPagoCheckoutUrl` as the "Pagar agora" link) and mark it sent.
Contributions that are no longer `pending` (approved, rejected, or
expired) are implicitly excluded — no further reminders since they
weren't in the fetched set.

**`SendGiftSuggestionRemindersUseCase`** — for every confirmed `Guest`
with an `email`: check whether any `GiftContribution` with a matching
`guestEmail` (case-insensitive, already normalized by both entities) has
`status` in `("pending", "approved")`. If none does, and
`daysBetweenBrasiliaDates(today, weddingDate)` equals exactly one of `90,
60, 30, 15, 3`, send the suggestion email (linking to `/presentes`) and
mark it sent for that guest/kind pair.

**`SendWeddingDayNotificationUseCase`** — if
`daysBetweenBrasiliaDates(today, weddingDate) === 0`, send the wedding-day
email to every confirmed guest with an email, marking each sent
(`kind: "wedding_day"`) so a second cron run the same day is a no-op.

**Immediate reservation confirmation** — not part of the cron. Right after
`reserveGiftForLaterAction` successfully creates the contribution, it
calls a fourth, tiny use case, `SendReservationConfirmationUseCase`,
synchronously. A failure here is caught and ignored (logged only) — it
must never block the reservation itself from succeeding, matching the
existing precedent where a failed payment-link refresh doesn't block a
gift save.

## 5. Cron wiring

New Route Handler `src/app/api/cron/daily-notifications/route.ts`
(`GET`), guarded by comparing the `Authorization` header to
`Bearer ${CRON_SECRET}` (new required env var, validated via `getEnv()`)
— returns `401` if it doesn't match. On success, calls all three
scheduled use cases in sequence inside a single try/catch per use case (one
failing must not stop the others), and returns a small JSON summary
(counts sent per rule) for visibility in Vercel's cron logs.

New `vercel.json` (doesn't exist yet) with a `crons` entry:
```json
{
  "crons": [{ "path": "/api/cron/daily-notifications", "schedule": "30 11 * * *" }]
}
```
(11:30 UTC = 08:30 BRT, since Brazil has had no DST since 2019 — a fixed
offset.)

## 6. Email copy

All four templates render simple HTML (a short paragraph + one styled
button), Portuguese, matching the site's warm tone. Approved copy:

1. **Reservation confirmation** — subject "Reserva confirmada: {gift} 🎁";
   body confirms the reservation and date, offers a no-pressure "Pagar
   agora" link.
2. **Reservation reminder** (same copy for all five thresholds, only the
   date stays fixed) — subject "Lembrete: sua reserva de {gift}"; same
   friendly, low-pressure tone.
3. **Gift suggestion** — subject "Faltam {N} dias para o nosso
   casamento!"; leads with warmth about their attendance, only then
   mentions the gift list, explicit that their presence matters most.
4. **Wedding day** — subject "Hoje é o grande dia! 💍"; no call to action,
   pure celebration note.

## 7. Testing

- `daysBetweenBrasiliaDates`: unit tests across a few fixed date pairs,
  including a case straddling a month boundary.
- Each `Send*UseCase`: unit tests using in-memory repositories and a fake
  `EmailGateway` (new `FakeEmailGateway` test double recording sent
  emails), covering: sends on an exact threshold day, does not send on a
  non-threshold day, does not re-send when already logged, stops once the
  underlying contribution/guest no longer qualifies (paid / gift given).
- The cron Route Handler: a lightweight test asserting the `401` rejection
  path for a missing/wrong `Authorization` header (the success path is
  exercised indirectly through the use case tests).
- Resend/Supabase-touching code (`ResendEmailGateway`,
  `SupabaseNotificationLogRepository`) is not unit tested, matching the
  existing precedent for thin infrastructure adapters in this codebase.

## What this does NOT do

- No unsubscribe/opt-out link — explicitly decided out of scope for this
  guest list's size.
- No admin-facing log of sent notifications — `notification_log` exists
  purely for deduplication, not as a reporting surface.
- No retry backoff beyond "try again on tomorrow's cron run" — acceptable
  given these are day-granularity reminders, not time-sensitive alerts.
- Matching a guest's RSVP email to their gift contribution's email is a
  simple case-insensitive string match — if a guest gives under a
  different email than the one in their RSVP, they'll keep receiving
  gift-suggestion nudges. Accepted as a known limitation given there's no
  login system tying the two together.
