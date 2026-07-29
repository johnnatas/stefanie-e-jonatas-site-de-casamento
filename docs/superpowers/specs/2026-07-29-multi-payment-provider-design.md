# Multi Payment Provider (Mercado Pago + Infinite Pay)

Date: 2026-07-29
Status: approved, ready for implementation plan

## Context

The site currently supports a single, hardcoded payment provider: Mercado
Pago. Every gift gets a checkout link (`mercadoPagoPreferenceId` /
`mercadoPagoCheckoutUrl`) generated when it's created or edited (see
`2026-07-20-mercadopago-fixed-links-design.md`), reused by the public
"Presentear" flow, and confirmed via a webhook at
`/api/webhooks/mercadopago` (see
`2026-07-20-mercadopago-payment-confirmation-design.md`).

The couple wants to add Infinite Pay as a second, admin-selectable
provider. Only one provider is *active* at a time, but links for a gift
can exist for **both** providers simultaneously — switching back and
forth must never lose or regenerate a link that's already there. The
admin also wants visibility into which gifts are missing a link for the
active provider, and manual ways to (re)generate links, since automatic
generation can fail (API errors, missing credentials, rate limits).

Finally, the couple wants to collect the guest's phone number (optional,
since international guests may not have a Brazilian-format number) so it
can be forwarded to whichever provider is active, letting guests skip
re-entering their contact details during checkout.

### Infinite Pay API (external checkout), as documented publicly

- `POST https://api.checkout.infinitepay.io/links` — creates a payment
  link. Auth is just the merchant's **handle** (their "InfiniteTag",
  without the `$`) in the request body — no access token/secret is
  involved in link creation.
- Request body: `handle`, `order_nsu` (our own order identifier),
  `redirect_url`, `webhook_url`, `items: [{ quantity, price (cents),
  description }]`, optional `customer: { name, email, phone_number }`.
- Response: `{ url: "https://checkout.infinitepay.com.br/..." }` — no
  separate "preference id"; `order_nsu` (which we chose) is the only
  handle we get to correlate later.
- Webhook: InfinitePay POSTs to the `webhook_url` we supplied per-link,
  with `order_nsu`, `invoice_slug`, `amount`, `paid_amount`,
  `installments`, `capture_method`, `transaction_nsu`, `receipt_url`,
  `items`. **No documented signature/secret to verify authenticity**,
  and no "fetch payment by id" endpoint to double-check (unlike Mercado
  Pago). Per the couple's decision, this is mitigated by
  correspondence validation: only approve a payment if `order_nsu`
  matches a `pending` contribution and `paid_amount` (cents) equals the
  gift's price. Mismatches or unknown `order_nsu` are logged and
  ignored, never approved.

## Goal

The admin picks an active payment provider (Mercado Pago or Infinite
Pay) on the Integrações page. Every gift can hold a checkout link for
*each* provider it's ever had active; switching providers never deletes
a link, and only generates new links for gifts that don't already have
one for the newly active provider. The admin can trigger link
generation manually (per gift, or for every gift missing one) and sees,
per gift, whether a link exists for the currently active provider. An
Infinite Pay webhook confirms payments the same way the Mercado Pago one
already does. Guests can optionally leave a phone number before paying,
which is forwarded to the active provider to skip its own contact-info
step.

## 1. Data model

### Shared `PaymentProvider` type

New file `src/domain/entities/PaymentProvider.ts`:

```ts
export type PaymentProvider = "mercado_pago" | "infinite_pay";
```

Imported by `Gift`, `GiftContribution`, and `AdminSecuritySettings`.

### `Gift` entity

Two new optional fields alongside the existing Mercado Pago ones —
**not** a rename, both pairs coexist permanently:

```ts
export interface GiftProps {
  // ...existing fields unchanged...
  mercadoPagoPreferenceId?: string;
  mercadoPagoCheckoutUrl?: string | null;
  infinitePayOrderNsu?: string;
  infinitePayCheckoutUrl?: string | null;
}
```

Two new read helpers (pure, no external dependency — the entity just
knows how to look up its own two link pairs):

```ts
checkoutUrlFor(provider: PaymentProvider): string | null {
  return provider === "mercado_pago"
    ? (this.mercadoPagoCheckoutUrl ?? null)
    : (this.infinitePayCheckoutUrl ?? null);
}

hasLinkFor(provider: PaymentProvider): boolean {
  return this.checkoutUrlFor(provider) !== null;
}
```

And a write helper replacing ad-hoc `Gift.create({ ...gift, mercadoPago... })`
call sites:

```ts
withProviderLink(provider: PaymentProvider, referenceId: string, checkoutUrl: string): Gift {
  return provider === "mercado_pago"
    ? Gift.create({ ...this, mercadoPagoPreferenceId: referenceId, mercadoPagoCheckoutUrl: checkoutUrl })
    : Gift.create({ ...this, infinitePayOrderNsu: referenceId, infinitePayCheckoutUrl: checkoutUrl });
}
```

`SupabaseGiftRepository` maps the two new fields to new nullable columns
`gifts.infinite_pay_order_nsu` / `gifts.infinite_pay_checkout_url`.

### `GiftContribution` entity

A contribution is created against whichever provider is active at that
moment, so (unlike `Gift`) it only ever needs **one** provider's
reference fields active at a time — but we keep both providers' columns
on the row (mirroring `Gift`) so historical contributions keep whichever
data they were created with, regardless of later provider switches:

```ts
export interface GiftContributionProps {
  // ...existing fields unchanged...
  guestPhone?: string | null;
  paymentProvider?: PaymentProvider; // defaults to "mercado_pago"
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  infinitePayOrderNsu?: string;
  infinitePayTransactionNsu?: string;
}
```

`withPreference(preferenceId)` is replaced by a provider-aware
`withProviderReference`:

```ts
withProviderReference(provider: PaymentProvider, referenceId: string): GiftContribution {
  return provider === "mercado_pago"
    ? new GiftContribution({ ...this, paymentProvider: provider, mercadoPagoPreferenceId: referenceId })
    : new GiftContribution({ ...this, paymentProvider: provider, infinitePayOrderNsu: referenceId });
}
```

`approve(paymentReference: string)` / `reject(paymentReference: string)`
keep their existing signature (no call-site churn in
`ConfirmGiftPaymentUseCase`) but branch internally on
`this.paymentProvider` to write into
`mercadoPagoPaymentId`/`infinitePayTransactionNsu` respectively.

### `admin_security_settings` (existing singleton table)

Two new columns:

```sql
alter table admin_security_settings
  add column if not exists active_payment_provider text not null default 'mercado_pago'
    check (active_payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinitepay_handle text;
```

`AdminSecuritySettings` domain type gains:

```ts
export interface AdminSecuritySettings {
  // ...existing fields unchanged...
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
}
```

`infinitePayHandle` is not a secret (it's a public merchant identifier,
like a Pix key alias) — it is shown in full on the Integrações page,
unlike the Mercado Pago token which is masked.

### `gift_contributions` (existing table)

```sql
alter table gift_contributions
  add column if not exists guest_phone text,
  add column if not exists payment_provider text not null default 'mercado_pago'
    check (payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinite_pay_order_nsu text,
  add column if not exists infinite_pay_transaction_nsu text;
```

`guest_phone` is nullable — the phone step is optional (see Section 5).
When present it's always normalized `+55XXXXXXXXXXX` (11 digits after
the country code); the guest-facing form only accepts Brazilian mobile
numbers, so a guest without one simply leaves it blank.

## 2. Payment gateway abstraction

### `PaymentGateway` port (simplified)

`getPayment` is dropped from the shared interface — Infinite Pay has no
"fetch payment by id" endpoint, so it can't honestly implement it. Only
`createPreference` is shared:

```ts
export interface CreatePreferenceInput {
  title: string;
  amount: number;
  externalReference: string;
  payerEmail?: string;
  payerPhone?: string; // new — E.164, only sent when the guest provided one
}

export interface CreatePreferenceOutput {
  preferenceId: string;
  checkoutUrl: string;
}

export interface PaymentGateway {
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput>;
}
```

`PaymentDetails`/`PaymentStatus` types are unchanged, just no longer
part of the port — they move to being MP-specific / webhook-local types
(see Section 4).

### `MercadoPagoGateway` (existing, adjusted)

- `createPreference`: unchanged except passing `payer.phone` when
  `input.payerPhone` is set (Mercado Pago's `Preference` API accepts a
  `payer.phone: { number }` object).
- `getPayment(paymentId)`: stays on the class as a concrete method (not
  part of `PaymentGateway` anymore) — it's still needed, but only by the
  Mercado Pago webhook route directly, not by any generic gateway
  consumer.

### `InfinitePayGateway` (new)

`src/infrastructure/payments/InfinitePayGateway.ts`, implements
`PaymentGateway`:

```ts
export class InfinitePayGateway implements PaymentGateway {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.infinitePayHandle) {
      throw new Error("Infinite Pay não está configurado. Configure o handle em Integrações.");
    }

    const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: settings.infinitePayHandle,
        order_nsu: input.externalReference,
        redirect_url: `${siteUrl}/presentes?status=sucesso`,
        webhook_url: `${siteUrl}/api/webhooks/infinitepay`,
        items: [{ quantity: 1, price: Math.round(input.amount * 100), description: input.title }],
        customer: input.payerEmail
          ? { name: undefined, email: input.payerEmail, phone_number: input.payerPhone }
          : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao criar o link de pagamento.`);
    }

    const result = (await response.json()) as { url?: string };
    if (!result.url) {
      throw new Error("Infinite Pay não retornou uma URL de checkout.");
    }

    return { preferenceId: input.externalReference, checkoutUrl: result.url };
  }
}
```

`preferenceId` in the output is always `input.externalReference` (which
call sites always set to `gift.id`) — Infinite Pay never gives us an id
of its own for a link, so we reuse the same one we sent as `order_nsu`,
exactly mirroring how Mercado Pago's `external_reference` is already
used as `gift.id` (see the fixed-links spec). This keeps
`RefreshGiftPaymentLinkUseCase` and `CreateGiftContributionUseCase`
provider-agnostic — neither needs to know how each provider's id came
to be.

### Resolving which gateway to use

`src/infrastructure/composition.ts` gains:

```ts
function resolvePaymentGateway(
  provider: PaymentProvider,
  gateways: { mercadoPago: MercadoPagoGateway; infinitePay: InfinitePayGateway }
): PaymentGateway {
  return provider === "mercado_pago" ? gateways.mercadoPago : gateways.infinitePay;
}
```

Both gateway instances already read fresh credentials from
`AdminSecuritySettingsRepository` on every call (existing
`MercadoPagoGateway` pattern), so there's no caching/staleness concern
across a provider switch — instantiating both eagerly in `repositories()`
is cheap and side-effect-free until a method is actually called.

Use-cases that need "the active provider's gateway" (contribution
creation, single-gift refresh, bulk generation) take the *resolved*
`PaymentGateway` plus the `PaymentProvider` value itself (since they also
need to know which pair of fields to read/write on `Gift`/
`GiftContribution`).

## 3. Link generation

### `RefreshGiftPaymentLinkUseCase` (existing, generalized)

```ts
async execute(gift: Gift, provider: PaymentProvider): Promise<Gift> {
  const preference = await this.paymentGateway.createPreference({
    title: gift.name,
    amount: gift.price,
    externalReference: gift.id!,
  });
  const giftWithLink = gift.withProviderLink(provider, preference.preferenceId, preference.checkoutUrl);
  return this.giftRepository.update(giftWithLink);
}
```

Composition passes the already-resolved gateway for the requested
provider — the use-case itself has no branching on provider beyond
which `Gift` fields to touch (handled by `withProviderLink`).

Call sites (`upsertGiftAction`, gift CSV/XLSX import) now resolve the
*currently active* provider (via
`GetAdminSecuritySettingsUseCase`) before calling `execute`, so a
name/price edit refreshes the link for whichever provider is active —
matching existing behavior when there was only one provider.

### `GenerateMissingPaymentLinksUseCase` (new)

`src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.ts`:

```ts
export interface GenerateMissingPaymentLinksResult {
  generated: number;
  failed: { giftId: string; giftName: string; reason: string }[];
}

export class GenerateMissingPaymentLinksUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly refreshGiftPaymentLinkUseCase: RefreshGiftPaymentLinkUseCase
  ) {}

  async execute(provider: PaymentProvider): Promise<GenerateMissingPaymentLinksResult> {
    const gifts = await this.giftRepository.findAll();
    const missing = gifts.filter((gift) => !gift.hasLinkFor(provider));

    let generated = 0;
    const failed: GenerateMissingPaymentLinksResult["failed"] = [];

    for (const gift of missing) {
      try {
        await this.refreshGiftPaymentLinkUseCase.execute(gift, provider);
        generated++;
      } catch (error) {
        failed.push({ giftId: gift.id!, giftName: gift.name, reason: error instanceof Error ? error.message : "Erro desconhecido" });
      }
    }

    return { generated, failed };
  }
}
```

Best-effort, sequential (gift counts here are small — dozens, not
thousands — so no batching/concurrency is needed). One failing gift
never stops the rest.

Used by:

1. **`UpdateActivePaymentProviderUseCase`** (new) — after persisting the
   provider switch, calls this use-case for the newly active provider
   and returns its result alongside the saved settings, so the
   Integrações page can show "12 links gerados, 2 falharam" immediately.
2. **A manual "Gerar links pendentes" Server Action** on the Presentes
   list page, for the *currently* active provider — lets the admin retry
   without touching the provider selection at all.

### Manual per-gift generation

A new Server Action `generatePaymentLinkAction(giftId)` on the gift edit
page calls `RefreshGiftPaymentLinkUseCase.execute(gift, activeProvider)`
directly — unlike the automatic name/price-change refresh, this ignores
whether name/price changed, so the admin can force a (re)generation any
time (e.g. after a transient Infinite Pay API failure).

## 4. Payment confirmation (webhooks)

### `ConfirmGiftPaymentUseCase` (existing, generalized)

Stops calling `paymentGateway.getPayment()` itself — instead it
receives an already-resolved payment result. This lets both webhook
routes share all the approve/reject/gift-update/email logic without the
use-case needing to know how each provider's status was obtained:

```ts
export interface ConfirmedPayment {
  paymentReference: string; // Mercado Pago payment id, or Infinite Pay transaction_nsu
  status: "approved" | "rejected";
  giftId: string; // resolved from external_reference / order_nsu by the caller
  paidAmount?: number; // only set by providers with no authoritative status API (Infinite Pay) — see below
}

export interface ConfirmGiftPaymentInput {
  payment: ConfirmedPayment;
}

export class ConfirmGiftPaymentUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(input: ConfirmGiftPaymentInput): Promise<GiftContribution | null> {
    const contribution = await this.giftContributionRepository.findPendingByGiftId(input.payment.giftId);
    if (!contribution) return null;

    if (input.payment.status === "approved" && input.payment.paidAmount !== undefined
        && input.payment.paidAmount !== contribution.amount) {
      console.error(`Payment amount mismatch for contribution ${contribution.id}: expected ${contribution.amount}, got ${input.payment.paidAmount}`);
      return contribution; // never approve on a mismatched amount — leave it pending
    }

    const gift = await this.giftRepository.findById(contribution.giftId);

    if (input.payment.status === "approved") {
      const updated = await this.giftContributionRepository.update(contribution.approve(input.payment.paymentReference));
      if (gift) await this.giftRepository.update(gift.markAsPaid());
      await this.sendThankYouEmail(updated, gift?.name ?? "seu presente");
      return updated;
    }

    const updated = await this.giftContributionRepository.update(contribution.reject(input.payment.paymentReference));
    if (gift) await this.giftRepository.update(gift.releaseToAvailable());
    return updated;
  }

  // sendThankYouEmail unchanged
}
```

The `"pending"` early-return branch (on payment status) is dropped —
both webhook routes now only call this use-case once they've already
decided the payment is final (approved or rejected), since neither
provider's webhook fires for an in-progress payment. The amount-mismatch
check is the "correspondence validation" the couple approved for
Infinite Pay; Mercado Pago never sets `paidAmount` since its own
`getPayment` call is already authoritative, so the check is skipped for
that provider.

### `/api/webhooks/mercadopago` (existing, adjusted)

Still parses `type`/`data.id`, still calls `MercadoPagoGateway.getPayment(paymentId)`
directly (via a new composition helper `createMercadoPagoGateway()`,
since it's no longer part of the generic resolved-gateway path) to get
authoritative status + `external_reference`. If status is `"pending"`,
the route returns 200 without calling `ConfirmGiftPaymentUseCase` at
all (replacing the use-case's old pending branch). Otherwise it builds
`{ paymentReference: payment.paymentId, status: payment.status === "approved" ? "approved" : "rejected", giftId: payment.externalReference }`
and calls the use-case.

### `/api/webhooks/infinitepay` (new)

`src/app/api/webhooks/infinitepay/route.ts`:

```ts
export async function POST(request: Request) {
  let body: { order_nsu?: string; transaction_nsu?: string; paid_amount?: number };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const { order_nsu, transaction_nsu, paid_amount } = body;
  if (!order_nsu || !transaction_nsu || typeof paid_amount !== "number") {
    return new Response("Missing required fields", { status: 400 });
  }

  try {
    // paid_amount arrives in cents; ConfirmGiftPaymentUseCase compares it
    // against the contribution's stored amount (in currency units) — convert here.
    await createConfirmGiftPaymentUseCase().execute({
      payment: {
        paymentReference: transaction_nsu,
        status: "approved",
        giftId: order_nsu,
        paidAmount: paid_amount / 100,
      },
    });

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Failed to process Infinite Pay webhook", error);
    return new Response("error", { status: 500 });
  }
}
```

`ConfirmGiftPaymentUseCase.execute` already no-ops (returns `null`) when
`order_nsu` doesn't resolve to any pending contribution, and already
refuses to approve when `paidAmount` doesn't match — so this route
doesn't need its own gift lookup or amount comparison. This is the
"correspondence validation" the couple approved: no signature check
exists, so authenticity is established by requiring the `order_nsu` to
resolve to a real pending contribution and the amount to match before
anything is marked paid. Infinite Pay's webhook has no documented
"rejected" case (it only fires on completed payment), so this route
never calls the use-case with `status: "rejected"` — unlike Mercado
Pago, there's no separate decline notification to handle.

## 5. Guest phone number

### `GiftDetailsModal`

Both forms ("Presentear agora" and "Reservar para depois") gain an
**optional** phone field between email and the submit button:

```tsx
<label htmlFor={`guestPhone-now-${gift.id}`} className="font-sans text-xs text-forest/70">
  Telefone (opcional)
</label>
<input
  id={`guestPhone-now-${gift.id}`}
  name="guestPhone"
  type="tel"
  placeholder="(11) 91234-5678"
  className={fieldClassName}
  onChange={(event) => (event.target.value = formatBrazilianPhoneMask(event.target.value))}
/>
```

`formatBrazilianPhoneMask` — new pure function in
`src/shared/utils/phoneMask.ts` — formats digits-as-typed into
`(XX)XXXXX-XXXX` incrementally (same family of utility as
`formatCurrency`, no library dependency). A guest with a non-Brazilian
number simply leaves the field blank; nothing blocks submission.

### Server Actions

`createGiftContributionAction` / `reserveGiftForLaterAction`
(`src/app/presentes/actions.ts`) read the new optional `guestPhone`
field. Before passing it down, a second new utility,
`normalizePhoneToE164(masked: string): string | null`, strips
non-digits and prepends `+55`; returns `null` if the field was empty or
doesn't have exactly 11 digits (defensive — never store a malformed
number). `CreateGiftContributionInput` gains `guestPhone?: string |
null`, threaded into `GiftContribution.create({ ..., guestPhone })` and
into the `payerPhone` field of the `createPreference` call so the active
gateway can forward it to whichever provider is in use. When
`guestPhone` is `null`, `payerPhone` is simply omitted — both gateways
already treat it as optional.

## 6. Admin UI

### Integrações page (`/admin/integracoes`)

New `PaymentProviderForm` component, placed above the existing
`MercadoPagoTokenForm`:

- A two-option selector (radio buttons: "Mercado Pago" / "Infinite
  Pay"), defaulting to the currently active provider.
- When "Infinite Pay" is selected, a single text field "Handle
  (InfiniteTag)" appears, pre-filled with the stored value if any (not
  masked — it's a public identifier).
- Submitting calls a new Server Action `updatePaymentProviderAction`,
  which calls `UpdateActivePaymentProviderUseCase`. On success it shows
  "Provedor atualizado para Infinite Pay. 12 links gerados, 2 falharam."
  (or "Todos os presentes já tinham link — nada a gerar." when nothing
  was missing), listing failed gift names if any, and revalidates
  `/admin/presentes`, `/admin/dashboard`, and every gift edit page (via
  `revalidatePath("/admin/presentes/[id]", "page")`, which Next.js
  supports for revalidating a whole dynamic-route type at once).
- The existing `MercadoPagoTokenForm` is unchanged and always visible
  (its own token can still be edited regardless of which provider is
  currently active — switching back to it later shouldn't require
  re-entering the token).

### Presentes list (`GiftsTable` + list page)

- New "Link" column: a badge "Gerado" (moss/green, matching existing
  status badge styling) or "Sem link" (muted/red) per gift, computed
  from a new `hasPaymentLink: boolean` prop the server page passes down
  (`gift.hasLinkFor(activeProvider)`).
- New "Gerar links pendentes" button above the table (only rendered
  when at least one visible gift is missing a link), calling a Server
  Action `generateMissingPaymentLinksAction()` that runs
  `GenerateMissingPaymentLinksUseCase` for the active provider and shows
  the same "X gerados, Y falharam" summary.

### Gift edit page (`GiftForm`)

- The existing read-only checkout-URL display now shows **only** the
  link for the currently active provider (per the couple's explicit
  requirement) — the page passes `checkoutUrl={gift.checkoutUrlFor(activeProvider)}`
  instead of the old hardcoded `gift.mercadoPagoCheckoutUrl`.
- New "Gerar link de pagamento" button next to that field, always
  visible (whether or not a link already exists — lets the admin force
  a regeneration), calling `generatePaymentLinkAction(giftId)`.

## 7. Error handling

- `InfinitePayGateway.createPreference` and `MercadoPagoGateway.createPreference`
  failures during `GenerateMissingPaymentLinksUseCase` are caught
  per-gift and reported in the summary — never abort the batch.
- `InfinitePayGateway.createPreference` failing during the **guest-facing**
  checkout flow (`CreateGiftContributionUseCase`, fallback path when a
  gift has no link yet) surfaces as a user-facing error on the modal
  form, same as the existing Mercado Pago behavior — a guest should
  never be silently stuck.
- Switching to Infinite Pay without a handle configured is rejected by
  `UpdateActivePaymentProviderUseCase` before saving anything ("Informe
  o handle da Infinite Pay antes de ativar este provedor.").
- The Infinite Pay webhook route always returns `200` for a
  successfully *parsed* request, even when the amount doesn't match or
  `order_nsu` doesn't resolve to a pending contribution — there is no
  known safe way to signal "retry this" vs. "reject this" to Infinite
  Pay, so treating every parseable webhook as handled (with mismatches
  only logged, inside `ConfirmGiftPaymentUseCase`) avoids an unbounded
  retry loop against an unrecognized/adversarial `order_nsu`. Only
  actual processing errors (network/database failures) return `500`.
- `normalizePhoneToE164` never throws — a malformed phone silently
  becomes `null` rather than blocking checkout, consistent with the
  field being optional.

## 8. Testing

- `Gift.checkoutUrlFor` / `hasLinkFor` / `withProviderLink`: unit tests
  covering both providers independently, and confirming one provider's
  link is untouched when writing the other's.
- `GiftContribution.withProviderReference` / `approve` / `reject`: unit
  tests confirming the correct pair of fields is written based on
  `paymentProvider`, and the other provider's fields stay `undefined`.
- `RefreshGiftPaymentLinkUseCase`: extend existing tests to cover both
  providers with a fake `PaymentGateway`.
- `GenerateMissingPaymentLinksUseCase`: unit tests — all gifts already
  linked (zero calls to the gateway), some missing (only those
  refreshed), one failing gift (reported in `failed`, others still
  succeed).
- `ConfirmGiftPaymentUseCase`: update existing Mercado Pago tests to the
  new `{ payment: ConfirmedPayment }` input shape; add Infinite Pay
  equivalents (same approve/reject/email assertions, different
  `paymentReference` field populated).
- `InfinitePayGateway`: unit tests against a mocked `fetch` — success
  shape, missing handle, non-2xx response, missing `url` in response.
- `/api/webhooks/infinitepay` route: integration-style tests (matching
  the existing Mercado Pago webhook route test style) for: matching
  amount → approved; mismatched amount → 200, not approved; unknown
  `order_nsu` → 200, no-op; malformed body → 400.
- `formatBrazilianPhoneMask` / `normalizePhoneToE164`: unit tests for
  partial input while typing, full valid number, and empty/invalid
  input producing `null`.
- `PaymentProviderForm` / `GiftsTable` "Link" column / `GiftForm`
  generate-link button: component tests for both provider states
  (Mercado Pago selected vs. Infinite Pay selected) and the
  generated/missing badge.

## What this does NOT do

- Does not support any provider beyond these two, and does not build a
  generic "provider registry" — the two provider names are hardcoded
  throughout (`PaymentProvider` union, explicit branches), matching
  YAGNI: a third provider is not a stated requirement.
- Does not migrate or delete any existing Mercado Pago data — every
  gift/contribution that only ever used Mercado Pago keeps working
  exactly as before, with the new Infinite Pay columns simply `null`.
- Does not add rate limiting, retry/backoff, or a job queue around bulk
  link generation — gift counts are small enough (dozens) that a single
  sequential pass in one request is acceptable, consistent with this
  project's existing scale.
- Does not attempt cryptographic verification of Infinite Pay webhooks
  (no mechanism is publicly documented) — mitigated by amount/order
  correspondence checking only, an explicitly accepted trade-off.
- Does not require the guest phone number, and does not validate
  non-Brazilian phone formats — a guest without a compatible number just
  leaves it blank, and checkout proceeds exactly as it does today.
- Does not change the public "Presentear" page's rendering
  (`GiftCard`/`GiftGrid`) — the provider is entirely a backend/admin
  concern from the guest's perspective, aside from the new optional
  phone field in the modal.
