# Mercado Pago Payment Confirmation (Phase 2)

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

Phase 1 (already shipped) gave every gift a durable, reusable Mercado
Pago checkout link, with `external_reference` always set to the
gift's own id — a deliberate change from the pre-phase-1 behavior,
where `external_reference` was the contribution's id. That change was
explicitly left unresolved on the confirmation side: `ConfirmGiftPaymentUseCase`
still resolves an incoming payment by looking up a contribution via
`findById(payment.externalReference)`, which no longer matches reality
now that `externalReference` is a gift id, not a contribution id. Real
payments currently land in Mercado Pago successfully but are never
reflected back onto the gift/contribution records.

Separately, there is currently no admin-facing way to see individual
contributions at all — only the aggregate Dashboard counters (total
arrecadado, presentes pagos) exist.

## Goal

Mercado Pago's payment webhook correctly resolves to the right
contribution via the gift id it now carries, marks that contribution
approved/rejected and the gift paid/available accordingly, and
tolerates a duplicate/replayed notification without error. A new
read-only "Pagamentos" admin page lists every contribution (guest,
gift, amount, status, date) for manual tracking.

## 1. Fix the confirmation lookup

`GiftContributionRepository` gains `findPendingByGiftId(giftId:
string): Promise<GiftContribution | null>` — the most recent
`"pending"` contribution for that gift (`order by created_at desc
limit 1`), since the reservation gate already guarantees at most one
contribution can be pending against a given gift at a time.

`ConfirmGiftPaymentUseCase` switches from `findById(payment.externalReference)`
to `findPendingByGiftId(payment.externalReference)`. If no pending
contribution is found — most likely a duplicate Mercado Pago webhook
delivery for a payment already processed, since a webhook can be
resent — the use case returns without writing anything and without
throwing. This keeps the existing webhook route's behavior (catch,
log, always respond 200) unaffected while making the common "already
handled" case silent rather than a logged error.

The unused `findByPreferenceId` method is removed from
`GiftContributionRepository` and both implementations — with preference
links now reused across every purchase attempt for a gift, a preference
id no longer identifies a single contribution, so this method was
already misleading dead code before this phase started.

## 2. New "Pagamentos" admin page

New top-level nav item (`/admin/pagamentos`), alongside Dashboard,
Convidados, Presentes, Conteúdo, Integrações. Read-only table: guest
name, gift name, amount, status (Pendente/Aprovado/Rejeitado), date —
newest first.

`GiftContributionRepository` gains `findAll(): Promise<GiftContribution[]>`
(today's only bulk read is `findApproved()`). The page's Server
Component fetches both this and the full gift list, and joins gift
names in by id for display — following the same small-scale,
client-side-join pattern already used elsewhere in this admin panel
(e.g. the Dashboard's own aggregate calculations).

No actions on this page — confirmed as explicitly out of scope for
this phase; a manual override (marking a contribution
approved/rejected by hand) is deferred.

## 3. Testing

- `ConfirmGiftPaymentUseCase`: existing tests currently simulate
  payments with `externalReference: contribution.id!`, which no
  longer reflects real payment data — rewritten to use the gift id
  instead. Add a new test: a webhook notification for a gift with no
  pending contribution (already processed, or none ever existed)
  returns without throwing and without altering any state.
- `findPendingByGiftId`/`findAll`: covered via the in-memory test
  double, exercised by the `ConfirmGiftPaymentUseCase` tests and a new
  Pagamentos-page-level test respectively.
- Pagamentos page: a rendering test confirming gift names are
  correctly joined in by id and rows are ordered newest-first.

## What this does NOT do

- No manual status-override UI on the Pagamentos page — read-only, as
  explicitly scoped.
- No changes to the public purchase flow (`CreateGiftContributionUseCase`)
  or to gift-registration behavior (phase 1, already shipped).
- No retry/backoff logic for failed webhook deliveries — Mercado
  Pago's own retry behavior is relied on as-is; this phase only makes
  redelivery of an already-processed notification safe to receive.
