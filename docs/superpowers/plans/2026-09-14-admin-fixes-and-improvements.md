# RSVP Fix and Admin Panel Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the RSVP nickname/name display bug and ship six admin-panel improvements (Infinite Pay payment sync, guest confirmation sorting, gift purchaser columns, guest sorting + inline edit, message sorting, mobile dashboard grid).

**Architecture:** Next.js App Router site with a layered architecture: `domain` (entities/repositories, framework-free), `application` (use cases, depend only on domain interfaces), `infrastructure` (Supabase + payment gateway implementations), and `app`/`components` (Next.js routes, server actions, React components). New behavior follows this layering: new use cases in `application/use-cases`, new persistence in the existing Supabase repositories, new UI in existing admin components/pages. Tests use Vitest + Testing Library for components, and in-memory repository test doubles for use cases.

**Tech Stack:** Next.js (App Router, Server Actions), TypeScript, Supabase (Postgres), Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- All new UI copy is in Brazilian Portuguese (pt-BR), matching the rest of the admin panel.
- Follow existing code conventions exactly: `"use client"` client components, `"use server"` server actions, Tailwind utility classes matching the existing forest/moss/paper color tokens, `useActionState` for form-backed async actions.
- Every new/changed use case, repository method, and component gets a test. Run `npm test` (or the project's Vitest command) after every task and confirm it passes before moving on.
- The manual "Atualizar status de pagamento" button text is exactly that string, unchanged, in both places it appears.
- Never remove or weaken the existing amount-mismatch safety check in `ConfirmGiftPaymentUseCase` (src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.ts:33-42).

---

## Task 1: Fix RSVP nickname/name display order

**Files:**
- Modify: `src/components/rsvp/RsvpSearch.tsx`
- Modify: `src/components/rsvp/RsvpSearch.test.tsx`

**Interfaces:**
- No new exports. `displayNameFor` (line 15-17) stays as-is (still used for the input's populated value).

- [ ] **Step 1: Write the failing tests**

Add these tests to `src/components/rsvp/RsvpSearch.test.tsx` (inside the existing `describe("RsvpSearch", ...)` block):

```tsx
  it("shows the full name first and the nickname small in suggestions, not the other way around", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");

    const suggestion = await screen.findByRole("button", { name: /joão pedro almeida/i });
    const text = suggestion.textContent ?? "";
    expect(text.indexOf("João Pedro Almeida")).toBeLessThan(text.indexOf("JP"));
  });

  it("greets the guest by full name, not nickname, after selecting a suggestion", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /joão pedro almeida/i }));

    expect(screen.getByText(/João\? Que bom que você apareceu!/i)).toBeInTheDocument();
    expect(screen.queryByText(/^JP$/)).not.toBeInTheDocument();
  });
```

Note: this changes the accessible name of the suggestion button used across the *existing* tests (it currently matches `/JP/i`). Update every existing `screen.findByRole("button", { name: /JP/i })` and `screen.getByRole("button", { name: "JP" })` call in this file to `/joão pedro almeida/i` instead, since the button's primary text is now the full name. Also update the `toHaveValue("JP")` assertion in "populates the field and reveals the action buttons once a suggestion is selected" — after this change, selecting a suggestion still populates the query input with `displayNameFor` (the nickname), so that assertion stays `toHaveValue("JP")` and does NOT need to change.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/rsvp/RsvpSearch.test.tsx`
Expected: FAIL — the two new tests fail because suggestions currently show nickname first, and the greeting currently reads "Mari?"/"JP? Que bom que você apareceu!" style using the nickname.

- [ ] **Step 3: Fix the suggestion list and companion suggestion list**

In `src/components/rsvp/RsvpSearch.tsx`, replace the suggestion button body in the main suggestions list (around line 205-219):

```tsx
                {matches.map((guest) => (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGuest(guest)}
                      className="w-full rounded-md border border-line px-4 py-3 text-center font-serif text-lg text-forest transition-colors hover:border-moss hover:text-moss"
                    >
                      {guest.fullName}
                      {guest.nickname && guest.nickname !== guest.fullName && (
                        <span className="ml-2 font-sans text-xs text-forest/60">({guest.nickname})</span>
                      )}
                    </button>
                  </li>
                ))}
```

And the companion suggestion list inside `CompanionNameField` (around line 68-82):

```tsx
          {matches.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => handleSelect(guest)}
                className="w-full rounded-md border border-line px-3 py-2 text-left font-sans text-sm text-forest transition-colors hover:border-moss hover:text-moss"
              >
                {guest.fullName}
                {guest.nickname && guest.nickname !== guest.fullName && (
                  <span className="ml-2 font-sans text-xs text-forest/60">({guest.nickname})</span>
                )}
              </button>
            </li>
          ))}
```

- [ ] **Step 4: Fix the greeting screen to use the first name, never the nickname**

In `src/components/rsvp/RsvpSearch.tsx`, replace the `displayName` computation (line 108):

```tsx
  const displayName = selectedGuest ? selectedGuest.fullName.split(" ")[0] : "";
```

Then replace the greeting block (around line 228-241), removing the script-font nickname line entirely:

```tsx
            {selectedGuest && step === "searching" && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-serif text-xl text-forest">{displayName}? Que bom que você apareceu! :)</p>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <PillButton onClick={() => setStep("confirming")} disabled={isSubmitting}>
                    Confirmar presença
                  </PillButton>
                  <PillButton variant="secondary" onClick={handleDecline} disabled={isSubmitting}>
                    Não poderei ir
                  </PillButton>
                </div>
              </div>
            )}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/rsvp/RsvpSearch.test.tsx`
Expected: PASS — all tests including the two new ones and the updated existing ones.

- [ ] **Step 6: Commit**

```bash
git add src/components/rsvp/RsvpSearch.tsx src/components/rsvp/RsvpSearch.test.tsx
git commit -m "fix: show full name before nickname in RSVP suggestions and greeting"
```

---

## Task 2: Add `confirmedAt` to the Guest domain entity and repositories

**Files:**
- Create: `supabase/migrations/0009_guest_confirmed_at.sql`
- Modify: `src/domain/entities/Guest.ts`
- Modify: `src/domain/repositories/GuestRepository.ts` (no signature change needed — see below)
- Modify: `src/infrastructure/supabase/SupabaseGuestRepository.ts`
- Modify: `src/application/testing/InMemoryGuestRepository.ts`
- Modify: `src/application/use-cases/admin/UpdateGuestUseCase.ts`
- Test: `src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
- Test: `src/application/use-cases/admin/UpdateGuestUseCase.test.ts`

**Interfaces:**
- Produces: `Guest.confirmedAt: Date | undefined` (readonly field, like `createdAt` but optional).
- Consumes: nothing new from other tasks.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0009_guest_confirmed_at.sql`:

```sql
alter table guests
  add column if not exists confirmed_at timestamptz;

-- Backfill: guests already confirmed before this column existed get their
-- created_at as an approximate confirmation date, so sorting/filtering by
-- confirmed_at never has to special-case "no value yet" for existing data.
update guests
  set confirmed_at = created_at
  where attendance_status = 'confirmed' and confirmed_at is null;
```

- [ ] **Step 2: Write the failing test for `ConfirmRsvpUseCase`**

Add to `src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts` (find the existing `beforeEach`/guest setup and add a new `it` near the other "confirmed" assertions):

```ts
  it("records the confirmation date when a guest confirms attendance", async () => {
    const before = Date.now();

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "confirmed",
      email: "ana@example.com",
    });

    expect(updated.confirmedAt).toBeInstanceOf(Date);
    expect(updated.confirmedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });
```

(Match this to the existing test file's setup variable names — read the file first; it already has a `guest`/`useCase`/`guestRepository` set up in `beforeEach` for the other tests in that describe block.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
Expected: FAIL — `updated.confirmedAt` is `undefined` because nothing sets it yet.

- [ ] **Step 4: Add `confirmedAt` to the `Guest` entity**

In `src/domain/entities/Guest.ts`, add the field (no validation needed — it's system-set, not user input):

```ts
export interface GuestProps {
  id?: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  message?: string;
  attendanceStatus: AttendanceStatus;
  confirmedAt?: Date;
  createdAt?: Date;
}
```

```ts
export class Guest {
  readonly id?: string;
  readonly fullName: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly companionsCount: number;
  readonly message?: string;
  readonly attendanceStatus: AttendanceStatus;
  readonly confirmedAt?: Date;
  readonly createdAt: Date;

  private constructor(props: GuestProps) {
    this.id = props.id;
    this.fullName = props.fullName.trim();
    this.nickname = props.nickname?.trim() || undefined;
    this.email = props.email?.trim().toLowerCase() || undefined;
    this.phone = props.phone?.trim() || undefined;
    this.companionsCount = props.companionsCount;
    this.message = props.message?.trim() || undefined;
    this.attendanceStatus = props.attendanceStatus;
    this.confirmedAt = props.confirmedAt;
    this.createdAt = props.createdAt ?? new Date();
  }
```

(Leave `static create` and `totalAttendeesCount` unchanged.)

- [ ] **Step 5: Make the Supabase repository set and read `confirmed_at`**

In `src/infrastructure/supabase/SupabaseGuestRepository.ts`:

Add `confirmed_at: string | null;` to the `GuestRow` interface, and read it in `toEntity`:

```ts
interface GuestRow {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  companions_count: number;
  message: string | null;
  attendance_status: AttendanceStatus;
  confirmed_at: string | null;
  created_at: string;
}

function toEntity(row: GuestRow): Guest {
  return Guest.create({
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    companionsCount: row.companions_count,
    message: row.message ?? undefined,
    attendanceStatus: row.attendance_status,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    createdAt: new Date(row.created_at),
  });
}
```

Add `confirmed_at: guest.confirmedAt ? guest.confirmedAt.toISOString() : null,` to both the `save()` and `update()` insert/update payloads.

In `updateAttendance()`, set `confirmed_at` whenever the guest is being marked confirmed:

```ts
  async updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest> {
    const patch: Record<string, unknown> = { attendance_status: update.attendanceStatus };
    if (update.companionsCount !== undefined) {
      patch.companions_count = update.companionsCount;
    }
    if (update.message !== undefined) {
      patch.message = update.message;
    }
    if (update.email !== undefined) {
      patch.email = update.email;
    }
    if (update.attendanceStatus === "confirmed") {
      patch.confirmed_at = new Date().toISOString();
    }
```

(Rest of the method unchanged.)

- [ ] **Step 6: Make `InMemoryGuestRepository` do the same**

In `src/application/testing/InMemoryGuestRepository.ts`, update `updateAttendance`:

```ts
  async updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest> {
    const index = this.guests.findIndex((guest) => guest.id === id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }

    const existing = this.guests[index];
    const updated = Guest.create({
      ...existing,
      attendanceStatus: update.attendanceStatus,
      companionsCount: update.companionsCount ?? existing.companionsCount,
      message: update.message ?? existing.message,
      email: update.email ?? existing.email,
      confirmedAt: update.attendanceStatus === "confirmed" ? new Date() : existing.confirmedAt,
    });

    this.guests[index] = updated;
    return updated;
  }
```

- [ ] **Step 7: Run the `ConfirmRsvpUseCase` test to verify it passes**

Run: `npx vitest run src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
Expected: PASS

- [ ] **Step 8: Write the failing test for `UpdateGuestUseCase` preserving/setting `confirmedAt`**

Read `src/application/use-cases/admin/UpdateGuestUseCase.test.ts` first to match its existing setup style, then add:

```ts
  it("preserves the existing confirmedAt when the guest is already confirmed", async () => {
    const originalConfirmedAt = new Date("2026-01-01T10:00:00Z");
    const guest = await guestRepository.save(
      Guest.create({
        fullName: "Ana Souza",
        companionsCount: 0,
        attendanceStatus: "confirmed",
        confirmedAt: originalConfirmedAt,
      })
    );

    const updated = await useCase.execute({
      id: guest.id!,
      fullName: "Ana Souza Lima",
      companionsCount: 1,
      attendanceStatus: "confirmed",
    });

    expect(updated.confirmedAt).toEqual(originalConfirmedAt);
  });

  it("sets confirmedAt when an admin edit changes the status to confirmed", async () => {
    const guest = await guestRepository.save(
      Guest.create({ fullName: "Bruno Lima", companionsCount: 0, attendanceStatus: "pending" })
    );

    const before = Date.now();
    const updated = await useCase.execute({
      id: guest.id!,
      fullName: "Bruno Lima",
      companionsCount: 0,
      attendanceStatus: "confirmed",
    });

    expect(updated.confirmedAt).toBeInstanceOf(Date);
    expect(updated.confirmedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });
```

(Match the actual `guestRepository`/`useCase` variable names from the file's `beforeEach`.)

- [ ] **Step 9: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/UpdateGuestUseCase.test.ts`
Expected: FAIL — `UpdateGuestUseCase` doesn't pass `confirmedAt` through at all yet.

- [ ] **Step 10: Update `UpdateGuestUseCase`**

In `src/application/use-cases/admin/UpdateGuestUseCase.ts`:

```ts
  async execute(input: UpdateGuestInput): Promise<Guest> {
    const existingGuest = await this.guestRepository.findById(input.id);
    if (!existingGuest) {
      throw new GuestNotFoundError(`Guest with id ${input.id} was not found.`);
    }

    const isNewlyConfirmed = input.attendanceStatus === "confirmed" && existingGuest.attendanceStatus !== "confirmed";

    const updatedGuest = Guest.create({
      id: input.id,
      fullName: input.fullName,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      companionsCount: input.companionsCount,
      attendanceStatus: input.attendanceStatus,
      message: input.message,
      confirmedAt: isNewlyConfirmed ? new Date() : existingGuest.confirmedAt,
      createdAt: existingGuest.createdAt,
    });

    return this.guestRepository.update(updatedGuest);
  }
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/admin/UpdateGuestUseCase.test.ts src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
Expected: PASS

- [ ] **Step 12: Run the full test suite to catch any other break**

Run: `npx vitest run`
Expected: PASS (this touches shared entity/repository code, so run everything once).

- [ ] **Step 13: Commit**

```bash
git add supabase/migrations/0009_guest_confirmed_at.sql src/domain/entities/Guest.ts src/infrastructure/supabase/SupabaseGuestRepository.ts src/application/testing/InMemoryGuestRepository.ts src/application/use-cases/admin/UpdateGuestUseCase.ts src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts src/application/use-cases/admin/UpdateGuestUseCase.test.ts
git commit -m "feat: track guest confirmation date"
```

---

## Task 3: Sortable Name column, name-as-link, and Confirmado-em column in GuestsTable

**Files:**
- Modify: `src/components/admin/GuestsTable.tsx`
- Modify: `src/components/admin/GuestsTable.test.tsx`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`

**Interfaces:**
- Consumes: `Guest.confirmedAt` (Task 2).
- Produces: `GuestListItem.confirmedAt?: Date` — read by no other task.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/admin/GuestsTable.test.tsx`. First update `makeGuest` to accept `confirmedAt`:

```tsx
function makeGuest(overrides: Partial<GuestListItem>): GuestListItem {
  return {
    id: "1",
    fullName: "Ana Silva",
    nickname: undefined,
    email: undefined,
    phone: undefined,
    companionsCount: 0,
    attendanceStatus: "pending",
    confirmedAt: undefined,
    ...overrides,
  };
}
```

Then add:

```tsx
  it("links the guest name to their edit page", () => {
    render(<GuestsTable guests={guests} />);

    expect(screen.getByRole("link", { name: "Ana Silva" })).toHaveAttribute("href", "/admin/convidados/1");
  });

  it("sorts by name ascending and descending when the Nome header is clicked", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.click(screen.getByRole("button", { name: /^nome/i }));
    let rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ana Silva");
    expect(rows[2]).toHaveTextContent("Carla Nunes");

    await user.click(screen.getByRole("button", { name: /^nome/i }));
    rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Carla Nunes");
    expect(rows[2]).toHaveTextContent("Ana Silva");
  });

  it("sorts by confirmation date when the Confirmado em header is clicked", async () => {
    const user = userEvent.setup();
    const guestsWithDates: GuestListItem[] = [
      makeGuest({ id: "1", fullName: "Ana Silva", attendanceStatus: "confirmed", confirmedAt: new Date("2026-01-10") }),
      makeGuest({ id: "2", fullName: "Bruno Costa", attendanceStatus: "confirmed", confirmedAt: new Date("2026-02-01") }),
    ];
    render(<GuestsTable guests={guestsWithDates} />);

    await user.click(screen.getByRole("button", { name: /confirmado em/i }));
    let rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Bruno Costa");

    await user.click(screen.getByRole("button", { name: /confirmado em/i }));
    rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ana Silva");
  });

  it("edits the companions count inline via double click, showing confirm and cancel controls", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    const cell = screen.getByTestId("companions-count-1");
    await user.dblClick(cell);

    const input = screen.getByLabelText(/editar acompanhantes de ana silva/i);
    expect(input).toHaveValue(0);
    expect(screen.getByRole("button", { name: /salvar acompanhantes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar edição de acompanhantes/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/admin/GuestsTable.test.tsx`
Expected: FAIL — none of this UI exists yet.

- [ ] **Step 3: Add sort icons**

In `src/components/admin/icons.tsx`, append:

```tsx
export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
```

- [ ] **Step 4: Add the `updateGuestCompanionsCountAction` server action**

Create the use case first. Read `src/application/use-cases/admin/UpdateGuestUseCase.ts` for the existing style, then create `src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.ts`:

```ts
import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

export interface UpdateGuestCompanionsCountInput {
  id: string;
  companionsCount: number;
}

export class UpdateGuestCompanionsCountUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: UpdateGuestCompanionsCountInput): Promise<Guest> {
    if (!Number.isInteger(input.companionsCount) || input.companionsCount < 0 || input.companionsCount > 10) {
      throw new InvalidGuestDataError("Companions count must be an integer between 0 and 10.");
    }

    const guest = await this.guestRepository.findById(input.id);
    if (!guest) {
      throw new GuestNotFoundError(`Guest with id ${input.id} was not found.`);
    }

    return this.guestRepository.updateAttendance(input.id, {
      attendanceStatus: guest.attendanceStatus,
      companionsCount: input.companionsCount,
    });
  }
}
```

Create its test, `src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.test.ts` (model it on `UpdateGuestUseCase.test.ts`'s setup):

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { UpdateGuestCompanionsCountUseCase } from "@/application/use-cases/admin/UpdateGuestCompanionsCountUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

describe("UpdateGuestCompanionsCountUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let useCase: UpdateGuestCompanionsCountUseCase;

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    useCase = new UpdateGuestCompanionsCountUseCase(guestRepository);
  });

  it("updates only the companions count, keeping the attendance status", async () => {
    const guest = await guestRepository.save(
      Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "confirmed" })
    );

    const updated = await useCase.execute({ id: guest.id!, companionsCount: 3 });

    expect(updated.companionsCount).toBe(3);
    expect(updated.attendanceStatus).toBe("confirmed");
  });

  it("rejects a negative companions count", async () => {
    const guest = await guestRepository.save(
      Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "confirmed" })
    );

    await expect(useCase.execute({ id: guest.id!, companionsCount: -1 })).rejects.toThrow(InvalidGuestDataError);
  });

  it("throws when the guest does not exist", async () => {
    await expect(useCase.execute({ id: "missing", companionsCount: 1 })).rejects.toThrow(GuestNotFoundError);
  });
});
```

Run: `npx vitest run src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.test.ts` — expect PASS immediately (this sub-step is implementation-first because it's a small, self-evidently-correct pure delegation; the plan still requires the test to exist and pass before moving on).

Wire it into `src/infrastructure/composition.ts` — add the import:

```ts
import { UpdateGuestCompanionsCountUseCase } from "@/application/use-cases/admin/UpdateGuestCompanionsCountUseCase";
```

and a factory function near `createUpdateGuestUseCase`:

```ts
export function createUpdateGuestCompanionsCountUseCase(): UpdateGuestCompanionsCountUseCase {
  return new UpdateGuestCompanionsCountUseCase(repositories().guestRepository);
}
```

Create `src/app/admin/(protected)/convidados/updateCompanionsCountAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createUpdateGuestCompanionsCountUseCase } from "@/infrastructure/composition";

export interface UpdateCompanionsCountResult {
  status: "success" | "error";
  message?: string;
  companionsCount?: number;
}

export async function updateGuestCompanionsCountAction(
  guestId: string,
  companionsCount: number
): Promise<UpdateCompanionsCountResult> {
  try {
    const updated = await createUpdateGuestCompanionsCountUseCase().execute({ id: guestId, companionsCount });
    revalidatePath("/admin/convidados");
    revalidatePath("/admin/dashboard");
    return { status: "success", companionsCount: updated.companionsCount };
  } catch {
    return { status: "error", message: "Não foi possível salvar o número de acompanhantes agora." };
  }
}
```

- [ ] **Step 5: Rewrite `GuestsTable.tsx` with sorting, name link, and inline companions editing**

Replace the full contents of `src/components/admin/GuestsTable.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AttendanceStatus } from "@/domain/entities/Guest";
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";
import { CheckIcon, XIcon } from "@/components/admin/icons";
import { updateGuestCompanionsCountAction } from "@/app/admin/(protected)/convidados/updateCompanionsCountAction";

export interface GuestListItem {
  id: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  attendanceStatus: AttendanceStatus;
  confirmedAt?: Date;
}

interface GuestsTableProps {
  guests: GuestListItem[];
}

type SortColumn = "name" | "confirmedAt";
type SortDirection = "asc" | "desc";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

function isValidStatus(value: string | null): value is AttendanceStatus {
  return value === "pending" || value === "confirmed" || value === "declined";
}

interface CompanionsCountCellProps {
  guest: GuestListItem;
}

function CompanionsCountCell({ guest }: CompanionsCountCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(guest.companionsCount);
  const [displayValue, setDisplayValue] = useState(guest.companionsCount);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValue(displayValue);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    const result = await updateGuestCompanionsCountAction(guest.id, value);
    setIsSaving(false);
    if (result.status === "error") {
      setError(result.message ?? "Não foi possível salvar agora.");
      return;
    }
    setDisplayValue(result.companionsCount ?? value);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <td
        className="py-3 pr-4 text-forest/70"
        data-testid={`companions-count-${guest.id}`}
        onDoubleClick={startEditing}
      >
        {displayValue}
      </td>
    );
  }

  return (
    <td className="py-3 pr-4 text-forest/70">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={10}
          value={value}
          onChange={(event) => setValue(Math.max(0, Number(event.target.value)))}
          aria-label={`Editar acompanhantes de ${guest.fullName}`}
          className="w-16 rounded-md border border-line bg-paper px-2 py-1 font-sans text-forest focus:border-moss focus:outline-none"
          disabled={isSaving}
        />
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          aria-label="Salvar acompanhantes"
          className="text-moss hover:text-moss/80 disabled:opacity-60"
        >
          <CheckIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSaving}
          aria-label="Cancelar edição de acompanhantes"
          className="text-danger hover:text-danger/80 disabled:opacity-60"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      {error && <p className="mt-1 font-sans text-xs text-danger">{error}</p>}
    </td>
  );
}

export function GuestsTable({ guests }: GuestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<AttendanceStatus | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as AttendanceStatus) : "all"
  );
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      router.replace(params.toString() ? `/admin/convidados?${params.toString()}` : "/admin/convidados");
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, router]);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = guests.filter((guest) => {
      const matchesText =
        !term ||
        guest.fullName.toLowerCase().includes(term) ||
        (guest.nickname?.toLowerCase().includes(term) ?? false);
      const matchesStatus = status === "all" || guest.attendanceStatus === status;
      return matchesText && matchesStatus;
    });

    if (!sortColumn) {
      return filtered;
    }

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === "name") {
        return a.fullName.localeCompare(b.fullName, "pt-BR") * direction;
      }
      const aTime = a.confirmedAt?.getTime() ?? 0;
      const bTime = b.confirmedAt?.getTime() ?? 0;
      return (aTime - bTime) * direction;
    });
  }, [guests, search, status, sortColumn, sortDirection]);

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="guest-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="guest-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
            onChange={(event) => setStatus(event.target.value as AttendanceStatus | "all")}
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
        <div className="mt-6">
          <p className="font-sans text-xs text-forest/70">
            {filteredGuests.length} de {guests.length} convidados
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-line text-left text-forest/70">
                  <th className="py-2 pr-4">
                    <button type="button" onClick={() => toggleSort("name")} className="hover:text-forest">
                      Nome{sortIndicator("name")}
                    </button>
                  </th>
                  <th className="py-2 pr-4">Contato</th>
                  <th className="py-2 pr-4">Acompanhantes</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">
                    <button type="button" onClick={() => toggleSort("confirmedAt")} className="hover:text-forest">
                      Confirmado em{sortIndicator("confirmedAt")}
                    </button>
                  </th>
                  <th className="py-2 pr-4" />
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-forest">
                      <Link href={`/admin/convidados/${guest.id}`} className="hover:text-moss">
                        {guest.fullName}
                      </Link>
                      {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                    </td>
                    <td className="py-3 pr-4 text-forest/70">
                      {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <CompanionsCountCell guest={guest} />
                    <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                    <td className="py-3 pr-4 text-forest/70">
                      {guest.confirmedAt ? guest.confirmedAt.toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/convidados/${guest.id}`} className="text-moss hover:text-moss/80">
                        Editar
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <DeleteGuestButton guestId={guest.id} guestName={guest.fullName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire `confirmedAt` through the Convidados page**

In `src/app/admin/(protected)/convidados/page.tsx`, add `confirmedAt: guest.confirmedAt,` to the `guests.map(...)` call that builds `GuestListItem`s.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/admin/GuestsTable.test.tsx src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/GuestsTable.tsx src/components/admin/GuestsTable.test.tsx src/components/admin/icons.tsx src/app/admin/\(protected\)/convidados/page.tsx src/app/admin/\(protected\)/convidados/updateCompanionsCountAction.ts src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.ts src/application/use-cases/admin/UpdateGuestCompanionsCountUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat: sortable guest name/confirmation date and inline companions editing"
```

---

## Task 4: Sort Mensagens by confirmation date, newest first, with a toggle

**Files:**
- Modify: `src/app/admin/(protected)/mensagens/page.tsx`
- Create: `src/app/admin/(protected)/mensagens/MessagesList.tsx`
- Create: `src/app/admin/(protected)/mensagens/MessagesList.test.tsx`

**Interfaces:**
- Consumes: `Guest.confirmedAt` (Task 2), `Guest.createdAt` (existing) as fallback.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(protected)/mensagens/MessagesList.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagesList, type MessageItem } from "./MessagesList";

const messages: MessageItem[] = [
  { id: "1", fullName: "Ana Silva", nickname: undefined, companionsCount: 0, message: "Mensagem antiga", date: new Date("2026-01-01") },
  { id: "2", fullName: "Bruno Costa", nickname: undefined, companionsCount: 1, message: "Mensagem nova", date: new Date("2026-03-01") },
];

describe("MessagesList", () => {
  it("shows the newest message first by default", () => {
    render(<MessagesList messages={messages} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Bruno Costa");
    expect(items[1]).toHaveTextContent("Ana Silva");
  });

  it("reverses the order when the sort toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<MessagesList messages={messages} />);

    await user.click(screen.getByRole("button", { name: /mais antigas primeiro/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ana Silva");
    expect(items[1]).toHaveTextContent("Bruno Costa");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/mensagens/MessagesList.test.tsx"`
Expected: FAIL — `MessagesList` module doesn't exist yet.

- [ ] **Step 3: Create `MessagesList.tsx`**

Move the list-rendering markup out of `page.tsx` into a new client component, `src/app/admin/(protected)/mensagens/MessagesList.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface MessageItem {
  id: string;
  fullName: string;
  nickname?: string;
  companionsCount: number;
  message: string;
  date: Date;
}

interface MessagesListProps {
  messages: MessageItem[];
}

export function MessagesList({ messages }: MessagesListProps) {
  const [newestFirst, setNewestFirst] = useState(true);

  const sorted = useMemo(() => {
    const direction = newestFirst ? -1 : 1;
    return [...messages].sort((a, b) => (a.date.getTime() - b.date.getTime()) * direction);
  }, [messages, newestFirst]);

  return (
    <div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setNewestFirst((current) => !current)}
          className="font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
        >
          {newestFirst ? "Mostrar mais antigas primeiro" : "Mostrar mais novas primeiro"}
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {sorted.map((item) => (
          <li key={item.id} className="rounded-md border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/admin/convidados/${item.id}`} className="font-serif text-lg text-forest hover:text-moss">
                {item.fullName}
                {item.nickname && <span className="text-forest/70"> ({item.nickname})</span>}
              </Link>
              {item.companionsCount > 0 && (
                <span className="font-sans text-xs uppercase tracking-widest text-forest/60">
                  +{item.companionsCount} acompanhante{item.companionsCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="mt-2 font-sans text-sm italic text-forest/80">&ldquo;{item.message}&rdquo;</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/mensagens/MessagesList.test.tsx"`
Expected: PASS

- [ ] **Step 5: Update the Mensagens page to use it**

Replace `src/app/admin/(protected)/mensagens/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import type { Guest } from "@/domain/entities/Guest";
import { MessagesList, type MessageItem } from "./MessagesList";

export const metadata: Metadata = {
  title: "Mensagens | Painel Administrativo",
};

export default async function AdminMensagensPage() {
  const backendConfigured = isBackendConfigured();
  let guests: Guest[] | null = null;

  if (backendConfigured) {
    try {
      guests = await createListGuestsUseCase().execute();
    } catch {
      guests = null;
    }
  }

  const messages: MessageItem[] | null =
    guests
      ?.filter((guest): guest is Guest & { message: string } => Boolean(guest.message))
      .map((guest) => ({
        id: guest.id!,
        fullName: guest.fullName,
        nickname: guest.nickname,
        companionsCount: guest.companionsCount,
        message: guest.message,
        date: guest.confirmedAt ?? guest.createdAt,
      })) ?? null;

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Mensagens</h1>
      <p className="mt-2 font-sans text-sm text-forest/70">
        Recados deixados pelos convidados ao confirmar presença.
      </p>

      {!messages ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar as mensagens agora."
                : "Configure o Supabase (.env.local) para ver as mensagens dos convidados."
            }
          />
        </div>
      ) : messages.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhuma mensagem deixada até agora.</p>
      ) : (
        <MessagesList messages={messages} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify nothing broke**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/mensagens/page.tsx" "src/app/admin/(protected)/mensagens/MessagesList.tsx" "src/app/admin/(protected)/mensagens/MessagesList.test.tsx"
git commit -m "feat: sort admin messages by confirmation date with a toggle"
```

---

## Task 5: Purchaser name + purchase date columns in GiftsTable, sortable

**Files:**
- Create: `src/app/admin/(protected)/presentes/buildGiftRows.ts`
- Create: `src/app/admin/(protected)/presentes/buildGiftRows.test.ts`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`
- Modify: `src/components/admin/GiftsTable.tsx`
- Modify: `src/components/admin/GiftsTable.test.tsx`

**Interfaces:**
- Produces: `buildGiftRows(gifts, approvedContributions): GiftListItem[]` — used only by `presentes/page.tsx`.
- `GiftListItem` gains `purchasedBy?: string` and `purchasedAt?: Date`.

- [ ] **Step 1: Write the failing test for `buildGiftRows`**

Create `src/app/admin/(protected)/presentes/buildGiftRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { buildGiftRows } from "./buildGiftRows";

describe("buildGiftRows", () => {
  it("attaches the approved contribution's guest name and date to a paid gift", () => {
    const gift = Gift.create({
      id: "gift-1",
      name: "Air fryer",
      description: "Air fryer 5L",
      imageUrl: null,
      price: 450,
      category: "cozinha",
      status: "paid",
    });
    const contribution = GiftContribution.create({
      id: "c1",
      giftId: "gift-1",
      guestName: "Ana Silva",
      guestEmail: "ana@example.com",
      amount: 450,
      status: "approved",
      createdAt: new Date("2026-02-10"),
    });

    const rows = buildGiftRows([gift], [contribution]);

    expect(rows[0].purchasedBy).toBe("Ana Silva");
    expect(rows[0].purchasedAt).toEqual(new Date("2026-02-10"));
  });

  it("leaves purchasedBy/purchasedAt undefined for gifts with no approved contribution", () => {
    const gift = Gift.create({
      id: "gift-2",
      name: "Jogo de panelas",
      description: "Panelas",
      imageUrl: null,
      price: 300,
      category: "cozinha",
      status: "available",
    });

    const rows = buildGiftRows([gift], []);

    expect(rows[0].purchasedBy).toBeUndefined();
    expect(rows[0].purchasedAt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/presentes/buildGiftRows.test.ts"`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `buildGiftRows`**

Create `src/app/admin/(protected)/presentes/buildGiftRows.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";
import type { GiftListItem } from "@/components/admin/GiftsTable";

export function buildGiftRows(
  gifts: Gift[],
  approvedContributions: GiftContribution[],
  activeProvider: PaymentProvider = "mercado_pago"
): GiftListItem[] {
  const contributionByGiftId = new Map<string, GiftContribution>();
  for (const contribution of approvedContributions) {
    const existing = contributionByGiftId.get(contribution.giftId);
    if (!existing || contribution.createdAt.getTime() > existing.createdAt.getTime()) {
      contributionByGiftId.set(contribution.giftId, contribution);
    }
  }

  return gifts.map((gift) => {
    const contribution = contributionByGiftId.get(gift.id!);
    return {
      id: gift.id!,
      name: gift.name,
      category: gift.category,
      price: gift.price,
      status: gift.status,
      createdAt: gift.createdAt,
      hasPaymentLink: gift.hasLinkFor(activeProvider),
      purchasedBy: contribution?.guestName,
      purchasedAt: contribution?.createdAt,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/presentes/buildGiftRows.test.ts"`
Expected: FAIL still — `GiftListItem` doesn't have `purchasedBy`/`purchasedAt` yet. Continue to the next step before re-running.

- [ ] **Step 5: Add the new fields and sort option to `GiftsTable`**

Add these tests to `src/components/admin/GiftsTable.test.tsx` first (find the existing `gifts` fixture array and add `purchasedBy`/`purchasedAt` to at least one entry, then add):

```tsx
  it("shows who purchased a gift and when", () => {
    render(<GiftsTable gifts={gifts} />);

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
  });

  it("sorts by purchase date when 'Data do presente recebido' is selected", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.selectOptions(screen.getByLabelText(/ordenar por/i), "purchasedAt");

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ana Silva");
  });
```

(Match this to the actual `gifts` fixture already in the file — give the fixture entry that should sort first a later `purchasedAt` date than the others, and reuse "Ana Silva" as that entry's `purchasedBy`.)

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx` — expect FAIL (columns/sort don't exist yet).

Now edit `src/components/admin/GiftsTable.tsx`:

Add to the `GiftListItem` interface:

```ts
export interface GiftListItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: GiftStatus;
  createdAt: Date;
  hasPaymentLink: boolean;
  purchasedBy?: string;
  purchasedAt?: Date;
}
```

Add a sort-field selector state and use it in the existing `.sort(...)` inside `filteredGifts`. Replace the `filteredGifts` `useMemo` and add sort state near the other `useState` calls:

```tsx
  const [sortBy, setSortBy] = useState<"createdAt" | "purchasedAt">("createdAt");
```

```tsx
  const filteredGifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return gifts
      .filter((gift) => {
        const matchesText = !term || gift.name.toLowerCase().includes(term);
        const matchesCategory = category === "all" || gift.category === category;
        const matchesStatus = status === "all" || gift.status === status;
        return matchesText && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "purchasedAt") {
          const aTime = a.purchasedAt?.getTime() ?? 0;
          const bTime = b.purchasedAt?.getTime() ?? 0;
          return bTime - aTime;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [gifts, search, category, status, sortBy]);
```

Add a "Ordenar por" select next to the existing Status filter (inside the `flex flex-wrap gap-4` filter row, after the Status `<div>`):

```tsx
        <div className="min-w-[200px]">
          <label htmlFor="gift-sort" className="block font-sans text-sm text-forest">
            Ordenar por
          </label>
          <select
            id="gift-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "createdAt" | "purchasedAt")}
            className={inputClassName}
          >
            <option value="createdAt">Data de cadastro</option>
            <option value="purchasedAt">Data do presente recebido</option>
          </select>
        </div>
```

Add the two new table columns — header cells (after the existing "Link" `<th>`):

```tsx
                  <th className="py-2 pr-4">Comprado por</th>
                  <th className="py-2 pr-4">Data da compra</th>
```

And body cells (after the existing "Link" `<td>`, before the delete-button `<td>`):

```tsx
                    <td className="py-3 pr-4 text-forest/70">{gift.purchasedBy ?? "—"}</td>
                    <td className="py-3 pr-4 text-forest/70">
                      {gift.purchasedAt ? gift.purchasedAt.toLocaleDateString("pt-BR") : "—"}
                    </td>
```

- [ ] **Step 6: Run GiftsTable and buildGiftRows tests to verify they pass**

Run: `npx vitest run src/components/admin/GiftsTable.test.tsx "src/app/admin/(protected)/presentes/buildGiftRows.test.ts"`
Expected: PASS

- [ ] **Step 7: Wire `buildGiftRows` into the Presentes page**

In `src/app/admin/(protected)/presentes/page.tsx`, replace the data-fetch and mapping. Add the import:

```tsx
import { createListGiftsUseCase, createGetAdminSecuritySettingsUseCase, createListGiftContributionsUseCase } from "@/infrastructure/composition";
import { buildGiftRows } from "./buildGiftRows";
```

Replace the body of `AdminGiftsPage`:

```tsx
export default async function AdminGiftsPage() {
  const backendConfigured = isBackendConfigured();
  let gifts: Gift[] | null = null;
  let activeProvider: PaymentProvider = "mercado_pago";
  let approvedContributions: Awaited<ReturnType<ReturnType<typeof createListGiftContributionsUseCase>["execute"]>> = [];

  if (backendConfigured) {
    try {
      const [allGifts, settings, allContributions] = await Promise.all([
        createListGiftsUseCase().execute(),
        createGetAdminSecuritySettingsUseCase().execute(),
        createListGiftContributionsUseCase().execute(),
      ]);
      gifts = allGifts;
      activeProvider = settings.activePaymentProvider;
      approvedContributions = allContributions.filter((contribution) => contribution.status === "approved");
    } catch {
      gifts = null;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl text-forest">Presentes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/presentes/importar"
            className="flex min-h-11 items-center font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar
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
        <>
          <p className="mt-6 font-sans text-sm text-forest/70">
            Valor total cadastrado:{" "}
            <span className="font-medium text-forest">
              {formatCurrency(gifts.reduce((total, gift) => total + gift.price, 0))}
            </span>
          </p>
          <Suspense fallback={<p className="mt-6 font-sans text-forest/70">Carregando...</p>}>
            <GiftsTable gifts={buildGiftRows(gifts, approvedContributions, activeProvider)} />
          </Suspense>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/presentes/buildGiftRows.ts" "src/app/admin/(protected)/presentes/buildGiftRows.test.ts" "src/app/admin/(protected)/presentes/page.tsx" src/components/admin/GiftsTable.tsx src/components/admin/GiftsTable.test.tsx
git commit -m "feat: show gift purchaser and purchase date, sortable"
```

---

## Task 6: `InfinitePayGateway.checkPaymentStatus`

**Files:**
- Modify: `src/infrastructure/payments/InfinitePayGateway.ts`
- Modify: `src/infrastructure/payments/InfinitePayGateway.test.ts`

**Interfaces:**
- Produces: `InfinitePayGateway.checkPaymentStatus(orderNsu: string): Promise<{ paid: boolean; paidAmount?: number }>` — consumed by Task 7's `SyncInfinitePayPaymentsUseCase`.

- [ ] **Step 1: Write the failing tests**

Add to `src/infrastructure/payments/InfinitePayGateway.test.ts` (inside the existing `describe`, reusing the file's `makeRepository` helper):

```ts
  it("checkPaymentStatus posts to the payment_check endpoint and reports paid=true", async () => {
    const repository = await makeRepository("meu_handle");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, paid: true, paid_amount: 45000 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new InfinitePayGateway(repository);
    const result = await gateway.checkPaymentStatus("gift-1");

    expect(result).toEqual({ paid: true, paidAmount: 450 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/payment_check",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ handle: "meu_handle", order_nsu: "gift-1" });
  });

  it("checkPaymentStatus reports paid=false when the order isn't paid yet", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, paid: false }),
    }) as unknown as typeof fetch;

    const gateway = new InfinitePayGateway(repository);
    const result = await gateway.checkPaymentStatus("gift-1");

    expect(result).toEqual({ paid: false, paidAmount: undefined });
  });

  it("checkPaymentStatus throws when the handle isn't configured", async () => {
    const repository = await makeRepository(null);
    const gateway = new InfinitePayGateway(repository);

    await expect(gateway.checkPaymentStatus("gift-1")).rejects.toThrow("Infinite Pay não está configurado");
  });

  it("checkPaymentStatus throws when the API responds with a non-2xx status", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const gateway = new InfinitePayGateway(repository);

    await expect(gateway.checkPaymentStatus("gift-1")).rejects.toThrow("500");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/payments/InfinitePayGateway.test.ts`
Expected: FAIL — `checkPaymentStatus` doesn't exist yet.

- [ ] **Step 3: Implement `checkPaymentStatus`**

In `src/infrastructure/payments/InfinitePayGateway.ts`, add the response type and method:

```ts
interface InfinitePayPaymentCheckResponse {
  success?: boolean;
  paid?: boolean;
  paid_amount?: number;
}

export interface PaymentCheckResult {
  paid: boolean;
  paidAmount?: number;
}
```

```ts
  async checkPaymentStatus(orderNsu: string): Promise<PaymentCheckResult> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.infinitePayHandle) {
      throw new Error("Infinite Pay não está configurado. Configure o handle em Integrações.");
    }

    const response = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: settings.infinitePayHandle, order_nsu: orderNsu }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao consultar o status do pagamento.`);
    }

    const result = (await response.json()) as InfinitePayPaymentCheckResponse;
    return {
      paid: result.paid === true,
      paidAmount: typeof result.paid_amount === "number" ? result.paid_amount / 100 : undefined,
    };
  }
```

Place this method inside the `InfinitePayGateway` class, after `createPreference`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/payments/InfinitePayGateway.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/payments/InfinitePayGateway.ts src/infrastructure/payments/InfinitePayGateway.test.ts
git commit -m "feat: add Infinite Pay payment status check"
```

---

## Task 7: `SyncInfinitePayPaymentsUseCase`

**Files:**
- Create: `src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.ts`
- Create: `src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `InfinitePayGateway.checkPaymentStatus` (Task 6), `ConfirmGiftPaymentUseCase.execute` (existing), `GiftContributionRepository.findAll` (existing).
- Produces: `SyncInfinitePayPaymentsUseCase.execute(): Promise<{ checked: number; updated: number; errors: Array<{ contributionId: string; message: string }> }>` — consumed by Task 8's server action and cron route.
- Produces: `createSyncInfinitePayPaymentsUseCase()` in `composition.ts` — consumed by Task 8.

- [ ] **Step 1: Write the failing test**

Read `src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts` first for the exact `InMemoryGiftContributionRepository`/`InMemoryAdminSecuritySettingsRepository` setup style, then create `src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncInfinitePayPaymentsUseCase } from "@/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

describe("SyncInfinitePayPaymentsUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let confirmGiftPaymentUseCase: ConfirmGiftPaymentUseCase;
  let checkPaymentStatus: ReturnType<typeof vi.fn>;
  let useCase: SyncInfinitePayPaymentsUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    confirmGiftPaymentUseCase = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
      new FakeEmailGateway(),
      new InMemoryNotificationLogRepository()
    );
    checkPaymentStatus = vi.fn();
    useCase = new SyncInfinitePayPaymentsUseCase(
      contributionRepository,
      { checkPaymentStatus } as unknown as { checkPaymentStatus: typeof checkPaymentStatus },
      confirmGiftPaymentUseCase
    );

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: null,
        price: 450,
        category: "cozinha",
        status: "reserved",
      })
    );
  });

  it("confirms a pending Infinite Pay contribution when the gateway reports it as paid", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockResolvedValue({ paid: true, paidAmount: 450 });

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, updated: 1, errors: [] });
    const updatedGift = await giftRepository.findById("gift-1");
    expect(updatedGift!.status).toBe("paid");
  });

  it("leaves unpaid contributions untouched", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockResolvedValue({ paid: false });

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, updated: 0, errors: [] });
  });

  it("skips pending contributions from other payment providers", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "mercado_pago",
      })
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 0, updated: 0, errors: [] });
    expect(checkPaymentStatus).not.toHaveBeenCalled();
  });

  it("records an error for one contribution without stopping the others", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockRejectedValue(new Error("boom"));

    const result = await useCase.execute();

    expect(result.checked).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("boom");
  });
});
```

This mirrors the exact fixture setup already used in `src/application/use-cases/gifts/ConfirmGiftPaymentUseCase.test.ts` — `InMemoryNotificationLogRepository` and `FakeEmailGateway` both exist in `src/application/testing/` with no-arg constructors.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the use case**

Create `src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.ts`:

```ts
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";

export interface InfinitePayStatusChecker {
  checkPaymentStatus(orderNsu: string): Promise<{ paid: boolean; paidAmount?: number }>;
}

export interface SyncInfinitePayPaymentsResult {
  checked: number;
  updated: number;
  errors: Array<{ contributionId: string; message: string }>;
}

export class SyncInfinitePayPaymentsUseCase {
  constructor(
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly infinitePayGateway: InfinitePayStatusChecker,
    private readonly confirmGiftPaymentUseCase: ConfirmGiftPaymentUseCase
  ) {}

  async execute(): Promise<SyncInfinitePayPaymentsResult> {
    const allContributions = await this.giftContributionRepository.findAll();
    const pending = allContributions.filter(
      (contribution) => contribution.status === "pending" && contribution.paymentProvider === "infinite_pay"
    );

    const result: SyncInfinitePayPaymentsResult = { checked: 0, updated: 0, errors: [] };

    for (const contribution of pending) {
      result.checked += 1;
      try {
        const status = await this.infinitePayGateway.checkPaymentStatus(contribution.giftId);
        if (status.paid) {
          // The Infinite Pay payment_check response doesn't return a
          // transaction_nsu, so we fall back to the existing one (set by a
          // prior webhook attempt) or the gift id — this reference is only
          // used as the contribution's stored payment reference, not to
          // look anything up.
          await this.confirmGiftPaymentUseCase.execute({
            payment: {
              paymentReference: contribution.infinitePayTransactionNsu ?? contribution.giftId,
              status: "approved",
              giftId: contribution.giftId,
              paidAmount: status.paidAmount,
            },
          });
          result.updated += 1;
        }
      } catch (error) {
        result.errors.push({
          contributionId: contribution.id!,
          message: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Wire it into `composition.ts`**

In `src/infrastructure/composition.ts`, add the import:

```ts
import { SyncInfinitePayPaymentsUseCase } from "@/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase";
```

and a factory function near `createConfirmGiftPaymentUseCase`:

```ts
export function createSyncInfinitePayPaymentsUseCase(): SyncInfinitePayPaymentsUseCase {
  const { giftContributionRepository, infinitePayGateway } = repositories();
  return new SyncInfinitePayPaymentsUseCase(
    giftContributionRepository,
    infinitePayGateway,
    createConfirmGiftPaymentUseCase()
  );
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.ts src/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat: add use case to reconcile pending Infinite Pay payments"
```

---

## Task 8: Manual "Atualizar status de pagamento" button on Pagamentos and Presentes

**Files:**
- Create: `src/app/admin/(protected)/syncInfinitePayPaymentsAction.ts`
- Create: `src/components/admin/SyncInfinitePayPaymentsButton.tsx`
- Create: `src/components/admin/SyncInfinitePayPaymentsButton.test.tsx`
- Modify: `src/app/admin/(protected)/pagamentos/page.tsx`
- Modify: `src/components/admin/GiftsTable.tsx`

**Interfaces:**
- Consumes: `createSyncInfinitePayPaymentsUseCase` (Task 7).
- Produces: `<SyncInfinitePayPaymentsButton />` — used by both pages.

- [ ] **Step 1: Create the server action**

Create `src/app/admin/(protected)/syncInfinitePayPaymentsAction.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createSyncInfinitePayPaymentsUseCase } from "@/infrastructure/composition";

export interface SyncInfinitePayPaymentsActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function syncInfinitePayPaymentsAction(
  _prevState: SyncInfinitePayPaymentsActionState,
  _formData: FormData
): Promise<SyncInfinitePayPaymentsActionState> {
  try {
    const result = await createSyncInfinitePayPaymentsUseCase().execute();

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    const failureSuffix = result.errors.length > 0 ? ` ${result.errors.length} falharam.` : "";
    return {
      status: "success",
      message: `${result.checked} verificado(s), ${result.updated} atualizado(s).${failureSuffix}`,
    };
  } catch {
    return { status: "error", message: "Não foi possível atualizar os status agora." };
  }
}
```

- [ ] **Step 2: Write the failing test for the button component**

Create `src/components/admin/SyncInfinitePayPaymentsButton.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncInfinitePayPaymentsButton } from "@/components/admin/SyncInfinitePayPaymentsButton";

const syncActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/syncInfinitePayPaymentsAction", () => ({
  syncInfinitePayPaymentsAction: (...args: unknown[]) => syncActionMock(...args),
}));

describe("SyncInfinitePayPaymentsButton", () => {
  it("shows the exact required label", () => {
    render(<SyncInfinitePayPaymentsButton />);

    expect(screen.getByRole("button", { name: "Atualizar status de pagamento" })).toBeInTheDocument();
  });

  it("shows the result message after the action resolves", async () => {
    syncActionMock.mockResolvedValue({ status: "success", message: "3 verificado(s), 1 atualizado(s)." });
    const user = userEvent.setup();
    render(<SyncInfinitePayPaymentsButton />);

    await user.click(screen.getByRole("button", { name: "Atualizar status de pagamento" }));

    expect(await screen.findByText("3 verificado(s), 1 atualizado(s).")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/admin/SyncInfinitePayPaymentsButton.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 4: Implement the button component**

Create `src/components/admin/SyncInfinitePayPaymentsButton.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  syncInfinitePayPaymentsAction,
  type SyncInfinitePayPaymentsActionState,
} from "@/app/admin/(protected)/syncInfinitePayPaymentsAction";

const initialState: SyncInfinitePayPaymentsActionState = { status: "idle" };

export function SyncInfinitePayPaymentsButton() {
  const [state, action, isPending] = useActionState(syncInfinitePayPaymentsAction, initialState);

  return (
    <form action={action} className="mt-4">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10 disabled:opacity-60"
      >
        {isPending ? "Atualizando..." : "Atualizar status de pagamento"}
      </button>
      {state.status === "success" && <p className="mt-2 font-sans text-xs text-moss">{state.message}</p>}
      {state.status === "error" && (
        <p role="alert" className="mt-2 font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/admin/SyncInfinitePayPaymentsButton.test.tsx`
Expected: PASS

- [ ] **Step 6: Add the button to the Pagamentos page**

In `src/app/admin/(protected)/pagamentos/page.tsx`, add the import:

```tsx
import { SyncInfinitePayPaymentsButton } from "@/components/admin/SyncInfinitePayPaymentsButton";
```

and render it right after the `<h1>`:

```tsx
      <h1 className="font-serif text-3xl text-forest">Pagamentos</h1>
      <SyncInfinitePayPaymentsButton />
```

- [ ] **Step 7: Add the button to the Presentes table**

In `src/components/admin/GiftsTable.tsx`, add the import:

```tsx
import { SyncInfinitePayPaymentsButton } from "@/components/admin/SyncInfinitePayPaymentsButton";
```

and render it next to the existing "Gerar links pendentes" form — wrap both in a flex row. Replace the `hasMissingLinks && (...)` block's surrounding structure so both buttons sit side by side:

```tsx
      <div className="mt-4 flex flex-wrap items-start gap-4">
        {hasMissingLinks && (
          <form action={generateAction}>
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
        <SyncInfinitePayPaymentsButton />
      </div>
```

(This replaces the existing `{hasMissingLinks && (...)}` block entirely — remove the old standalone block and the `mt-4` that was on the old `<form>`.)

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/syncInfinitePayPaymentsAction.ts" src/components/admin/SyncInfinitePayPaymentsButton.tsx src/components/admin/SyncInfinitePayPaymentsButton.test.tsx "src/app/admin/(protected)/pagamentos/page.tsx" src/components/admin/GiftsTable.tsx
git commit -m "feat: add manual Infinite Pay payment status sync button"
```

---

## Task 9: Hourly cron for Infinite Pay payment sync

**Files:**
- Create: `src/app/api/cron/sync-infinitepay-payments/route.ts`
- Create: `src/app/api/cron/sync-infinitepay-payments/route.test.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `createSyncInfinitePayPaymentsUseCase` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/cron/sync-infinitepay-payments/route.test.ts` (mirroring `src/app/api/cron/daily-notifications/route.test.ts`):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue({ checked: 2, updated: 1, errors: [] });

vi.mock("@/infrastructure/composition", () => ({
  createSyncInfinitePayPaymentsUseCase: vi.fn(() => ({ execute: executeMock })),
}));

describe("GET /api/cron/sync-infinitepay-payments", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects requests without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects requests with no Authorization header at all", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("runs the sync use case and returns its result when authorized", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ checked: 2, updated: 1, errors: [] });
    expect(executeMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/cron/sync-infinitepay-payments/route.test.ts"`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/cron/sync-infinitepay-payments/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSyncInfinitePayPaymentsUseCase } from "@/infrastructure/composition";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await createSyncInfinitePayPaymentsUseCase().execute();
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/cron/sync-infinitepay-payments/route.test.ts"`
Expected: PASS

- [ ] **Step 5: Register the cron schedule**

Replace `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily-notifications", "schedule": "30 11 * * *" },
    { "path": "/api/cron/sync-infinitepay-payments", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/cron/sync-infinitepay-payments/route.ts" "src/app/api/cron/sync-infinitepay-payments/route.test.ts" vercel.json
git commit -m "feat: sync Infinite Pay payment status hourly via cron"
```

---

## Task 10: Fix dashboard mobile grid so stat cards use the full width

**Files:**
- Modify: `src/components/admin/DashboardStats.tsx`
- Modify: `src/components/admin/DashboardStats.test.tsx`

**Interfaces:** None — purely presentational.

- [ ] **Step 1: Write the failing test**

Add to `src/components/admin/DashboardStats.test.tsx`:

```tsx
  it("stacks stat cards in a single column on mobile instead of breaking into an odd half-width card", () => {
    render(<DashboardStats summary={summary} />);

    const confirmedLink = screen.getByRole("link", { name: /confirmados/i });
    const grid = confirmedLink.parentElement;

    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).not.toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("sm:grid-cols-3");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: FAIL — grid currently has `grid-cols-2`, not `grid-cols-1`.

- [ ] **Step 3: Fix the grid**

In `src/components/admin/DashboardStats.tsx`, change `StatGrid`:

```tsx
function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} item={item} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/DashboardStats.tsx src/components/admin/DashboardStats.test.tsx
git commit -m "fix: stack dashboard stat cards full-width on mobile"
```

---

## Task 11: Full regression pass

**Files:** None (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `npx vitest run`
Expected: PASS, zero failures.

- [ ] **Step 2: Run the linter and type checker if configured**

Run: `npm run lint` and `npm run build` (or the project's equivalent type-check command — check `package.json` `scripts` first).
Expected: no errors.

- [ ] **Step 3: Manually smoke-test the two riskiest changes**

These can't be fully covered by unit tests:
- `SyncInfinitePayPaymentsUseCase` real-world behavior depends on Infinite Pay's `payment_check` endpoint accepting `order_nsu` alone (see the risk note in the design spec, `docs/superpowers/specs/2026-09-14-admin-fixes-and-improvements-design.md`). After deploying, trigger the manual "Atualizar status de pagamento" button once against a real pending Infinite Pay contribution (or the known stuck production payment) and confirm in the logs/DB that it either updates correctly or fails with a clear, loggable error — not a silent no-op.
- The inline Acompanhantes edit (Task 3) and the RSVP fix (Task 1) are UI-behavior-sensitive; open `/admin/convidados` and `/confirmar-presenca` in a browser once after deploying to confirm they look and behave as expected.

- [ ] **Step 4: No commit for this task** — it's verification only.
