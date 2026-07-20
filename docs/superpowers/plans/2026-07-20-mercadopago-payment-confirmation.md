# Mercado Pago Payment Confirmation (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mercado Pago's payment webhook correctly resolves to the right contribution via the gift id it now carries (a change phase 1 made but deliberately left unresolved on the confirmation side), marks that contribution and its gift correctly, and silently tolerates a duplicate/replayed notification. A new read-only "Pagamentos" admin page lists every contribution.

**Architecture:** `GiftContributionRepository` gains `findPendingByGiftId` (the lookup `ConfirmGiftPaymentUseCase` actually needs now) and `findAll` (for the new admin list), and loses the now-misleading, unused `findByPreferenceId`. A small `ListGiftContributionsUseCase` mirrors the existing `ListGiftsUseCase`/`ListGuestsUseCase` pattern. A pure `buildContributionRows` helper does the gift-name join and newest-first ordering, kept separate from the Server Component page so it stays unit-testable — this project's admin list pages (`convidados/page.tsx`, `presentes/page.tsx`, `dashboard/page.tsx`) are not themselves render-tested; the actual logic they contain always lives in a testable use-case or helper instead, and this plan follows that same split.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Vitest.

## Global Constraints

- Never `git add -A` — stage explicit file lists only.
- `external_reference` on every Mercado Pago preference remains the gift's id (unchanged from phase 1) — this plan only fixes how the *confirmation* side resolves that id back to a contribution, it does not touch preference creation.
- A duplicate/replayed webhook notification (no pending contribution found for the referenced gift) must return cleanly with no error and no state change — not throw, not log as a failure.
- The Pagamentos page is read-only — no status-override actions, per the spec's explicit scope decision.
- Follow existing code patterns/style exactly (Clean Architecture, existing admin list-page Tailwind conventions).

---

## Task 1: `GiftContributionRepository` — add `findPendingByGiftId`/`findAll`, remove `findByPreferenceId`

**Files:**
- Modify: `src/domain/repositories/GiftContributionRepository.ts`
- Modify: `src/infrastructure/supabase/SupabaseGiftContributionRepository.ts`
- Modify: `src/application/testing/InMemoryGiftContributionRepository.ts`

**Interfaces:**
- Produces: `GiftContributionRepository.findPendingByGiftId(giftId: string): Promise<GiftContribution | null>`, `GiftContributionRepository.findAll(): Promise<GiftContribution[]>` — consumed by Task 2 (`ConfirmGiftPaymentUseCase`) and Task 3 (`ListGiftContributionsUseCase`). Removes `findByPreferenceId` — verify no remaining callers before removing (there are none; it was unused dead code, confirmed during the design phase).

- [ ] **Step 1: Update the repository interface**

Replace the full content of `src/domain/repositories/GiftContributionRepository.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";

export interface GiftContributionRepository {
  save(contribution: GiftContribution): Promise<GiftContribution>;
  update(contribution: GiftContribution): Promise<GiftContribution>;
  findById(id: string): Promise<GiftContribution | null>;
  findPendingByGiftId(giftId: string): Promise<GiftContribution | null>;
  findApproved(): Promise<GiftContribution[]>;
  findAll(): Promise<GiftContribution[]>;
}
```

- [ ] **Step 2: Update `SupabaseGiftContributionRepository`**

Replace the full content of `src/infrastructure/supabase/SupabaseGiftContributionRepository.ts`:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { ContributionStatus, GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

interface GiftContributionRow {
  id: string;
  gift_id: string;
  guest_name: string;
  guest_email: string;
  amount: number;
  status: ContributionStatus;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  created_at: string;
}

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
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGiftContributionRepository implements GiftContributionRepository {
  constructor(private readonly client: SupabaseClient) {}

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
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save gift contribution: ${error.message}`);
    }

    return toEntity(data as GiftContributionRow);
  }

  async update(contribution: GiftContribution): Promise<GiftContribution> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .update({
        status: contribution.status,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
      })
      .eq("id", contribution.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update gift contribution: ${error.message}`);
    }

    return toEntity(data as GiftContributionRow);
  }

  async findById(id: string): Promise<GiftContribution | null> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find gift contribution: ${error.message}`);
    }

    return data ? toEntity(data as GiftContributionRow) : null;
  }

  async findPendingByGiftId(giftId: string): Promise<GiftContribution | null> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("gift_id", giftId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find pending gift contribution: ${error.message}`);
    }

    return data ? toEntity(data as GiftContributionRow) : null;
  }

  async findApproved(): Promise<GiftContribution[]> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("status", "approved");

    if (error) {
      throw new Error(`Failed to list approved gift contributions: ${error.message}`);
    }

    return (data as GiftContributionRow[]).map(toEntity);
  }

  async findAll(): Promise<GiftContribution[]> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list gift contributions: ${error.message}`);
    }

    return (data as GiftContributionRow[]).map(toEntity);
  }
}
```

- [ ] **Step 3: Update `InMemoryGiftContributionRepository`**

Replace the full content of `src/application/testing/InMemoryGiftContributionRepository.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class InMemoryGiftContributionRepository implements GiftContributionRepository {
  private contributions: GiftContribution[] = [];
  private nextId = 1;

  async save(contribution: GiftContribution): Promise<GiftContribution> {
    const persisted = GiftContribution.create({
      ...contribution,
      id: contribution.id ?? `contribution-${this.nextId++}`,
    });
    this.contributions.push(persisted);
    return persisted;
  }

  async update(contribution: GiftContribution): Promise<GiftContribution> {
    const index = this.contributions.findIndex((c) => c.id === contribution.id);
    if (index === -1) {
      throw new Error(`Gift contribution with id ${contribution.id} not found.`);
    }
    this.contributions[index] = contribution;
    return contribution;
  }

  async findById(id: string): Promise<GiftContribution | null> {
    return this.contributions.find((c) => c.id === id) ?? null;
  }

  async findPendingByGiftId(giftId: string): Promise<GiftContribution | null> {
    const pending = this.contributions
      .filter((c) => c.giftId === giftId && c.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return pending[0] ?? null;
  }

  async findApproved(): Promise<GiftContribution[]> {
    return this.contributions.filter((c) => c.status === "approved");
  }

  async findAll(): Promise<GiftContribution[]> {
    return [...this.contributions];
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts` (still calls the now-removed `findById` for this purpose — expected, fixed in Task 2). No errors elsewhere, confirming `findByPreferenceId` truly had no other callers.

- [ ] **Step 5: Commit**

```bash
git add src/domain/repositories/GiftContributionRepository.ts src/infrastructure/supabase/SupabaseGiftContributionRepository.ts src/application/testing/InMemoryGiftContributionRepository.ts
git commit -m "feat(payments): add findPendingByGiftId/findAll, remove unused findByPreferenceId"
```

---

## Task 2: Fix `ConfirmGiftPaymentUseCase`'s lookup

**Files:**
- Modify: `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts`
- Modify: `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`

**Interfaces:**
- Consumes: `GiftContributionRepository.findPendingByGiftId` (Task 1).
- Produces: `ConfirmGiftPaymentUseCase.execute(input): Promise<GiftContribution | null>` (return type changes from `Promise<GiftContribution>` to `Promise<GiftContribution | null>` — the webhook route already ignores the return value entirely, so this is not a breaking change for any caller).

- [ ] **Step 1: Update the test first**

Replace the full content of `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("ConfirmGiftPaymentUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let paymentGateway: FakePaymentGateway;
  let createContribution: CreateGiftContributionUseCase;
  let confirmPayment: ConfirmGiftPaymentUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    paymentGateway = new FakePaymentGateway();
    createContribution = new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway);
    confirmPayment = new ConfirmGiftPaymentUseCase(giftRepository, contributionRepository, paymentGateway);

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
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-1", "approved", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-1" });

    expect(updated?.status).toBe("approved");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("rejects the contribution and releases the gift when payment is rejected", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-2", "rejected", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-2" });

    expect(updated?.status).toBe("rejected");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("available");
  });

  it("keeps the contribution pending when the payment is still pending", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-3", "pending", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-3" });

    expect(updated?.status).toBe("pending");
  });

  it("returns null without throwing or changing state when there is no pending contribution (duplicate notification)", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });
    paymentGateway.simulatePayment("payment-4", "approved", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-4" });

    paymentGateway.simulatePayment("payment-4-retry", "approved", "gift-1");
    const result = await confirmPayment.execute({ paymentId: "payment-4-retry" });

    expect(result).toBeNull();
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
Expected: FAIL — `simulatePayment` is now called with `"gift-1"` as the external reference, but the current implementation still calls `findById("gift-1")` on the contribution repository, which won't find anything (contributions are keyed by their own generated id, not the gift id), so `contribution` is `null`/undefined and the use case throws `InvalidContributionDataError` instead of proceeding.

- [ ] **Step 3: Implement the fix**

Replace the full content of `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export interface ConfirmGiftPaymentInput {
  paymentId: string;
}

export class ConfirmGiftPaymentUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(input: ConfirmGiftPaymentInput): Promise<GiftContribution | null> {
    const payment = await this.paymentGateway.getPayment(input.paymentId);

    const contribution = await this.giftContributionRepository.findPendingByGiftId(payment.externalReference);
    if (!contribution) {
      return null;
    }

    if (payment.status === "pending") {
      return contribution;
    }

    const gift = await this.giftRepository.findById(contribution.giftId);

    if (payment.status === "approved") {
      const updatedContribution = await this.giftContributionRepository.update(
        contribution.approve(payment.paymentId)
      );
      if (gift) {
        await this.giftRepository.update(gift.markAsPaid());
      }
      return updatedContribution;
    }

    const updatedContribution = await this.giftContributionRepository.update(
      contribution.reject(payment.paymentId)
    );
    if (gift) {
      await this.giftRepository.update(gift.releaseToAvailable());
    }
    return updatedContribution;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts
git commit -m "fix(payments): resolve payment confirmation by gift id, tolerate duplicate notifications"
```

---

## Task 3: `ListGiftContributionsUseCase` + composition wiring

**Files:**
- Create: `src/application/use-cases/gifts/ListGiftContributionsUseCase.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `GiftContributionRepository.findAll` (Task 1).
- Produces: `ListGiftContributionsUseCase.execute(): Promise<GiftContribution[]>`, `createListGiftContributionsUseCase()` — consumed by Task 5's Pagamentos page.

- [ ] **Step 1: Implement `ListGiftContributionsUseCase`**

Create `src/application/use-cases/gifts/ListGiftContributionsUseCase.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class ListGiftContributionsUseCase {
  constructor(private readonly giftContributionRepository: GiftContributionRepository) {}

  async execute(): Promise<GiftContribution[]> {
    return this.giftContributionRepository.findAll();
  }
}
```

(No dedicated test file for this task — it's a trivial one-line passthrough, matching this codebase's existing precedent: `ListGiftsUseCase`, an identically-shaped passthrough over `GiftRepository.findAll()`, also has no test file of its own. The behavior this use-case exposes is exercised by Task 4's `buildContributionRows` tests and Task 5's manual verification.)

- [ ] **Step 2: Wire into the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after the existing `RefreshGiftPaymentLinkUseCase` import:

```ts
import { ListGiftContributionsUseCase } from "@/application/use-cases/gifts/ListGiftContributionsUseCase";
```

Add this factory function after `createRefreshGiftPaymentLinkUseCase`:

```ts
export function createListGiftContributionsUseCase(): ListGiftContributionsUseCase {
  return new ListGiftContributionsUseCase(repositories().giftContributionRepository);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/application/use-cases/gifts/ListGiftContributionsUseCase.ts src/infrastructure/composition.ts
git commit -m "feat(payments): add ListGiftContributionsUseCase"
```

---

## Task 4: `buildContributionRows` — pure join/sort helper

**Files:**
- Create: `src/app/admin/(protected)/pagamentos/buildContributionRows.ts`
- Test: `src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts`

**Interfaces:**
- Produces: `interface ContributionRow { id: string; guestName: string; giftName: string; amount: number; status: GiftContribution["status"]; createdAt: Date }`, `function buildContributionRows(contributions: GiftContribution[], gifts: Gift[]): ContributionRow[]` — consumed by Task 5's Pagamentos page.

- [ ] **Step 1: Write the failing tests**

Create `src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts`:

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/app/admin/(protected)/pagamentos/buildContributionRows.ts`:

```ts
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

export interface ContributionRow {
  id: string;
  guestName: string;
  giftName: string;
  amount: number;
  status: GiftContribution["status"];
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
      createdAt: contribution.createdAt,
    }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts"`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/pagamentos/buildContributionRows.ts" "src/app/admin/(protected)/pagamentos/buildContributionRows.test.ts"
git commit -m "feat(payments): add buildContributionRows join/sort helper"
```

---

## Task 5: `/admin/pagamentos` page + nav item

**Files:**
- Create: `src/app/admin/(protected)/pagamentos/page.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `createListGiftContributionsUseCase`, `createListGiftsUseCase` (Task 3/existing), `buildContributionRows` (Task 4), `isBackendConfigured`, `ConfigurationNotice`, `formatCurrency` (all existing).

- [ ] **Step 1: Create the Pagamentos page**

Create `src/app/admin/(protected)/pagamentos/page.tsx`:

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
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Convidado</th>
                <th className="py-2 pr-4">Presente</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
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

- [ ] **Step 2: Add the nav item**

Edit `src/app/admin/(protected)/layout.tsx`, changing `ADMIN_NAV`:

```ts
const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Convidados", href: "/admin/convidados" },
  { label: "Presentes", href: "/admin/presentes" },
  { label: "Pagamentos", href: "/admin/pagamentos" },
  { label: "Conteúdo", href: "/admin/conteudo" },
  { label: "Integrações", href: "/admin/integracoes" },
];
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(protected)/pagamentos/page.tsx" "src/app/admin/(protected)/layout.tsx"
git commit -m "feat(payments): add the Pagamentos admin page"
```

---

## Task 6: Final verification

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
Expected: build succeeds, `/admin/pagamentos` appears in the route list.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, log into `/admin`, then:
- Visit `/admin/pagamentos`. Confirm it renders (empty state if no contributions exist yet, or the table if some do).
- Go through a real purchase flow on the public `/presentes` page (or via the existing test Mercado Pago sandbox flow from phase 1) far enough to create a pending contribution, then simulate/complete the payment. Confirm the gift's status updates and the new contribution appears in `/admin/pagamentos` with the correct guest/gift/amount/status/date.
- Confirm the Dashboard's existing "Presentes recebidos"/"Valor arrecadado" counters (unchanged code, but now fed by correctly-confirmed data) reflect the same result.

- [ ] **Step 6: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
