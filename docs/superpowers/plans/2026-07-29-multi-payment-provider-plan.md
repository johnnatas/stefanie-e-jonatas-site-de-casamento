# Multi Payment Provider (Mercado Pago + Infinite Pay) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin choose an active payment provider (Mercado Pago or
Infinite Pay), generate/track per-gift checkout links for each provider,
confirm Infinite Pay payments via webhook, and let guests optionally leave a
phone number that's forwarded to the active provider's checkout.

**Architecture:** Extends the existing Clean/Hexagonal layering. `Gift` and
`GiftContribution` domain entities gain provider-aware fields and helpers.
The `PaymentGateway` port is trimmed to just `createPreference`; a new
`InfinitePayGateway` sits alongside the existing `MercadoPagoGateway`. A
`resolvePaymentGateway(provider)` helper in the composition root maps a
`PaymentProvider` to the right adapter. Payment confirmation is generalized
so both Mercado Pago's webhook (which still calls `getPayment` itself,
authoritative) and Infinite Pay's webhook (which cannot — no such endpoint
exists — so it's validated by amount/order correspondence instead) share the
same approve/reject/email logic.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), Vitest +
Testing Library, no new npm dependencies (Infinite Pay is called via the
built-in `fetch`).

**Full design reference:** `docs/superpowers/specs/2026-07-29-multi-payment-provider-design.md`
— read it once for the "why"; this plan carries the "how" (exact code, file
paths, test content). Where this plan and the spec ever disagree on a fine
detail, this plan is the more recently refined and correct one (a few gaps
in the spec's webhook design were tightened while writing these tasks — see
Task 10/11 notes).

## Global Constraints

- Never delete, rename, or repurpose any existing Mercado Pago field, column,
  or behavior — every new field is additive. Gifts/contributions that only
  ever used Mercado Pago must keep working exactly as before.
- `PaymentProvider = "mercado_pago" | "infinite_pay"` — hardcode exactly
  these two, no generic provider registry (YAGNI — a third provider is not a
  requirement).
- The guest phone field is **optional**. Never require it, never block
  checkout on a missing or malformed phone number — an invalid/empty phone
  always normalizes to `null`, never throws.
- Bulk link generation (`GenerateMissingPaymentLinksUseCase`) is best-effort
  and sequential: one gift's failure is recorded and must never stop the
  rest from being attempted.
- The Infinite Pay webhook has no documented signature/secret. Authenticity
  is established only by requiring `order_nsu` to resolve to a real pending
  contribution and the paid amount to exactly match — implemented inside
  `ConfirmGiftPaymentUseCase`, not duplicated in the route.
- Money amounts: `Gift.price` / `GiftContribution.amount` are stored as
  currency units (reais, e.g. `450` = R$450,00) everywhere in the domain and
  application layers, exactly like today. Infinite Pay's API uses **cents**
  — conversion happens only at the `InfinitePayGateway` boundary (currency
  units → cents when calling their API) and in the Infinite Pay webhook
  route (cents → currency units when reading `paid_amount`). Never let cents
  leak past those two conversion points.
- Run `npx vitest run` after every task and confirm it passes before
  committing.

---

### Task 1: `PaymentProvider` type and `Gift` entity provider helpers

**Files:**
- Create: `src/domain/entities/PaymentProvider.ts`
- Modify: `src/domain/entities/Gift.ts`
- Test: `src/domain/entities/Gift.test.ts`

**Interfaces:**
- Produces: `PaymentProvider` type (`"mercado_pago" | "infinite_pay"`),
  imported by every later task that touches `Gift`, `GiftContribution`, or
  `AdminSecuritySettings`.
- Produces on `Gift`: `infinitePayOrderNsu?: string`,
  `infinitePayCheckoutUrl: string | null` props; methods
  `checkoutUrlFor(provider)`, `providerReferenceIdFor(provider)`,
  `hasLinkFor(provider)`, `withProviderLink(provider, referenceId, checkoutUrl)`.

- [ ] **Step 1: Write the failing test for `PaymentProvider` usage on `Gift`**

Append to `src/domain/entities/Gift.test.ts` (read the existing file first to
match its style — it uses `Gift.create` fixtures and `describe`/`it`):

```ts
describe("Gift payment provider helpers", () => {
  function makeGift(overrides = {}) {
    return Gift.create({
      name: "Jogo de panelas",
      description: "desc",
      imageUrl: null,
      price: 200,
      category: "cozinha",
      ...overrides,
    });
  }

  it("has no link for either provider by default", () => {
    const gift = makeGift();
    expect(gift.hasLinkFor("mercado_pago")).toBe(false);
    expect(gift.hasLinkFor("infinite_pay")).toBe(false);
    expect(gift.checkoutUrlFor("mercado_pago")).toBeNull();
    expect(gift.checkoutUrlFor("infinite_pay")).toBeNull();
    expect(gift.providerReferenceIdFor("mercado_pago")).toBeUndefined();
    expect(gift.providerReferenceIdFor("infinite_pay")).toBeUndefined();
  });

  it("withProviderLink writes only the given provider's fields, leaving the other untouched", () => {
    const withMp = makeGift().withProviderLink("mercado_pago", "pref-1", "https://mp.test/checkout/1");
    expect(withMp.hasLinkFor("mercado_pago")).toBe(true);
    expect(withMp.checkoutUrlFor("mercado_pago")).toBe("https://mp.test/checkout/1");
    expect(withMp.providerReferenceIdFor("mercado_pago")).toBe("pref-1");
    expect(withMp.hasLinkFor("infinite_pay")).toBe(false);

    const withBoth = withMp.withProviderLink("infinite_pay", "order-1", "https://infinitepay.test/checkout/1");
    expect(withBoth.hasLinkFor("mercado_pago")).toBe(true);
    expect(withBoth.checkoutUrlFor("mercado_pago")).toBe("https://mp.test/checkout/1");
    expect(withBoth.hasLinkFor("infinite_pay")).toBe(true);
    expect(withBoth.checkoutUrlFor("infinite_pay")).toBe("https://infinitepay.test/checkout/1");
    expect(withBoth.providerReferenceIdFor("infinite_pay")).toBe("order-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/entities/Gift.test.ts`
Expected: FAIL — `checkoutUrlFor`/`hasLinkFor`/`withProviderLink`/`providerReferenceIdFor` are not functions.

- [ ] **Step 3: Create `PaymentProvider.ts`**

```ts
export type PaymentProvider = "mercado_pago" | "infinite_pay";
```

- [ ] **Step 4: Extend `Gift.ts`**

In `src/domain/entities/Gift.ts`, add the import and extend `GiftProps`,
the class fields, the constructor, and add the four new methods:

```ts
import { PaymentProvider } from "@/domain/entities/PaymentProvider";
```

```ts
export interface GiftProps {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
  status?: GiftStatus;
  reservedUntil?: Date | null;
  mercadoPagoPreferenceId?: string;
  mercadoPagoCheckoutUrl?: string | null;
  infinitePayOrderNsu?: string;
  infinitePayCheckoutUrl?: string | null;
  createdAt?: Date;
}
```

Class fields (added alongside the existing `mercadoPago*` ones):

```ts
readonly infinitePayOrderNsu?: string;
readonly infinitePayCheckoutUrl: string | null;
```

Constructor body (added alongside the existing `mercadoPago*` assignments):

```ts
this.infinitePayOrderNsu = props.infinitePayOrderNsu;
this.infinitePayCheckoutUrl = props.infinitePayCheckoutUrl ?? null;
```

New methods, added after `releaseToAvailable()`:

```ts
checkoutUrlFor(provider: PaymentProvider): string | null {
  return provider === "mercado_pago" ? this.mercadoPagoCheckoutUrl : this.infinitePayCheckoutUrl;
}

providerReferenceIdFor(provider: PaymentProvider): string | undefined {
  return provider === "mercado_pago" ? this.mercadoPagoPreferenceId : this.infinitePayOrderNsu;
}

hasLinkFor(provider: PaymentProvider): boolean {
  return this.checkoutUrlFor(provider) !== null;
}

withProviderLink(provider: PaymentProvider, referenceId: string, checkoutUrl: string): Gift {
  return provider === "mercado_pago"
    ? new Gift({ ...this, mercadoPagoPreferenceId: referenceId, mercadoPagoCheckoutUrl: checkoutUrl })
    : new Gift({ ...this, infinitePayOrderNsu: referenceId, infinitePayCheckoutUrl: checkoutUrl });
}
```

Note: `withProviderLink` calls `new Gift(...)` directly (the constructor is
`private`, but this is a method of the same class, so it's allowed) rather
than `Gift.create(...)`, to skip re-running name/price/category validation
on data that's already valid — same pattern `reserve()`/`markAsPaid()`
already use.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/domain/entities/Gift.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/PaymentProvider.ts src/domain/entities/Gift.ts src/domain/entities/Gift.test.ts
git commit -m "feat: add PaymentProvider type and Gift provider-link helpers"
```

---

### Task 2: `GiftContribution` entity provider awareness + guest phone

**Files:**
- Modify: `src/domain/entities/GiftContribution.ts`
- Test: `src/domain/entities/GiftContribution.test.ts`

**Interfaces:**
- Consumes: `PaymentProvider` from Task 1.
- Produces: `guestPhone?: string | null` prop; `paymentProvider: PaymentProvider`
  (defaults `"mercado_pago"`); `infinitePayOrderNsu?: string`,
  `infinitePayTransactionNsu?: string` props; `withProviderReference(provider, referenceId)`
  replacing `withPreference`; `approve(paymentReference)` / `reject(paymentReference)`
  keep their existing signature but branch on `this.paymentProvider` internally.

- [ ] **Step 1: Write the failing tests**

Read `src/domain/entities/GiftContribution.test.ts` first to match its
existing style, then add:

```ts
describe("GiftContribution payment provider handling", () => {
  function makeContribution(overrides = {}) {
    return GiftContribution.create({
      giftId: "gift-1",
      guestName: "Ana Souza",
      guestEmail: "ana@example.com",
      amount: 200,
      ...overrides,
    });
  }

  it("defaults to the mercado_pago provider and no phone", () => {
    const contribution = makeContribution();
    expect(contribution.paymentProvider).toBe("mercado_pago");
    expect(contribution.guestPhone).toBeNull();
  });

  it("stores the guest phone when provided", () => {
    const contribution = makeContribution({ guestPhone: "+5511987654321" });
    expect(contribution.guestPhone).toBe("+5511987654321");
  });

  it("withProviderReference writes only the given provider's reference field", () => {
    const withMp = makeContribution().withProviderReference("mercado_pago", "pref-1");
    expect(withMp.paymentProvider).toBe("mercado_pago");
    expect(withMp.mercadoPagoPreferenceId).toBe("pref-1");
    expect(withMp.infinitePayOrderNsu).toBeUndefined();

    const withIp = makeContribution().withProviderReference("infinite_pay", "order-1");
    expect(withIp.paymentProvider).toBe("infinite_pay");
    expect(withIp.infinitePayOrderNsu).toBe("order-1");
    expect(withIp.mercadoPagoPreferenceId).toBeUndefined();
  });

  it("approve writes the payment reference into the field matching the contribution's provider", () => {
    const mpApproved = makeContribution({ paymentProvider: "mercado_pago" }).approve("payment-1");
    expect(mpApproved.status).toBe("approved");
    expect(mpApproved.mercadoPagoPaymentId).toBe("payment-1");
    expect(mpApproved.infinitePayTransactionNsu).toBeUndefined();

    const ipApproved = makeContribution({ paymentProvider: "infinite_pay" }).approve("transaction-1");
    expect(ipApproved.status).toBe("approved");
    expect(ipApproved.infinitePayTransactionNsu).toBe("transaction-1");
    expect(ipApproved.mercadoPagoPaymentId).toBeUndefined();
  });

  it("reject writes the payment reference into the field matching the contribution's provider", () => {
    const ipRejected = makeContribution({ paymentProvider: "infinite_pay" }).reject("transaction-2");
    expect(ipRejected.status).toBe("rejected");
    expect(ipRejected.infinitePayTransactionNsu).toBe("transaction-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/entities/GiftContribution.test.ts`
Expected: FAIL — `paymentProvider`/`guestPhone` undefined, `withProviderReference` not a function.

- [ ] **Step 3: Update `GiftContribution.ts`**

```ts
import { InvalidContributionDataError } from "@/domain/errors/DomainError";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export type ContributionStatus = "pending" | "approved" | "rejected" | "expired";

export interface GiftContributionProps {
  id?: string;
  giftId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  amount: number;
  status?: ContributionStatus;
  paymentProvider?: PaymentProvider;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  infinitePayOrderNsu?: string;
  infinitePayTransactionNsu?: string;
  expectedPaymentDate?: Date | null;
  createdAt?: Date;
}

export class GiftContribution {
  readonly id?: string;
  readonly giftId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone: string | null;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly paymentProvider: PaymentProvider;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoPaymentId?: string;
  readonly infinitePayOrderNsu?: string;
  readonly infinitePayTransactionNsu?: string;
  readonly expectedPaymentDate: Date | null;
  readonly createdAt: Date;

  private constructor(props: GiftContributionProps) {
    this.id = props.id;
    this.giftId = props.giftId;
    this.guestName = props.guestName.trim();
    this.guestEmail = props.guestEmail.trim().toLowerCase();
    this.guestPhone = props.guestPhone ?? null;
    this.amount = props.amount;
    this.status = props.status ?? "pending";
    this.paymentProvider = props.paymentProvider ?? "mercado_pago";
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoPaymentId = props.mercadoPagoPaymentId;
    this.infinitePayOrderNsu = props.infinitePayOrderNsu;
    this.infinitePayTransactionNsu = props.infinitePayTransactionNsu;
    this.expectedPaymentDate = props.expectedPaymentDate ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GiftContributionProps): GiftContribution {
    if (!props.giftId) {
      throw new InvalidContributionDataError("Gift contribution must reference a gift.");
    }

    if (!props.guestName || props.guestName.trim().length < 3) {
      throw new InvalidContributionDataError("Guest name must have at least 3 characters.");
    }

    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new InvalidContributionDataError("Contribution amount must be a positive number.");
    }

    return new GiftContribution(props);
  }

  withProviderReference(provider: PaymentProvider, referenceId: string): GiftContribution {
    return provider === "mercado_pago"
      ? new GiftContribution({ ...this, paymentProvider: provider, mercadoPagoPreferenceId: referenceId })
      : new GiftContribution({ ...this, paymentProvider: provider, infinitePayOrderNsu: referenceId });
  }

  approve(paymentReference: string): GiftContribution {
    return this.paymentProvider === "infinite_pay"
      ? new GiftContribution({ ...this, status: "approved", infinitePayTransactionNsu: paymentReference })
      : new GiftContribution({ ...this, status: "approved", mercadoPagoPaymentId: paymentReference });
  }

  reject(paymentReference: string): GiftContribution {
    return this.paymentProvider === "infinite_pay"
      ? new GiftContribution({ ...this, status: "rejected", infinitePayTransactionNsu: paymentReference })
      : new GiftContribution({ ...this, status: "rejected", mercadoPagoPaymentId: paymentReference });
  }

  expire(): GiftContribution {
    return new GiftContribution({ ...this, status: "expired" });
  }
}
```

`withPreference` is removed entirely (replaced by `withProviderReference`) —
grep the codebase for `.withPreference(` after this step; any remaining
call sites are handled by Task 12 (`CreateGiftContributionUseCase`), not
missed here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/entities/GiftContribution.test.ts`
Expected: PASS (the rest of the codebase will not compile yet until Task 12 —
that's expected and fixed there; this task's own test file passes in isolation).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/GiftContribution.ts src/domain/entities/GiftContribution.test.ts
git commit -m "feat: add provider-aware references and guest phone to GiftContribution"
```

---

### Task 3: Database migration

**Files:**
- Create: `supabase/migrations/0008_multi_payment_provider.sql`

No app code in this task — pure schema. Not run against Vitest; verified by
inspection and by later tasks' Supabase repository code compiling against
these exact column names.

- [ ] **Step 1: Write the migration**

```sql
alter table gifts
  add column if not exists infinite_pay_order_nsu text,
  add column if not exists infinite_pay_checkout_url text;

alter table gift_contributions
  add column if not exists guest_phone text,
  add column if not exists payment_provider text not null default 'mercado_pago'
    check (payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinite_pay_order_nsu text,
  add column if not exists infinite_pay_transaction_nsu text;

alter table admin_security_settings
  add column if not exists active_payment_provider text not null default 'mercado_pago'
    check (active_payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinitepay_handle text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0008_multi_payment_provider.sql
git commit -m "feat: add multi payment provider columns to gifts, gift_contributions, admin_security_settings"
```

Applying this migration to the actual Supabase project (QA/prod) happens at
deploy time, following this project's existing migration-apply workflow —
not part of this plan's task loop.

---

### Task 4: `AdminSecuritySettings` — active provider + Infinite Pay handle

**Files:**
- Modify: `src/domain/repositories/AdminSecuritySettingsRepository.ts`
- Modify: `src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts`
- Modify: `src/application/testing/InMemoryAdminSecuritySettingsRepository.ts`
- Modify: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts`
- Test: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts` (create if it doesn't exist — check first)

**Interfaces:**
- Consumes: `PaymentProvider` from Task 1.
- Produces: `AdminSecuritySettings.activePaymentProvider: PaymentProvider`,
  `AdminSecuritySettings.infinitePayHandle: string | null`;
  `AdminSecuritySettingsRepository.updateActivePaymentProvider(provider)`,
  `AdminSecuritySettingsRepository.updateInfinitePayHandle(handle)`;
  `AdminSecuritySettingsSummary.activePaymentProvider`,
  `AdminSecuritySettingsSummary.infinitePayHandle` (shown in full, not masked
  — it's a public merchant identifier, unlike the Mercado Pago token).

- [ ] **Step 1: Check for an existing `GetAdminSecuritySettingsUseCase.test.ts`**

Run: `ls src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
If it doesn't exist, this task creates it. If it does, extend it — read it
first to match its style.

- [ ] **Step 2: Write the failing test**

Create (or extend) `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";

describe("GetAdminSecuritySettingsUseCase", () => {
  it("defaults to mercado_pago with no Infinite Pay handle configured", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.activePaymentProvider).toBe("mercado_pago");
    expect(summary.infinitePayHandle).toBeNull();
  });

  it("reflects a stored active provider and handle", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateActivePaymentProvider("infinite_pay");
    await repository.updateInfinitePayHandle("meu_handle");

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.activePaymentProvider).toBe("infinite_pay");
    expect(summary.infinitePayHandle).toBe("meu_handle");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
Expected: FAIL — `updateActivePaymentProvider` is not a function on the in-memory repository, `activePaymentProvider` undefined on the summary.

- [ ] **Step 4: Extend the domain repository interface**

In `src/domain/repositories/AdminSecuritySettingsRepository.ts`:

```ts
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export interface AdminSecuritySettings {
  mercadoPagoAccessToken: string | null;
  priceChangeSecretHash: string | null;
  priceChangeSecretSalt: string | null;
  resendApiKey: string | null;
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
}

export interface SecretResetToken {
  hash: string;
  salt: string;
  expiresAt: Date;
}

export interface AdminSecuritySettingsRepository {
  getSettings(): Promise<AdminSecuritySettings>;
  updateMercadoPagoAccessToken(token: string): Promise<void>;
  updateSecretKeyHash(hash: string, salt: string): Promise<void>;
  updateResendApiKey(key: string): Promise<void>;
  updateActivePaymentProvider(provider: PaymentProvider): Promise<void>;
  updateInfinitePayHandle(handle: string): Promise<void>;
  setSecretResetToken(hash: string, salt: string, expiresAt: Date): Promise<void>;
  getSecretResetToken(): Promise<SecretResetToken | null>;
  clearSecretResetToken(): Promise<void>;
}
```

- [ ] **Step 5: Update `InMemoryAdminSecuritySettingsRepository`**

```ts
private settings: AdminSecuritySettings = {
  mercadoPagoAccessToken: null,
  priceChangeSecretHash: null,
  priceChangeSecretSalt: null,
  resendApiKey: null,
  activePaymentProvider: "mercado_pago",
  infinitePayHandle: null,
};
```

Add two methods (alongside `updateResendApiKey`):

```ts
async updateActivePaymentProvider(provider: PaymentProvider): Promise<void> {
  this.settings.activePaymentProvider = provider;
}

async updateInfinitePayHandle(handle: string): Promise<void> {
  this.settings.infinitePayHandle = handle;
}
```

Add the import: `import { PaymentProvider } from "@/domain/entities/PaymentProvider";`

- [ ] **Step 6: Update `SupabaseAdminSecuritySettingsRepository`**

Extend `SettingsRow` and `getSettings`:

```ts
interface SettingsRow {
  mercadopago_access_token: string | null;
  price_change_secret_hash: string | null;
  price_change_secret_salt: string | null;
  resend_api_key: string | null;
  active_payment_provider: PaymentProvider;
  infinitepay_handle: string | null;
}
```

```ts
async getSettings(): Promise<AdminSecuritySettings> {
  const { data, error } = await this.client
    .from("admin_security_settings")
    .select(
      "mercadopago_access_token, price_change_secret_hash, price_change_secret_salt, resend_api_key, active_payment_provider, infinitepay_handle"
    )
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(`Failed to load admin security settings: ${error.message}`);
  }

  const row = data as SettingsRow;
  return {
    mercadoPagoAccessToken: row.mercadopago_access_token,
    priceChangeSecretHash: row.price_change_secret_hash,
    priceChangeSecretSalt: row.price_change_secret_salt,
    resendApiKey: row.resend_api_key,
    activePaymentProvider: row.active_payment_provider,
    infinitePayHandle: row.infinitepay_handle,
  };
}
```

Add two new methods (alongside `updateResendApiKey`):

```ts
async updateActivePaymentProvider(provider: PaymentProvider): Promise<void> {
  const { error } = await this.client
    .from("admin_security_settings")
    .update({ active_payment_provider: provider, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    throw new Error(`Failed to update active payment provider: ${error.message}`);
  }
}

async updateInfinitePayHandle(handle: string): Promise<void> {
  const { error } = await this.client
    .from("admin_security_settings")
    .update({ infinitepay_handle: handle, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    throw new Error(`Failed to update Infinite Pay handle: ${error.message}`);
  }
}
```

Add the import: `import { PaymentProvider } from "@/domain/entities/PaymentProvider";`

- [ ] **Step 7: Extend `GetAdminSecuritySettingsUseCase`**

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export interface AdminSecuritySettingsSummary {
  mercadoPagoAccessTokenLast4: string | null;
  resendApiKeyLast4: string | null;
  hasSecretKey: boolean;
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
}

export class GetAdminSecuritySettingsUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(): Promise<AdminSecuritySettingsSummary> {
    const settings = await this.securitySettingsRepository.getSettings();
    return {
      mercadoPagoAccessTokenLast4: settings.mercadoPagoAccessToken
        ? settings.mercadoPagoAccessToken.slice(-4)
        : null,
      resendApiKeyLast4: settings.resendApiKey ? settings.resendApiKey.slice(-4) : null,
      hasSecretKey: Boolean(settings.priceChangeSecretHash),
      activePaymentProvider: settings.activePaymentProvider,
      infinitePayHandle: settings.infinitePayHandle,
    };
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/domain/repositories/AdminSecuritySettingsRepository.ts src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts src/application/testing/InMemoryAdminSecuritySettingsRepository.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts
git commit -m "feat: track active payment provider and Infinite Pay handle in admin security settings"
```

---

### Task 5: `Gift`/`GiftContribution` Supabase repository column mapping

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGiftRepository.ts`
- Modify: `src/infrastructure/supabase/SupabaseGiftContributionRepository.ts`

**Interfaces:**
- Consumes: `Gift`/`GiftContribution` fields from Tasks 1–2, migration
  columns from Task 3.
- Produces: nothing new for other tasks — this is a leaf mapping task, no
  in-memory fake needed (repositories under test use the in-memory fakes,
  not this Supabase implementation).

No unit test — this class has no existing test file (Supabase repositories
are integration-tested manually / via the app running against real Supabase,
consistent with the rest of this codebase's pattern for these classes).
Correctness here is verified by TypeScript compilation matching the
`Gift`/`GiftContribution` entity shapes from Tasks 1–2.

- [ ] **Step 1: Update `SupabaseGiftRepository.ts`**

Extend `GiftRow` and `toEntity`:

```ts
interface GiftRow {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  category: string;
  status: GiftStatus;
  reserved_until: string | null;
  mercado_pago_preference_id: string | null;
  mercado_pago_checkout_url: string | null;
  infinite_pay_order_nsu: string | null;
  infinite_pay_checkout_url: string | null;
  created_at: string;
}

function toEntity(row: GiftRow): Gift {
  return Gift.create({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    price: row.price,
    category: row.category,
    status: row.status,
    reservedUntil: row.reserved_until ? new Date(row.reserved_until) : null,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoCheckoutUrl: row.mercado_pago_checkout_url,
    infinitePayOrderNsu: row.infinite_pay_order_nsu ?? undefined,
    infinitePayCheckoutUrl: row.infinite_pay_checkout_url,
    createdAt: new Date(row.created_at),
  });
}
```

In both `save` and `update`, add to the object passed to `.insert(...)` /
`.update(...)`:

```ts
infinite_pay_order_nsu: gift.infinitePayOrderNsu ?? null,
infinite_pay_checkout_url: gift.infinitePayCheckoutUrl,
```

- [ ] **Step 2: Update `SupabaseGiftContributionRepository.ts`**

Extend `GiftContributionRow` and `toEntity`:

```ts
interface GiftContributionRow {
  id: string;
  gift_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  amount: number;
  status: ContributionStatus;
  payment_provider: PaymentProvider;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  infinite_pay_order_nsu: string | null;
  infinite_pay_transaction_nsu: string | null;
  expected_payment_date: string | null;
  created_at: string;
}

function toEntity(row: GiftContributionRow): GiftContribution {
  return GiftContribution.create({
    id: row.id,
    giftId: row.gift_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    amount: row.amount,
    status: row.status,
    paymentProvider: row.payment_provider,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoPaymentId: row.mercado_pago_payment_id ?? undefined,
    infinitePayOrderNsu: row.infinite_pay_order_nsu ?? undefined,
    infinitePayTransactionNsu: row.infinite_pay_transaction_nsu ?? undefined,
    expectedPaymentDate: row.expected_payment_date ? new Date(row.expected_payment_date) : null,
    createdAt: new Date(row.created_at),
  });
}
```

Add the import: `import { PaymentProvider } from "@/domain/entities/PaymentProvider";`

In `save`, add to the `.insert(...)` object:

```ts
guest_phone: contribution.guestPhone,
payment_provider: contribution.paymentProvider,
infinite_pay_order_nsu: contribution.infinitePayOrderNsu ?? null,
infinite_pay_transaction_nsu: contribution.infinitePayTransactionNsu ?? null,
```

In `update`, add to the `.update(...)` object (alongside the existing
`status`/`mercado_pago_*` fields — `update` only ever changes status and
provider references, never name/email/phone/amount, matching its existing
scope):

```ts
payment_provider: contribution.paymentProvider,
infinite_pay_order_nsu: contribution.infinitePayOrderNsu ?? null,
infinite_pay_transaction_nsu: contribution.infinitePayTransactionNsu ?? null,
```

- [ ] **Step 3: Run the full suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: same pass/fail state as before this task for unrelated files (Tasks
6+ will still be failing to compile if run out of order — run tasks in
order and this will be clean).

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGiftRepository.ts src/infrastructure/supabase/SupabaseGiftContributionRepository.ts
git commit -m "feat: map Infinite Pay and guest phone columns in Supabase gift repositories"
```

---

### Task 6: `PaymentGateway` port simplification + `InfinitePayGateway`

**Files:**
- Modify: `src/application/ports/PaymentGateway.ts`
- Modify: `src/infrastructure/payments/MercadoPagoGateway.ts`
- Create: `src/infrastructure/payments/InfinitePayGateway.ts`
- Test: `src/infrastructure/payments/InfinitePayGateway.test.ts`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository` from Task 4 (needs
  `infinitePayHandle`).
- Produces: `PaymentGateway` with only `createPreference`;
  `CreatePreferenceInput.payerPhone?: string`; `InfinitePayGateway` class
  implementing `PaymentGateway`; `MercadoPagoGateway.getPayment` remains as a
  **concrete method not part of the interface**.

- [ ] **Step 1: Update the port**

`src/application/ports/PaymentGateway.ts`:

```ts
export interface CreatePreferenceInput {
  title: string;
  amount: number;
  externalReference: string;
  payerEmail?: string;
  payerPhone?: string;
}

export interface CreatePreferenceOutput {
  preferenceId: string;
  checkoutUrl: string;
}

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentDetails {
  paymentId: string;
  status: PaymentStatus;
  externalReference: string;
}

export interface PaymentGateway {
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput>;
}
```

(`PaymentDetails`/`PaymentStatus` stay exported — `MercadoPagoGateway.getPayment`
and the Mercado Pago webhook route in Task 10 still use them — they're just
no longer part of the `PaymentGateway` interface itself.)

- [ ] **Step 2: Update `MercadoPagoGateway`**

`getPayment` is unchanged in behavior; only the `implements PaymentGateway`
class no longer needs it to satisfy the interface (it still compiles fine as
an extra method). Add `payer.phone` support to `createPreference`:

```ts
async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
  const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;
  const client = await this.getClient();
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.externalReference,
          title: input.title,
          quantity: 1,
          unit_price: input.amount,
          currency_id: "BRL",
        },
      ],
      payer: input.payerEmail
        ? { email: input.payerEmail, phone: input.payerPhone ? { number: input.payerPhone } : undefined }
        : undefined,
      external_reference: input.externalReference,
      back_urls: {
        success: `${siteUrl}/presentes?status=sucesso`,
        pending: `${siteUrl}/presentes?status=pendente`,
        failure: `${siteUrl}/presentes?status=falha`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error("Mercado Pago did not return a preference id or checkout url.");
  }

  return { preferenceId: result.id, checkoutUrl: result.init_point };
}
```

(Only the `payer` line changes; `getPayment` below it is untouched.)

- [ ] **Step 3: Write the failing test for `InfinitePayGateway`**

`src/infrastructure/payments/InfinitePayGateway.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfinitePayGateway } from "@/infrastructure/payments/InfinitePayGateway";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";

describe("InfinitePayGateway", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  async function makeRepository(handle: string | null) {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    if (handle) {
      await repository.updateInfinitePayHandle(handle);
    }
    return repository;
  }

  it("throws when no handle is configured", async () => {
    const repository = await makeRepository(null);
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("Infinite Pay não está configurado");
  });

  it("creates a preference by posting to the Infinite Pay checkout API", async () => {
    const repository = await makeRepository("meu_handle");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.infinitepay.com.br/abc" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new InfinitePayGateway(repository);
    const result = await gateway.createPreference({
      title: "Jogo de panelas",
      amount: 199.9,
      externalReference: "gift-1",
      payerEmail: "ana@example.com",
      payerPhone: "+5511987654321",
    });

    expect(result).toEqual({ preferenceId: "gift-1", checkoutUrl: "https://checkout.infinitepay.com.br/abc" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/links",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.handle).toBe("meu_handle");
    expect(body.order_nsu).toBe("gift-1");
    expect(body.webhook_url).toBe("https://example.test/api/webhooks/infinitepay");
    expect(body.items).toEqual([{ quantity: 1, price: 19990, description: "Jogo de panelas" }]);
    expect(body.customer).toEqual({ email: "ana@example.com", phone_number: "+5511987654321" });
  });

  it("throws when the API responds with a non-2xx status", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 }) as unknown as typeof fetch;
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("422");
  });

  it("throws when the response has no url", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }) as unknown as typeof fetch;
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("não retornou uma URL");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/payments/InfinitePayGateway.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 5: Create `InfinitePayGateway.ts`**

```ts
import { CreatePreferenceInput, CreatePreferenceOutput, PaymentGateway } from "@/application/ports/PaymentGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { getEnv } from "@/infrastructure/config/env";

interface InfinitePayLinkResponse {
  url?: string;
}

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
          ? { email: input.payerEmail, phone_number: input.payerPhone }
          : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao criar o link de pagamento.`);
    }

    const result = (await response.json()) as InfinitePayLinkResponse;
    if (!result.url) {
      throw new Error("Infinite Pay não retornou uma URL de checkout.");
    }

    return { preferenceId: input.externalReference, checkoutUrl: result.url };
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/payments/InfinitePayGateway.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/ports/PaymentGateway.ts src/infrastructure/payments/MercadoPagoGateway.ts src/infrastructure/payments/InfinitePayGateway.ts src/infrastructure/payments/InfinitePayGateway.test.ts
git commit -m "feat: add InfinitePayGateway and trim PaymentGateway port to createPreference"
```

---

### Task 7: `RefreshGiftPaymentLinkUseCase` provider-aware + gateway resolution wiring

**Files:**
- Modify: `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.ts`
- Modify: `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`
- Modify: `src/app/admin/(protected)/presentes/actions.ts`
- Modify: `src/app/admin/(protected)/presentes/importar/actions.ts`
- Modify: `src/app/admin/(protected)/presentes/importar/actions.test.ts` (if it exists — check first)

**Interfaces:**
- Consumes: `Gift.withProviderLink` (Task 1), `PaymentGateway` (Task 6),
  `GetAdminSecuritySettingsUseCase` returning `activePaymentProvider` (Task 4).
- Produces: `RefreshGiftPaymentLinkUseCase.execute(gift, provider)`;
  `resolvePaymentGateway(provider: PaymentProvider): PaymentGateway` and
  `createMercadoPagoGateway(): MercadoPagoGateway` exported from
  `composition.ts` (the latter is for Task 10's webhook route — export it
  now while touching this file's `repositories()` function, but don't wire
  its only caller until Task 10).

- [ ] **Step 1: Check for an existing import test file**

Run: `ls "src/app/admin/(protected)/presentes/importar/actions.test.ts"`
Note whether it exists — if so, Step 6 below extends it instead of creating
a fresh one; read it first to match its style (it likely tests
`importGiftRows` directly with fakes, per the `Pick<...>` parameter types
already visible in `actions.ts`).

- [ ] **Step 2: Write the failing test for the new `RefreshGiftPaymentLinkUseCase` signature**

Rewrite `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("RefreshGiftPaymentLinkUseCase", () => {
  it("creates a preference using the gift's own id as the external reference and persists the link for the given provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const gift = await repository.save(
      Gift.create({
        name: "Liquidificador",
        description: "Liquidificador de alta potência",
        imageUrl: "/placeholder.jpg",
        price: 300,
        category: "cozinha",
      })
    );

    const updated = await new RefreshGiftPaymentLinkUseCase(repository, () => gateway).execute(gift, "mercado_pago");

    expect(updated.mercadoPagoPreferenceId).toBeDefined();
    expect(updated.mercadoPagoCheckoutUrl).toContain(`ref=${gift.id}`);
    expect(updated.infinitePayCheckoutUrl).toBeNull();

    const persisted = await repository.findById(gift.id!);
    expect(persisted?.mercadoPagoCheckoutUrl).toBe(updated.mercadoPagoCheckoutUrl);
  });

  it("persists the link under the Infinite Pay fields when refreshed for that provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const gift = await repository.save(
      Gift.create({
        name: "Cafeteira",
        description: "Cafeteira elétrica",
        imageUrl: "/placeholder.jpg",
        price: 200,
        category: "cozinha",
      })
    );

    const updated = await new RefreshGiftPaymentLinkUseCase(repository, () => gateway).execute(gift, "infinite_pay");

    expect(updated.infinitePayCheckoutUrl).toContain(`ref=${gift.id}`);
    expect(updated.mercadoPagoCheckoutUrl).toBeNull();
  });

  it("propagates a payment gateway failure", async () => {
    const repository = new InMemoryGiftRepository();
    const gift = await repository.save(
      Gift.create({
        name: "Cafeteira",
        description: "Cafeteira elétrica",
        imageUrl: "/placeholder.jpg",
        price: 200,
        category: "cozinha",
      })
    );
    const failingGateway = {
      createPreference: async () => {
        throw new Error("Mercado Pago indisponível");
      },
    };

    await expect(
      new RefreshGiftPaymentLinkUseCase(repository, () => failingGateway).execute(gift, "mercado_pago")
    ).rejects.toThrow("Mercado Pago indisponível");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`
Expected: FAIL — `execute` still takes only one argument.

- [ ] **Step 4: Update `RefreshGiftPaymentLinkUseCase.ts`**

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export class RefreshGiftPaymentLinkUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly resolvePaymentGateway: (provider: PaymentProvider) => PaymentGateway
  ) {}

  async execute(gift: Gift, provider: PaymentProvider): Promise<Gift> {
    const gateway = this.resolvePaymentGateway(provider);
    const preference = await gateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: gift.id!,
    });

    const giftWithLink = gift.withProviderLink(provider, preference.preferenceId, preference.checkoutUrl);
    return this.giftRepository.update(giftWithLink);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`
Expected: PASS

- [ ] **Step 6: Wire `composition.ts`**

In `repositories()`, replace the single `paymentGateway: new MercadoPagoGateway(securitySettingsRepository)`
line with two named gateways:

```ts
function repositories() {
  const client = getSupabaseServiceRoleClient();
  const securitySettingsRepository = new SupabaseAdminSecuritySettingsRepository(client);
  return {
    guestRepository: new SupabaseGuestRepository(client),
    giftRepository: new SupabaseGiftRepository(client),
    giftContributionRepository: new SupabaseGiftContributionRepository(client),
    siteContentRepository: new SupabaseSiteContentRepository(client),
    securitySettingsRepository,
    mercadoPagoGateway: new MercadoPagoGateway(securitySettingsRepository),
    infinitePayGateway: new InfinitePayGateway(securitySettingsRepository),
    notificationLogRepository: new SupabaseNotificationLogRepository(client),
    emailGateway: new ResendEmailGateway(securitySettingsRepository),
  };
}

function resolvePaymentGateway(provider: PaymentProvider): PaymentGateway {
  const { mercadoPagoGateway, infinitePayGateway } = repositories();
  return provider === "mercado_pago" ? mercadoPagoGateway : infinitePayGateway;
}

export function createMercadoPagoGateway(): MercadoPagoGateway {
  return repositories().mercadoPagoGateway;
}
```

Add the imports:

```ts
import { InfinitePayGateway } from "@/infrastructure/payments/InfinitePayGateway";
import { PaymentGateway } from "@/application/ports/PaymentGateway";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";
```

Update `createRefreshGiftPaymentLinkUseCase`:

```ts
export function createRefreshGiftPaymentLinkUseCase(): RefreshGiftPaymentLinkUseCase {
  const { giftRepository } = repositories();
  return new RefreshGiftPaymentLinkUseCase(giftRepository, resolvePaymentGateway);
}
```

Renaming the `paymentGateway` key breaks `createGiftContributionUseCase` and
`createConfirmGiftPaymentUseCase`, which still reference it — fix both
**inline, in this same task**, so the repo keeps compiling at every commit.
Their full provider-aware rewrite happens in Tasks 10 and 12; for now, just
swap the removed `paymentGateway` key for `mercadoPagoGateway` (same
behavior as before this task, since Mercado Pago was the only provider
until now):

```ts
export function createGiftContributionUseCase(): CreateGiftContributionUseCase {
  const { giftRepository, giftContributionRepository, mercadoPagoGateway } = repositories();
  return new CreateGiftContributionUseCase(giftRepository, giftContributionRepository, mercadoPagoGateway);
}

export function createConfirmGiftPaymentUseCase(): ConfirmGiftPaymentUseCase {
  const { giftRepository, giftContributionRepository, mercadoPagoGateway, emailGateway, notificationLogRepository } =
    repositories();
  return new ConfirmGiftPaymentUseCase(
    giftRepository,
    giftContributionRepository,
    mercadoPagoGateway,
    emailGateway,
    notificationLogRepository
  );
}
```

- [ ] **Step 7: Update `upsertGiftAction`**

`src/app/admin/(protected)/presentes/actions.ts` — resolve the active
provider before refreshing:

```ts
import {
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createVerifyPriceChangeSecretUseCase,
  createListGiftsUseCase,
  createGetAdminSecuritySettingsUseCase,
  resolvePhotoField,
} from "@/infrastructure/composition";
```

```ts
if (upsertResult.nameOrPriceChanged) {
  try {
    const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
    await createRefreshGiftPaymentLinkUseCase().execute(upsertResult.gift, activePaymentProvider);
  } catch {
    return {
      status: "error",
      message:
        "Presente salvo, mas não foi possível gerar o link de pagamento agora. Edite e salve novamente para tentar de novo.",
    };
  }
}
```

- [ ] **Step 8: Update `importGiftRows`/`importGiftsAction`**

`src/app/admin/(protected)/presentes/importar/actions.ts` — `importGiftRows`
gains a `provider` parameter, threaded through to
`refreshGiftPaymentLinkUseCase.execute`:

```ts
export async function importGiftRows(
  rows: { [column: string]: string }[],
  giftRepository: Pick<GiftRepository, "findAll">,
  upsertGiftUseCase: Pick<UpsertGiftUseCase, "execute">,
  refreshGiftPaymentLinkUseCase: Pick<RefreshGiftPaymentLinkUseCase, "execute">,
  provider: PaymentProvider
): Promise<ImportResult> {
  // ...unchanged body until the refresh call...

    try {
      await refreshGiftPaymentLinkUseCase.execute(gift, provider);
    } catch {
      result.withoutPaymentLink++;
    }

  // ...unchanged return...
}
```

Add the import: `import { PaymentProvider } from "@/domain/entities/PaymentProvider";`

`importGiftsAction` resolves the provider first:

```ts
import {
  createListGiftsUseCase,
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createGetAdminSecuritySettingsUseCase,
} from "@/infrastructure/composition";
```

```ts
try {
  const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
  const result = await importGiftRows(
    rows,
    { findAll: () => createListGiftsUseCase().execute() },
    createUpsertGiftUseCase(),
    createRefreshGiftPaymentLinkUseCase(),
    activePaymentProvider
  );
  revalidatePath("/presentes");
  revalidatePath("/admin/presentes");
  revalidatePath("/admin/presentes/novo");
  revalidatePath("/admin/dashboard");
  return { status: "done", result };
} catch {
  return { status: "error", message: "Não foi possível importar os presentes agora." };
}
```

- [ ] **Step 9: Update the import action's test file, if it exists**

If Step 1 found `actions.test.ts`, it calls `importGiftRows(...)` directly —
add a fifth argument `"mercado_pago"` (or the specific provider the test
cares about) to every call site inside that file.

- [ ] **Step 10: Run the full suite**

Run: `npx vitest run`
Expected: PASS (Tasks 10 and 12 still owe their own full provider-awareness,
but the placeholder `mercadoPagoGateway` wiring from Step 6 keeps everything
compiling and passing in the meantime).

- [ ] **Step 11: Commit**

```bash
git add src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.ts src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts src/infrastructure/composition.ts "src/app/admin/(protected)/presentes/actions.ts" "src/app/admin/(protected)/presentes/importar/actions.ts"
git commit -m "feat: make RefreshGiftPaymentLinkUseCase provider-aware and wire gateway resolution"
```

(If Step 9 touched a test file, include it in this commit too.)

---

### Task 8: `GenerateMissingPaymentLinksUseCase`

**Files:**
- Create: `src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.ts`
- Test: `src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `Gift.hasLinkFor` (Task 1), `RefreshGiftPaymentLinkUseCase` (Task 7).
- Produces: `GenerateMissingPaymentLinksUseCase.execute(provider)` returning
  `{ generated: number; failed: { giftId: string; giftName: string; reason: string }[] }`;
  `createGenerateMissingPaymentLinksUseCase()` composition export.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { GenerateMissingPaymentLinksUseCase } from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("GenerateMissingPaymentLinksUseCase", () => {
  async function makeGift(repository: InMemoryGiftRepository, overrides: Partial<Parameters<typeof Gift.create>[0]> = {}) {
    return repository.save(
      Gift.create({
        name: "Presente",
        description: "desc",
        imageUrl: null,
        price: 100,
        category: "casa",
        ...overrides,
      })
    );
  }

  it("does nothing when every gift already has a link for the provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => gateway);
    const gift = await makeGift(repository);
    await repository.update(gift.withProviderLink("mercado_pago", "pref-1", "https://mp.test/1"));

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result).toEqual({ generated: 0, failed: [] });
  });

  it("generates links only for gifts missing one for the given provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => gateway);
    const hasLink = await makeGift(repository, { name: "Já tem link" });
    await repository.update(hasLink.withProviderLink("mercado_pago", "pref-1", "https://mp.test/1"));
    await makeGift(repository, { name: "Sem link" });

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result.generated).toBe(1);
    expect(result.failed).toEqual([]);
    const gifts = await repository.findAll();
    expect(gifts.every((gift) => gift.hasLinkFor("mercado_pago"))).toBe(true);
  });

  it("records a failure per gift without stopping the rest", async () => {
    const repository = new InMemoryGiftRepository();
    const giftA = await makeGift(repository, { name: "A" });
    const giftB = await makeGift(repository, { name: "B" });
    let calls = 0;
    const flakyGateway = {
      createPreference: async () => {
        calls++;
        if (calls === 1) throw new Error("Falha temporária");
        return { preferenceId: "pref-ok", checkoutUrl: "https://mp.test/ok" };
      },
    };
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => flakyGateway);

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result.generated).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toBe("Falha temporária");
    expect([giftA.id, giftB.id]).toContain(result.failed[0].giftId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the use-case**

```ts
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

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
        failed.push({
          giftId: gift.id!,
          giftName: gift.name,
          reason: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return { generated, failed };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Wire composition**

In `composition.ts`, add:

```ts
export function createGenerateMissingPaymentLinksUseCase(): GenerateMissingPaymentLinksUseCase {
  const { giftRepository } = repositories();
  return new GenerateMissingPaymentLinksUseCase(giftRepository, createRefreshGiftPaymentLinkUseCase());
}
```

Add the import:
`import { GenerateMissingPaymentLinksUseCase } from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";`

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.ts src/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat: add GenerateMissingPaymentLinksUseCase"
```

---

### Task 9: `UpdateActivePaymentProviderUseCase`

**Files:**
- Create: `src/application/use-cases/security/UpdateActivePaymentProviderUseCase.ts`
- Test: `src/application/use-cases/security/UpdateActivePaymentProviderUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository.updateActivePaymentProvider`/`updateInfinitePayHandle`
  (Task 4), `GenerateMissingPaymentLinksUseCase` (Task 8).
- Produces: `UpdateActivePaymentProviderUseCase.execute({ provider, infinitePayHandle? })`
  returning `GenerateMissingPaymentLinksResult`; throws
  `InvalidSecurityCredentialError` when switching to `infinite_pay` without a
  handle. `createUpdateActivePaymentProviderUseCase()` composition export.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { UpdateActivePaymentProviderUseCase } from "@/application/use-cases/security/UpdateActivePaymentProviderUseCase";
import { GenerateMissingPaymentLinksUseCase } from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";
import { Gift } from "@/domain/entities/Gift";

describe("UpdateActivePaymentProviderUseCase", () => {
  function makeUseCase() {
    const securitySettingsRepository = new InMemoryAdminSecuritySettingsRepository();
    const giftRepository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(giftRepository, () => gateway);
    const generate = new GenerateMissingPaymentLinksUseCase(giftRepository, refresh);
    return { useCase: new UpdateActivePaymentProviderUseCase(securitySettingsRepository, generate), securitySettingsRepository, giftRepository };
  }

  it("switches to mercado_pago and generates missing links", async () => {
    const { useCase, securitySettingsRepository, giftRepository } = makeUseCase();
    await giftRepository.save(
      Gift.create({ name: "Presente", description: "desc", imageUrl: null, price: 100, category: "casa" })
    );

    const result = await useCase.execute({ provider: "mercado_pago" });

    expect(result.generated).toBe(1);
    const settings = await securitySettingsRepository.getSettings();
    expect(settings.activePaymentProvider).toBe("mercado_pago");
  });

  it("rejects switching to infinite_pay without a handle", async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ provider: "infinite_pay" })).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("stores the handle and switches to infinite_pay when a handle is provided", async () => {
    const { useCase, securitySettingsRepository } = makeUseCase();

    await useCase.execute({ provider: "infinite_pay", infinitePayHandle: "meu_handle" });

    const settings = await securitySettingsRepository.getSettings();
    expect(settings.activePaymentProvider).toBe("infinite_pay");
    expect(settings.infinitePayHandle).toBe("meu_handle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/security/UpdateActivePaymentProviderUseCase.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the use-case**

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import {
  GenerateMissingPaymentLinksResult,
  GenerateMissingPaymentLinksUseCase,
} from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateActivePaymentProviderInput {
  provider: PaymentProvider;
  infinitePayHandle?: string;
}

export class UpdateActivePaymentProviderUseCase {
  constructor(
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly generateMissingPaymentLinksUseCase: GenerateMissingPaymentLinksUseCase
  ) {}

  async execute(input: UpdateActivePaymentProviderInput): Promise<GenerateMissingPaymentLinksResult> {
    if (input.provider === "infinite_pay") {
      const handle = input.infinitePayHandle?.trim();
      if (!handle) {
        throw new InvalidSecurityCredentialError(
          "Informe o handle da Infinite Pay antes de ativar este provedor."
        );
      }
      await this.securitySettingsRepository.updateInfinitePayHandle(handle);
    }

    await this.securitySettingsRepository.updateActivePaymentProvider(input.provider);
    return this.generateMissingPaymentLinksUseCase.execute(input.provider);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/security/UpdateActivePaymentProviderUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Wire composition**

```ts
export function createUpdateActivePaymentProviderUseCase(): UpdateActivePaymentProviderUseCase {
  const { securitySettingsRepository } = repositories();
  return new UpdateActivePaymentProviderUseCase(securitySettingsRepository, createGenerateMissingPaymentLinksUseCase());
}
```

Add the import:
`import { UpdateActivePaymentProviderUseCase } from "@/application/use-cases/security/UpdateActivePaymentProviderUseCase";`

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/security/UpdateActivePaymentProviderUseCase.ts src/application/use-cases/security/UpdateActivePaymentProviderUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat: add UpdateActivePaymentProviderUseCase"
```

---

### Task 10: `ConfirmGiftPaymentUseCase` generalization + Mercado Pago webhook route

**Files:**
- Modify: `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts`
- Modify: `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
- Modify: `src/app/api/webhooks/mercadopago/route.ts`
- Create: `src/app/api/webhooks/mercadopago/route.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `createMercadoPagoGateway` (Task 7), `GiftContribution.approve`/`reject`
  (Task 2).
- Produces: `ConfirmGiftPaymentUseCase.execute({ payment: ConfirmedPayment })`
  where `ConfirmedPayment = { paymentReference, status, giftId, paidAmount? }`.

- [ ] **Step 1: Rewrite `ConfirmGiftPaymentUseCase.test.ts`**

The use-case no longer takes a `paymentGateway` or a `paymentId` — it takes
an already-resolved `ConfirmedPayment`. Replace the whole file:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Gift } from "@/domain/entities/Gift";

describe("ConfirmGiftPaymentUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let createContribution: CreateGiftContributionUseCase;
  let confirmPayment: ConfirmGiftPaymentUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    createContribution = new CreateGiftContributionUseCase(
      giftRepository,
      contributionRepository,
      new InMemoryAdminSecuritySettingsRepository(),
      () => new FakePaymentGateway()
    );
    confirmPayment = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
      emailGateway,
      notificationLogRepository
    );

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Liquidificador",
        description: "Liquidificador de alta potência",
        imageUrl: "/placeholder.jpg",
        price: 200,
        category: "cozinha",
      })
    );
  });

  it("approves the contribution and marks the gift as paid when payment is approved", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    const updated = await confirmPayment.execute({
      payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" },
    });

    expect(updated?.status).toBe("approved");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("sends a thank-you email to the guest when payment is approved", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    await confirmPayment.execute({ payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("bruna@example.com");
    expect(emailGateway.sentEmails[0].subject).toContain("obrigado");
    expect(emailGateway.sentEmails[0].html).toContain("Liquidificador");
  });

  it("does not send a thank-you email when payment is rejected", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    await confirmPayment.execute({ payment: { paymentReference: "payment-2", status: "rejected", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(0);
  });

  it("does not send a duplicate thank-you email on a repeated approved notification", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    await confirmPayment.execute({ payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" } });
    await confirmPayment.execute({ payment: { paymentReference: "payment-1-retry", status: "approved", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(1);
  });

  it("rejects the contribution and releases the gift when payment is rejected", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    const updated = await confirmPayment.execute({
      payment: { paymentReference: "payment-2", status: "rejected", giftId: "gift-1" },
    });

    expect(updated?.status).toBe("rejected");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("available");
  });

  it("returns null without throwing or changing state when there is no pending contribution (duplicate notification)", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });
    await confirmPayment.execute({ payment: { paymentReference: "payment-4", status: "approved", giftId: "gift-1" } });

    const result = await confirmPayment.execute({
      payment: { paymentReference: "payment-4-retry", status: "approved", giftId: "gift-1" },
    });

    expect(result).toBeNull();
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("refuses to approve when paidAmount is provided and does not match the contribution amount", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    const result = await confirmPayment.execute({
      payment: { paymentReference: "payment-5", status: "approved", giftId: "gift-1", paidAmount: 50 },
    });

    expect(result?.status).toBe("pending");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(emailGateway.sentEmails).toHaveLength(0);
  });

  it("approves when paidAmount is provided and matches the contribution amount", async () => {
    await createContribution.execute({ giftId: "gift-1", guestName: "Bruna Lima", guestEmail: "bruna@example.com" });

    const result = await confirmPayment.execute({
      payment: { paymentReference: "transaction-1", status: "approved", giftId: "gift-1", paidAmount: 200 },
    });

    expect(result?.status).toBe("approved");
  });
});
```

Note: `CreateGiftContributionUseCase`'s new constructor shape (repository +
resolver, added in Task 12) is used here already — since Task 12 comes
after this one, **run this task's test file after Task 12 is complete**, or
— simpler, to keep task order strictly sequential — write this test file
now using the *pre-Task-12* constructor shape
(`new CreateGiftContributionUseCase(giftRepository, contributionRepository, new FakePaymentGateway())`)
and revisit it in Task 12 when that constructor changes. Use the
pre-Task-12 shape here; Task 12's own steps explicitly update this file's
`beforeEach` to the new shape as part of its own test-migration step.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
Expected: FAIL — `execute({ paymentId })` shape no longer matches; constructor arity mismatch.

- [ ] **Step 3: Rewrite `ConfirmGiftPaymentUseCase.ts`**

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { paymentThankYouEmail } from "@/infrastructure/email/templates";

export interface ConfirmedPayment {
  paymentReference: string;
  status: "approved" | "rejected";
  giftId: string;
  paidAmount?: number;
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
    if (!contribution) {
      return null;
    }

    if (
      input.payment.status === "approved" &&
      input.payment.paidAmount !== undefined &&
      input.payment.paidAmount !== contribution.amount
    ) {
      console.error(
        `Payment amount mismatch for contribution ${contribution.id}: expected ${contribution.amount}, got ${input.payment.paidAmount}`
      );
      return contribution;
    }

    const gift = await this.giftRepository.findById(contribution.giftId);

    if (input.payment.status === "approved") {
      const updatedContribution = await this.giftContributionRepository.update(
        contribution.approve(input.payment.paymentReference)
      );
      if (gift) {
        await this.giftRepository.update(gift.markAsPaid());
      }
      await this.sendThankYouEmail(updatedContribution, gift?.name ?? "seu presente");
      return updatedContribution;
    }

    const updatedContribution = await this.giftContributionRepository.update(
      contribution.reject(input.payment.paymentReference)
    );
    if (gift) {
      await this.giftRepository.update(gift.releaseToAvailable());
    }
    return updatedContribution;
  }

  private async sendThankYouEmail(contribution: GiftContribution, giftName: string): Promise<void> {
    try {
      const alreadySent = await this.notificationLogRepository.hasBeenSent(
        "payment_thank_you",
        "gift_contribution",
        contribution.id!
      );
      if (alreadySent) {
        return;
      }

      const { subject, html } = paymentThankYouEmail({ guestName: contribution.guestName, giftName });
      await this.emailGateway.sendEmail({ to: contribution.guestEmail, subject, html });
      await this.notificationLogRepository.markSent("payment_thank_you", "gift_contribution", contribution.id!);
    } catch (error) {
      console.error("Failed to send payment thank-you email", error);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Update `composition.ts`**

Replace the `createConfirmGiftPaymentUseCase` placeholder from Task 7 with
its final form (drops the gateway dependency entirely):

```ts
export function createConfirmGiftPaymentUseCase(): ConfirmGiftPaymentUseCase {
  const { giftRepository, giftContributionRepository, emailGateway, notificationLogRepository } = repositories();
  return new ConfirmGiftPaymentUseCase(giftRepository, giftContributionRepository, emailGateway, notificationLogRepository);
}
```

- [ ] **Step 6: Update the Mercado Pago webhook route**

`src/app/api/webhooks/mercadopago/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createConfirmGiftPaymentUseCase, createMercadoPagoGateway } from "@/infrastructure/composition";

interface MercadoPagoWebhookBody {
  type?: string;
  data?: { id?: string };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as MercadoPagoWebhookBody | null;

  const type = body?.type ?? request.nextUrl.searchParams.get("type");
  const paymentId = body?.data?.id ?? request.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    const payment = await createMercadoPagoGateway().getPayment(String(paymentId));

    if (payment.status === "pending") {
      return NextResponse.json({ received: true });
    }

    await createConfirmGiftPaymentUseCase().execute({
      payment: {
        paymentReference: payment.paymentId,
        status: payment.status === "approved" ? "approved" : "rejected",
        giftId: payment.externalReference,
      },
    });
  } catch (error) {
    console.error("Failed to process Mercado Pago webhook notification", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  revalidatePath("/presentes");
  revalidatePath("/admin/presentes");
  revalidatePath("/admin/pagamentos");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 7: Write the failing route test**

`src/app/api/webhooks/mercadopago/route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue(null);
const getPaymentMock = vi.fn();

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
  createMercadoPagoGateway: () => ({ getPayment: getPaymentMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/mercadopago", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  it("ignores notifications that are not payment type", async () => {
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");
    const response = await POST(makeRequest({ type: "merchant_order", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(getPaymentMock).not.toHaveBeenCalled();
  });

  it("does not confirm the payment when it is still pending", async () => {
    getPaymentMock.mockResolvedValueOnce({ paymentId: "1", status: "pending", externalReference: "gift-1" });
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("confirms an approved payment", async () => {
    getPaymentMock.mockResolvedValueOnce({ paymentId: "1", status: "approved", externalReference: "gift-1" });
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      payment: { paymentReference: "1", status: "approved", giftId: "gift-1" },
    });
  });

  it("returns 500 when confirmation throws, so Mercado Pago retries", async () => {
    getPaymentMock.mockRejectedValueOnce(new Error("Mercado Pago indisponível"));
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 8: Run the route test**

Run: `npx vitest run src/app/api/webhooks/mercadopago/route.test.ts`
Expected: PASS

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts src/app/api/webhooks/mercadopago/route.ts src/app/api/webhooks/mercadopago/route.test.ts src/infrastructure/composition.ts
git commit -m "feat: generalize ConfirmGiftPaymentUseCase for multiple providers"
```

---

### Task 11: Infinite Pay webhook route

**Files:**
- Create: `src/app/api/webhooks/infinitepay/route.ts`
- Create: `src/app/api/webhooks/infinitepay/route.test.ts`

**Interfaces:**
- Consumes: `ConfirmGiftPaymentUseCase` (Task 10).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue(null);

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/infinitepay", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/infinitepay", () => {
  it("returns 400 for a malformed body", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/infinitepay", { method: "POST", body: "not json" })
    );

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(makeRequest({ order_nsu: "gift-1" }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("converts paid_amount from cents and confirms the payment", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      payment: { paymentReference: "txn-1", status: "approved", giftId: "gift-1", paidAmount: 200 },
    });
  });

  it("returns 500 when confirmation throws", async () => {
    executeMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/webhooks/infinitepay/route.test.ts`
Expected: FAIL — route module doesn't exist.

- [ ] **Step 3: Create the route**

```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createConfirmGiftPaymentUseCase } from "@/infrastructure/composition";

interface InfinitePayWebhookBody {
  order_nsu?: string;
  transaction_nsu?: string;
  paid_amount?: number;
}

export async function POST(request: Request) {
  let body: InfinitePayWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const { order_nsu, transaction_nsu, paid_amount } = body;
  if (!order_nsu || !transaction_nsu || typeof paid_amount !== "number") {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Infinite Pay webhook", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/webhooks/infinitepay/route.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/infinitepay/route.ts src/app/api/webhooks/infinitepay/route.test.ts
git commit -m "feat: add Infinite Pay webhook route"
```

---

### Task 12: `CreateGiftContributionUseCase` — provider-aware + guest phone

**Files:**
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts`
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
- Modify: `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts` (finish the Task 10 note — update `beforeEach`)
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `Gift.hasLinkFor`/`checkoutUrlFor`/`providerReferenceIdFor`/`withProviderLink`
  (Task 1), `GiftContribution.withProviderReference` (Task 2),
  `resolvePaymentGateway` (Task 7).
- Produces: `CreateGiftContributionUseCase` constructor
  `(giftRepository, giftContributionRepository, securitySettingsRepository, resolvePaymentGateway)`;
  `CreateGiftContributionInput.guestPhone?: string | null`.

- [ ] **Step 1: Rewrite `CreateGiftContributionUseCase.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

describe("CreateGiftContributionUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let securitySettingsRepository: InMemoryAdminSecuritySettingsRepository;
  let gateway: FakePaymentGateway;
  let useCase: CreateGiftContributionUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    securitySettingsRepository = new InMemoryAdminSecuritySettingsRepository();
    gateway = new FakePaymentGateway();
    useCase = new CreateGiftContributionUseCase(
      giftRepository,
      contributionRepository,
      securitySettingsRepository,
      () => gateway
    );

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
  });

  it("reserves the gift, creates a pending contribution, and creates a checkout url when the gift has none stored", async () => {
    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.status).toBe("pending");
    expect(result.contribution.amount).toBe(450);
    expect(result.contribution.paymentProvider).toBe("mercado_pago");
    expect(result.contribution.mercadoPagoPreferenceId).toBeDefined();
    expect(result.checkoutUrl).toContain("mercadopago.test");

    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(gift?.mercadoPagoCheckoutUrl).toBe(result.checkoutUrl);
  });

  it("reuses the gift's stored checkout url instead of creating a new preference", async () => {
    const gift = await giftRepository.findById("gift-1");
    await giftRepository.update(gift!.withProviderLink("mercado_pago", "preference-fixed", "https://mercadopago.test/fixed-link"));

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.checkoutUrl).toBe("https://mercadopago.test/fixed-link");
    expect(result.contribution.mercadoPagoPreferenceId).toBe("preference-fixed");
  });

  it("uses the active provider's link and gateway when Infinite Pay is active", async () => {
    await securitySettingsRepository.updateActivePaymentProvider("infinite_pay");
    await securitySettingsRepository.updateInfinitePayHandle("meu_handle");

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.paymentProvider).toBe("infinite_pay");
    expect(result.contribution.infinitePayOrderNsu).toBeDefined();
    expect(result.contribution.mercadoPagoPreferenceId).toBeUndefined();
  });

  it("stores the guest phone on the contribution and forwards it to the gateway", async () => {
    let receivedPhone: string | undefined;
    const capturingGateway = {
      createPreference: async (input: { payerPhone?: string }) => {
        receivedPhone = input.payerPhone;
        return { preferenceId: "pref-1", checkoutUrl: "https://mercadopago.test/1" };
      },
    };
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, securitySettingsRepository, () => capturingGateway);

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      guestPhone: "+5511987654321",
    });

    expect(result.contribution.guestPhone).toBe("+5511987654321");
    expect(receivedPhone).toBe("+5511987654321");
  });

  it("omits payerPhone when the guest left it blank", async () => {
    let receivedInput: { payerPhone?: string } | undefined;
    const capturingGateway = {
      createPreference: async (input: { payerPhone?: string }) => {
        receivedInput = input;
        return { preferenceId: "pref-1", checkoutUrl: "https://mercadopago.test/1" };
      },
    };
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, securitySettingsRepository, () => capturingGateway);

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.guestPhone).toBeNull();
    expect(receivedInput?.payerPhone).toBeUndefined();
  });

  it("throws when the gift does not exist", async () => {
    await expect(
      useCase.execute({ giftId: "missing", guestName: "Carla Nunes", guestEmail: "carla@example.com" })
    ).rejects.toThrow(InvalidGiftDataError);
  });

  it("throws when the gift is already reserved", async () => {
    await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    await expect(
      useCase.execute({ giftId: "gift-1", guestName: "Outro", guestEmail: "outro@example.com" })
    ).rejects.toThrow(GiftNotAvailableError);
  });

  it("reserves the gift for about 30 minutes by default", async () => {
    const before = Date.now();

    await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    const after = Date.now();
    const gift = await giftRepository.findById("gift-1");
    const reservedUntilMs = gift!.reservedUntil!.getTime();

    expect(reservedUntilMs).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
    expect(reservedUntilMs).toBeLessThanOrEqual(after + 31 * 60 * 1000);
  });

  it("reserves until the guest's chosen date and stores it on the contribution when provided", async () => {
    const expectedPaymentDate = new Date("2027-05-01T23:59:59-03:00");

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      expectedPaymentDate,
    });

    expect(result.contribution.expectedPaymentDate).toEqual(expectedPaymentDate);
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.reservedUntil).toEqual(expectedPaymentDate);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: FAIL — constructor arity mismatch.

- [ ] **Step 3: Rewrite `CreateGiftContributionUseCase.ts`**

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export const AUTO_CHECKOUT_RESERVATION_MINUTES = 30;

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  expectedPaymentDate?: Date;
}

export interface CreateGiftContributionOutput {
  contribution: GiftContribution;
  checkoutUrl: string;
}

export class CreateGiftContributionUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly resolvePaymentGateway: (provider: PaymentProvider) => PaymentGateway
  ) {}

  async execute(input: CreateGiftContributionInput): Promise<CreateGiftContributionOutput> {
    const gift = await this.giftRepository.findById(input.giftId);
    if (!gift) {
      throw new InvalidGiftDataError(`Gift with id ${input.giftId} was not found.`);
    }

    const { activePaymentProvider } = await this.securitySettingsRepository.getSettings();

    const reservedUntil =
      input.expectedPaymentDate ?? new Date(Date.now() + AUTO_CHECKOUT_RESERVATION_MINUTES * 60 * 1000);
    const reservedGift = await this.giftRepository.update(gift.reserve(reservedUntil));

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone ?? null,
        amount: gift.price,
        expectedPaymentDate: input.expectedPaymentDate ?? null,
      })
    );

    let referenceId: string;
    let checkoutUrl: string;

    if (reservedGift.hasLinkFor(activePaymentProvider)) {
      referenceId = reservedGift.providerReferenceIdFor(activePaymentProvider)!;
      checkoutUrl = reservedGift.checkoutUrlFor(activePaymentProvider)!;
    } else {
      const gateway = this.resolvePaymentGateway(activePaymentProvider);
      const preference = await gateway.createPreference({
        title: gift.name,
        amount: gift.price,
        externalReference: gift.id!,
        payerEmail: input.guestEmail,
        payerPhone: input.guestPhone ?? undefined,
      });
      referenceId = preference.preferenceId;
      checkoutUrl = preference.checkoutUrl;

      await this.giftRepository.update(reservedGift.withProviderLink(activePaymentProvider, referenceId, checkoutUrl));
    }

    const contributionWithReference = await this.giftContributionRepository.update(
      contribution.withProviderReference(activePaymentProvider, referenceId)
    );

    return { contribution: contributionWithReference, checkoutUrl };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Finish the `ConfirmGiftPaymentUseCase.test.ts` migration noted in Task 10**

In `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`,
update the `beforeEach` construction of `createContribution` to the final
constructor shape:

```ts
createContribution = new CreateGiftContributionUseCase(
  giftRepository,
  contributionRepository,
  new InMemoryAdminSecuritySettingsRepository(),
  () => new FakePaymentGateway()
);
```

(This matches what Task 10's Step 1 already wrote — verify it's present
and, if Task 10 was executed strictly in isolation and this line still
reads `new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway)`
with a bare `paymentGateway` variable, fix it now to the four-argument form
above, and remove the now-unused `paymentGateway` local variable / its
`new FakePaymentGateway()` assignment from `beforeEach`, replacing direct
uses with the inline `() => new FakePaymentGateway()` resolver shown here.)

- [ ] **Step 6: Run that test file to confirm it still passes**

Run: `npx vitest run src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
Expected: PASS

- [ ] **Step 7: Update `composition.ts`**

Replace the `createGiftContributionUseCase` placeholder from Task 7:

```ts
export function createGiftContributionUseCase(): CreateGiftContributionUseCase {
  const { giftRepository, giftContributionRepository, securitySettingsRepository } = repositories();
  return new CreateGiftContributionUseCase(giftRepository, giftContributionRepository, securitySettingsRepository, resolvePaymentGateway);
}
```

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/application/use-cases/gifts/CreateGiftContributionUseCase.ts src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat: make CreateGiftContributionUseCase provider-aware and capture guest phone"
```

---

### Task 13: Phone mask utilities

**Files:**
- Create: `src/shared/utils/phoneMask.ts`
- Test: `src/shared/utils/phoneMask.test.ts`

**Interfaces:**
- Produces: `formatBrazilianPhoneMask(raw: string): string`,
  `normalizePhoneToE164(masked: string): string | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { formatBrazilianPhoneMask, normalizePhoneToE164 } from "@/shared/utils/phoneMask";

describe("formatBrazilianPhoneMask", () => {
  it("formats digits incrementally as the user types", () => {
    expect(formatBrazilianPhoneMask("1")).toBe("(1");
    expect(formatBrazilianPhoneMask("11")).toBe("(11)");
    expect(formatBrazilianPhoneMask("119876")).toBe("(11)9876");
    expect(formatBrazilianPhoneMask("11987654321")).toBe("(11)98765-4321");
  });

  it("ignores non-digit characters and caps at 11 digits", () => {
    expect(formatBrazilianPhoneMask("(11) 98765-4321-extra")).toBe("(11)98765-4321");
  });

  it("returns an empty string for empty input", () => {
    expect(formatBrazilianPhoneMask("")).toBe("");
  });
});

describe("normalizePhoneToE164", () => {
  it("converts a fully-filled mask to +55 E.164", () => {
    expect(normalizePhoneToE164("(11)98765-4321")).toBe("+5511987654321");
  });

  it("returns null for empty input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164(undefined as unknown as string)).toBeNull();
  });

  it("returns null for a partially-filled or malformed number", () => {
    expect(normalizePhoneToE164("(11)9876")).toBeNull();
    expect(normalizePhoneToE164("not a phone")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/utils/phoneMask.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `phoneMask.ts`**

```ts
export function formatBrazilianPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) {
    return `(${ddd}`;
  }

  if (rest.length <= 5) {
    return `(${ddd})${rest}`;
  }

  return `(${ddd})${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function normalizePhoneToE164(masked: string): string | null {
  if (!masked) return null;

  const digits = masked.replace(/\D/g, "");
  if (digits.length !== 11) return null;

  return `+55${digits}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/utils/phoneMask.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/phoneMask.ts src/shared/utils/phoneMask.test.ts
git commit -m "feat: add Brazilian phone mask and E.164 normalization utilities"
```

---

### Task 14: Guest phone field in the checkout modal

**Files:**
- Modify: `src/components/gifts/GiftDetailsModal.tsx`
- Modify: `src/app/presentes/actions.ts`
- Test: `src/components/gifts/GiftDetailsModal.test.tsx` (check if it exists first)

**Interfaces:**
- Consumes: `formatBrazilianPhoneMask`/`normalizePhoneToE164` (Task 13),
  `CreateGiftContributionInput.guestPhone` (Task 12).

- [ ] **Step 1: Check for an existing modal test file**

Run: `ls src/components/gifts/GiftDetailsModal.test.tsx`
If present, read it first and follow its existing render/query patterns
below instead of introducing a new style.

- [ ] **Step 2: Write the failing test**

Add to (or create) `src/components/gifts/GiftDetailsModal.test.tsx`:

```ts
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";

const gift = {
  id: "gift-1",
  name: "Jogo de panelas",
  description: "desc",
  imageUrl: null,
  price: 200,
  category: "cozinha",
  status: "available" as const,
};

describe("GiftDetailsModal guest phone field", () => {
  it("masks the phone number as the guest types, and the field is optional", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Presentear agora" }));
    const phoneInput = screen.getByLabelText(/telefone/i);
    expect(phoneInput).not.toBeRequired();

    await user.type(phoneInput, "11987654321");
    expect(phoneInput).toHaveValue("(11)98765-4321");
  });
});
```

(Adjust the `gift` fixture shape to match whatever `GiftDto` actually
requires — check `src/components/gifts/GiftDto.ts` if the above fields
don't compile; this is illustrative of the assertions, the fixture must
satisfy the real type.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: FAIL — no element matches `/telefone/i`.

- [ ] **Step 4: Add the phone field to both forms**

In `src/components/gifts/GiftDetailsModal.tsx`, add the import:

```ts
import { formatBrazilianPhoneMask } from "@/shared/utils/phoneMask";
```

In the "Presentear agora" form (`activeForm === "now"`), insert between the
email field and the submit button:

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
  onChange={(event) => {
    event.target.value = formatBrazilianPhoneMask(event.target.value);
  }}
/>
```

In the "Reservar para depois" form (`activeForm === "later"`), insert the
identical block (with `-later-` in the `id`) between the email field and the
"Quando pretende pagar?" label.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: PASS

- [ ] **Step 6: Thread `guestPhone` through the Server Actions**

`src/app/presentes/actions.ts` — add the import, extend both Zod schemas,
read the new field, normalize it, and pass it to
`createGiftContributionUseCase().execute(...)`:

```ts
import { normalizePhoneToE164 } from "@/shared/utils/phoneMask";
```

```ts
const contributionSchema = z.object({
  giftId: z.string().min(1, "Presente inválido."),
  guestName: z.string().min(3, "Informe seu nome completo."),
  guestEmail: z.string().email("Informe um e-mail válido."),
  guestPhone: z.string().optional(),
});
```

In `createGiftContributionAction`:

```ts
const parsed = contributionSchema.safeParse({
  giftId: formData.get("giftId"),
  guestName: formData.get("guestName"),
  guestEmail: formData.get("guestEmail"),
  guestPhone: formData.get("guestPhone"),
});

if (!parsed.success) {
  return { status: "error", message: "Preencha seu nome e e-mail corretamente." };
}

let checkoutUrl: string;
try {
  const result = await createGiftContributionUseCase().execute({
    ...parsed.data,
    guestPhone: normalizePhoneToE164(parsed.data.guestPhone ?? ""),
  });
  checkoutUrl = result.checkoutUrl;
  // ...unchanged revalidatePath calls...
```

Same pattern for `reserveForLaterSchema` and `reserveGiftForLaterAction`:
add `guestPhone: z.string().optional()` to the schema, read
`formData.get("guestPhone")` in the `safeParse` call, and pass
`guestPhone: normalizePhoneToE164(parsed.data.guestPhone ?? "")` into the
`createGiftContributionUseCase().execute({...})` call alongside the
existing `giftId`/`guestName`/`guestEmail`/`expectedPaymentDate` fields.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/gifts/GiftDetailsModal.tsx src/components/gifts/GiftDetailsModal.test.tsx src/app/presentes/actions.ts
git commit -m "feat: collect optional guest phone before checkout"
```

---

### Task 15: Integrações page — payment provider selector

**Files:**
- Create: `src/components/admin/PaymentProviderForm.tsx`
- Create: `src/components/admin/PaymentProviderForm.test.tsx`
- Modify: `src/app/admin/(protected)/integracoes/actions.ts`
- Modify: `src/app/admin/(protected)/integracoes/page.tsx`

**Interfaces:**
- Consumes: `UpdateActivePaymentProviderUseCase` (Task 9),
  `GetAdminSecuritySettingsUseCase` returning `activePaymentProvider`/`infinitePayHandle`
  (Task 4).

- [ ] **Step 1: Write the failing component test**

`src/components/admin/PaymentProviderForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentProviderForm } from "@/components/admin/PaymentProviderForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updatePaymentProviderAction: vi.fn(),
}));

describe("PaymentProviderForm", () => {
  it("shows the Infinite Pay handle field only when Infinite Pay is selected", async () => {
    const user = userEvent.setup();
    render(<PaymentProviderForm activeProvider="mercado_pago" infinitePayHandle={null} />);

    expect(screen.queryByLabelText(/handle/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Infinite Pay"));

    expect(screen.getByLabelText(/handle/i)).toBeInTheDocument();
  });

  it("pre-fills the handle field when one is already stored", () => {
    render(<PaymentProviderForm activeProvider="infinite_pay" infinitePayHandle="meu_handle" />);

    expect(screen.getByLabelText(/handle/i)).toHaveValue("meu_handle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/PaymentProviderForm.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Add the Server Action**

In `src/app/admin/(protected)/integracoes/actions.ts`, add the import and
new action:

```ts
import {
  createUpdateMercadoPagoAccessTokenUseCase,
  createUpdateResendApiKeyUseCase,
  createUpdateSecretKeyUseCase,
  createRequestSecretKeyResetUseCase,
  createResetSecretKeyWithTokenUseCase,
  createUpdateActivePaymentProviderUseCase,
} from "@/infrastructure/composition";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";
```

```ts
export interface UpdatePaymentProviderActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updatePaymentProviderAction(
  _prevState: UpdatePaymentProviderActionState,
  formData: FormData
): Promise<UpdatePaymentProviderActionState> {
  const provider = (formData.get("provider") as string) as PaymentProvider;
  const infinitePayHandle = (formData.get("infinitePayHandle") as string) || undefined;

  try {
    const result = await createUpdateActivePaymentProviderUseCase().execute({ provider, infinitePayHandle });

    const providerLabel = provider === "infinite_pay" ? "Infinite Pay" : "Mercado Pago";
    if (result.generated === 0 && result.failed.length === 0) {
      return { status: "success", message: `Provedor atualizado para ${providerLabel}. Todos os presentes já tinham link — nada a gerar.` };
    }

    const failedSuffix =
      result.failed.length > 0
        ? ` Falharam: ${result.failed.map((item) => item.giftName).join(", ")}.`
        : "";
    return {
      status: "success",
      message: `Provedor atualizado para ${providerLabel}. ${result.generated} link(s) gerado(s), ${result.failed.length} falharam.${failedSuffix}`,
    };
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível atualizar o provedor de pagamento agora." };
  }
}
```

(`InvalidSecurityCredentialError` is already imported at the top of this
file from prior code — no new import needed for it.)

- [ ] **Step 4: Create `PaymentProviderForm.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import {
  updatePaymentProviderAction,
  type UpdatePaymentProviderActionState,
} from "@/app/admin/(protected)/integracoes/actions";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";

interface PaymentProviderFormProps {
  activeProvider: PaymentProvider;
  infinitePayHandle: string | null;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdatePaymentProviderActionState = { status: "idle" };

export function PaymentProviderForm({ activeProvider, infinitePayHandle }: PaymentProviderFormProps) {
  const [state, formAction, isPending] = useActionState(updatePaymentProviderAction, initialState);
  const [provider, setProvider] = useState<PaymentProvider>(activeProvider);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Provedor de pagamento</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">Escolha qual integração gera os links de pagamento dos presentes.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 font-sans text-sm text-forest">
          <input
            type="radio"
            name="provider"
            value="mercado_pago"
            checked={provider === "mercado_pago"}
            onChange={() => setProvider("mercado_pago")}
          />
          Mercado Pago
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-forest">
          <input
            type="radio"
            name="provider"
            value="infinite_pay"
            checked={provider === "infinite_pay"}
            onChange={() => setProvider("infinite_pay")}
          />
          Infinite Pay
        </label>
      </div>

      {provider === "infinite_pay" && (
        <div>
          <label htmlFor="infinitePayHandle" className="block font-sans text-sm text-forest">
            Handle (InfiniteTag)
          </label>
          <input
            id="infinitePayHandle"
            name="infinitePayHandle"
            defaultValue={infinitePayHandle ?? ""}
            required
            className={inputClassName}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar provedor"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
      {state.status === "success" && <p className="text-xs text-moss">{state.message}</p>}
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/admin/PaymentProviderForm.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire the page**

`src/app/admin/(protected)/integracoes/page.tsx` — add the import and
render the new form above `MercadoPagoTokenForm`:

```ts
import { PaymentProviderForm } from "@/components/admin/PaymentProviderForm";
```

```tsx
<div className="mt-8 flex max-w-md flex-col gap-10">
  {resetToken && <ResetSecretKeyWithTokenForm token={resetToken} />}
  <PaymentProviderForm activeProvider={summary.activePaymentProvider} infinitePayHandle={summary.infinitePayHandle} />
  <MercadoPagoTokenForm
    currentTokenLast4={summary.mercadoPagoAccessTokenLast4}
    hasSecretKey={summary.hasSecretKey}
  />
  <ResendApiKeyForm currentApiKeyLast4={summary.resendApiKeyLast4} hasSecretKey={summary.hasSecretKey} />
  <SecretKeyForm hasSecretKey={summary.hasSecretKey} />
</div>
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/PaymentProviderForm.tsx src/components/admin/PaymentProviderForm.test.tsx "src/app/admin/(protected)/integracoes/actions.ts" "src/app/admin/(protected)/integracoes/page.tsx"
git commit -m "feat: add payment provider selector to Integrações page"
```

---

### Task 16: Gifts list — link status column + bulk generation

**Files:**
- Modify: `src/components/admin/GiftsTable.tsx`
- Modify: `src/components/admin/GiftsTable.test.tsx`
- Create: `src/app/admin/(protected)/presentes/generateLinksAction.ts`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`

**Interfaces:**
- Consumes: `Gift.hasLinkFor` (Task 1), `GenerateMissingPaymentLinksUseCase`
  (Task 8), `GetAdminSecuritySettingsUseCase` (Task 4).
- Produces: `GiftListItem.hasPaymentLink: boolean` prop.

- [ ] **Step 1: Write the failing test**

Add to `src/components/admin/GiftsTable.test.tsx` (extend the existing
`makeGift`/`gifts` fixtures with `hasPaymentLink: true` as the default for
existing tests so they keep passing, then add):

```ts
it("shows a Gerado badge when the gift has a payment link, and Sem link otherwise", () => {
  render(
    <GiftsTable
      gifts={[
        makeGift({ id: "1", name: "Com link", hasPaymentLink: true }),
        makeGift({ id: "2", name: "Sem link", hasPaymentLink: false }),
      ]}
    />
  );

  const rows = screen.getAllByRole("row");
  expect(rows[1]).toHaveTextContent("Gerado");
  expect(rows[2]).toHaveTextContent("Sem link");
});
```

Update `makeGift`'s default return object and the `GiftListItem` fixtures
list (`gifts` at module scope) to include `hasPaymentLink: true` so every
pre-existing test keeps passing unmodified.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx`
Expected: FAIL — `hasPaymentLink` not a recognized prop / no "Gerado" text.

- [ ] **Step 3: Update `GiftsTable.tsx`**

Add `hasPaymentLink: boolean` to `GiftListItem`:

```ts
export interface GiftListItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: GiftStatus;
  createdAt: Date;
  hasPaymentLink: boolean;
}
```

Add a new table header cell after "Status":

```tsx
<th className="py-2 pr-4">Link</th>
```

Add a new table cell after the status cell:

```tsx
<td className="py-3 pr-4">
  {gift.hasPaymentLink ? (
    <span className="rounded-full bg-moss/10 px-2 py-1 font-sans text-xs text-moss">Gerado</span>
  ) : (
    <span className="rounded-full bg-danger/10 px-2 py-1 font-sans text-xs text-danger">Sem link</span>
  )}
</td>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx`
Expected: PASS

- [ ] **Step 5: Add the "Gerar links pendentes" button**

Still in `GiftsTable.tsx`, add the import:

```ts
import { generateMissingPaymentLinksAction } from "@/app/admin/(protected)/presentes/generateLinksAction";
import { useActionState } from "react";
```

Add state and a button above the filters row (inside the returned `<div>`,
before the `<div className="mt-6 flex flex-wrap gap-4">` filters block):

```tsx
const hasMissingLinks = gifts.some((gift) => !gift.hasPaymentLink);
const [generateState, generateAction, isGenerating] = useActionState(generateMissingPaymentLinksAction, {
  status: "idle" as const,
});
```

```tsx
{hasMissingLinks && (
  <form action={generateAction} className="mt-4">
    <button
      type="submit"
      disabled={isGenerating}
      className="rounded-full border border-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10 disabled:opacity-60"
    >
      {isGenerating ? "Gerando..." : "Gerar links pendentes"}
    </button>
    {generateState.status === "success" && (
      <p className="mt-2 font-sans text-xs text-moss">{generateState.message}</p>
    )}
    {generateState.status === "error" && (
      <p role="alert" className="mt-2 font-sans text-xs text-danger">
        {generateState.message}
      </p>
    )}
  </form>
)}
```

(Place this block right after the opening `<div>` and before the "mt-6
flex flex-wrap gap-4" filters `<div>`.)

- [ ] **Step 6: Write the failing test for the button**

Add to `GiftsTable.test.tsx`:

```ts
vi.mock("@/app/admin/(protected)/presentes/generateLinksAction", () => ({
  generateMissingPaymentLinksAction: vi.fn(),
}));
```

```ts
it("shows the bulk generation button only when some gift is missing a link", () => {
  const { rerender } = render(<GiftsTable gifts={[makeGift({ hasPaymentLink: true })]} />);
  expect(screen.queryByRole("button", { name: "Gerar links pendentes" })).not.toBeInTheDocument();

  rerender(<GiftsTable gifts={[makeGift({ hasPaymentLink: false })]} />);
  expect(screen.getByRole("button", { name: "Gerar links pendentes" })).toBeInTheDocument();
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx`
Expected: PASS

- [ ] **Step 8: Create the Server Action**

`src/app/admin/(protected)/presentes/generateLinksAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  createGenerateMissingPaymentLinksUseCase,
  createGetAdminSecuritySettingsUseCase,
} from "@/infrastructure/composition";

export interface GenerateMissingPaymentLinksActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function generateMissingPaymentLinksAction(
  _prevState: GenerateMissingPaymentLinksActionState,
  _formData: FormData
): Promise<GenerateMissingPaymentLinksActionState> {
  try {
    const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
    const result = await createGenerateMissingPaymentLinksUseCase().execute(activePaymentProvider);

    revalidatePath("/admin/presentes");
    revalidatePath("/admin/presentes/[id]", "page");

    if (result.generated === 0 && result.failed.length === 0) {
      return { status: "success", message: "Todos os presentes já tinham link — nada a gerar." };
    }

    const failedSuffix =
      result.failed.length > 0 ? ` Falharam: ${result.failed.map((item) => item.giftName).join(", ")}.` : "";
    return {
      status: "success",
      message: `${result.generated} link(s) gerado(s), ${result.failed.length} falharam.${failedSuffix}`,
    };
  } catch {
    return { status: "error", message: "Não foi possível gerar os links agora." };
  }
}
```

- [ ] **Step 9: Wire the list page**

`src/app/admin/(protected)/presentes/page.tsx` — fetch the active provider
and compute `hasPaymentLink` per gift:

```ts
import { createListGiftsUseCase, createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
```

```tsx
export default async function AdminGiftsPage() {
  const backendConfigured = isBackendConfigured();
  let gifts: Gift[] | null = null;
  let activeProvider: PaymentProvider = "mercado_pago";

  if (backendConfigured) {
    try {
      gifts = await createListGiftsUseCase().execute();
      activeProvider = (await createGetAdminSecuritySettingsUseCase().execute()).activePaymentProvider;
    } catch {
      gifts = null;
    }
  }

  // ...unchanged notice/empty states...

  <GiftsTable
    gifts={gifts.map((gift) => ({
      id: gift.id!,
      name: gift.name,
      category: gift.category,
      price: gift.price,
      status: gift.status,
      createdAt: gift.createdAt,
      hasPaymentLink: gift.hasLinkFor(activeProvider),
    }))}
  />
```

Add the import: `import type { PaymentProvider } from "@/domain/entities/PaymentProvider";`

- [ ] **Step 10: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/components/admin/GiftsTable.tsx src/components/admin/GiftsTable.test.tsx "src/app/admin/(protected)/presentes/generateLinksAction.ts" "src/app/admin/(protected)/presentes/page.tsx"
git commit -m "feat: show payment link status and add bulk link generation to gifts list"
```

---

### Task 17: Gift edit page — provider-scoped link + manual generation button

**Files:**
- Modify: `src/components/admin/GiftForm.tsx`
- Modify: `src/components/admin/GiftForm.test.tsx`
- Create: `src/app/admin/(protected)/presentes/generateSingleLinkAction.ts`
- Modify: `src/app/admin/(protected)/presentes/[id]/page.tsx`

**Interfaces:**
- Consumes: `RefreshGiftPaymentLinkUseCase` (Task 7),
  `GetAdminSecuritySettingsUseCase` (Task 4), `Gift.checkoutUrlFor` (Task 1).

- [ ] **Step 1: Read the existing `GiftForm.test.tsx`**

Read `src/components/admin/GiftForm.test.tsx` fully first, to match its
render helper / default props pattern exactly before adding to it.

- [ ] **Step 2: Write the failing test**

Add (adapting to whatever render helper the existing file already defines):

```ts
it("shows the Gerar link de pagamento button on the edit form", () => {
  render(<GiftForm defaultValues={{ id: "gift-1", name: "Jogo de panelas", description: "d", imageUrl: "", price: 100, category: "casa" }} checkoutUrl={null} />);

  expect(screen.getByRole("button", { name: "Gerar link de pagamento" })).toBeInTheDocument();
});
```

(If the file mocks `upsertGiftAction` via `vi.mock`, add a matching mock for
`generateSingleLinkAction` from
`@/app/admin/(protected)/presentes/generateSingleLinkAction`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/admin/GiftForm.test.tsx`
Expected: FAIL — no such button.

- [ ] **Step 4: Create the Server Action**

`src/app/admin/(protected)/presentes/generateSingleLinkAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  createListGiftsUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createGetAdminSecuritySettingsUseCase,
} from "@/infrastructure/composition";

export interface GenerateSingleLinkActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function generateSingleLinkAction(
  _prevState: GenerateSingleLinkActionState,
  formData: FormData
): Promise<GenerateSingleLinkActionState> {
  const giftId = (formData.get("giftId") as string) || "";
  if (!giftId) {
    return { status: "error", message: "Presente inválido." };
  }

  try {
    const gifts = await createListGiftsUseCase().execute();
    const gift = gifts.find((candidate) => candidate.id === giftId);
    if (!gift) {
      return { status: "error", message: "Presente não encontrado." };
    }

    const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
    await createRefreshGiftPaymentLinkUseCase().execute(gift, activePaymentProvider);

    revalidatePath(`/admin/presentes/${giftId}`);
    revalidatePath("/admin/presentes");

    return { status: "success", message: "Link de pagamento gerado com sucesso." };
  } catch {
    return { status: "error", message: "Não foi possível gerar o link agora." };
  }
}
```

- [ ] **Step 5: Update `GiftForm.tsx`**

Add the import:

```ts
import {
  generateSingleLinkAction,
  type GenerateSingleLinkActionState,
} from "@/app/admin/(protected)/presentes/generateSingleLinkAction";
```

Inside the component, alongside the existing `useActionState` call:

```ts
const initialGenerateLinkState: GenerateSingleLinkActionState = { status: "idle" };
const [generateLinkState, generateLinkAction, isGeneratingLink] = useActionState(
  generateSingleLinkAction,
  initialGenerateLinkState
);
```

(`initialGenerateLinkState` can be declared once at module scope alongside
`initialUpsertGiftActionState`, matching the existing style, rather than
re-created on every render — prefer that placement.)

Replace the existing `{checkoutUrl && (...)}` block (the "Link de
pagamento" read-only field) with a version that always renders the
generate button, and the read-only field only when a link exists:

```tsx
{defaultValues?.id && (
  <div>
    <label className="block font-sans text-sm text-forest">Link de pagamento</label>
    {checkoutUrl ? (
      <div className="mt-1 flex items-center gap-2">
        <input
          id="checkoutUrl"
          type="text"
          readOnly
          value={checkoutUrl}
          onFocus={(event) => event.target.select()}
          className={cn(inputClassName, "min-w-0")}
        />
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(checkoutUrl)}
          className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
        >
          Copiar link
        </button>
      </div>
    ) : (
      <p className="mt-1 font-sans text-xs text-forest/70">Nenhum link gerado para o provedor ativo ainda.</p>
    )}
    <form action={generateLinkAction} className="mt-2">
      <input type="hidden" name="giftId" value={defaultValues.id} />
      <button
        type="submit"
        disabled={isGeneratingLink}
        className="rounded-full border border-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10 disabled:opacity-60"
      >
        {isGeneratingLink ? "Gerando..." : "Gerar link de pagamento"}
      </button>
      {generateLinkState.status === "success" && (
        <p className="mt-1 font-sans text-xs text-moss">{generateLinkState.message}</p>
      )}
      {generateLinkState.status === "error" && (
        <p role="alert" className="mt-1 font-sans text-xs text-danger">
          {generateLinkState.message}
        </p>
      )}
    </form>
  </div>
)}
```

This replaces the old `{checkoutUrl && (...)}` block entirely; it now
renders whenever `defaultValues?.id` is set (i.e., only in edit mode, same
condition as before), regardless of whether `checkoutUrl` is currently set.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GiftForm.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire the edit page**

`src/app/admin/(protected)/presentes/[id]/page.tsx`:

```ts
import { createListGiftsUseCase, createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
```

```tsx
let gifts;
let activeProvider: PaymentProvider = "mercado_pago";
try {
  gifts = await createListGiftsUseCase().execute();
  activeProvider = (await createGetAdminSecuritySettingsUseCase().execute()).activePaymentProvider;
} catch {
  // ...unchanged error branch...
}
```

```tsx
<GiftForm
  defaultValues={{
    id: gift.id,
    name: gift.name,
    description: gift.description,
    imageUrl: gift.imageUrl ?? "",
    price: gift.price,
    category: gift.category,
  }}
  checkoutUrl={gift.checkoutUrlFor(activeProvider)}
  existingCategories={existingCategories}
/>
```

Add the import: `import type { PaymentProvider } from "@/domain/entities/PaymentProvider";`

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/GiftForm.tsx src/components/admin/GiftForm.test.tsx "src/app/admin/(protected)/presentes/generateSingleLinkAction.ts" "src/app/admin/(protected)/presentes/[id]/page.tsx"
git commit -m "feat: scope gift edit checkout link to active provider, add manual link generation"
```

---

## Final Verification

After Task 17:

- [ ] Run `npx vitest run` — full suite green.
- [ ] Run `npx tsc --noEmit` (or the project's standard typecheck script —
  check `package.json`) to catch any cross-file type drift the task-by-task
  narrative might have missed (e.g. a stray `paymentGateway` reference).
- [ ] Grep for `paymentGateway:` and `.withPreference(` across `src/` — both
  should return zero matches (fully replaced by `mercadoPagoGateway`/
  `infinitePayGateway` and `withProviderReference` respectively).
- [ ] Manually exercise, if credentials are available: switching provider on
  Integrações, generating links, the guest checkout modal's optional phone
  field, and both webhook routes via a manual `curl`/Postman POST — this
  plan's automated tests cover logic, not a live Mercado Pago/Infinite Pay
  round-trip.
