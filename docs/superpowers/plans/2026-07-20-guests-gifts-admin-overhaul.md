# Guests & Gifts Admin Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the couple manage guests and gifts at real-world scale: CSV bulk import (with downloadable template) for both, edit/delete for both, per-field filters on both list pages, a fixed gift-edit page, and clickable Dashboard cards that deep-link into filtered lists.

**Architecture:** Clean Architecture layering stays exactly as-is (`src/domain` → `src/application` → `src/infrastructure` → `src/app`/`src/components`). New capabilities are added by extending existing repository interfaces (`update`/`delete`) and adding new use-cases, following the exact patterns already established by `UpsertGiftUseCase` and `SupabaseGuestRepository`. Filtering is client-side (`GuestsTable`/`GiftsTable` Client Components reading/writing `useSearchParams`), not server-side, because both lists are small. CSV import reuses the existing single-entity use cases (`CreateGuestUseCase`, `UpsertGiftUseCase`) row-by-row rather than adding bulk-insert repository methods.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Zod v4, Supabase (Postgres 17, service-role client only), Vitest + Testing Library, new dependency **`papaparse`** (+ `@types/papaparse`) for CSV parsing.

## Global Constraints

- Never `git add -A` — stage explicit file lists only, per this project's established git safety rule.
- `"use server"` files may only export `async function`s — no exported constants (e.g. `initial*ActionState`) in action files; those constants live in the consuming Client Component.
- CSV only — no XLSX import (explicit scope decision).
- No bulk edit/delete (one row at a time), no photo-via-spreadsheet import, no pagination — all explicit non-goals from the spec.
- Follow `docs/superpowers/specs/2026-07-20-guests-gifts-admin-overhaul-design.md` exactly for copy/labels (Portuguese UI strings, exact column headers, exact error messages).
- Every new Server Action follows the existing `useActionState` + Zod `safeParse` + composition-root factory + `redirect` pattern already used by `createGuestAction`/`upsertGiftAction`.
- Gift-edit bug fix task must reproduce the error locally first (per `systematic-debugging`), not just apply the suspected fix blind.

---

## Task 1: Extend domain errors and repository interfaces

**Files:**
- Modify: `src/domain/errors/DomainError.ts`
- Modify: `src/domain/repositories/GuestRepository.ts`
- Modify: `src/domain/repositories/GiftRepository.ts`

**Interfaces:**
- Produces: `GiftHasContributionsError` (extends `DomainError`), `GuestRepository.update(guest: Guest): Promise<Guest>`, `GuestRepository.delete(id: string): Promise<void>`, `GiftRepository.delete(id: string): Promise<void>`.

- [ ] **Step 1: Add the new domain error**

Edit `src/domain/errors/DomainError.ts`, appending after `InvalidSiteContentError`:

```ts
export class GiftHasContributionsError extends DomainError {}
```

- [ ] **Step 2: Add `update`/`delete` to `GuestRepository`**

Edit `src/domain/repositories/GuestRepository.ts`, the `GuestRepository` interface becomes:

```ts
export interface GuestRepository {
  save(guest: Guest): Promise<Guest>;
  update(guest: Guest): Promise<Guest>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Guest[]>;
  /** Name/nickname/id only — never email, phone, or message. */
  findAllPublicNames(): Promise<GuestPublicSummary[]>;
  findById(id: string): Promise<Guest | null>;
  updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest>;
}
```

- [ ] **Step 3: Add `delete` to `GiftRepository`**

Edit `src/domain/repositories/GiftRepository.ts`, full new content:

```ts
import { Gift } from "@/domain/entities/Gift";

export interface GiftRepository {
  save(gift: Gift): Promise<Gift>;
  update(gift: Gift): Promise<Gift>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Gift[]>;
  findById(id: string): Promise<Gift | null>;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `SupabaseGuestRepository.ts`, `InMemoryGuestRepository.ts`, `SupabaseGiftRepository.ts`, `InMemoryGiftRepository.ts` (missing `update`/`delete` implementations) — this is expected and fixed in Tasks 2-3. No other errors should appear.

- [ ] **Step 5: Commit**

```bash
git add src/domain/errors/DomainError.ts src/domain/repositories/GuestRepository.ts src/domain/repositories/GiftRepository.ts
git commit -m "feat: extend guest/gift repository interfaces with update/delete"
```

---

## Task 2: Implement guest update/delete in both repositories

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGuestRepository.ts`
- Modify: `src/application/testing/InMemoryGuestRepository.ts`
- Test: `src/application/testing/InMemoryGuestRepository.test.ts` (new — exercises the in-memory double directly since it has real branching logic)

**Interfaces:**
- Consumes: `GuestRepository.update`/`delete` from Task 1.
- Produces: working `update`/`delete` on both repository implementations, used by Task 4/5's use-cases.

- [ ] **Step 1: Write the failing test for `InMemoryGuestRepository`**

Create `src/application/testing/InMemoryGuestRepository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

describe("InMemoryGuestRepository", () => {
  it("updates an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Ana Lima", companionsCount: 0, attendanceStatus: "pending" })
    );

    const updated = await repository.update(
      Guest.create({ ...created, fullName: "Ana Lima Souza", companionsCount: 2 })
    );

    expect(updated.fullName).toBe("Ana Lima Souza");
    expect(updated.companionsCount).toBe(2);
    expect((await repository.findById(created.id!))?.fullName).toBe("Ana Lima Souza");
  });

  it("throws GuestNotFoundError when updating a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(
      repository.update(Guest.create({ id: "missing", fullName: "Nobody", companionsCount: 0, attendanceStatus: "pending" }))
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("deletes an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Bruno Reis", companionsCount: 0, attendanceStatus: "pending" })
    );

    await repository.delete(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("throws GuestNotFoundError when deleting a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(repository.delete("missing")).rejects.toThrow(GuestNotFoundError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/testing/InMemoryGuestRepository.test.ts`
Expected: FAIL — `repository.update is not a function`.

- [ ] **Step 3: Implement `update`/`delete` on `InMemoryGuestRepository`**

Edit `src/application/testing/InMemoryGuestRepository.ts`, add these two methods (after `save`, before `findAll`):

```ts
  async update(guest: Guest): Promise<Guest> {
    const index = this.guests.findIndex((existing) => existing.id === guest.id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }
    this.guests[index] = guest;
    return guest;
  }

  async delete(id: string): Promise<void> {
    const index = this.guests.findIndex((existing) => existing.id === id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }
    this.guests.splice(index, 1);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/testing/InMemoryGuestRepository.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Implement `update`/`delete` on `SupabaseGuestRepository`**

Edit `src/infrastructure/supabase/SupabaseGuestRepository.ts`, add these two methods (after `save`, before `findAll`):

```ts
  async update(guest: Guest): Promise<Guest> {
    const { data, error } = await this.client
      .from("guests")
      .update({
        full_name: guest.fullName,
        nickname: guest.nickname ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        companions_count: guest.companionsCount,
        message: guest.message ?? null,
        attendance_status: guest.attendanceStatus,
      })
      .eq("id", guest.id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update guest: ${error.message}`);
    }

    if (!data) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return toEntity(data as GuestRow);
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client.from("guests").delete({ count: "exact" }).eq("id", id);

    if (error) {
      throw new Error(`Failed to delete guest: ${error.message}`);
    }

    if (!count) {
      throw new GuestNotFoundError("Guest not found.");
    }
  }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `SupabaseGuestRepository.ts` or `InMemoryGuestRepository.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGuestRepository.ts src/application/testing/InMemoryGuestRepository.ts src/application/testing/InMemoryGuestRepository.test.ts
git commit -m "feat: implement guest update/delete on both repository implementations"
```

---

## Task 3: Implement gift delete in both repositories (with FK-violation handling)

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGiftRepository.ts`
- Modify: `src/application/testing/InMemoryGiftRepository.ts`
- Test: `src/application/testing/InMemoryGiftRepository.test.ts` (new)

**Interfaces:**
- Consumes: `GiftRepository.delete` from Task 1, `GiftHasContributionsError` from Task 1.
- Produces: working `delete` on both repository implementations, used by Task 6's `DeleteGiftUseCase`.

**Context:** `gift_contributions.gift_id` references `gifts(id)` with no `ON DELETE` clause (Postgres default `NO ACTION`), so deleting a gift with existing contributions raises Postgres error code `23503` (foreign_key_violation). The in-memory double can't reproduce a real FK error, so `InMemoryGiftRepository.delete` just deletes unconditionally — the FK-violation-to-domain-error translation is exercised in Supabase code and covered by `DeleteGiftUseCase`'s own test in Task 6 using a fake repository that simulates the throw.

- [ ] **Step 1: Write the failing test for `InMemoryGiftRepository`**

Create `src/application/testing/InMemoryGiftRepository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { Gift } from "@/domain/entities/Gift";

const baseProps = {
  name: "Jogo de taças",
  description: "Seis taças de cristal",
  imageUrl: "/placeholder.jpg",
  price: 150,
  category: "cozinha",
};

describe("InMemoryGiftRepository", () => {
  it("deletes an existing gift", async () => {
    const repository = new InMemoryGiftRepository();
    const created = await repository.save(Gift.create(baseProps));

    await repository.delete(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("throws when deleting a missing gift", async () => {
    const repository = new InMemoryGiftRepository();

    await expect(repository.delete("missing")).rejects.toThrow("Gift with id missing not found.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/testing/InMemoryGiftRepository.test.ts`
Expected: FAIL — `repository.delete is not a function`.

- [ ] **Step 3: Implement `delete` on `InMemoryGiftRepository`**

Edit `src/application/testing/InMemoryGiftRepository.ts`, add after `update`:

```ts
  async delete(id: string): Promise<void> {
    const index = this.gifts.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Gift with id ${id} not found.`);
    }
    this.gifts.splice(index, 1);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/testing/InMemoryGiftRepository.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Implement `delete` on `SupabaseGiftRepository`**

Edit `src/infrastructure/supabase/SupabaseGiftRepository.ts`. First add the import at the top:

```ts
import { GiftHasContributionsError } from "@/domain/errors/DomainError";
```

Then add this method after `update`:

```ts
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
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `SupabaseGiftRepository.ts` or `InMemoryGiftRepository.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGiftRepository.ts src/application/testing/InMemoryGiftRepository.ts src/application/testing/InMemoryGiftRepository.test.ts
git commit -m "feat: implement gift delete with foreign-key-violation handling"
```

---

## Task 4: `UpdateGuestUseCase`

**Files:**
- Create: `src/application/use-cases/admin/UpdateGuestUseCase.ts`
- Test: `src/application/use-cases/admin/UpdateGuestUseCase.test.ts`

**Interfaces:**
- Consumes: `GuestRepository.update`/`findById` (Task 1/2), `Guest.create` (existing), `GuestNotFoundError` (existing).
- Produces: `UpdateGuestInput { id: string; fullName: string; nickname?: string; email?: string; phone?: string; companionsCount: number; attendanceStatus: AttendanceStatus; message?: string; }`, `UpdateGuestUseCase.execute(input): Promise<Guest>` — consumed by Task 8's edit action.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/admin/UpdateGuestUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpdateGuestUseCase } from "@/application/use-cases/admin/UpdateGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

async function seedGuest(repository: InMemoryGuestRepository) {
  return repository.save(
    Guest.create({ fullName: "Carla Nunes", companionsCount: 0, attendanceStatus: "pending" })
  );
}

describe("UpdateGuestUseCase", () => {
  it("updates every editable field", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await seedGuest(repository);

    const updated = await new UpdateGuestUseCase(repository).execute({
      id: created.id!,
      fullName: "Carla Nunes Silva",
      nickname: "Carlinha",
      email: "carla@example.com",
      phone: "11999999999",
      companionsCount: 2,
      attendanceStatus: "confirmed",
      message: "Mal posso esperar!",
    });

    expect(updated.fullName).toBe("Carla Nunes Silva");
    expect(updated.nickname).toBe("Carlinha");
    expect(updated.email).toBe("carla@example.com");
    expect(updated.companionsCount).toBe(2);
    expect(updated.attendanceStatus).toBe("confirmed");
  });

  it("throws GuestNotFoundError when the guest does not exist", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(
      new UpdateGuestUseCase(repository).execute({
        id: "missing",
        fullName: "Nobody",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("propagates domain validation errors", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await seedGuest(repository);

    await expect(
      new UpdateGuestUseCase(repository).execute({
        id: created.id!,
        fullName: "Al",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/UpdateGuestUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `UpdateGuestUseCase`**

Create `src/application/use-cases/admin/UpdateGuestUseCase.ts`:

```ts
import { AttendanceStatus, Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

export interface UpdateGuestInput {
  id: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  attendanceStatus: AttendanceStatus;
  message?: string;
}

export class UpdateGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: UpdateGuestInput): Promise<Guest> {
    const existingGuest = await this.guestRepository.findById(input.id);
    if (!existingGuest) {
      throw new GuestNotFoundError(`Guest with id ${input.id} was not found.`);
    }

    const updatedGuest = Guest.create({
      id: input.id,
      fullName: input.fullName,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      companionsCount: input.companionsCount,
      attendanceStatus: input.attendanceStatus,
      message: input.message,
      createdAt: existingGuest.createdAt,
    });

    return this.guestRepository.update(updatedGuest);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/UpdateGuestUseCase.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/UpdateGuestUseCase.ts src/application/use-cases/admin/UpdateGuestUseCase.test.ts
git commit -m "feat: add UpdateGuestUseCase"
```

---

## Task 5: `DeleteGuestUseCase`

**Files:**
- Create: `src/application/use-cases/admin/DeleteGuestUseCase.ts`
- Test: `src/application/use-cases/admin/DeleteGuestUseCase.test.ts`

**Interfaces:**
- Consumes: `GuestRepository.delete` (Task 1/2).
- Produces: `DeleteGuestUseCase.execute(id: string): Promise<void>` — consumed by Task 9's delete action.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/admin/DeleteGuestUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DeleteGuestUseCase } from "@/application/use-cases/admin/DeleteGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

describe("DeleteGuestUseCase", () => {
  it("deletes an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Diego Alves", companionsCount: 0, attendanceStatus: "pending" })
    );

    await new DeleteGuestUseCase(repository).execute(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("propagates GuestNotFoundError for a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(new DeleteGuestUseCase(repository).execute("missing")).rejects.toThrow(GuestNotFoundError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/DeleteGuestUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DeleteGuestUseCase`**

Create `src/application/use-cases/admin/DeleteGuestUseCase.ts`:

```ts
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export class DeleteGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(id: string): Promise<void> {
    await this.guestRepository.delete(id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/DeleteGuestUseCase.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/DeleteGuestUseCase.ts src/application/use-cases/admin/DeleteGuestUseCase.test.ts
git commit -m "feat: add DeleteGuestUseCase"
```

---

## Task 6: `DeleteGiftUseCase`

**Files:**
- Create: `src/application/use-cases/admin/DeleteGiftUseCase.ts`
- Test: `src/application/use-cases/admin/DeleteGiftUseCase.test.ts`

**Interfaces:**
- Consumes: `GiftRepository.delete` (Task 1/3), `GiftHasContributionsError` (Task 1).
- Produces: `DeleteGiftUseCase.execute(id: string): Promise<void>` — consumed by Task 10's delete action. Simply delegates to the repository; the FK-violation-to-domain-error translation lives in `SupabaseGiftRepository` (Task 3), so this use-case's own test verifies it propagates whatever the repository throws, using a small fake that simulates the FK error without a real database.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/admin/DeleteGiftUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DeleteGiftUseCase } from "@/application/use-cases/admin/DeleteGiftUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

class ThrowingGiftRepository implements GiftRepository {
  async save(gift: Gift) {
    return gift;
  }
  async update(gift: Gift) {
    return gift;
  }
  async delete(): Promise<void> {
    throw new GiftHasContributionsError(
      "Não é possível excluir: este presente já tem contribuições registradas."
    );
  }
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
}

const baseProps = {
  name: "Liquidificador",
  description: "Liquidificador de alta potência",
  imageUrl: "/placeholder.jpg",
  price: 300,
  category: "cozinha",
};

describe("DeleteGiftUseCase", () => {
  it("deletes an existing gift", async () => {
    const repository = new InMemoryGiftRepository();
    const created = await repository.save(Gift.create(baseProps));

    await new DeleteGiftUseCase(repository).execute(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("propagates GiftHasContributionsError from the repository", async () => {
    await expect(new DeleteGiftUseCase(new ThrowingGiftRepository()).execute("any-id")).rejects.toThrow(
      GiftHasContributionsError
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/DeleteGiftUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DeleteGiftUseCase`**

Create `src/application/use-cases/admin/DeleteGiftUseCase.ts`:

```ts
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export class DeleteGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(id: string): Promise<void> {
    await this.giftRepository.delete(id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/DeleteGiftUseCase.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/DeleteGiftUseCase.ts src/application/use-cases/admin/DeleteGiftUseCase.test.ts
git commit -m "feat: add DeleteGiftUseCase"
```

---

## Task 7: Wire new use-cases into the composition root

**Files:**
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `UpdateGuestUseCase` (Task 4), `DeleteGuestUseCase` (Task 5), `DeleteGiftUseCase` (Task 6).
- Produces: `createUpdateGuestUseCase()`, `createDeleteGuestUseCase()`, `createDeleteGiftUseCase()` — consumed by Tasks 8-10's Server Actions.

- [ ] **Step 1: Add imports**

Edit `src/infrastructure/composition.ts`, add after the existing `CreateGuestUseCase` import:

```ts
import { UpdateGuestUseCase } from "@/application/use-cases/admin/UpdateGuestUseCase";
import { DeleteGuestUseCase } from "@/application/use-cases/admin/DeleteGuestUseCase";
import { DeleteGiftUseCase } from "@/application/use-cases/admin/DeleteGiftUseCase";
```

- [ ] **Step 2: Add factory functions**

Edit `src/infrastructure/composition.ts`, add after `createCreateGuestUseCase`:

```ts
export function createUpdateGuestUseCase(): UpdateGuestUseCase {
  return new UpdateGuestUseCase(repositories().guestRepository);
}

export function createDeleteGuestUseCase(): DeleteGuestUseCase {
  return new DeleteGuestUseCase(repositories().guestRepository);
}

export function createDeleteGiftUseCase(): DeleteGiftUseCase {
  return new DeleteGiftUseCase(repositories().giftRepository);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/composition.ts
git commit -m "feat: wire guest/gift update and delete use-cases into composition root"
```

---

## Task 8: Expand `guestFormSchema` and convert `GuestForm` to a shared create/edit component

**Files:**
- Create: `src/components/admin/guestFormSchema.ts`
- Modify: `src/components/admin/GuestForm.tsx`
- Modify: `src/app/admin/(protected)/convidados/actions.ts`
- Modify: `src/app/admin/(protected)/convidados/novo/page.tsx`
- Create: `src/app/admin/(protected)/convidados/[id]/page.tsx`

**Interfaces:**
- Consumes: `createCreateGuestUseCase`, `createUpdateGuestUseCase` (Task 7), `createListGuestsUseCase` (existing).
- Produces: `guestFormSchema`, `GuestFormValues = z.output<typeof guestFormSchema>`, `<GuestForm defaultValues?: GuestFormValues />`, `upsertGuestAction` (replaces `createGuestAction`), `/admin/convidados/[id]` edit page. `GuestFormValues`/`upsertGuestAction` are consumed by Task 9's list/edit UI.

- [ ] **Step 1: Create the expanded Zod schema**

Create `src/components/admin/guestFormSchema.ts`:

```ts
import { z } from "zod";

export const guestFormSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(3, "Informe o nome completo."),
  nickname: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().min(8, "Telefone inválido.").optional().or(z.literal("")),
  companionsCount: z.coerce.number().int().min(0).default(0),
  attendanceStatus: z.enum(["pending", "confirmed", "declined"]).default("pending"),
  message: z.string().optional(),
});

export type GuestFormValues = z.output<typeof guestFormSchema>;
export type GuestFormInput = z.input<typeof guestFormSchema>;
```

- [ ] **Step 2: Replace `createGuestAction` with a shared `upsertGuestAction`**

Replace the full content of `src/app/admin/(protected)/convidados/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createCreateGuestUseCase, createUpdateGuestUseCase } from "@/infrastructure/composition";
import { guestFormSchema } from "@/components/admin/guestFormSchema";

export interface UpsertGuestActionState {
  status: "idle" | "error";
  message?: string;
}

export async function upsertGuestAction(
  _prevState: UpsertGuestActionState,
  formData: FormData
): Promise<UpsertGuestActionState> {
  const parsed = guestFormSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    companionsCount: formData.get("companionsCount") || 0,
    attendanceStatus: formData.get("attendanceStatus") || "pending",
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    if (parsed.data.id) {
      await createUpdateGuestUseCase().execute({ ...parsed.data, id: parsed.data.id });
    } else {
      await createCreateGuestUseCase().execute(parsed.data);
    }
  } catch {
    return { status: "error", message: "Não foi possível salvar o convidado agora." };
  }

  redirect("/admin/convidados");
}
```

- [ ] **Step 3: Rewrite `GuestForm` as a shared create/edit component**

Replace the full content of `src/components/admin/GuestForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  upsertGuestAction,
  type UpsertGuestActionState,
} from "@/app/admin/(protected)/convidados/actions";
import { GuestFormValues } from "@/components/admin/guestFormSchema";

interface GuestFormProps {
  defaultValues?: GuestFormValues;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGuestActionState: UpsertGuestActionState = { status: "idle" };

export function GuestForm({ defaultValues }: GuestFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGuestAction, initialUpsertGuestActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="fullName" className="block font-sans text-sm text-forest">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={defaultValues?.fullName}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block font-sans text-sm text-forest">
          Apelido (como aparece na busca, opcional)
        </label>
        <input id="nickname" name="nickname" defaultValue={defaultValues?.nickname} className={inputClassName} />
      </div>

      <div>
        <label htmlFor="email" className="block font-sans text-sm text-forest">
          E-mail (opcional)
        </label>
        <input id="email" name="email" type="email" defaultValue={defaultValues?.email} className={inputClassName} />
      </div>

      <div>
        <label htmlFor="phone" className="block font-sans text-sm text-forest">
          Telefone (opcional)
        </label>
        <input id="phone" name="phone" defaultValue={defaultValues?.phone} className={inputClassName} />
      </div>

      <div>
        <label htmlFor="companionsCount" className="block font-sans text-sm text-forest">
          Acompanhantes
        </label>
        <input
          id="companionsCount"
          name="companionsCount"
          type="number"
          min={0}
          defaultValue={defaultValues?.companionsCount ?? 0}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="attendanceStatus" className="block font-sans text-sm text-forest">
          Status de presença
        </label>
        <select
          id="attendanceStatus"
          name="attendanceStatus"
          defaultValue={defaultValues?.attendanceStatus ?? "pending"}
          className={inputClassName}
        >
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="declined">Recusado</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block font-sans text-sm text-forest">
          Mensagem (opcional)
        </label>
        <textarea
          id="message"
          name="message"
          defaultValue={defaultValues?.message}
          rows={3}
          className={inputClassName}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar convidado"}
        </button>
        <a href="/admin/convidados" className="font-sans text-sm text-forest/70 hover:text-forest">
          Cancelar
        </a>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Add the "Cancelar" link to the new-guest page**

Replace the full content of `src/app/admin/(protected)/convidados/novo/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Novo Convidado | Painel Administrativo",
};

export default function NewGuestPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/convidados" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Novo convidado</h1>
      <div className="mt-6">
        <GuestForm />
      </div>
    </div>
  );
}
```

Note: `GuestForm` itself already renders a "Cancelar" link next to its submit button (Step 3), which covers both the "novo" and "[id]" pages; this "← Voltar" link at the top of the "novo" page additionally matches the CMS pages' established back-link pattern referenced in the spec.

- [ ] **Step 5: Create the guest edit page**

Create `src/app/admin/(protected)/convidados/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Editar Convidado | Painel Administrativo",
};

interface EditGuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGuestPage({ params }: EditGuestPageProps) {
  const { id } = await params;
  const guests = await createListGuestsUseCase().execute();
  const guest = guests.find((candidate) => candidate.id === id);

  if (!guest) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Editar convidado</h1>
      <div className="mt-6">
        <GuestForm
          defaultValues={{
            id: guest.id,
            fullName: guest.fullName,
            nickname: guest.nickname,
            email: guest.email,
            phone: guest.phone,
            companionsCount: guest.companionsCount,
            attendanceStatus: guest.attendanceStatus,
            message: guest.message,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/guestFormSchema.ts src/components/admin/GuestForm.tsx src/app/admin/(protected)/convidados/actions.ts src/app/admin/(protected)/convidados/novo/page.tsx "src/app/admin/(protected)/convidados/[id]/page.tsx"
git commit -m "feat: expand guest form to all fields and add guest edit page"
```

---

## Task 9: Convidados list — Editar/Excluir columns + `DeleteGuestButton`

**Files:**
- Create: `src/components/admin/DeleteGuestButton.tsx`
- Create: `src/app/admin/(protected)/convidados/deleteAction.ts`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`

**Interfaces:**
- Consumes: `createDeleteGuestUseCase` (Task 7).
- Produces: `<DeleteGuestButton guestId={string} />` — a small form Client Component used by Task 9 today and reusable by Task 15's `GuestsTable`.

- [ ] **Step 1: Create the delete Server Action**

Create `src/app/admin/(protected)/convidados/deleteAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createDeleteGuestUseCase } from "@/infrastructure/composition";

export async function deleteGuestAction(guestId: string): Promise<void> {
  await createDeleteGuestUseCase().execute(guestId);
  revalidatePath("/admin/convidados");
}
```

- [ ] **Step 2: Create `DeleteGuestButton`**

Create `src/components/admin/DeleteGuestButton.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { deleteGuestAction } from "@/app/admin/(protected)/convidados/deleteAction";

interface DeleteGuestButtonProps {
  guestId: string;
  guestName: string;
}

export function DeleteGuestButton({ guestId, guestName }: DeleteGuestButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Excluir o convidado "${guestName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(() => {
      deleteGuestAction(guestId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="font-sans text-sm text-danger hover:text-danger/80 disabled:opacity-60"
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
```

- [ ] **Step 3: Add Editar/Excluir columns to the Convidados list**

Edit `src/app/admin/(protected)/convidados/page.tsx`. Add the import:

```ts
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";
```

Change the table header row (adds two `<th>`):

```tsx
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Contato</th>
                <th className="py-2 pr-4">Acompanhantes</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
```

Change the row body (adds two `<td>`):

```tsx
                <tr key={guest.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">
                    {guest.fullName}
                    {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">
                    {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">{guest.companionsCount}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/convidados/${guest.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGuestButton guestId={guest.id!} guestName={guest.fullName} />
                  </td>
                </tr>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/DeleteGuestButton.tsx "src/app/admin/(protected)/convidados/deleteAction.ts" "src/app/admin/(protected)/convidados/page.tsx"
git commit -m "feat: add edit/delete actions to the guests list"
```

---

## Task 10: Fix the gift-edit page bug + add Presentes delete UI

**Files:**
- Modify: `src/app/admin/(protected)/presentes/[id]/page.tsx`
- Create: `src/app/admin/(protected)/presentes/deleteAction.ts`
- Create: `src/components/admin/DeleteGiftButton.tsx`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`

**Interfaces:**
- Consumes: `createDeleteGiftUseCase` (Task 7), `isBackendConfigured` (existing), `ConfigurationNotice` (existing).
- Produces: `<DeleteGiftButton giftId giftName />`.

**Bug reproduction (required before touching code — per `systematic-debugging`):**

- [ ] **Step 1: Reproduce the reported error locally**

Run: `npm run dev`, open the admin panel, log in, go to `/admin/presentes`, and click "Editar" on any real gift. Note the exact error shown (e.g. a thrown/unhandled exception page, a Next.js error overlay, or a blank page) and, if the dev server prints a stack trace to the terminal, capture it.

Compare `src/app/admin/(protected)/presentes/[id]/page.tsx` (no `isBackendConfigured()` check, no try/catch around `createListGiftsUseCase().execute()`) against `src/app/admin/(protected)/presentes/page.tsx` (has both). If Supabase env vars are configured locally, the direct cause is more likely a runtime exception inside `execute()` (e.g. transient network/query failure) surfacing as an unhandled Server Component error — which the list page suppresses via try/catch and this page doesn't. If Supabase is NOT configured locally, `isBackendConfigured()` being unchecked means `getSupabaseServiceRoleClient()` throws immediately. Either way, the fix (Step 2) is the same: apply the guard/try-catch pattern already proven on the list page. Note in the task report which of the two conditions reproduced the error.

- [ ] **Step 2: Apply the guard/try-catch fix**

Replace the full content of `src/app/admin/(protected)/presentes/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GiftForm } from "@/components/admin/GiftForm";

export const metadata: Metadata = {
  title: "Editar Presente | Painel Administrativo",
};

interface EditGiftPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGiftPage({ params }: EditGiftPageProps) {
  const { id } = await params;
  const backendConfigured = isBackendConfigured();

  if (!backendConfigured) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para editar presentes." />
        </div>
      </div>
    );
  }

  let gifts;
  try {
    gifts = await createListGiftsUseCase().execute();
  } catch {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Não foi possível carregar este presente agora." />
        </div>
      </div>
    );
  }

  const gift = gifts.find((candidate) => candidate.id === id);

  if (!gift) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
      <div className="mt-6">
        <GiftForm
          defaultValues={{
            id: gift.id,
            name: gift.name,
            description: gift.description,
            imageUrl: gift.imageUrl,
            price: gift.price,
            category: gift.category,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the fix**

Restart the dev server if needed, repeat Step 1's reproduction steps, and confirm "Editar" now opens the edit form (or, if Supabase is unconfigured locally, shows the `ConfigurationNotice` instead of crashing) rather than the original error.

- [ ] **Step 4: Create the gift delete Server Action**

Create `src/app/admin/(protected)/presentes/deleteAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createDeleteGiftUseCase } from "@/infrastructure/composition";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

export interface DeleteGiftResult {
  status: "ok" | "error";
  message?: string;
}

export async function deleteGiftAction(giftId: string): Promise<DeleteGiftResult> {
  try {
    await createDeleteGiftUseCase().execute(giftId);
  } catch (error) {
    if (error instanceof GiftHasContributionsError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível excluir o presente agora." };
  }

  revalidatePath("/admin/presentes");
  return { status: "ok" };
}
```

- [ ] **Step 5: Create `DeleteGiftButton`**

Create `src/components/admin/DeleteGiftButton.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { deleteGiftAction } from "@/app/admin/(protected)/presentes/deleteAction";

interface DeleteGiftButtonProps {
  giftId: string;
  giftName: string;
}

export function DeleteGiftButton({ giftId, giftName }: DeleteGiftButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Excluir o presente "${giftName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteGiftAction(giftId);
      if (result.status === "error") {
        setErrorMessage(result.message ?? "Não foi possível excluir o presente agora.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="font-sans text-sm text-danger hover:text-danger/80 disabled:opacity-60"
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>
      {errorMessage && <p className="mt-1 font-sans text-xs text-danger">{errorMessage}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Add the Excluir column to the Presentes list**

Edit `src/app/admin/(protected)/presentes/page.tsx`. Add the import:

```ts
import { DeleteGiftButton } from "@/components/admin/DeleteGiftButton";
```

Change the header row (adds one `<th>`):

```tsx
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
```

Change the row body (adds one `<td>`):

```tsx
                <tr key={gift.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{gift.name}</td>
                  <td className="py-3 pr-4 text-forest/70">{gift.category}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(gift.price)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[gift.status]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/presentes/${gift.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGiftButton giftId={gift.id!} giftName={gift.name} />
                  </td>
                </tr>
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/(protected)/presentes/[id]/page.tsx" "src/app/admin/(protected)/presentes/deleteAction.ts" src/components/admin/DeleteGiftButton.tsx "src/app/admin/(protected)/presentes/page.tsx"
git commit -m "fix: guard gift-edit page against crashes and add gift delete"
```

---

## Task 11: `parseCsv` shared utility

**Files:**
- Create: `src/shared/utils/parseCsv.ts`
- Test: `src/shared/utils/parseCsv.test.ts`

**Interfaces:**
- Produces: `interface ParsedCsvRow { [column: string]: string }`, `function parseCsv(fileContent: string): ParsedCsvRow[]` — consumed by Task 12/13's import actions.

- [ ] **Step 1: Add the `papaparse` dependency**

Run: `npm install papaparse` and `npm install -D @types/papaparse`

- [ ] **Step 2: Write the failing test**

Create `src/shared/utils/parseCsv.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/utils/parseCsv";

describe("parseCsv", () => {
  it("parses a simple CSV with a header row", () => {
    const rows = parseCsv("Nome completo,Apelido\nAna Silva,Aninha\nBruno Costa,Bruno");

    expect(rows).toEqual([
      { "Nome completo": "Ana Silva", Apelido: "Aninha" },
      { "Nome completo": "Bruno Costa", Apelido: "Bruno" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('Nome completo,Apelido\n"Silva, Ana",Aninha');

    expect(rows).toEqual([{ "Nome completo": "Silva, Ana", Apelido: "Aninha" }]);
  });

  it("strips a UTF-8 BOM prefix", () => {
    const bom = "﻿";
    const rows = parseCsv(`${bom}Nome completo,Apelido\nAna Silva,Aninha`);

    expect(rows).toEqual([{ "Nome completo": "Ana Silva", Apelido: "Aninha" }]);
  });

  it("skips fully blank rows", () => {
    const rows = parseCsv("Nome completo,Apelido\nAna Silva,Aninha\n\n");

    expect(rows).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/shared/utils/parseCsv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `parseCsv`**

Create `src/shared/utils/parseCsv.ts`:

```ts
import Papa from "papaparse";

export interface ParsedCsvRow {
  [column: string]: string;
}

export function parseCsv(fileContent: string): ParsedCsvRow[] {
  const result = Papa.parse<ParsedCsvRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  return result.data;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/shared/utils/parseCsv.test.ts`
Expected: PASS (4/4). Papa Parse strips a leading UTF-8 BOM automatically, so no extra handling is needed for that case.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/shared/utils/parseCsv.ts src/shared/utils/parseCsv.test.ts
git commit -m "feat: add parseCsv utility wrapping papaparse"
```

---

## Task 12: Guest CSV import (template + page + action)

**Files:**
- Create: `public/templates/convidados-modelo.csv`
- Create: `src/app/admin/(protected)/convidados/importar/actions.ts`
- Test: `src/app/admin/(protected)/convidados/importar/actions.test.ts`
- Create: `src/app/admin/(protected)/convidados/importar/page.tsx`
- Create: `src/components/admin/ImportGuestsForm.tsx`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`

**Interfaces:**
- Consumes: `parseCsv` (Task 11), `createListGuestsUseCase`, `createCreateGuestUseCase` (existing/Task 7), `guestFormSchema` (Task 8).
- Produces: `ImportResult { created: number; skipped: number; errors: { row: number; message: string }[] }`, `importGuestsAction(prevState, formData): Promise<ImportGuestsActionState>`.

- [ ] **Step 1: Create the template file**

Create `public/templates/convidados-modelo.csv`:

```
Nome completo,Apelido
Maria da Silva,Maria
```

- [ ] **Step 2: Write the failing test for the import action's core logic**

The action itself calls `createListGuestsUseCase`/`createCreateGuestUseCase`, which require the composition root (real Supabase client) — so, matching this codebase's existing pattern of not unit-testing Server Actions that hit the composition root directly, this task tests the row-processing logic as a standalone function that the action delegates to, taking repositories as parameters (testable with the in-memory doubles) instead of importing the composition root.

Create `src/app/admin/(protected)/convidados/importar/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { importGuestRows } from "@/app/admin/(protected)/convidados/importar/actions";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { Guest } from "@/domain/entities/Guest";

describe("importGuestRows", () => {
  it("creates guests from valid rows", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows(
      [
        { "Nome completo": "Ana Silva", Apelido: "Aninha" },
        { "Nome completo": "Bruno Costa", Apelido: "" },
      ],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 2, skipped: 0, errors: [] });
    expect((await repository.findAll()).map((g) => g.fullName)).toEqual(["Ana Silva", "Bruno Costa"]);
  });

  it("skips rows matching an existing guest name (case-insensitive)", async () => {
    const repository = new InMemoryGuestRepository();
    await repository.save(Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "pending" }));
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows([{ "Nome completo": "ana silva", Apelido: "" }], repository, useCase);

    expect(result).toEqual({ created: 0, skipped: 1, errors: [] });
  });

  it("reports a per-row error for invalid data without stopping the import", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows(
      [
        { "Nome completo": "Al", Apelido: "" },
        { "Nome completo": "Carla Nunes", Apelido: "" },
      ],
      repository,
      useCase
    );

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([{ row: 1, message: "Verifique o nome completo (mínimo 3 caracteres)." }]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/app/admin/(protected)/convidados/importar/actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the import action + testable row-processing function**

Create `src/app/admin/(protected)/convidados/importar/actions.ts`:

```ts
"use server";

import { createCreateGuestUseCase, createListGuestsUseCase } from "@/infrastructure/composition";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { parseCsv } from "@/shared/utils/parseCsv";

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface ImportGuestsActionState {
  status: "idle" | "done" | "error";
  result?: ImportResult;
  message?: string;
}

/** Exported for testing: processes already-parsed rows against injected repository/use-case. */
export async function importGuestRows(
  rows: { [column: string]: string }[],
  guestRepository: Pick<GuestRepository, "findAll">,
  createGuestUseCase: Pick<CreateGuestUseCase, "execute">
): Promise<ImportResult> {
  const existingNames = new Set((await guestRepository.findAll()).map((guest) => guest.fullName.toLowerCase()));
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fullName = (row["Nome completo"] ?? "").trim();
    const nickname = (row["Apelido"] ?? "").trim() || undefined;

    if (existingNames.has(fullName.toLowerCase())) {
      result.skipped++;
      continue;
    }

    if (fullName.length < 3) {
      result.errors.push({ row: i, message: "Verifique o nome completo (mínimo 3 caracteres)." });
      continue;
    }

    await createGuestUseCase.execute({ fullName, nickname });
    existingNames.add(fullName.toLowerCase());
    result.created++;
  }

  return result;
}

export async function importGuestsAction(
  _prevState: ImportGuestsActionState,
  formData: FormData
): Promise<ImportGuestsActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo CSV." };
  }

  const fileContent = await file.text();
  const rows = parseCsv(fileContent);

  try {
    const result = await importGuestRows(rows, { findAll: () => createListGuestsUseCase().execute() }, createCreateGuestUseCase());
    return { status: "done", result };
  } catch {
    return { status: "error", message: "Não foi possível importar os convidados agora." };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/admin/(protected)/convidados/importar/actions.test.ts`
Expected: PASS (3/3).

- [ ] **Step 6: Create the import page's Client Component**

Create `src/components/admin/ImportGuestsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  importGuestsAction,
  type ImportGuestsActionState,
} from "@/app/admin/(protected)/convidados/importar/actions";

const initialImportGuestsActionState: ImportGuestsActionState = { status: "idle" };

export function ImportGuestsForm() {
  const [state, formAction, isPending] = useActionState(importGuestsAction, initialImportGuestsActionState);

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="file" className="block font-sans text-sm text-forest">
            Arquivo CSV
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv"
            required
            className="mt-1 w-full font-sans text-sm text-forest"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Importando..." : "Importar convidados"}
        </button>
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}

      {state.status === "done" && state.result && (
        <div className="rounded-md border border-line bg-paper p-4 font-sans text-sm text-forest">
          <p>{state.result.created} convidado(s) importado(s).</p>
          <p>{state.result.skipped} ignorado(s) por já existir.</p>
          {state.result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-danger">{state.result.errors.length} linha(s) com erro:</p>
              <ul className="mt-1 list-disc pl-5 text-forest/70">
                {state.result.errors.map((error) => (
                  <li key={error.row}>
                    Linha {error.row + 2}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create the import page**

Create `src/app/admin/(protected)/convidados/importar/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ImportGuestsForm } from "@/components/admin/ImportGuestsForm";

export const metadata: Metadata = {
  title: "Importar Convidados | Painel Administrativo",
};

export default function ImportGuestsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/convidados" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Importar convidados</h1>
      <a
        href="/templates/convidados-modelo.csv"
        download
        className="mt-2 inline-block font-sans text-sm text-moss hover:text-moss/80"
      >
        Baixar planilha modelo
      </a>
      <div className="mt-6">
        <ImportGuestsForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Link the import page from the Convidados list**

Edit `src/app/admin/(protected)/convidados/page.tsx`, changing the header block:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Convidados</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/convidados/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/convidados/novo"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            + Novo convidado
          </Link>
        </div>
      </div>
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add public/templates/convidados-modelo.csv "src/app/admin/(protected)/convidados/importar" src/components/admin/ImportGuestsForm.tsx "src/app/admin/(protected)/convidados/page.tsx"
git commit -m "feat: add CSV import for guests"
```

---

## Task 13: Gift CSV import (template + page + action)

**Files:**
- Create: `public/templates/presentes-modelo.csv`
- Create: `src/app/admin/(protected)/presentes/importar/actions.ts`
- Test: `src/app/admin/(protected)/presentes/importar/actions.test.ts`
- Create: `src/app/admin/(protected)/presentes/importar/page.tsx`
- Create: `src/components/admin/ImportGiftsForm.tsx`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`

**Interfaces:**
- Consumes: `parseCsv` (Task 11), `createListGiftsUseCase`, `createUpsertGiftUseCase` (existing).
- Produces: same `ImportResult` shape as Task 12, `importGiftsAction`.

- [ ] **Step 1: Create the template file**

Create `public/templates/presentes-modelo.csv`:

```
Nome,Descrição,Categoria,Valor
Jogo de panelas,Conjunto de 5 panelas antiaderentes,cozinha,450,00
```

- [ ] **Step 2: Write the failing test**

Create `src/app/admin/(protected)/presentes/importar/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { importGiftRows } from "@/app/admin/(protected)/presentes/importar/actions";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { Gift } from "@/domain/entities/Gift";

describe("importGiftRows", () => {
  it("creates gifts from valid rows, accepting comma or dot decimals", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [
        { Nome: "Jogo de panelas", Descrição: "5 panelas", Categoria: "cozinha", Valor: "450,00" },
        { Nome: "Aspirador", Descrição: "Robô aspirador", Categoria: "casa", Valor: "899.90" },
      ],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 2, skipped: 0, errors: [] });
    const gifts = await repository.findAll();
    expect(gifts.map((g) => g.price)).toEqual([450, 899.9]);
    expect(gifts.every((g) => g.imageUrl === null)).toBe(true);
  });

  it("skips rows matching an existing gift name (case-insensitive)", async () => {
    const repository = new InMemoryGiftRepository();
    await repository.save(
      Gift.create({ name: "Jogo de panelas", description: "x", imageUrl: "/a.jpg", price: 100, category: "cozinha" })
    );
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [{ Nome: "jogo de panelas", Descrição: "x", Categoria: "cozinha", Valor: "100" }],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 0, skipped: 1, errors: [] });
  });

  it("reports a per-row error for an invalid value", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [{ Nome: "Item", Descrição: "x", Categoria: "casa", Valor: "não é número" }],
      repository,
      useCase
    );

    expect(result.created).toBe(0);
    expect(result.errors).toEqual([{ row: 0, message: "Verifique o valor informado." }]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/app/admin/(protected)/presentes/importar/actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the import action + testable row-processing function**

Create `src/app/admin/(protected)/presentes/importar/actions.ts`. Note: `imageUrl` is typed as `string` on `Gift`/`giftFormSchema`, but imported gifts have no photo yet — this task passes `imageUrl: null` and widens the local processing function's repository/use-case parameter types with `Pick<...>`, matching the pattern in Task 12; the actual persisted row's `image_url` column is nullable in Supabase (confirmed by `SupabaseGiftRepository`'s `image_url: string | null` handling elsewhere), and `PhotoOrPlaceholder` already renders a fallback for a null/empty `imageUrl`, so this is consistent with existing behavior, not a new gap.

```ts
"use server";

import { createListGiftsUseCase, createUpsertGiftUseCase } from "@/infrastructure/composition";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { parseCsv } from "@/shared/utils/parseCsv";

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface ImportGiftsActionState {
  status: "idle" | "done" | "error";
  result?: ImportResult;
  message?: string;
}

function parseBrazilianDecimal(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.includes(",")) {
    // Comma decimal separator (Brazilian format): strip thousands dots, then comma -> dot.
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed);
}

/** Exported for testing: processes already-parsed rows against injected repository/use-case. */
export async function importGiftRows(
  rows: { [column: string]: string }[],
  giftRepository: Pick<GiftRepository, "findAll">,
  upsertGiftUseCase: Pick<UpsertGiftUseCase, "execute">
): Promise<ImportResult> {
  const existingNames = new Set((await giftRepository.findAll()).map((gift) => gift.name.toLowerCase()));
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row["Nome"] ?? "").trim();
    const description = (row["Descrição"] ?? "").trim();
    const category = (row["Categoria"] ?? "").trim();
    const rawValor = (row["Valor"] ?? "").trim();

    if (existingNames.has(name.toLowerCase())) {
      result.skipped++;
      continue;
    }

    const price = parseBrazilianDecimal(rawValor);
    if (!Number.isFinite(price) || price <= 0) {
      result.errors.push({ row: i, message: "Verifique o valor informado." });
      continue;
    }

    if (name.length < 2 || description.length < 3 || category.length < 2) {
      result.errors.push({ row: i, message: "Verifique nome, descrição e categoria." });
      continue;
    }

    await upsertGiftUseCase.execute({ name, description, category, price, imageUrl: null as unknown as string });
    existingNames.add(name.toLowerCase());
    result.created++;
  }

  return result;
}

export async function importGiftsAction(
  _prevState: ImportGiftsActionState,
  formData: FormData
): Promise<ImportGiftsActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo CSV." };
  }

  const fileContent = await file.text();
  const rows = parseCsv(fileContent);

  try {
    const result = await importGiftRows(rows, { findAll: () => createListGiftsUseCase().execute() }, createUpsertGiftUseCase());
    return { status: "done", result };
  } catch {
    return { status: "error", message: "Não foi possível importar os presentes agora." };
  }
}
```

- [ ] **Step 5: Allow a null `imageUrl` end to end**

The `UpsertGiftUseCase.execute` call above passes `null as unknown as string` for `imageUrl`, which works at runtime (Supabase's `image_url` column is nullable) but is a type-system lie. Fix it properly: widen `imageUrl` to accept `null` across the gift-creation path used by import.

Edit `src/domain/entities/Gift.ts`: change `imageUrl: string;` to `imageUrl: string | null;` in `GiftProps`, and the class field `readonly imageUrl: string;` to `readonly imageUrl: string | null;`.

Edit `src/application/use-cases/admin/UpsertGiftUseCase.ts`: change `imageUrl: string;` to `imageUrl: string | null;` in `UpsertGiftInput`.

Edit `src/infrastructure/supabase/SupabaseGiftRepository.ts`: no change needed — `image_url: gift.imageUrl` already assigns whatever the entity holds, and Supabase's column is nullable.

Now edit `src/app/admin/(protected)/presentes/importar/actions.ts`, replacing the call:

```ts
    await upsertGiftUseCase.execute({ name, description, category, price, imageUrl: null });
```

- [ ] **Step 6: Update the two call sites that assumed `imageUrl` was always a string**

`src/components/admin/GiftForm.tsx` reads `defaultValues?.imageUrl ?? null` already (Step-safe, no change). `src/app/admin/(protected)/presentes/[id]/page.tsx` (Task 10) passes `imageUrl: gift.imageUrl` directly into `defaultValues` — `PhotoUploadField`'s `currentUrl` prop is already typed `string | null`, so this remains valid. Run a typecheck to confirm no other call site breaks:

Run: `npx tsc --noEmit`
Expected: no errors. If any appear outside the files touched in this task, read the error and adjust that call site to handle `imageUrl: string | null` (e.g. a `?? ""` fallback for display-only usages) rather than reverting the type change.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/app/admin/(protected)/presentes/importar/actions.test.ts`
Expected: PASS (3/3).

- [ ] **Step 8: Run the full existing gift test suite to confirm no regression**

Run: `npx vitest run src/application/use-cases/admin/UpsertGiftUseCase.test.ts src/application/testing/InMemoryGiftRepository.test.ts src/application/use-cases/admin/DeleteGiftUseCase.test.ts`
Expected: all PASS.

- [ ] **Step 9: Create the import page's Client Component**

Create `src/components/admin/ImportGiftsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  importGiftsAction,
  type ImportGiftsActionState,
} from "@/app/admin/(protected)/presentes/importar/actions";

const initialImportGiftsActionState: ImportGiftsActionState = { status: "idle" };

export function ImportGiftsForm() {
  const [state, formAction, isPending] = useActionState(importGiftsAction, initialImportGiftsActionState);

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="file" className="block font-sans text-sm text-forest">
            Arquivo CSV
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv"
            required
            className="mt-1 w-full font-sans text-sm text-forest"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Importando..." : "Importar presentes"}
        </button>
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}

      {state.status === "done" && state.result && (
        <div className="rounded-md border border-line bg-paper p-4 font-sans text-sm text-forest">
          <p>{state.result.created} presente(s) importado(s).</p>
          <p>{state.result.skipped} ignorado(s) por já existir.</p>
          {state.result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-danger">{state.result.errors.length} linha(s) com erro:</p>
              <ul className="mt-1 list-disc pl-5 text-forest/70">
                {state.result.errors.map((error) => (
                  <li key={error.row}>
                    Linha {error.row + 2}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Create the import page**

Create `src/app/admin/(protected)/presentes/importar/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ImportGiftsForm } from "@/components/admin/ImportGiftsForm";

export const metadata: Metadata = {
  title: "Importar Presentes | Painel Administrativo",
};

export default function ImportGiftsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/presentes" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Importar presentes</h1>
      <a
        href="/templates/presentes-modelo.csv"
        download
        className="mt-2 inline-block font-sans text-sm text-moss hover:text-moss/80"
      >
        Baixar planilha modelo
      </a>
      <div className="mt-6">
        <ImportGiftsForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Link the import page from the Presentes list**

Edit `src/app/admin/(protected)/presentes/page.tsx`, changing the header block:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Presentes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/presentes/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/presentes/novo"
            className="rounded-full bg-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
          >
            Novo presente
          </Link>
        </div>
      </div>
```

- [ ] **Step 12: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add public/templates/presentes-modelo.csv "src/app/admin/(protected)/presentes/importar" src/components/admin/ImportGiftsForm.tsx "src/app/admin/(protected)/presentes/page.tsx" src/domain/entities/Gift.ts src/application/use-cases/admin/UpsertGiftUseCase.ts
git commit -m "feat: add CSV import for gifts and allow a null imageUrl for imported rows"
```

---

## Task 14: `GuestsTable` — client-side filtering for the guests list

**Files:**
- Create: `src/components/admin/GuestsTable.tsx`
- Test: `src/components/admin/GuestsTable.test.tsx`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`

**Interfaces:**
- Consumes: `Guest` (existing entity type), `DeleteGuestButton` (Task 9).
- Produces: `<GuestsTable guests={Guest[]} />` — a Client Component owning the table, filter inputs, and URL sync. Consumed by Task 16's Dashboard links (`/admin/convidados?status=confirmed` etc. — read by this component via `useSearchParams`).

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/GuestsTable.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuestsTable } from "@/components/admin/GuestsTable";
import type { Guest } from "@/domain/entities/Guest";

function makeGuest(overrides: Partial<Guest>): Guest {
  return {
    id: "1",
    fullName: "Ana Silva",
    nickname: undefined,
    email: undefined,
    phone: undefined,
    companionsCount: 0,
    message: undefined,
    attendanceStatus: "pending",
    createdAt: new Date(),
    totalAttendeesCount: () => 0,
    ...overrides,
  } as Guest;
}

const guests: Guest[] = [
  makeGuest({ id: "1", fullName: "Ana Silva", attendanceStatus: "confirmed" }),
  makeGuest({ id: "2", fullName: "Bruno Costa", attendanceStatus: "pending" }),
  makeGuest({ id: "3", fullName: "Carla Nunes", nickname: "Carlinha", attendanceStatus: "declined" }),
];

describe("GuestsTable", () => {
  it("renders every guest with no filters applied", () => {
    render(<GuestsTable guests={guests} />);

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
    expect(screen.getByText("Carla Nunes")).toBeInTheDocument();
  });

  it("filters by name/nickname text", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.type(screen.getByLabelText("Buscar por nome"), "carlinha");

    expect(screen.queryByText("Ana Silva")).not.toBeInTheDocument();
    expect(screen.getByText("Carla Nunes")).toBeInTheDocument();
  });

  it("filters by attendance status", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.selectOptions(screen.getByLabelText("Status"), "confirmed");

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.queryByText("Bruno Costa")).not.toBeInTheDocument();
    expect(screen.queryByText("Carla Nunes")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/GuestsTable.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GuestsTable`**

Create `src/components/admin/GuestsTable.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Guest } from "@/domain/entities/Guest";
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";

interface GuestsTableProps {
  guests: Guest[];
}

const STATUS_LABELS: Record<Guest["attendanceStatus"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

function isValidStatus(value: string | null): value is Guest["attendanceStatus"] {
  return value === "pending" || value === "confirmed" || value === "declined";
}

export function GuestsTable({ guests }: GuestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<Guest["attendanceStatus"] | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as Guest["attendanceStatus"]) : "all"
  );

  function syncUrl(nextSearch: string, nextStatus: Guest["attendanceStatus"] | "all") {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus !== "all") params.set("status", nextStatus);
    router.replace(params.toString() ? `/admin/convidados?${params.toString()}` : "/admin/convidados");
  }

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesText =
        !term ||
        guest.fullName.toLowerCase().includes(term) ||
        (guest.nickname?.toLowerCase().includes(term) ?? false);
      const matchesStatus = status === "all" || guest.attendanceStatus === status;
      return matchesText && matchesStatus;
    });
  }, [guests, search, status]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="guest-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="guest-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              syncUrl(event.target.value, status);
            }}
            className={inputClassName}
          />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="guest-status" className="block font-sans text-sm text-forest">
            Status
          </label>
          <select
            id="guest-status"
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value as Guest["attendanceStatus"] | "all";
              setStatus(nextStatus);
              syncUrl(search, nextStatus);
            }}
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="declined">Recusado</option>
          </select>
        </div>
      </div>

      {filteredGuests.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum convidado encontrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Contato</th>
                <th className="py-2 pr-4">Acompanhantes</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">
                    {guest.fullName}
                    {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">
                    {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">{guest.companionsCount}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/convidados/${guest.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGuestButton guestId={guest.id!} guestName={guest.fullName} />
                  </td>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GuestsTable.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Wire `GuestsTable` into the Convidados list page**

Replace the full content of `src/app/admin/(protected)/convidados/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GuestsTable } from "@/components/admin/GuestsTable";
import type { Guest } from "@/domain/entities/Guest";

export const metadata: Metadata = {
  title: "Convidados | Painel Administrativo",
};

export default async function AdminGuestsPage() {
  const backendConfigured = isBackendConfigured();
  let guests: Guest[] | null = null;

  if (backendConfigured) {
    try {
      guests = await createListGuestsUseCase().execute();
    } catch {
      guests = null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Convidados</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/convidados/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/convidados/novo"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            + Novo convidado
          </Link>
        </div>
      </div>

      {!guests ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os convidados agora."
                : "Configure o Supabase (.env.local) para ver a lista de convidados."
            }
          />
        </div>
      ) : guests.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum convidado cadastrado ainda.</p>
      ) : (
        <GuestsTable guests={guests} />
      )}
    </div>
  );
}
```

This supersedes Task 9's inline table markup — Task 9's Editar/Excluir columns now live inside `GuestsTable` (Step 3 above already includes them), so no functionality from Task 9 is lost.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/GuestsTable.tsx src/components/admin/GuestsTable.test.tsx "src/app/admin/(protected)/convidados/page.tsx"
git commit -m "feat: add dynamic filtering to the guests list"
```

---

## Task 15: `GiftsTable` — client-side filtering for the gifts list

**Files:**
- Create: `src/components/admin/GiftsTable.tsx`
- Test: `src/components/admin/GiftsTable.test.tsx`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`

**Interfaces:**
- Consumes: `Gift`/`GiftStatus` (existing entity types), `DeleteGiftButton` (Task 10), `formatCurrency` (existing).
- Produces: `<GiftsTable gifts={Gift[]} />` — consumed by Task 16's Dashboard links (`/admin/presentes?status=paid`).

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/GiftsTable.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftsTable } from "@/components/admin/GiftsTable";
import type { Gift } from "@/domain/entities/Gift";

function makeGift(overrides: Partial<Gift>): Gift {
  return {
    id: "1",
    name: "Jogo de panelas",
    description: "5 panelas",
    imageUrl: "/a.jpg",
    price: 200,
    category: "cozinha",
    status: "available",
    createdAt: new Date(),
    isAvailable: () => true,
    reserve: () => makeGift(overrides),
    markAsPaid: () => makeGift(overrides),
    releaseToAvailable: () => makeGift(overrides),
    ...overrides,
  } as Gift;
}

const gifts: Gift[] = [
  makeGift({ id: "1", name: "Jogo de panelas", category: "cozinha", status: "available" }),
  makeGift({ id: "2", name: "Aspirador robô", category: "casa", status: "reserved" }),
  makeGift({ id: "3", name: "Jogo de taças", category: "cozinha", status: "paid" }),
];

describe("GiftsTable", () => {
  it("renders every gift with no filters applied", () => {
    render(<GiftsTable gifts={gifts} />);

    expect(screen.getByText("Jogo de panelas")).toBeInTheDocument();
    expect(screen.getByText("Aspirador robô")).toBeInTheDocument();
    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
  });

  it("filters by name text", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.type(screen.getByLabelText("Buscar por nome"), "aspirador");

    expect(screen.getByText("Aspirador robô")).toBeInTheDocument();
    expect(screen.queryByText("Jogo de panelas")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "cozinha");

    expect(screen.getByText("Jogo de panelas")).toBeInTheDocument();
    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
    expect(screen.queryByText("Aspirador robô")).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.selectOptions(screen.getByLabelText("Status"), "paid");

    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
    expect(screen.queryByText("Jogo de panelas")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GiftsTable`**

Create `src/components/admin/GiftsTable.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Gift, GiftStatus } from "@/domain/entities/Gift";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DeleteGiftButton } from "@/components/admin/DeleteGiftButton";

interface GiftsTableProps {
  gifts: Gift[];
}

const STATUS_LABEL: Record<GiftStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  paid: "Presenteado",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

function isValidStatus(value: string | null): value is GiftStatus {
  return value === "available" || value === "reserved" || value === "paid";
}

export function GiftsTable({ gifts }: GiftsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = useMemo(() => Array.from(new Set(gifts.map((gift) => gift.category))).sort(), [gifts]);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [status, setStatus] = useState<GiftStatus | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as GiftStatus) : "all"
  );

  function syncUrl(nextSearch: string, nextCategory: string, nextStatus: GiftStatus | "all") {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextStatus !== "all") params.set("status", nextStatus);
    router.replace(params.toString() ? `/admin/presentes?${params.toString()}` : "/admin/presentes");
  }

  const filteredGifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return gifts.filter((gift) => {
      const matchesText = !term || gift.name.toLowerCase().includes(term);
      const matchesCategory = category === "all" || gift.category === category;
      const matchesStatus = status === "all" || gift.status === status;
      return matchesText && matchesCategory && matchesStatus;
    });
  }, [gifts, search, category, status]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="gift-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="gift-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              syncUrl(event.target.value, category, status);
            }}
            className={inputClassName}
          />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="gift-category" className="block font-sans text-sm text-forest">
            Categoria
          </label>
          <select
            id="gift-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              syncUrl(search, event.target.value, status);
            }}
            className={inputClassName}
          >
            <option value="all">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="gift-status" className="block font-sans text-sm text-forest">
            Status
          </label>
          <select
            id="gift-status"
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value as GiftStatus | "all";
              setStatus(nextStatus);
              syncUrl(search, category, nextStatus);
            }}
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="available">Disponível</option>
            <option value="reserved">Reservado</option>
            <option value="paid">Presenteado</option>
          </select>
        </div>
      </div>

      {filteredGifts.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum presente encontrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filteredGifts.map((gift) => (
                <tr key={gift.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{gift.name}</td>
                  <td className="py-3 pr-4 text-forest/70">{gift.category}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(gift.price)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[gift.status]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/presentes/${gift.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGiftButton giftId={gift.id!} giftName={gift.name} />
                  </td>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Wire `GiftsTable` into the Presentes list page**

Replace the full content of `src/app/admin/(protected)/presentes/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GiftsTable } from "@/components/admin/GiftsTable";
import type { Gift } from "@/domain/entities/Gift";

export const metadata: Metadata = {
  title: "Presentes | Painel Administrativo",
};

export default async function AdminGiftsPage() {
  const backendConfigured = isBackendConfigured();
  let gifts: Gift[] | null = null;

  if (backendConfigured) {
    try {
      gifts = await createListGiftsUseCase().execute();
    } catch {
      gifts = null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Presentes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/presentes/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/presentes/novo"
            className="rounded-full bg-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
          >
            Novo presente
          </Link>
        </div>
      </div>

      {!gifts ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os presentes agora."
                : "Configure o Supabase (.env.local) para gerenciar a lista de presentes."
            }
          />
        </div>
      ) : gifts.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum presente cadastrado ainda.</p>
      ) : (
        <GiftsTable gifts={gifts} />
      )}
    </div>
  );
}
```

This supersedes Task 10's inline table markup — Task 10's Editar/Excluir columns now live inside `GiftsTable` (Step 3 above already includes them).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/GiftsTable.tsx src/components/admin/GiftsTable.test.tsx "src/app/admin/(protected)/presentes/page.tsx"
git commit -m "feat: add dynamic filtering to the gifts list"
```

---

## Task 16: Dashboard clickable cards

**Files:**
- Modify: `src/components/admin/DashboardStats.tsx`
- Test: `src/components/admin/DashboardStats.test.tsx`

**Interfaces:**
- Consumes: `DashboardSummary` (existing), the URL scheme read by `GuestsTable`/`GiftsTable` (Tasks 14-15: `?status=`).
- Produces: each stat tile becomes an `<a>` (via `next/link`) per the spec's mapping table.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/DashboardStats.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "@/components/admin/DashboardStats";

const summary = {
  confirmedGuestsCount: 10,
  pendingGuestsCount: 3,
  declinedGuestsCount: 1,
  totalAttendeesCount: 20,
  totalGiftsCount: 15,
  paidGiftsCount: 5,
  totalAmountReceived: 1234.5,
};

describe("DashboardStats", () => {
  it("links each card to its filtered list", () => {
    render(<DashboardStats summary={summary} />);

    expect(screen.getByRole("link", { name: /confirmados/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=confirmed"
    );
    expect(screen.getByRole("link", { name: /pendentes/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=pending"
    );
    expect(screen.getByRole("link", { name: /não vão/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=declined"
    );
    expect(screen.getByRole("link", { name: /total de pessoas/i })).toHaveAttribute("href", "/admin/convidados");
    expect(screen.getByRole("link", { name: /presentes cadastrados/i })).toHaveAttribute(
      "href",
      "/admin/presentes"
    );
    expect(screen.getByRole("link", { name: /presentes recebidos/i })).toHaveAttribute(
      "href",
      "/admin/presentes?status=paid"
    );
    expect(screen.getByRole("link", { name: /valor arrecadado/i })).toHaveAttribute(
      "href",
      "/admin/presentes?status=paid"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: FAIL — no `link` roles found (current tiles are plain `div`s).

- [ ] **Step 3: Convert stat tiles to links**

Replace the full content of `src/components/admin/DashboardStats.tsx`:

```tsx
import Link from "next/link";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const items = [
    { label: "Confirmados", value: summary.confirmedGuestsCount, href: "/admin/convidados?status=confirmed" },
    { label: "Pendentes", value: summary.pendingGuestsCount, href: "/admin/convidados?status=pending" },
    { label: "Não vão", value: summary.declinedGuestsCount, href: "/admin/convidados?status=declined" },
    { label: "Total de pessoas", value: summary.totalAttendeesCount, href: "/admin/convidados" },
    { label: "Presentes cadastrados", value: summary.totalGiftsCount, href: "/admin/presentes" },
    { label: "Presentes recebidos", value: summary.paidGiftsCount, href: "/admin/presentes?status=paid" },
    {
      label: "Valor arrecadado",
      value: formatCurrency(summary.totalAmountReceived),
      href: "/admin/presentes?status=paid",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-lg border border-line bg-paper p-5 text-center transition-colors hover:border-moss"
        >
          <p className="font-serif text-3xl text-forest">{item.value}</p>
          <p className="mt-1 font-sans text-xs uppercase tracking-widest text-forest/70">
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: PASS (1/1).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/DashboardStats.tsx src/components/admin/DashboardStats.test.tsx
git commit -m "feat: make dashboard stat cards clickable, deep-linking to filtered lists"
```

---

## Task 17: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all test files PASS, no failures.

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: no errors (warnings acceptable only if pre-existing and unrelated to this plan's files).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, log into `/admin`, then:
- Visit `/admin/convidados`: confirm Editar/Excluir columns, working filters, "Importar CSV" and "+ Novo convidado" links.
- Click "Novo convidado", confirm the "Cancelar"/"← Voltar" links work and the full field set (email/phone/companions/status/message) saves correctly.
- Click "Editar" on an existing guest, change a field, save, confirm it persists.
- Click "Excluir" on a guest, confirm the native confirm dialog and that the guest disappears from the list after confirming.
- Visit `/admin/convidados/importar`, download the template, re-upload it (with one new row and one row matching an existing guest name), confirm the created/skipped counts are correct.
- Repeat the same edit/delete/import checks on `/admin/presentes`, specifically re-confirming "Editar" no longer errors.
- Attempt to delete a gift that has at least one recorded contribution (via the public RSVP/gift flow, or existing seed data) and confirm the domain error message displays instead of a raw crash.
- Visit `/admin/dashboard`, click each stat card, and confirm it lands on the correctly filtered `/admin/convidados` or `/admin/presentes` URL with the filter pre-applied.

- [ ] **Step 5: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
