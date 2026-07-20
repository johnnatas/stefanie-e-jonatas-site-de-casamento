# Gift Reservation Auto-Expiry + "Reserve for Later" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No gift reservation blocks a gift indefinitely. Immediate checkout ("Presentear agora") holds the gift for 30 minutes; an explicit "Reservar para depois" flow holds it until a guest-chosen date (capped at 30 days before the wedding). Either way, an unpaid reservation releases itself automatically — no cron needed yet, the release happens lazily whenever gifts are listed.

**Architecture:** `Gift` gains a `reservedUntil` deadline; `GiftContribution` gains an `expectedPaymentDate` and a new `"expired"` status. `ListGiftsUseCase` sweeps past-deadline reservations back to available on every call (shared by the public and admin gift lists). `CreateGiftContributionUseCase` takes an optional `expectedPaymentDate` that determines the reservation window. A new Server Action handles the "reserve for later" form without redirecting, so the client can show a confirmation modal.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Zod v4, Supabase Postgres 17, Vitest, Testing Library.

## Global Constraints

- Never `git add -A` — stage explicit file lists only.
- "Presentear agora" reserves the gift for exactly 30 minutes from the moment of contribution creation.
- "Reservar para depois" requires an `expectedPaymentDate` that is not in the past and no later than 30 days before the wedding date (`weddingDateIso` from site settings content); the reservation holds until the end of that day (`${date}T23:59:59-03:00`).
- When a reservation's deadline has passed, its pending contribution becomes `"expired"` (distinct from `"rejected"`, which stays reserved for an explicit Mercado Pago decline) and the gift releases back to `"available"`.
- The sweep that performs this release runs inside `ListGiftsUseCase`, consumed by both the public `/presentes` page and the admin `/admin/presentes` page — no cron job in this plan.
- The "Reservar para depois" button is hidden entirely once fewer than 30 days remain before the wedding.
- Follow existing code patterns/style exactly (Clean Architecture, existing Tailwind conventions, existing Server Action error-handling shape).

---

## Task 1: `Gift` entity — `reservedUntil`

**Files:**
- Modify: `src/domain/entities/Gift.ts`
- Modify: `src/domain/entities/Gift.test.ts`

**Interfaces:**
- Produces: `Gift.reservedUntil: Date | null`, `Gift.reserve(reservedUntil: Date): Gift` (signature change from the current no-arg `reserve()`) — consumed by Task 4 (`CreateGiftContributionUseCase`) and Task 5 (`ListGiftsUseCase`'s sweep).
- `markAsPaid()` and `releaseToAvailable()` now clear `reservedUntil` back to `null`.

- [ ] **Step 1: Write the failing/updated tests**

Replace the full content of `src/domain/entities/Gift.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

const validProps = {
  name: "Jogo de panelas",
  description: "Jogo de panelas antiaderentes",
  imageUrl: "/placeholder-gift.jpg",
  price: 350,
  category: "cozinha",
};

const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

describe("Gift", () => {
  it("creates a gift defaulting to available status", () => {
    const gift = Gift.create(validProps);

    expect(gift.status).toBe("available");
    expect(gift.isAvailable()).toBe(true);
    expect(gift.reservedUntil).toBeNull();
  });

  it("rejects a non-positive price", () => {
    expect(() => Gift.create({ ...validProps, price: 0 })).toThrow(InvalidGiftDataError);
  });

  it("reserves an available gift until the given instant", () => {
    const gift = Gift.create(validProps);

    const reserved = gift.reserve(oneHourFromNow);

    expect(reserved.status).toBe("reserved");
    expect(reserved.isAvailable()).toBe(false);
    expect(reserved.reservedUntil).toBe(oneHourFromNow);
  });

  it("does not allow reserving a gift that is already reserved", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow);

    expect(() => gift.reserve(oneHourFromNow)).toThrow(GiftNotAvailableError);
  });

  it("marks a gift as paid and clears the reservation deadline", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).markAsPaid();

    expect(gift.status).toBe("paid");
    expect(gift.reservedUntil).toBeNull();
  });

  it("does not allow releasing a paid gift back to available", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).markAsPaid();

    expect(() => gift.releaseToAvailable()).toThrow(GiftNotAvailableError);
  });

  it("clears the reservation deadline when releasing back to available", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).releaseToAvailable();

    expect(gift.status).toBe("available");
    expect(gift.reservedUntil).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/entities/Gift.test.ts`
Expected: FAIL — `reserve()` doesn't accept an argument yet and `reservedUntil` doesn't exist.

- [ ] **Step 3: Implement**

Replace the full content of `src/domain/entities/Gift.ts`:

```ts
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

export type GiftStatus = "available" | "reserved" | "paid";

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
  createdAt?: Date;
}

export class Gift {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string | null;
  readonly price: number;
  readonly category: string;
  readonly status: GiftStatus;
  readonly reservedUntil: Date | null;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoCheckoutUrl: string | null;
  readonly createdAt: Date;

  private constructor(props: GiftProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.imageUrl = props.imageUrl;
    this.price = props.price;
    this.category = props.category.trim();
    this.status = props.status ?? "available";
    this.reservedUntil = props.reservedUntil ?? null;
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoCheckoutUrl = props.mercadoPagoCheckoutUrl ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GiftProps): Gift {
    if (!props.name || props.name.trim().length < 2) {
      throw new InvalidGiftDataError("Gift name must have at least 2 characters.");
    }

    if (!Number.isFinite(props.price) || props.price <= 0) {
      throw new InvalidGiftDataError("Gift price must be a positive number.");
    }

    if (!props.category || props.category.trim().length === 0) {
      throw new InvalidGiftDataError("Gift category is required.");
    }

    return new Gift(props);
  }

  isAvailable(): boolean {
    return this.status === "available";
  }

  reserve(reservedUntil: Date): Gift {
    if (!this.isAvailable()) {
      throw new GiftNotAvailableError(`Gift "${this.name}" is not available.`);
    }

    return new Gift({ ...this, status: "reserved", reservedUntil });
  }

  markAsPaid(): Gift {
    return new Gift({ ...this, status: "paid", reservedUntil: null });
  }

  releaseToAvailable(): Gift {
    if (this.status === "paid") {
      throw new GiftNotAvailableError(`Gift "${this.name}" is already paid and cannot be released.`);
    }

    return new Gift({ ...this, status: "available", reservedUntil: null });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/entities/Gift.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: an error in `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts` (still calls `gift.reserve()` with no argument) — expected, fixed in Task 4. No other errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/Gift.ts src/domain/entities/Gift.test.ts
git commit -m "feat(gifts): add reservedUntil deadline to Gift.reserve()"
```

---

## Task 2: `GiftContribution` entity — `expectedPaymentDate` + `"expired"` status

**Files:**
- Modify: `src/domain/entities/GiftContribution.ts`
- Modify: `src/domain/entities/GiftContribution.test.ts`

**Interfaces:**
- Produces: `GiftContribution.expectedPaymentDate: Date | null`, `ContributionStatus` gains `"expired"`, `GiftContribution.expire(): GiftContribution` — consumed by Task 4 (`CreateGiftContributionUseCase`), Task 5 (`ListGiftsUseCase`'s sweep), and Task 9 (Pagamentos page).

- [ ] **Step 1: Write the failing/updated tests**

Replace the full content of `src/domain/entities/GiftContribution.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { InvalidContributionDataError } from "@/domain/errors/DomainError";

const validProps = {
  giftId: "gift-1",
  guestName: "João Souza",
  guestEmail: "joao@example.com",
  amount: 150,
};

describe("GiftContribution", () => {
  it("creates a pending contribution by default", () => {
    const contribution = GiftContribution.create(validProps);

    expect(contribution.status).toBe("pending");
  });

  it("rejects a non-positive amount", () => {
    expect(() => GiftContribution.create({ ...validProps, amount: 0 })).toThrow(InvalidContributionDataError);
  });

  it("attaches a Mercado Pago preference id", () => {
    const contribution = GiftContribution.create(validProps).withPreference("pref-123");

    expect(contribution.mercadoPagoPreferenceId).toBe("pref-123");
  });

  it("approves a contribution with a payment id", () => {
    const contribution = GiftContribution.create(validProps).approve("payment-1");

    expect(contribution.status).toBe("approved");
    expect(contribution.mercadoPagoPaymentId).toBe("payment-1");
  });

  it("rejects a contribution with a payment id", () => {
    const contribution = GiftContribution.create(validProps).reject("payment-1");

    expect(contribution.status).toBe("rejected");
  });

  it("defaults expectedPaymentDate to null", () => {
    const contribution = GiftContribution.create(validProps);

    expect(contribution.expectedPaymentDate).toBeNull();
  });

  it("stores an expected payment date when provided", () => {
    const date = new Date("2027-05-01T23:59:59-03:00");
    const contribution = GiftContribution.create({ ...validProps, expectedPaymentDate: date });

    expect(contribution.expectedPaymentDate).toBe(date);
  });

  it("expires a pending contribution", () => {
    const contribution = GiftContribution.create(validProps).expire();

    expect(contribution.status).toBe("expired");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/entities/GiftContribution.test.ts`
Expected: FAIL — `expectedPaymentDate` and `expire()` don't exist yet.

- [ ] **Step 3: Implement**

Replace the full content of `src/domain/entities/GiftContribution.ts`:

```ts
import { InvalidContributionDataError } from "@/domain/errors/DomainError";

export type ContributionStatus = "pending" | "approved" | "rejected" | "expired";

export interface GiftContributionProps {
  id?: string;
  giftId: string;
  guestName: string;
  guestEmail: string;
  amount: number;
  status?: ContributionStatus;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  expectedPaymentDate?: Date | null;
  createdAt?: Date;
}

export class GiftContribution {
  readonly id?: string;
  readonly giftId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoPaymentId?: string;
  readonly expectedPaymentDate: Date | null;
  readonly createdAt: Date;

  private constructor(props: GiftContributionProps) {
    this.id = props.id;
    this.giftId = props.giftId;
    this.guestName = props.guestName.trim();
    this.guestEmail = props.guestEmail.trim().toLowerCase();
    this.amount = props.amount;
    this.status = props.status ?? "pending";
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoPaymentId = props.mercadoPagoPaymentId;
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

  withPreference(preferenceId: string): GiftContribution {
    return new GiftContribution({ ...this, mercadoPagoPreferenceId: preferenceId });
  }

  approve(paymentId: string): GiftContribution {
    return new GiftContribution({ ...this, status: "approved", mercadoPagoPaymentId: paymentId });
  }

  reject(paymentId: string): GiftContribution {
    return new GiftContribution({ ...this, status: "rejected", mercadoPagoPaymentId: paymentId });
  }

  expire(): GiftContribution {
    return new GiftContribution({ ...this, status: "expired" });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/entities/GiftContribution.test.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: same single known error as Task 1 (`CreateGiftContributionUseCase.ts`'s `gift.reserve()` call), plus a new error in `src/app/admin/(protected)/pagamentos/page.tsx` (its `STATUS_LABEL` record is no longer exhaustive over `ContributionStatus`) — both expected, fixed in Tasks 4 and 9 respectively.

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/GiftContribution.ts src/domain/entities/GiftContribution.test.ts
git commit -m "feat(gifts): add expectedPaymentDate and expired status to GiftContribution"
```

---

## Task 3: Persist the new columns (Supabase repositories + migration)

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGiftRepository.ts`
- Modify: `src/infrastructure/supabase/SupabaseGiftContributionRepository.ts`
- Create: `supabase/migrations/0005_gift_reservation_expiry.sql`

**Interfaces:**
- Consumes: `Gift.reservedUntil` (Task 1), `GiftContribution.expectedPaymentDate` (Task 2).
- No new interfaces produced — this task only makes existing fields durable.

- [ ] **Step 1: Update `SupabaseGiftRepository`**

Replace the full content of `src/infrastructure/supabase/SupabaseGiftRepository.ts`:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Gift, GiftStatus } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

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
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGiftRepository implements GiftRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(gift: Gift): Promise<Gift> {
    const { data, error } = await this.client
      .from("gifts")
      .insert({
        name: gift.name,
        description: gift.description,
        image_url: gift.imageUrl,
        price: gift.price,
        category: gift.category,
        status: gift.status,
        reserved_until: gift.reservedUntil ? gift.reservedUntil.toISOString() : null,
        mercado_pago_preference_id: gift.mercadoPagoPreferenceId ?? null,
        mercado_pago_checkout_url: gift.mercadoPagoCheckoutUrl,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save gift: ${error.message}`);
    }

    return toEntity(data as GiftRow);
  }

  async update(gift: Gift): Promise<Gift> {
    const { data, error } = await this.client
      .from("gifts")
      .update({
        name: gift.name,
        description: gift.description,
        image_url: gift.imageUrl,
        price: gift.price,
        category: gift.category,
        status: gift.status,
        reserved_until: gift.reservedUntil ? gift.reservedUntil.toISOString() : null,
        mercado_pago_preference_id: gift.mercadoPagoPreferenceId ?? null,
        mercado_pago_checkout_url: gift.mercadoPagoCheckoutUrl,
      })
      .eq("id", gift.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update gift: ${error.message}`);
    }

    return toEntity(data as GiftRow);
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client.from("gifts").delete({ count: "exact" }).eq("id", id);

    if (error) {
      if (error.code === "23503") {
        throw new GiftHasContributionsError(
          "Não é possível excluir: este presente já tem contribuições registradas."
        );
      }
      throw new Error(`Failed to delete gift: ${error.message}`);
    }

    if (!count) {
      throw new Error(`Gift with id ${id} not found.`);
    }
  }

  async findAll(): Promise<Gift[]> {
    const { data, error } = await this.client
      .from("gifts")
      .select()
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list gifts: ${error.message}`);
    }

    return (data as GiftRow[]).map(toEntity);
  }

  async findById(id: string): Promise<Gift | null> {
    const { data, error } = await this.client.from("gifts").select().eq("id", id).maybeSingle();

    if (error) {
      throw new Error(`Failed to find gift: ${error.message}`);
    }

    return data ? toEntity(data as GiftRow) : null;
  }
}
```

- [ ] **Step 2: Update `SupabaseGiftContributionRepository`**

Edit `src/infrastructure/supabase/SupabaseGiftContributionRepository.ts`. Add `expected_payment_date: string | null;` to the `GiftContributionRow` interface, right after `mercado_pago_payment_id`:

```ts
interface GiftContributionRow {
  id: string;
  gift_id: string;
  guest_name: string;
  guest_email: string;
  amount: number;
  status: ContributionStatus;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  expected_payment_date: string | null;
  created_at: string;
}
```

Update `toEntity` to map it:

```ts
function toEntity(row: GiftContributionRow): GiftContribution {
  return GiftContribution.create({
    id: row.id,
    giftId: row.gift_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    amount: row.amount,
    status: row.status,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoPaymentId: row.mercado_pago_payment_id ?? undefined,
    expectedPaymentDate: row.expected_payment_date ? new Date(row.expected_payment_date) : null,
    createdAt: new Date(row.created_at),
  });
}
```

Update `save()`'s insert payload to include it:

```ts
  async save(contribution: GiftContribution): Promise<GiftContribution> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .insert({
        gift_id: contribution.giftId,
        guest_name: contribution.guestName,
        guest_email: contribution.guestEmail,
        amount: contribution.amount,
        status: contribution.status,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
        expected_payment_date: contribution.expectedPaymentDate
          ? contribution.expectedPaymentDate.toISOString()
          : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save gift contribution: ${error.message}`);
    }

    return toEntity(data as GiftContributionRow);
  }
```

`update()` is unchanged — `expectedPaymentDate` is set once at creation and never mutated afterwards, matching how `guest_name`/`amount` are already excluded from that method's payload.

- [ ] **Step 3: Discover the current status check-constraint name**

Run this via the Supabase MCP `execute_sql` tool (or `supabase db query` if using the CLI) against the project:

```sql
select conname from pg_constraint where conrelid = 'gift_contributions'::regclass and contype = 'c';
```

Note the returned constraint name (expected to be `gift_contributions_status_check`, Postgres's default name for an unnamed `check()` on the `status` column — confirm from the query result rather than assuming).

- [ ] **Step 4: Create the migration file**

Create `supabase/migrations/0005_gift_reservation_expiry.sql` (replace `gift_contributions_status_check` below with whatever Step 3 actually returned, if different):

```sql
alter table gifts
  add column reserved_until timestamptz null;

alter table gift_contributions
  add column expected_payment_date timestamptz null;

alter table gift_contributions
  drop constraint gift_contributions_status_check;

alter table gift_contributions
  add constraint gift_contributions_status_check
  check (status in ('pending', 'approved', 'rejected', 'expired'));

update gifts
  set status = 'available'
  where status = 'reserved';
```

- [ ] **Step 5: Apply the migration to the live Supabase project**

Run the migration file's SQL via the Supabase MCP `execute_sql` tool.

- [ ] **Step 6: Verify**

Run via `execute_sql`:

```sql
select column_name from information_schema.columns where table_name = 'gifts' and column_name = 'reserved_until';
select column_name from information_schema.columns where table_name = 'gift_contributions' and column_name = 'expected_payment_date';
select count(*) from gifts where status = 'reserved';
```

Expected: both column queries return one row each; the last query returns `0`.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: same known errors as after Task 2 (fixed in Tasks 4 and 9).

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGiftRepository.ts src/infrastructure/supabase/SupabaseGiftContributionRepository.ts supabase/migrations/0005_gift_reservation_expiry.sql
git commit -m "feat(gifts): persist reservedUntil and expectedPaymentDate columns"
```

---

## Task 4: `CreateGiftContributionUseCase` — reservation window + `expectedPaymentDate`

**Files:**
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts`
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`

**Interfaces:**
- Consumes: `Gift.reserve(reservedUntil)` (Task 1), `GiftContribution.create({ expectedPaymentDate })` (Task 2).
- Produces: `CreateGiftContributionInput.expectedPaymentDate?: Date`, exported constant `AUTO_CHECKOUT_RESERVATION_MINUTES = 30` — consumed by Task 7 (Server Actions, implicitly via the use case) and referenced by Task 4's own tests.

- [ ] **Step 1: Write the new/updated tests**

Replace the full content of `src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

describe("CreateGiftContributionUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let paymentGateway: FakePaymentGateway;
  let useCase: CreateGiftContributionUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    paymentGateway = new FakePaymentGateway();
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway);

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
    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
    });

    expect(result.contribution.status).toBe("pending");
    expect(result.contribution.amount).toBe(450);
    expect(result.contribution.mercadoPagoPreferenceId).toBeDefined();
    expect(result.checkoutUrl).toContain("mercadopago.test");

    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(gift?.mercadoPagoCheckoutUrl).toBe(result.checkoutUrl);
  });

  it("reuses the gift's stored checkout url instead of creating a new preference", async () => {
    const gift = await giftRepository.findById("gift-1");
    await giftRepository.update(
      Gift.create({
        ...gift!,
        mercadoPagoPreferenceId: "preference-fixed",
        mercadoPagoCheckoutUrl: "https://mercadopago.test/fixed-link",
      })
    );

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
    });

    expect(result.checkoutUrl).toBe("https://mercadopago.test/fixed-link");
    expect(result.contribution.mercadoPagoPreferenceId).toBe("preference-fixed");
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

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: FAIL — `gift.reserve()` still takes no argument, `expectedPaymentDate` isn't wired through yet.

- [ ] **Step 3: Implement**

Replace the full content of `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export const AUTO_CHECKOUT_RESERVATION_MINUTES = 30;

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
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
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(input: CreateGiftContributionInput): Promise<CreateGiftContributionOutput> {
    const gift = await this.giftRepository.findById(input.giftId);
    if (!gift) {
      throw new InvalidGiftDataError(`Gift with id ${input.giftId} was not found.`);
    }

    const reservedUntil =
      input.expectedPaymentDate ?? new Date(Date.now() + AUTO_CHECKOUT_RESERVATION_MINUTES * 60 * 1000);
    const reservedGift = await this.giftRepository.update(gift.reserve(reservedUntil));

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        amount: gift.price,
        expectedPaymentDate: input.expectedPaymentDate ?? null,
      })
    );

    let preferenceId: string;
    let checkoutUrl: string;

    if (reservedGift.mercadoPagoCheckoutUrl && reservedGift.mercadoPagoPreferenceId) {
      preferenceId = reservedGift.mercadoPagoPreferenceId;
      checkoutUrl = reservedGift.mercadoPagoCheckoutUrl;
    } else {
      const preference = await this.paymentGateway.createPreference({
        title: gift.name,
        amount: gift.price,
        externalReference: gift.id!,
        payerEmail: input.guestEmail,
      });
      preferenceId = preference.preferenceId;
      checkoutUrl = preference.checkoutUrl;

      await this.giftRepository.update(
        Gift.create({
          ...reservedGift,
          mercadoPagoPreferenceId: preferenceId,
          mercadoPagoCheckoutUrl: checkoutUrl,
        })
      );
    }

    const contributionWithPreference = await this.giftContributionRepository.update(
      contribution.withPreference(preferenceId)
    );

    return { contribution: contributionWithPreference, checkoutUrl };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the known `pagamentos/page.tsx` `STATUS_LABEL` error remains (fixed in Task 9).

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/gifts/CreateGiftContributionUseCase.ts src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts
git commit -m "feat(gifts): support a caller-provided reservation deadline"
```

---

## Task 5: `ListGiftsUseCase` — sweep expired reservations

**Files:**
- Modify: `src/application/use-cases/gifts/ListGiftsUseCase.ts`
- Create: `src/application/use-cases/gifts/ListGiftsUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `GiftContributionRepository.findPendingByGiftId` (already exists, from the payment-confirmation phase), `GiftContribution.expire()` (Task 2), `Gift.releaseToAvailable()` (Task 1, unchanged signature).
- Produces: `ListGiftsUseCase` constructor changes from `(giftRepository)` to `(giftRepository, giftContributionRepository)` — this is a breaking change to its only caller, `createListGiftsUseCase()` in `composition.ts`, updated in this same task.

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/gifts/ListGiftsUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ListGiftsUseCase } from "@/application/use-cases/gifts/ListGiftsUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("ListGiftsUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let useCase: ListGiftsUseCase;

  beforeEach(() => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    useCase = new ListGiftsUseCase(giftRepository, contributionRepository);
  });

  it("releases a reserved gift and expires its pending contribution once the reservation deadline has passed", async () => {
    const gift = await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
    const reservedGift = await giftRepository.update(gift.reserve(new Date(Date.now() - 1000)));
    const contribution = await contributionRepository.save(
      GiftContribution.create({
        giftId: reservedGift.id!,
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 450,
      })
    );

    const [result] = await useCase.execute();

    expect(result.status).toBe("available");
    expect(result.reservedUntil).toBeNull();
    const updatedContribution = await contributionRepository.findById(contribution.id!);
    expect(updatedContribution?.status).toBe("expired");
  });

  it("leaves a reservation untouched while the deadline is still in the future", async () => {
    const gift = await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
    await giftRepository.update(gift.reserve(new Date(Date.now() + 60 * 60 * 1000)));

    const [result] = await useCase.execute();

    expect(result.status).toBe("reserved");
  });

  it("leaves available gifts untouched", async () => {
    await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );

    const [result] = await useCase.execute();

    expect(result.status).toBe("available");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/gifts/ListGiftsUseCase.test.ts`
Expected: FAIL — `ListGiftsUseCase` doesn't accept a second constructor argument yet and doesn't sweep.

- [ ] **Step 3: Implement**

Replace the full content of `src/application/use-cases/gifts/ListGiftsUseCase.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class ListGiftsUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository
  ) {}

  async execute(): Promise<Gift[]> {
    const gifts = await this.giftRepository.findAll();

    return Promise.all(
      gifts.map(async (gift) => {
        const isExpiredReservation =
          gift.status === "reserved" && gift.reservedUntil !== null && gift.reservedUntil.getTime() <= Date.now();

        if (!isExpiredReservation) {
          return gift;
        }

        const pendingContribution = await this.giftContributionRepository.findPendingByGiftId(gift.id!);
        if (pendingContribution) {
          await this.giftContributionRepository.update(pendingContribution.expire());
        }

        return this.giftRepository.update(gift.releaseToAvailable());
      })
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/gifts/ListGiftsUseCase.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Update the composition root**

Edit `src/infrastructure/composition.ts`. Replace:

```ts
export function createListGiftsUseCase(): ListGiftsUseCase {
  return new ListGiftsUseCase(repositories().giftRepository);
}
```

with:

```ts
export function createListGiftsUseCase(): ListGiftsUseCase {
  const { giftRepository, giftContributionRepository } = repositories();
  return new ListGiftsUseCase(giftRepository, giftContributionRepository);
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the known `pagamentos/page.tsx` `STATUS_LABEL` error remains (fixed in Task 9).

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/gifts/ListGiftsUseCase.ts src/application/use-cases/gifts/ListGiftsUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat(gifts): sweep expired reservations when listing gifts"
```

---

## Task 6: Shared reservation-window helper

**Files:**
- Create: `src/shared/utils/giftReservationWindow.ts`
- Create: `src/shared/utils/giftReservationWindow.test.ts`

**Interfaces:**
- Produces: `RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING = 30`, `latestReservableDate(weddingDate: Date): Date`, `canReserveForLater(weddingDate: Date, now?: Date): boolean`, `parseExpectedPaymentDateEndOfDay(dateOnly: string): Date` — consumed by Task 7 (Server Action validation) and Task 8 (public page, to decide whether to show the "Reservar para depois" button).

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/giftReservationWindow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canReserveForLater,
  latestReservableDate,
  parseExpectedPaymentDateEndOfDay,
  RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING,
} from "@/shared/utils/giftReservationWindow";

describe("giftReservationWindow", () => {
  it("computes the latest reservable date as 30 days before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");

    const result = latestReservableDate(weddingDate);

    expect(result.getTime()).toBe(
      weddingDate.getTime() - RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING * 24 * 60 * 60 * 1000
    );
  });

  it("allows reserving when more than 30 days remain before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");
    const now = new Date("2027-01-01T12:00:00-03:00");

    expect(canReserveForLater(weddingDate, now)).toBe(true);
  });

  it("blocks reserving when fewer than 30 days remain before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");
    const now = new Date("2027-06-01T12:00:00-03:00");

    expect(canReserveForLater(weddingDate, now)).toBe(false);
  });

  it("parses a date-only string as the end of that day in Brasília time", () => {
    const result = parseExpectedPaymentDateEndOfDay("2027-05-01");

    expect(result.toISOString()).toBe(new Date("2027-05-01T23:59:59-03:00").toISOString());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/utils/giftReservationWindow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/shared/utils/giftReservationWindow.ts`:

```ts
export const RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING = 30;

export function latestReservableDate(weddingDate: Date): Date {
  return new Date(weddingDate.getTime() - RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING * 24 * 60 * 60 * 1000);
}

export function canReserveForLater(weddingDate: Date, now: Date = new Date()): boolean {
  return latestReservableDate(weddingDate).getTime() > now.getTime();
}

export function parseExpectedPaymentDateEndOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59-03:00`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/utils/giftReservationWindow.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/giftReservationWindow.ts src/shared/utils/giftReservationWindow.test.ts
git commit -m "feat(gifts): add shared reservation-window helper"
```

---

## Task 7: Server Action — "Reservar para depois"

**Files:**
- Modify: `src/app/presentes/actions.ts`

**Interfaces:**
- Consumes: `createGiftContributionUseCase()` (existing), `getSiteContentOrDefault("settings")` (existing, exported from `@/infrastructure/composition`), `canReserveForLater`, `latestReservableDate`, `parseExpectedPaymentDateEndOfDay` (Task 6).
- Produces: `ReserveGiftForLaterActionState { status: "idle" | "error" | "success"; message?: string; checkoutUrl?: string; guestName?: string; expectedPaymentDate?: string }`, `reserveGiftForLaterAction(prevState, formData)` — consumed by Task 8 (`GiftCard`).

- [ ] **Step 1: Implement**

Replace the full content of `src/app/presentes/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createGiftContributionUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";
import {
  canReserveForLater,
  latestReservableDate,
  parseExpectedPaymentDateEndOfDay,
} from "@/shared/utils/giftReservationWindow";

const contributionSchema = z.object({
  giftId: z.string().min(1, "Presente inválido."),
  guestName: z.string().min(3, "Informe seu nome completo."),
  guestEmail: z.string().email("Informe um e-mail válido."),
});

export interface CreateGiftContributionActionState {
  status: "idle" | "error";
  message?: string;
}

export async function createGiftContributionAction(
  _prevState: CreateGiftContributionActionState,
  formData: FormData
): Promise<CreateGiftContributionActionState> {
  const parsed = contributionSchema.safeParse({
    giftId: formData.get("giftId"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Preencha seu nome e e-mail corretamente." };
  }

  let checkoutUrl: string;
  try {
    const result = await createGiftContributionUseCase().execute(parsed.data);
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    if (error instanceof GiftNotAvailableError) {
      return { status: "error", message: "Esse presente já foi escolhido por outra pessoa." };
    }
    if (error instanceof InvalidGiftDataError) {
      return { status: "error", message: "Presente não encontrado." };
    }
    return {
      status: "error",
      message: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.",
    };
  }

  redirect(checkoutUrl);
}

const reserveForLaterSchema = z.object({
  giftId: z.string().min(1, "Presente inválido."),
  guestName: z.string().min(3, "Informe seu nome completo."),
  guestEmail: z.string().email("Informe um e-mail válido."),
  expectedPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
});

export interface ReserveGiftForLaterActionState {
  status: "idle" | "error" | "success";
  message?: string;
  checkoutUrl?: string;
  guestName?: string;
  expectedPaymentDate?: string;
}

export async function reserveGiftForLaterAction(
  _prevState: ReserveGiftForLaterActionState,
  formData: FormData
): Promise<ReserveGiftForLaterActionState> {
  const parsed = reserveForLaterSchema.safeParse({
    giftId: formData.get("giftId"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    expectedPaymentDate: formData.get("expectedPaymentDate"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Preencha seu nome, e-mail e a data corretamente." };
  }

  const settings = await getSiteContentOrDefault("settings");
  const weddingDate = new Date(settings.weddingDateIso);
  const expectedPaymentDate = parseExpectedPaymentDateEndOfDay(parsed.data.expectedPaymentDate);

  if (expectedPaymentDate.getTime() < Date.now()) {
    return { status: "error", message: "A data prevista não pode estar no passado." };
  }

  if (
    !canReserveForLater(weddingDate) ||
    expectedPaymentDate.getTime() > latestReservableDate(weddingDate).getTime()
  ) {
    return {
      status: "error",
      message: "A data prevista deve ser de até 30 dias antes do casamento.",
    };
  }

  try {
    const result = await createGiftContributionUseCase().execute({
      giftId: parsed.data.giftId,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      expectedPaymentDate,
    });

    revalidatePath("/presentes");

    return {
      status: "success",
      checkoutUrl: result.checkoutUrl,
      guestName: parsed.data.guestName,
      expectedPaymentDate: parsed.data.expectedPaymentDate,
    };
  } catch (error) {
    if (error instanceof GiftNotAvailableError) {
      return { status: "error", message: "Esse presente já foi escolhido por outra pessoa." };
    }
    if (error instanceof InvalidGiftDataError) {
      return { status: "error", message: "Presente não encontrado." };
    }
    return {
      status: "error",
      message: "Não foi possível reservar o presente agora. Tente novamente em instantes.",
    };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the known `pagamentos/page.tsx` `STATUS_LABEL` error remains (fixed in Task 9). `GiftCard.tsx` will show a new error too once Task 8 tries to import `reserveGiftForLaterAction` before it exists on the old `GiftCard.tsx` — not yet, since Task 8 hasn't run; at this checkpoint `presentes/actions.ts` compiles standalone.

- [ ] **Step 3: Commit**

```bash
git add src/app/presentes/actions.ts
git commit -m "feat(gifts): add reserveGiftForLaterAction"
```

---

## Task 8: Public UI — two buttons, later-form, confirmation modal

**Files:**
- Modify: `src/components/gifts/GiftCard.tsx`
- Modify: `src/components/gifts/GiftCard.test.tsx`
- Modify: `src/components/gifts/GiftGrid.tsx`
- Modify: `src/app/presentes/page.tsx`

**Interfaces:**
- Consumes: `reserveGiftForLaterAction`, `ReserveGiftForLaterActionState` (Task 7), `canReserveForLater` (Task 6), `getSiteContentOrDefault` (existing).
- Produces: `GiftCard` and `GiftGrid` both require a new `canReserveForLater: boolean` prop.

- [ ] **Step 1: Write the updated/new tests**

Replace the full content of `src/components/gifts/GiftCard.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "@/components/gifts/GiftCard";
import { GiftDto } from "@/components/gifts/GiftDto";

const createGiftContributionActionMock = vi.fn();
const reserveGiftForLaterActionMock = vi.fn();

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: (...args: unknown[]) => createGiftContributionActionMock(...args),
  reserveGiftForLaterAction: (...args: unknown[]) => reserveGiftForLaterActionMock(...args),
}));

const availableGift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  imageUrl: null,
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftCard", () => {
  it("shows a status badge instead of the buttons when the gift is not available", () => {
    render(<GiftCard gift={{ ...availableGift, status: "paid" }} canReserveForLater />);

    expect(screen.getByText("Presenteado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /presentear agora/i })).not.toBeInTheDocument();
  });

  it("reveals the immediate-checkout form when 'Presentear agora' is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));

    expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Seu e-mail")).toBeInTheDocument();
  });

  it("shows the error message returned by the action when the immediate contribution fails", async () => {
    createGiftContributionActionMock.mockResolvedValue({
      status: "error",
      message: "Esse presente já foi escolhido por outra pessoa.",
    });
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    await user.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse presente já foi escolhido por outra pessoa."
    );
  });

  it("hides the 'Reservar para depois' button when canReserveForLater is false", () => {
    render(<GiftCard gift={availableGift} canReserveForLater={false} />);

    expect(screen.queryByRole("button", { name: /reservar para depois/i })).not.toBeInTheDocument();
  });

  it("shows a confirmation modal with a payment link after reserving for later, and 'Voltar' closes it", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    fireEvent.change(screen.getByLabelText("Quando pretende pagar?"), { target: { value: "2027-05-01" } });
    await user.click(screen.getByRole("button", { name: /reservar presente/i }));

    expect(await screen.findByText("Presente reservado!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para pagamento/i })).toHaveAttribute(
      "href",
      "https://mercadopago.test/checkout"
    );

    await user.click(screen.getByRole("button", { name: /voltar/i }));

    expect(screen.queryByText("Presente reservado!")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: FAIL — `GiftCard` doesn't accept `canReserveForLater` yet, has no second button/form/modal, and `reserveGiftForLaterAction` isn't imported by it.

- [ ] **Step 3: Implement `GiftCard`**

Replace the full content of `src/components/gifts/GiftCard.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import {
  createGiftContributionAction,
  reserveGiftForLaterAction,
  type CreateGiftContributionActionState,
  type ReserveGiftForLaterActionState,
} from "@/app/presentes/actions";

interface GiftCardProps {
  gift: GiftDto;
  canReserveForLater: boolean;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

const initialGiftContributionActionState: CreateGiftContributionActionState = { status: "idle" };
const initialReserveForLaterActionState: ReserveGiftForLaterActionState = { status: "idle" };

export function GiftCard({ gift, canReserveForLater }: GiftCardProps) {
  const [activeForm, setActiveForm] = useState<"none" | "now" | "later">("none");
  const [modalOpen, setModalOpen] = useState(false);

  const [nowState, nowFormAction, isNowPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );
  const [laterState, laterFormAction, isLaterPending] = useActionState(
    reserveGiftForLaterAction,
    initialReserveForLaterActionState
  );

  useEffect(() => {
    if (laterState.status === "success") {
      setModalOpen(true);
    }
  }, [laterState]);

  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col rounded-lg border border-line bg-paper p-5">
      <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-xl text-forest">{gift.name}</h3>
      <p className="mt-1 flex-1 font-sans text-sm text-forest/70">{gift.description}</p>
      <p className="mt-3 font-serif text-lg text-moss">{formatCurrency(gift.price)}</p>

      {gift.status !== "available" && (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isAvailable && activeForm === "none" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveForm("now")}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
          >
            Presentear agora
          </button>
          {canReserveForLater && (
            <button
              type="button"
              onClick={() => setActiveForm("later")}
              className="rounded-full border border-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10"
            >
              Reservar para depois
            </button>
          )}
        </div>
      )}

      {isAvailable && activeForm === "now" && (
        <form action={nowFormAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="giftId" value={gift.id} />
          <input
            name="guestName"
            placeholder="Seu nome"
            required
            minLength={3}
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <input
            name="guestEmail"
            type="email"
            placeholder="Seu e-mail"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <button
            type="submit"
            disabled={isNowPending}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
          >
            {isNowPending ? "Redirecionando..." : "Ir para pagamento"}
          </button>
          {nowState.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {nowState.message}
            </p>
          )}
        </form>
      )}

      {isAvailable && activeForm === "later" && (
        <form action={laterFormAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="giftId" value={gift.id} />
          <input
            name="guestName"
            placeholder="Seu nome"
            required
            minLength={3}
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <input
            name="guestEmail"
            type="email"
            placeholder="Seu e-mail"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <label htmlFor={`expected-payment-date-${gift.id}`} className="font-sans text-xs text-forest/70">
            Quando pretende pagar?
          </label>
          <input
            id={`expected-payment-date-${gift.id}`}
            name="expectedPaymentDate"
            type="date"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLaterPending}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
          >
            {isLaterPending ? "Reservando..." : "Reservar presente"}
          </button>
          {laterState.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {laterState.message}
            </p>
          )}
        </form>
      )}

      {modalOpen && laterState.status === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-paper p-6">
            <h4 className="font-serif text-lg text-forest">Presente reservado!</h4>
            <p className="mt-2 font-sans text-sm text-forest/70">
              Reservamos <strong>{gift.name}</strong> para {laterState.guestName}, com pagamento previsto
              para {laterState.expectedPaymentDate?.split("-").reverse().join("/")}.
            </p>
            <p className="mt-2 font-sans text-sm text-forest/70">
              Se preferir, você já pode pagar agora clicando no botão abaixo, ou voltar e pagar depois.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={laterState.checkoutUrl}
                className="rounded-full bg-moss px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
              >
                Ir para pagamento
              </a>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setActiveForm("none");
                }}
                className="rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `GiftGrid`**

Replace the full content of `src/components/gifts/GiftGrid.tsx`:

```tsx
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftCard } from "@/components/gifts/GiftCard";

interface GiftGridProps {
  gifts: GiftDto[];
  canReserveForLater: boolean;
}

export function GiftGrid({ gifts, canReserveForLater }: GiftGridProps) {
  if (gifts.length === 0) {
    return (
      <p className="text-center font-sans text-forest/70">
        A lista de presentes ainda está sendo preparada.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {gifts.map((gift) => (
        <GiftCard key={gift.id} gift={gift} canReserveForLater={canReserveForLater} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Update the gifts page to compute and pass `canReserveForLater`**

Replace the full content of `src/app/presentes/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createListGiftsUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { canReserveForLater } from "@/shared/utils/giftReservationWindow";

export const metadata: Metadata = {
  title: "Lista de Presentes | Stéfanie & Jonatas",
};

interface GiftsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento aprovado! Muito obrigado pelo carinho.",
  pendente: "Pagamento em processamento. Assim que for aprovado, atualizaremos a lista.",
  falha: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
};

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { status } = await searchParams;

  let gifts: GiftDto[] = [];
  let loadError = false;
  let allowReserveForLater = false;

  if (isBackendConfigured()) {
    try {
      const [result, settings] = await Promise.all([
        createListGiftsUseCase().execute(),
        getSiteContentOrDefault("settings"),
      ]);
      gifts = result.map(mapGiftToDto);
      allowReserveForLater = canReserveForLater(new Date(settings.weddingDateIso));
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="pb-20">
      <h1 className="sr-only">Lista de Presentes</h1>

      <SplitPanel
        eyebrow="Com carinho"
        title="Lista de Presentes"
        tone="dark"
        image={<PlaceholderImage label="Lista de presentes" className="absolute inset-0 h-full w-full" />}
      >
        <p>
          Sua presença já é o nosso maior presente. Mas se quiser nos ajudar a começar essa nova
          fase da vida, preparamos esta lista com muito carinho.
        </p>
      </SplitPanel>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto mt-8 max-w-2xl px-6">
          <p className="rounded-md border border-moss/40 bg-moss/10 px-4 py-3 text-center font-sans text-sm text-forest">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-5xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <GiftGrid gifts={gifts} canReserveForLater={allowReserveForLater} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the known `pagamentos/page.tsx` `STATUS_LABEL` error remains (fixed in Task 9).

- [ ] **Step 8: Commit**

```bash
git add src/components/gifts/GiftCard.tsx src/components/gifts/GiftCard.test.tsx src/components/gifts/GiftGrid.tsx src/app/presentes/page.tsx
git commit -m "feat(gifts): add reserve-for-later flow with confirmation modal to the public gift card"
```

---

## Task 9: Admin — show expected payment date and the new "Expirada" status

**Files:**
- Modify: `src/app/admin/(protected)/pagamentos/buildContributionRows.ts`
- Modify: `src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts`
- Modify: `src/app/admin/(protected)/pagamentos/page.tsx`

**Interfaces:**
- Consumes: `GiftContribution.expectedPaymentDate` (Task 2).
- Produces: `ContributionRow.expectedPaymentDate: Date | null` — consumed by the Pagamentos page's new table column.

- [ ] **Step 1: Write the updated tests**

Replace the full content of `src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildContributionRows } from "@/app/admin/(protected)/pagamentos/buildContributionRows";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

describe("buildContributionRows", () => {
  it("joins gift names by id and orders rows newest first", () => {
    const gift = Gift.create({
      id: "gift-1",
      name: "Liquidificador",
      description: "Liquidificador de alta potência",
      imageUrl: null,
      price: 200,
      category: "cozinha",
    });
    const older = GiftContribution.create({
      id: "c-1",
      giftId: "gift-1",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 200,
      createdAt: new Date("2026-01-01"),
    });
    const newer = GiftContribution.create({
      id: "c-2",
      giftId: "gift-1",
      guestName: "Bruno",
      guestEmail: "bruno@example.com",
      amount: 200,
      createdAt: new Date("2026-02-01"),
    });

    const rows = buildContributionRows([older, newer], [gift]);

    expect(rows.map((row) => row.id)).toEqual(["c-2", "c-1"]);
    expect(rows[0].giftName).toBe("Liquidificador");
    expect(rows[0].guestName).toBe("Bruno");
  });

  it("falls back to a placeholder when the gift is not found", () => {
    const contribution = GiftContribution.create({
      id: "c-1",
      giftId: "missing-gift",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 100,
    });

    const rows = buildContributionRows([contribution], []);

    expect(rows[0].giftName).toBe("—");
  });

  it("carries the expected payment date through when present", () => {
    const contribution = GiftContribution.create({
      id: "c-1",
      giftId: "missing-gift",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 100,
      expectedPaymentDate: new Date("2027-05-01T23:59:59-03:00"),
    });

    const rows = buildContributionRows([contribution], []);

    expect(rows[0].expectedPaymentDate).toEqual(new Date("2027-05-01T23:59:59-03:00"));
  });

  it("defaults expectedPaymentDate to null when absent", () => {
    const contribution = GiftContribution.create({
      id: "c-1",
      giftId: "missing-gift",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 100,
    });

    const rows = buildContributionRows([contribution], []);

    expect(rows[0].expectedPaymentDate).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts"`
Expected: FAIL — `expectedPaymentDate` isn't on `ContributionRow` yet.

- [ ] **Step 3: Implement**

Replace the full content of `src/app/admin/(protected)/pagamentos/buildContributionRows.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

export interface ContributionRow {
  id: string;
  guestName: string;
  giftName: string;
  amount: number;
  status: GiftContribution["status"];
  expectedPaymentDate: Date | null;
  createdAt: Date;
}

export function buildContributionRows(contributions: GiftContribution[], gifts: Gift[]): ContributionRow[] {
  const giftNameById = new Map(gifts.map((gift) => [gift.id!, gift.name]));

  return [...contributions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((contribution) => ({
      id: contribution.id!,
      guestName: contribution.guestName,
      giftName: giftNameById.get(contribution.giftId) ?? "—",
      amount: contribution.amount,
      status: contribution.status,
      expectedPaymentDate: contribution.expectedPaymentDate,
      createdAt: contribution.createdAt,
    }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts"`
Expected: PASS (4/4).

- [ ] **Step 5: Update the Pagamentos page**

Replace the full content of `src/app/admin/(protected)/pagamentos/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createListGiftContributionsUseCase, createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { buildContributionRows, type ContributionRow } from "./buildContributionRows";

export const metadata: Metadata = {
  title: "Pagamentos | Painel Administrativo",
};

const STATUS_LABEL: Record<ContributionRow["status"], string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirada",
};

export default async function AdminPagamentosPage() {
  const backendConfigured = isBackendConfigured();
  let rows: ContributionRow[] | null = null;

  if (backendConfigured) {
    try {
      const [contributions, gifts] = await Promise.all([
        createListGiftContributionsUseCase().execute(),
        createListGiftsUseCase().execute(),
      ]);
      rows = buildContributionRows(contributions, gifts);
    } catch {
      rows = null;
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Pagamentos</h1>

      {!rows ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os pagamentos agora."
                : "Configure o Supabase (.env.local) para ver os pagamentos."
            }
          />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhuma contribuição registrada ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Convidado</th>
                <th className="py-2 pr-4">Presente</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Data prevista de pagamento</th>
                <th className="py-2 pr-4">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{row.guestName}</td>
                  <td className="py-3 pr-4 text-forest/70">{row.giftName}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(row.amount)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[row.status]}</td>
                  <td className="py-3 pr-4 text-forest/70">
                    {row.expectedPaymentDate ? row.expectedPaymentDate.toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">{row.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — this was the last known/expected error, now fixed.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/pagamentos/buildContributionRows.ts" "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts" "src/app/admin/(protected)/pagamentos/page.tsx"
git commit -m "feat(gifts): show expected payment date and expired status in the Pagamentos page"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all test files PASS, no failures.

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: no errors (the 3 pre-existing `<img>` warnings are fine).

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Confirm the migration already landed**

This was applied live during Task 3; re-run the same verification queries via the Supabase MCP `execute_sql` tool as a final sanity check:

```sql
select count(*) from gifts where status = 'reserved' and reserved_until is null;
```

Expected: `0` (no reservations without a deadline should exist going forward — every new reservation is created with one by `CreateGiftContributionUseCase`).

- [ ] **Step 6: Manual smoke test**

Run `npm run dev` and, on `/presentes`:
- Confirm an available gift shows both "Presentear agora" and "Reservar para depois" buttons (assuming more than 30 days remain before the configured wedding date).
- Click "Reservar para depois", fill the form with a valid near-future date, submit, and confirm the modal appears with the recap and a working "Ir para pagamento" link.
- Click "Voltar" and confirm the gift now shows the "Reservado" badge instead of the buttons.
- In `/admin/pagamentos`, confirm the new contribution shows the chosen date in the "Data prevista de pagamento" column.
- (Optional, requires waiting or manually backdating a row) Verify that reloading `/presentes` after a reservation's deadline has passed shows the gift as available again and its contribution as "Expirada" in the Pagamentos page.

Note: as in the previous phase, a full walkthrough requires admin login credentials this session may not have — note any step skipped for that reason rather than assuming it passed.

- [ ] **Step 7: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
