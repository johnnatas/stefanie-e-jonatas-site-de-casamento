# RSVP Guest-Search Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the open self-registration RSVP form with a pre-registered
guest list that visitors search by typing their name, matching the
reference site's "Digite seu nome" → live match → confirm/decline flow —
plus the admin-side guest pre-registration screen this flow requires.

**Architecture:** `Guest` changes from "self-registered with full contact
info" to "pre-registered by the couple, attendance status updated by the
guest": `attendanceConfirmed: boolean` becomes `attendanceStatus: "pending"
| "confirmed" | "declined"`, `email`/`phone` become optional, and a new
`nickname` field supports name search. `GuestRepository` gains
`findAllPublicNames` (name/nickname/id only, never contact info),
`findById`, and `updateAttendance`. The public RSVP page becomes a Server
Component that fetches the public name list once and hands it to a Client
Component (`RsvpSearch`) that does client-side fuzzy matching — no
per-keystroke network calls. The admin panel gains a guest pre-registration
form following the existing `GiftForm`/`upsertGiftAction` pattern.

**Tech Stack:** Next.js 16.2.10 (App Router, Server Actions), TypeScript,
Supabase (Postgres), Zod, React Hook Form is NOT used here (the search UI
is plain controlled state, not a form-heavy flow), Vitest + Testing
Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` for current App Router / Server Action
  conventions before touching `src/app/` (per `AGENTS.md`).
- New/modified UI code in this plan must use only: `paper`, `paper-soft`,
  `ink`, `ink-soft`, `charcoal`, `gold`, `gold-soft`, `line`, `line-dark`,
  `danger` — never `rose`, `rose-dark`, `cream`, or `cream-dark`.
- Follow the existing Clean Architecture layering: `src/domain` (entities,
  repository interfaces, errors) → `src/application` (use cases, tested
  against `InMemoryGuestRepository`) → `src/infrastructure` (Supabase) →
  `src/app` (routes, Server Actions) / `src/components`.
- The public guest-name list (`findAllPublicNames`) must NEVER return
  `email`, `phone`, or `message` — only `id`, `fullName`, `nickname`.
- Use `PillButton` (`@/components/ui/PillButton`) for RSVP action buttons
  on the public page. The admin form keeps its existing hand-rolled
  button style (same as `GiftForm`), just with tokens swapped — the admin
  panel is explicitly NOT part of this redesign's visual scope beyond
  that.
- **When committing, always `git add` an explicit file list — never `git
  add -A`.** A prior plan's verification task used `git add -A` in a fix
  commit and it swept ~98 unrelated pre-existing files into that commit.
  Every task below lists its exact files; use exactly those.
- Run `npm run test` and `npm run lint` before every commit.
- Plans 1–3 are already merged: color tokens, `PillButton`, `Monogram`,
  the restyled Header/Footer, and the redesigned Home page exist.

---

## Task 1: Rewrite the `Guest` entity

**Files:**
- Modify: `src/domain/entities/Guest.ts`
- Modify: `src/domain/entities/Guest.test.ts`
- Modify: `src/domain/errors/DomainError.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GuestProps` gains `nickname?: string`; `email`/`phone` become
  optional (`string | undefined`); `attendanceConfirmed: boolean` is
  replaced by `attendanceStatus: AttendanceStatus` where `type
  AttendanceStatus = "pending" | "confirmed" | "declined"`. `Guest.create`
  validates `fullName` (unchanged), `email` only if provided, `phone` only
  if provided, `companionsCount` (unchanged), and `attendanceStatus` (must
  be one of the 3 values). `totalAttendeesCount()` returns `1 +
  companionsCount` only when `attendanceStatus === "confirmed"`, otherwise
  `0`. `DomainError.ts` gains `export class GuestNotFoundError extends
  DomainError {}`, used by Task 4's `ConfirmRsvpUseCase`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/domain/entities/Guest.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { Guest } from "@/domain/entities/Guest";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

const validProps = {
  fullName: "Maria da Silva",
  nickname: "Mari",
  companionsCount: 2,
  attendanceStatus: "confirmed" as const,
};

describe("Guest", () => {
  it("creates a guest with a trimmed name and nickname", () => {
    const guest = Guest.create(validProps);

    expect(guest.fullName).toBe("Maria da Silva");
    expect(guest.nickname).toBe("Mari");
  });

  it("allows creating a guest with no email, phone, or nickname", () => {
    const guest = Guest.create({
      fullName: "João Pedro",
      companionsCount: 0,
      attendanceStatus: "pending",
    });

    expect(guest.email).toBeUndefined();
    expect(guest.phone).toBeUndefined();
    expect(guest.nickname).toBeUndefined();
  });

  it("normalizes email to lowercase when provided", () => {
    const guest = Guest.create({ ...validProps, email: "Maria@Example.com" });

    expect(guest.email).toBe("maria@example.com");
  });

  it("computes total attendees including companions when confirmed", () => {
    const guest = Guest.create(validProps);

    expect(guest.totalAttendeesCount()).toBe(3);
  });

  it("computes zero attendees when pending", () => {
    const guest = Guest.create({ ...validProps, attendanceStatus: "pending" });

    expect(guest.totalAttendeesCount()).toBe(0);
  });

  it("computes zero attendees when declined", () => {
    const guest = Guest.create({ ...validProps, attendanceStatus: "declined" });

    expect(guest.totalAttendeesCount()).toBe(0);
  });

  it("rejects a full name shorter than 3 characters", () => {
    expect(() => Guest.create({ ...validProps, fullName: "Al" })).toThrow(InvalidGuestDataError);
  });

  it("rejects an invalid email when one is provided", () => {
    expect(() => Guest.create({ ...validProps, email: "not-an-email" })).toThrow(
      InvalidGuestDataError
    );
  });

  it("rejects a negative companions count", () => {
    expect(() => Guest.create({ ...validProps, companionsCount: -1 })).toThrow(
      InvalidGuestDataError
    );
  });

  it("rejects an invalid attendance status", () => {
    // @ts-expect-error deliberately invalid for the test
    expect(() => Guest.create({ ...validProps, attendanceStatus: "maybe" })).toThrow(
      InvalidGuestDataError
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/entities/Guest.test.ts`
Expected: FAIL (current `Guest` requires `email`/`phone`, uses
`attendanceConfirmed: boolean`, has no `nickname`).

- [ ] **Step 3: Add `GuestNotFoundError`**

In `src/domain/errors/DomainError.ts`, add one line after
`InvalidGuestDataError`:

```ts
export class GuestNotFoundError extends DomainError {}
```

- [ ] **Step 4: Rewrite the entity**

Replace the full contents of `src/domain/entities/Guest.ts` with:

```ts
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

export type AttendanceStatus = "pending" | "confirmed" | "declined";

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["pending", "confirmed", "declined"];

export interface GuestProps {
  id?: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  message?: string;
  attendanceStatus: AttendanceStatus;
  createdAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Guest {
  readonly id?: string;
  readonly fullName: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly companionsCount: number;
  readonly message?: string;
  readonly attendanceStatus: AttendanceStatus;
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
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GuestProps): Guest {
    if (!props.fullName || props.fullName.trim().length < 3) {
      throw new InvalidGuestDataError("Guest full name must have at least 3 characters.");
    }

    if (props.email && !EMAIL_PATTERN.test(props.email)) {
      throw new InvalidGuestDataError("Guest email is invalid.");
    }

    if (props.phone && props.phone.trim().length < 8) {
      throw new InvalidGuestDataError("Guest phone is invalid.");
    }

    if (!Number.isInteger(props.companionsCount) || props.companionsCount < 0) {
      throw new InvalidGuestDataError("Companions count must be a non-negative integer.");
    }

    if (!ATTENDANCE_STATUSES.includes(props.attendanceStatus)) {
      throw new InvalidGuestDataError("Attendance status is invalid.");
    }

    return new Guest(props);
  }

  totalAttendeesCount(): number {
    return this.attendanceStatus === "confirmed" ? 1 + this.companionsCount : 0;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/domain/entities/Guest.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/Guest.ts src/domain/entities/Guest.test.ts src/domain/errors/DomainError.ts
git commit -m "feat(rsvp): rewrite Guest entity with attendanceStatus, nickname, optional contact info"
```

---

## Task 2: Rewrite `GuestRepository` and `InMemoryGuestRepository`

**Files:**
- Modify: `src/domain/repositories/GuestRepository.ts`
- Modify: `src/application/testing/InMemoryGuestRepository.ts`

**Interfaces:**
- Consumes: `Guest`, `AttendanceStatus` from `@/domain/entities/Guest`
  (Task 1).
- Produces: `GuestPublicSummary { id: string; fullName: string; nickname?:
  string }`; `GuestAttendanceUpdate { attendanceStatus: AttendanceStatus;
  companionsCount?: number; message?: string }`; `GuestRepository` gains
  `findAllPublicNames(): Promise<GuestPublicSummary[]>`, `findById(id:
  string): Promise<Guest | null>`, `updateAttendance(id: string, update:
  GuestAttendanceUpdate): Promise<Guest>`. `InMemoryGuestRepository`
  implements all of it. Tasks 4–6's use cases and Task 3's Supabase
  repository depend on these exact names/signatures.

This task has no dedicated new test file — `InMemoryGuestRepository` (like
`InMemoryGiftRepository` before it) has no test file of its own in this
codebase; it's exercised through the use-case tests in Tasks 4–6. Verify
via `npm run build` (TypeScript will fail to compile if the interface and
implementation don't match).

- [ ] **Step 1: Rewrite the repository interface**

Replace the full contents of `src/domain/repositories/GuestRepository.ts`
with:

```ts
import { AttendanceStatus, Guest } from "@/domain/entities/Guest";

export interface GuestPublicSummary {
  id: string;
  fullName: string;
  nickname?: string;
}

export interface GuestAttendanceUpdate {
  attendanceStatus: AttendanceStatus;
  companionsCount?: number;
  message?: string;
}

export interface GuestRepository {
  save(guest: Guest): Promise<Guest>;
  findAll(): Promise<Guest[]>;
  /** Name/nickname/id only — never email, phone, or message. */
  findAllPublicNames(): Promise<GuestPublicSummary[]>;
  findById(id: string): Promise<Guest | null>;
  updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest>;
}
```

- [ ] **Step 2: Rewrite the in-memory implementation**

Replace the full contents of `src/application/testing/InMemoryGuestRepository.ts`
with:

```ts
import { Guest } from "@/domain/entities/Guest";
import { GuestAttendanceUpdate, GuestPublicSummary, GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

export class InMemoryGuestRepository implements GuestRepository {
  private guests: Guest[] = [];
  private nextId = 1;

  async save(guest: Guest): Promise<Guest> {
    const persisted = Guest.create({ ...guest, id: guest.id ?? `guest-${this.nextId++}` });
    this.guests.push(persisted);
    return persisted;
  }

  async findAll(): Promise<Guest[]> {
    return [...this.guests];
  }

  async findAllPublicNames(): Promise<GuestPublicSummary[]> {
    return this.guests.map((guest) => ({
      id: guest.id!,
      fullName: guest.fullName,
      nickname: guest.nickname,
    }));
  }

  async findById(id: string): Promise<Guest | null> {
    return this.guests.find((guest) => guest.id === id) ?? null;
  }

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
    });

    this.guests[index] = updated;
    return updated;
  }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: FAILS at this point — `SupabaseGuestRepository` (Task 3),
`ConfirmRsvpUseCase` (Task 4), and callers still reference the old shape.
This is expected; do not try to fix those files here, that's the next
tasks. Instead, run just the domain/application-layer type check scoped
to what this task touches:

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "InMemoryGuestRepository\|GuestRepository.ts" || true`
Expected: no output referencing `InMemoryGuestRepository.ts` or
`GuestRepository.ts` themselves (errors about *other* files that consume
the old shape are expected and are not this task's problem).

- [ ] **Step 4: Run the domain test suite**

Run: `npx vitest run src/domain`
Expected: PASS (10 tests from Task 1 — this task doesn't add new tests,
but confirms nothing in the domain layer broke).

- [ ] **Step 5: Commit**

```bash
git add src/domain/repositories/GuestRepository.ts src/application/testing/InMemoryGuestRepository.ts
git commit -m "feat(rsvp): add findAllPublicNames/findById/updateAttendance to GuestRepository"
```

---

## Task 3: Rewrite `SupabaseGuestRepository` and add the migration

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGuestRepository.ts`
- Create: `supabase/migrations/0002_guest_rsvp_search.sql`

**Interfaces:**
- Consumes: `GuestRepository`, `GuestPublicSummary`,
  `GuestAttendanceUpdate` (Task 2); `Guest` (Task 1).
- Produces: `SupabaseGuestRepository` fully implements the new
  `GuestRepository` interface against the migrated `guests` table
  (columns: `nickname` added, `attendance_status` text replacing
  `attendance_confirmed` boolean, `email`/`phone` now nullable).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_guest_rsvp_search.sql`:

```sql
-- Moves the RSVP flow from open self-registration to a pre-registered
-- guest list searched by name: guests now start as 'pending' (created by
-- the couple via /admin/convidados/novo) and are updated to
-- 'confirmed'/'declined' by the guest themselves on /confirmar-presenca.

alter table guests
  add column if not exists nickname text;

alter table guests
  add column if not exists attendance_status text;

update guests
  set attendance_status = case when attendance_confirmed then 'confirmed' else 'declined' end
  where attendance_status is null;

alter table guests
  alter column attendance_status set default 'pending';

alter table guests
  alter column attendance_status set not null;

alter table guests
  add constraint guests_attendance_status_check
  check (attendance_status in ('pending', 'confirmed', 'declined'));

alter table guests
  alter column email drop not null;

alter table guests
  alter column phone drop not null;

alter table guests
  drop column attendance_confirmed;
```

- [ ] **Step 2: Rewrite the repository**

Replace the full contents of `src/infrastructure/supabase/SupabaseGuestRepository.ts`
with:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { AttendanceStatus, Guest } from "@/domain/entities/Guest";
import {
  GuestAttendanceUpdate,
  GuestPublicSummary,
  GuestRepository,
} from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

interface GuestRow {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  companions_count: number;
  message: string | null;
  attendance_status: AttendanceStatus;
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
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGuestRepository implements GuestRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(guest: Guest): Promise<Guest> {
    const { data, error } = await this.client
      .from("guests")
      .insert({
        full_name: guest.fullName,
        nickname: guest.nickname ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        companions_count: guest.companionsCount,
        message: guest.message ?? null,
        attendance_status: guest.attendanceStatus,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save guest: ${error.message}`);
    }

    return toEntity(data as GuestRow);
  }

  async findAll(): Promise<Guest[]> {
    const { data, error } = await this.client
      .from("guests")
      .select()
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list guests: ${error.message}`);
    }

    return (data as GuestRow[]).map(toEntity);
  }

  async findAllPublicNames(): Promise<GuestPublicSummary[]> {
    const { data, error } = await this.client.from("guests").select("id, full_name, nickname");

    if (error) {
      throw new Error(`Failed to list guest names: ${error.message}`);
    }

    return (data as Pick<GuestRow, "id" | "full_name" | "nickname">[]).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      nickname: row.nickname ?? undefined,
    }));
  }

  async findById(id: string): Promise<Guest | null> {
    const { data, error } = await this.client.from("guests").select().eq("id", id).maybeSingle();

    if (error) {
      throw new Error(`Failed to find guest: ${error.message}`);
    }

    return data ? toEntity(data as GuestRow) : null;
  }

  async updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest> {
    const patch: Record<string, unknown> = { attendance_status: update.attendanceStatus };
    if (update.companionsCount !== undefined) {
      patch.companions_count = update.companionsCount;
    }
    if (update.message !== undefined) {
      patch.message = update.message;
    }

    const { data, error } = await this.client
      .from("guests")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update guest attendance: ${error.message}`);
    }

    if (!data) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return toEntity(data as GuestRow);
  }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: still FAILS at this point — `ConfirmRsvpUseCase` and its
callers (Task 4+) haven't been updated yet. Confirm the failures no
longer mention `SupabaseGuestRepository.ts`:

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "SupabaseGuestRepository" || true`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGuestRepository.ts supabase/migrations/0002_guest_rsvp_search.sql
git commit -m "feat(rsvp): implement findAllPublicNames/findById/updateAttendance in SupabaseGuestRepository"
```

---

## Task 4: Rewrite `ConfirmRsvpUseCase`

**Files:**
- Modify: `src/application/use-cases/rsvp/ConfirmRsvpUseCase.ts`
- Modify: `src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`

**Interfaces:**
- Consumes: `GuestRepository`, `GuestAttendanceUpdate` (Task 2);
  `GuestNotFoundError`, `InvalidGuestDataError` (Task 1).
- Produces: `ConfirmRsvpInput { guestId: string; attendanceStatus:
  "confirmed" | "declined"; companionsCount?: number; message?: string }`;
  `ConfirmRsvpUseCase.execute(input): Promise<Guest>` — looks up the
  guest by id, validates `companionsCount` (0–10, forced to 0 when
  declining), and calls `guestRepository.updateAttendance`. Throws
  `GuestNotFoundError` if the id doesn't exist. Task 9's Server Action
  calls this with the shape above (not the old
  `fullName`/`email`/`phone`/`attendanceConfirmed` shape).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of
`src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { ConfirmRsvpUseCase } from "@/application/use-cases/rsvp/ConfirmRsvpUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

async function seedPendingGuest(repository: InMemoryGuestRepository) {
  return repository.save(
    Guest.create({ fullName: "Ana Pereira", companionsCount: 0, attendanceStatus: "pending" })
  );
}

describe("ConfirmRsvpUseCase", () => {
  it("confirms a pending guest with companions and a message", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "confirmed",
      companionsCount: 2,
      message: "Mal podemos esperar!",
    });

    expect(updated.attendanceStatus).toBe("confirmed");
    expect(updated.companionsCount).toBe(2);
    expect(updated.message).toBe("Mal podemos esperar!");
  });

  it("declines a pending guest and forces companions to zero", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "declined",
      companionsCount: 3,
    });

    expect(updated.attendanceStatus).toBe("declined");
    expect(updated.companionsCount).toBe(0);
  });

  it("defaults companions to zero when confirming without a count", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed" });

    expect(updated.companionsCount).toBe(0);
  });

  it("throws GuestNotFoundError for an unknown guest id", async () => {
    const useCase = new ConfirmRsvpUseCase(new InMemoryGuestRepository());

    await expect(
      useCase.execute({ guestId: "does-not-exist", attendanceStatus: "confirmed" })
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("rejects a companions count above 10", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed", companionsCount: 11 })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
Expected: FAIL (current use case takes the old `fullName`/`email`/`phone`
shape and has no `guestId` lookup).

- [ ] **Step 3: Rewrite the use case**

Replace the full contents of
`src/application/use-cases/rsvp/ConfirmRsvpUseCase.ts` with:

```ts
import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

export interface ConfirmRsvpInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  message?: string;
}

export class ConfirmRsvpUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: ConfirmRsvpInput): Promise<Guest> {
    const companionsCount =
      input.attendanceStatus === "confirmed" ? (input.companionsCount ?? 0) : 0;

    if (!Number.isInteger(companionsCount) || companionsCount < 0 || companionsCount > 10) {
      throw new InvalidGuestDataError("Companions count must be an integer between 0 and 10.");
    }

    const guest = await this.guestRepository.findById(input.guestId);
    if (!guest) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return this.guestRepository.updateAttendance(input.guestId, {
      attendanceStatus: input.attendanceStatus,
      companionsCount,
      message: input.message?.trim() || undefined,
    });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/rsvp/ConfirmRsvpUseCase.ts src/application/use-cases/rsvp/ConfirmRsvpUseCase.test.ts
git commit -m "feat(rsvp): rewrite ConfirmRsvpUseCase around guestId + attendanceStatus updates"
```

---

## Task 5: `SearchGuestsUseCase`

**Files:**
- Create: `src/application/use-cases/rsvp/SearchGuestsUseCase.ts`
- Create: `src/application/use-cases/rsvp/SearchGuestsUseCase.test.ts`

**Interfaces:**
- Consumes: `GuestRepository`, `GuestPublicSummary` (Task 2).
- Produces: `SearchGuestsUseCase.execute(): Promise<GuestPublicSummary[]>`
  — returns every pre-registered guest's public name/nickname/id,
  alphabetically sorted by `fullName`. Task 10's RSVP page Server
  Component calls this once per page load.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/rsvp/SearchGuestsUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SearchGuestsUseCase } from "@/application/use-cases/rsvp/SearchGuestsUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";

describe("SearchGuestsUseCase", () => {
  it("returns every guest's public name info, sorted alphabetically", async () => {
    const repository = new InMemoryGuestRepository();
    await repository.save(
      Guest.create({ fullName: "Zeca Alves", companionsCount: 0, attendanceStatus: "pending" })
    );
    await repository.save(
      Guest.create({
        fullName: "Ana Beatriz",
        nickname: "Bia",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    );

    const results = await new SearchGuestsUseCase(repository).execute();

    expect(results.map((r) => r.fullName)).toEqual(["Ana Beatriz", "Zeca Alves"]);
    expect(results[0].nickname).toBe("Bia");
    expect(results.every((r) => "email" in r === false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/application/use-cases/rsvp/SearchGuestsUseCase.test.ts`
Expected: FAIL — `Cannot find module '@/application/use-cases/rsvp/SearchGuestsUseCase'`

- [ ] **Step 3: Write the implementation**

Create `src/application/use-cases/rsvp/SearchGuestsUseCase.ts`:

```ts
import { GuestPublicSummary, GuestRepository } from "@/domain/repositories/GuestRepository";

export class SearchGuestsUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(): Promise<GuestPublicSummary[]> {
    const guests = await this.guestRepository.findAllPublicNames();
    return [...guests].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/application/use-cases/rsvp/SearchGuestsUseCase.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/rsvp/SearchGuestsUseCase.ts src/application/use-cases/rsvp/SearchGuestsUseCase.test.ts
git commit -m "feat(rsvp): add SearchGuestsUseCase for the public name list"
```

---

## Task 6: `CreateGuestUseCase`

**Files:**
- Create: `src/application/use-cases/admin/CreateGuestUseCase.ts`
- Create: `src/application/use-cases/admin/CreateGuestUseCase.test.ts`

**Interfaces:**
- Consumes: `Guest`, `GuestRepository` (Tasks 1–2).
- Produces: `CreateGuestInput { fullName: string; nickname?: string }`;
  `CreateGuestUseCase.execute(input): Promise<Guest>` — creates a new
  guest with `attendanceStatus: "pending"` and `companionsCount: 0`. Task
  11's admin form/action calls this.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/admin/CreateGuestUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

describe("CreateGuestUseCase", () => {
  it("creates a pending guest with zero companions", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const guest = await useCase.execute({ fullName: "Carlos Souza", nickname: "Cadu" });

    expect(guest.id).toBeDefined();
    expect(guest.attendanceStatus).toBe("pending");
    expect(guest.companionsCount).toBe(0);
    expect(guest.nickname).toBe("Cadu");
  });

  it("propagates domain validation errors for an invalid name", async () => {
    const useCase = new CreateGuestUseCase(new InMemoryGuestRepository());

    await expect(useCase.execute({ fullName: "Al" })).rejects.toThrow(InvalidGuestDataError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/CreateGuestUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/application/use-cases/admin/CreateGuestUseCase.ts`:

```ts
import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export interface CreateGuestInput {
  fullName: string;
  nickname?: string;
}

export class CreateGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: CreateGuestInput): Promise<Guest> {
    const guest = Guest.create({
      fullName: input.fullName,
      nickname: input.nickname,
      companionsCount: 0,
      attendanceStatus: "pending",
    });

    return this.guestRepository.save(guest);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/CreateGuestUseCase.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/CreateGuestUseCase.ts src/application/use-cases/admin/CreateGuestUseCase.test.ts
git commit -m "feat(rsvp): add CreateGuestUseCase for admin guest pre-registration"
```

---

## Task 7: Update `GetDashboardSummaryUseCase` and `DashboardStats`

**Files:**
- Modify: `src/application/use-cases/admin/GetDashboardSummaryUseCase.ts`
- Modify: `src/application/use-cases/admin/GetDashboardSummaryUseCase.test.ts`
- Modify: `src/components/admin/DashboardStats.tsx`
- Modify: `src/components/admin/DashboardStats.test.tsx`

**Interfaces:**
- Consumes: `Guest.attendanceStatus` (Task 1).
- Produces: `DashboardSummary` gains `pendingGuestsCount: number`;
  `confirmedGuestsCount`/`declinedGuestsCount` are now computed from
  `attendanceStatus` instead of a boolean (previously `declinedGuestsCount`
  silently included pending guests — this task fixes that). `DashboardStats`
  renders a 4th "Pendentes" stat tile.

- [ ] **Step 1: Write the failing test for the use case**

Replace the full contents of
`src/application/use-cases/admin/GetDashboardSummaryUseCase.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Guest } from "@/domain/entities/Guest";

describe("GetDashboardSummaryUseCase", () => {
  it("counts confirmed, declined, and pending guests separately", async () => {
    const guestRepository = new InMemoryGuestRepository();
    await guestRepository.save(
      Guest.create({ fullName: "Guest Confirmed", companionsCount: 1, attendanceStatus: "confirmed" })
    );
    await guestRepository.save(
      Guest.create({ fullName: "Guest Declined", companionsCount: 0, attendanceStatus: "declined" })
    );
    await guestRepository.save(
      Guest.create({ fullName: "Guest Pending", companionsCount: 0, attendanceStatus: "pending" })
    );

    const summary = await new GetDashboardSummaryUseCase(
      guestRepository,
      new InMemoryGiftRepository(),
      new InMemoryGiftContributionRepository()
    ).execute();

    expect(summary.confirmedGuestsCount).toBe(1);
    expect(summary.declinedGuestsCount).toBe(1);
    expect(summary.pendingGuestsCount).toBe(1);
    expect(summary.totalAttendeesCount).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/GetDashboardSummaryUseCase.test.ts`
Expected: FAIL (current use case has no `pendingGuestsCount` and filters
by the old `attendanceConfirmed` boolean).

- [ ] **Step 3: Rewrite the use case**

Replace the full contents of
`src/application/use-cases/admin/GetDashboardSummaryUseCase.ts` with:

```ts
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export interface DashboardSummary {
  confirmedGuestsCount: number;
  declinedGuestsCount: number;
  pendingGuestsCount: number;
  totalAttendeesCount: number;
  totalGiftsCount: number;
  paidGiftsCount: number;
  totalAmountReceived: number;
}

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository
  ) {}

  async execute(): Promise<DashboardSummary> {
    const [guests, gifts, approvedContributions] = await Promise.all([
      this.guestRepository.findAll(),
      this.giftRepository.findAll(),
      this.giftContributionRepository.findApproved(),
    ]);

    return {
      confirmedGuestsCount: guests.filter((guest) => guest.attendanceStatus === "confirmed").length,
      declinedGuestsCount: guests.filter((guest) => guest.attendanceStatus === "declined").length,
      pendingGuestsCount: guests.filter((guest) => guest.attendanceStatus === "pending").length,
      totalAttendeesCount: guests.reduce((total, guest) => total + guest.totalAttendeesCount(), 0),
      totalGiftsCount: gifts.length,
      paidGiftsCount: gifts.filter((gift) => gift.status === "paid").length,
      totalAmountReceived: approvedContributions.reduce((total, contribution) => total + contribution.amount, 0),
    };
  }
}
```

- [ ] **Step 4: Run the use-case test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/GetDashboardSummaryUseCase.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing test for `DashboardStats`**

Replace the full contents of `src/components/admin/DashboardStats.test.tsx`
with:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "@/components/admin/DashboardStats";

describe("DashboardStats", () => {
  it("renders every summary metric, including pending guests, formatting the amount as BRL", () => {
    render(
      <DashboardStats
        summary={{
          confirmedGuestsCount: 42,
          declinedGuestsCount: 3,
          pendingGuestsCount: 7,
          totalAttendeesCount: 80,
          totalGiftsCount: 12,
          paidGiftsCount: 5,
          totalAmountReceived: 2500,
        }}
      />
    );

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("R$ 2.500,00")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: FAIL (current component has no "Pendentes" tile and its prop
type doesn't include `pendingGuestsCount`).

- [ ] **Step 7: Update the component**

Replace the full contents of `src/components/admin/DashboardStats.tsx`
with:

```tsx
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const items = [
    { label: "Confirmados", value: summary.confirmedGuestsCount },
    { label: "Pendentes", value: summary.pendingGuestsCount },
    { label: "Não vão", value: summary.declinedGuestsCount },
    { label: "Total de pessoas", value: summary.totalAttendeesCount },
    { label: "Presentes cadastrados", value: summary.totalGiftsCount },
    { label: "Presentes recebidos", value: summary.paidGiftsCount },
    { label: "Valor arrecadado", value: formatCurrency(summary.totalAmountReceived) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-line bg-paper p-5 text-center">
          <p className="font-serif text-3xl text-ink">{item.value}</p>
          <p className="mt-1 font-sans text-xs uppercase tracking-widest text-ink-soft">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/admin/DashboardStats.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add src/application/use-cases/admin/GetDashboardSummaryUseCase.ts src/application/use-cases/admin/GetDashboardSummaryUseCase.test.ts src/components/admin/DashboardStats.tsx src/components/admin/DashboardStats.test.tsx
git commit -m "feat(rsvp): split dashboard guest counts into confirmed/declined/pending"
```

---

## Task 8: `matchGuestName` fuzzy-search utility

**Files:**
- Create: `src/shared/utils/matchGuestName.ts`
- Create: `src/shared/utils/matchGuestName.test.ts`

**Interfaces:**
- Consumes: nothing beyond plain strings.
- Produces: `GuestNameCandidate { id: string; fullName: string; nickname?:
  string }` (structurally compatible with `GuestPublicSummary` from Task
  2 — Task 10's `RsvpSearch` passes the Server Component's
  `GuestPublicSummary[]` straight in); `findBestGuestMatch(query: string,
  candidates: GuestNameCandidate[]): GuestNameCandidate | null` — accent-
  and case-insensitive, matches full name or nickname by substring/prefix
  first, then falls back to Levenshtein-distance typo tolerance (≤2 edits)
  per word. Returns `null` for queries shorter than 2 characters or with
  no close-enough candidate.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/matchGuestName.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findBestGuestMatch } from "@/shared/utils/matchGuestName";

const GUESTS = [
  { id: "1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "2", fullName: "Maria da Silva" },
  { id: "3", fullName: "Ana Beatriz Costa", nickname: "Bia" },
];

describe("findBestGuestMatch", () => {
  it("matches by exact full name, case insensitive", () => {
    const match = findBestGuestMatch("MARIA DA SILVA", GUESTS);
    expect(match?.id).toBe("2");
  });

  it("matches by nickname", () => {
    const match = findBestGuestMatch("bia", GUESTS);
    expect(match?.id).toBe("3");
  });

  it("matches a prefix of the first name", () => {
    const match = findBestGuestMatch("jo", GUESTS);
    expect(match?.id).toBe("1");
  });

  it("ignores accents", () => {
    const match = findBestGuestMatch("joao", GUESTS);
    expect(match?.id).toBe("1");
  });

  it("tolerates a small typo in a single word", () => {
    const match = findBestGuestMatch("marya", GUESTS);
    expect(match?.id).toBe("2");
  });

  it("returns null when nothing is close enough", () => {
    const match = findBestGuestMatch("xyzxyzxyz", GUESTS);
    expect(match).toBeNull();
  });

  it("returns null for a query shorter than 2 characters", () => {
    expect(findBestGuestMatch("j", GUESTS)).toBeNull();
    expect(findBestGuestMatch("", GUESTS)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/utils/matchGuestName.test.ts`
Expected: FAIL — `Cannot find module '@/shared/utils/matchGuestName'`

- [ ] **Step 3: Write the implementation**

Create `src/shared/utils/matchGuestName.ts`:

```ts
export interface GuestNameCandidate {
  id: string;
  fullName: string;
  nickname?: string;
}

const MIN_QUERY_LENGTH = 2;
const MAX_TYPO_DISTANCE = 2;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function fieldScore(normalizedQuery: string, field: string): number | null {
  const normalizedField = normalize(field);

  if (normalizedField.startsWith(normalizedQuery) || normalizedField.includes(normalizedQuery)) {
    return 0;
  }

  const words = normalizedField.split(" ");
  const candidateDistances = [levenshteinDistance(normalizedQuery, normalizedField), ...words.map((word) => levenshteinDistance(normalizedQuery, word))];
  const minDistance = Math.min(...candidateDistances);

  return minDistance <= MAX_TYPO_DISTANCE ? minDistance + 1 : null;
}

/**
 * Finds the closest guest to a typed name, tolerating accents, casing,
 * partial names, and small typos. Used by the public RSVP search — never
 * hits the network, matches against the already-loaded public name list.
 */
export function findBestGuestMatch(
  query: string,
  candidates: GuestNameCandidate[]
): GuestNameCandidate | null {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return null;
  }

  let best: { candidate: GuestNameCandidate; score: number } | null = null;

  for (const candidate of candidates) {
    const fields = [candidate.nickname, candidate.fullName].filter((value): value is string => Boolean(value));

    for (const field of fields) {
      const score = fieldScore(normalizedQuery, field);
      if (score !== null && (!best || score < best.score)) {
        best = { candidate, score };
      }
    }
  }

  return best?.candidate ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared/utils/matchGuestName.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/matchGuestName.ts src/shared/utils/matchGuestName.test.ts
git commit -m "feat(rsvp): add findBestGuestMatch fuzzy name-search utility"
```

---

## Task 9: Wire composition root, delete the old form, rewrite the Server Action

**Files:**
- Modify: `src/infrastructure/composition.ts`
- Modify: `src/app/confirmar-presenca/actions.ts`
- Delete: `src/components/rsvp/RsvpForm.tsx`
- Delete: `src/components/rsvp/RsvpForm.test.tsx`
- Delete: `src/components/rsvp/rsvpFormSchema.ts`

**Interfaces:**
- Consumes: `ConfirmRsvpUseCase` (Task 4), `SearchGuestsUseCase` (Task 5),
  `CreateGuestUseCase` (Task 6).
- Produces: `createSearchGuestsUseCase(): SearchGuestsUseCase` and
  `createCreateGuestUseCase(): CreateGuestUseCase` added to
  `composition.ts`, following the existing factory-function pattern.
  `confirmRsvpAction(input: ConfirmRsvpActionInput):
  Promise<ConfirmRsvpActionResult>` replaces the old form-shaped action —
  Task 10's `RsvpSearch` client component calls it directly (not through
  a `<form>`).

- [ ] **Step 1: Delete the old form files**

```bash
git rm src/components/rsvp/RsvpForm.tsx src/components/rsvp/RsvpForm.test.tsx src/components/rsvp/rsvpFormSchema.ts
```

- [ ] **Step 2: Add the two new factory functions**

In `src/infrastructure/composition.ts`, add these two imports near the
top (after the existing `ListGuestsUseCase` import):

```ts
import { SearchGuestsUseCase } from "@/application/use-cases/rsvp/SearchGuestsUseCase";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
```

And add these two functions at the end of the file:

```ts
export function createSearchGuestsUseCase(): SearchGuestsUseCase {
  return new SearchGuestsUseCase(repositories().guestRepository);
}

export function createCreateGuestUseCase(): CreateGuestUseCase {
  return new CreateGuestUseCase(repositories().guestRepository);
}
```

- [ ] **Step 3: Rewrite the Server Action**

Replace the full contents of `src/app/confirmar-presenca/actions.ts` with:

```ts
"use server";

import { createConfirmRsvpUseCase } from "@/infrastructure/composition";
import { DomainError } from "@/domain/errors/DomainError";

export interface ConfirmRsvpActionInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  message?: string;
}

export interface ConfirmRsvpActionResult {
  success: boolean;
  message: string;
}

export async function confirmRsvpAction(
  input: ConfirmRsvpActionInput
): Promise<ConfirmRsvpActionResult> {
  try {
    await createConfirmRsvpUseCase().execute(input);

    return {
      success: true,
      message:
        input.attendanceStatus === "confirmed"
          ? "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você."
          : "Tudo bem, sentiremos sua falta! Obrigado por avisar.",
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "Não foi possível registrar sua resposta agora. Tente novamente em instantes.",
    };
  }
}
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass. The deleted `RsvpForm.test.tsx` no longer runs;
no other test references `RsvpForm`, `rsvpFormSchema`, or the old
`confirmRsvpAction` shape at this point (Task 10 will add the new
consumer).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/composition.ts src/app/confirmar-presenca/actions.ts
git commit -m "feat(rsvp): wire SearchGuestsUseCase/CreateGuestUseCase, rewrite confirmRsvpAction, remove old self-registration form"
```

---

## Task 10: `RsvpSearch` client component + rebuild the RSVP page

**Files:**
- Create: `src/components/rsvp/RsvpSearch.tsx`
- Create: `src/components/rsvp/RsvpSearch.test.tsx`
- Modify: `src/app/confirmar-presenca/page.tsx`

**Interfaces:**
- Consumes: `findBestGuestMatch`, `GuestNameCandidate` (Task 8);
  `confirmRsvpAction` (Task 9); `PillButton` (`@/components/ui/PillButton`,
  Plan 1); `createSearchGuestsUseCase`, `isBackendConfigured`,
  `ConfigurationNotice` (existing/Task 9).
- Produces: `RsvpSearch(props: { guests: GuestNameCandidate[] }):
  JSX.Element` — the full search → match → confirm/decline → optional
  companions/message → feedback flow. `RsvpPage` (default export of
  `confirmar-presenca/page.tsx`) becomes an async Server Component that
  fetches the guest list via `createSearchGuestsUseCase()` and renders
  `RsvpSearch`, falling back to `ConfigurationNotice` when the backend
  isn't configured — same pattern as `src/app/admin/(protected)/convidados/page.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/rsvp/RsvpSearch.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RsvpSearch } from "@/components/rsvp/RsvpSearch";

const confirmRsvpActionMock = vi.fn();

vi.mock("@/app/confirmar-presenca/actions", () => ({
  confirmRsvpAction: (...args: unknown[]) => confirmRsvpActionMock(...args),
}));

const GUESTS = [
  { id: "guest-1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "guest-2", fullName: "Maria da Silva" },
];

describe("RsvpSearch", () => {
  it("shows a personalized match and action buttons once a close name is typed", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");

    expect(await screen.findByText("JP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /não poderei ir/i })).toBeInTheDocument();
  });

  it("shows a not-found message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "xyzxyzxyz");

    expect(await screen.findByText(/não encontramos esse nome/i)).toBeInTheDocument();
  });

  it("declines directly and shows the feedback message", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Tudo bem, sentiremos sua falta! Obrigado por avisar.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /não poderei ir/i }));

    expect(await screen.findByText(/sentiremos sua falta/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "declined",
    });
  });

  it("reveals the companions/message form and submits with the confirmed status", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /confirmar presença/i }));

    const companionsInput = await screen.findByLabelText(/número de acompanhantes/i);
    await user.clear(companionsInput);
    await user.type(companionsInput, "2");
    await user.type(screen.getByLabelText(/mensagem para o casal/i), "Vai ser lindo!");
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/presença confirmada com sucesso/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "confirmed",
      companionsCount: 2,
      message: "Vai ser lindo!",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/rsvp/RsvpSearch.test.tsx`
Expected: FAIL — `Cannot find module '@/components/rsvp/RsvpSearch'`

- [ ] **Step 3: Write the component**

Create `src/components/rsvp/RsvpSearch.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { findBestGuestMatch, GuestNameCandidate } from "@/shared/utils/matchGuestName";
import { confirmRsvpAction } from "@/app/confirmar-presenca/actions";

interface RsvpSearchProps {
  guests: GuestNameCandidate[];
}

type Step = "searching" | "confirming" | "done";

function shuffleWord(word: string, seed: number): string {
  const letters = word.split("");
  let state = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}

export function RsvpSearch({ guests }: RsvpSearchProps) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("searching");
  const [companionsCount, setCompanionsCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decorativeText = useMemo(
    () =>
      guests
        .map((guest, index) =>
          guest.fullName
            .split(" ")
            .map((word) => shuffleWord(word, index + word.length + 1))
            .join(" ")
        )
        .join("   "),
    [guests]
  );

  const trimmedQuery = query.trim();
  const match = useMemo(() => findBestGuestMatch(trimmedQuery, guests), [trimmedQuery, guests]);
  const displayName = match ? match.nickname ?? match.fullName.split(" ")[0] : "";

  async function handleDecline() {
    if (!match) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({ guestId: match.id, attendanceStatus: "declined" });
    setIsSubmitting(false);
    setFeedback(result.message);
    setStep("done");
  }

  async function handleConfirmSubmit() {
    if (!match) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({
      guestId: match.id,
      attendanceStatus: "confirmed",
      companionsCount,
      message: message.trim() || undefined,
    });
    setIsSubmitting(false);
    setFeedback(result.message);
    setStep("done");
  }

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden px-6 font-serif text-3xl leading-loose text-line"
      >
        {decorativeText}
      </p>

      <div className="relative flex w-full max-w-lg flex-col items-center gap-6">
        {step === "done" ? (
          <p role="status" className="font-serif text-2xl text-ink">
            {feedback}
          </p>
        ) : (
          <>
            <div className="w-full">
              <label htmlFor="guest-search" className="block font-sans text-xs uppercase tracking-widest text-ink-soft">
                Digite seu nome
              </label>
              <input
                id="guest-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full border-b border-line bg-transparent py-2 text-center font-serif text-4xl text-ink focus:border-gold focus:outline-none"
              />
              <p className="mt-3 font-script text-xl italic text-ink-soft">
                Pedimos que confirme o mais rápido que puder, assim que tiver certeza!
              </p>
            </div>

            {trimmedQuery.length >= 2 && match && step === "searching" && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-script text-2xl italic text-gold">
                  {match.nickname ?? match.fullName}
                </p>
                <p className="font-serif text-xl text-ink">{displayName}? Que bom que você apareceu! :)</p>
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

            {trimmedQuery.length >= 2 && !match && (
              <p className="font-sans text-sm text-ink-soft">
                Não encontramos esse nome — confira a grafia ou fale com a gente.
              </p>
            )}

            {step === "confirming" && match && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleConfirmSubmit();
                }}
                className="flex w-full flex-col gap-4 text-left"
              >
                <div>
                  <label htmlFor="companionsCount" className="block font-sans text-sm text-ink">
                    Número de acompanhantes
                  </label>
                  <input
                    id="companionsCount"
                    type="number"
                    min={0}
                    max={10}
                    value={companionsCount}
                    onChange={(event) => setCompanionsCount(Number(event.target.value))}
                    className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block font-sans text-sm text-ink">
                    Mensagem para o casal (opcional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <PillButton type="submit" disabled={isSubmitting} className="self-center">
                  {isSubmitting ? "Enviando..." : "Confirmar presença"}
                </PillButton>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/rsvp/RsvpSearch.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Rebuild the RSVP page**

Replace the full contents of `src/app/confirmar-presenca/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { createSearchGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { RsvpSearch } from "@/components/rsvp/RsvpSearch";

export const metadata: Metadata = {
  title: "Confirme sua Presença | Stéfanie & Jonatas",
};

export default async function RsvpPage() {
  const backendConfigured = isBackendConfigured();
  const guests = backendConfigured ? await createSearchGuestsUseCase().execute() : null;

  return (
    <div>
      {!guests ? (
        <div className="mx-auto max-w-2xl px-6 pt-20 pb-20">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para confirmar presença." />
        </div>
      ) : (
        <RsvpSearch guests={guests} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/rsvp/RsvpSearch.tsx src/components/rsvp/RsvpSearch.test.tsx src/app/confirmar-presenca/page.tsx
git commit -m "feat(rsvp): add RsvpSearch name-search UI and rebuild the RSVP page around it"
```

---

## Task 11: Admin guest pre-registration

**Files:**
- Create: `src/components/admin/guestFormSchema.ts`
- Create: `src/components/admin/GuestForm.tsx`
- Create: `src/app/admin/(protected)/convidados/actions.ts`
- Create: `src/app/admin/(protected)/convidados/novo/page.tsx`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`

**Interfaces:**
- Consumes: `createCreateGuestUseCase` (Task 9); `createListGuestsUseCase`
  (existing, unchanged).
- Produces: an admin flow to pre-register guests before the wedding,
  mirroring the existing `GiftForm`/`upsertGiftAction`/`presentes/novo`
  pattern. The guest list page shows `attendanceStatus` instead of a
  yes/no confirmed column and links to the new registration page.

This task follows the existing `GiftForm` pattern exactly (see
`src/components/admin/GiftForm.tsx` and
`src/app/admin/(protected)/presentes/actions.ts` for reference — read
them if anything below is ambiguous) — no dedicated test file for
`GuestForm.tsx` or the actions file, consistent with `GiftForm.tsx` and
`presentes/actions.ts` having none either. `CreateGuestUseCase` (Task 6)
already has its own unit tests.

- [ ] **Step 1: Create the form schema**

Create `src/components/admin/guestFormSchema.ts`:

```ts
import { z } from "zod";

export const guestFormSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo."),
  nickname: z.string().optional(),
});

export type GuestFormValues = z.output<typeof guestFormSchema>;
export type GuestFormInput = z.input<typeof guestFormSchema>;
```

- [ ] **Step 2: Create the Server Action**

Create `src/app/admin/(protected)/convidados/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createCreateGuestUseCase } from "@/infrastructure/composition";
import { guestFormSchema } from "@/components/admin/guestFormSchema";

export interface CreateGuestActionState {
  status: "idle" | "error";
  message?: string;
}

export const initialCreateGuestActionState: CreateGuestActionState = { status: "idle" };

export async function createGuestAction(
  _prevState: CreateGuestActionState,
  formData: FormData
): Promise<CreateGuestActionState> {
  const parsed = guestFormSchema.safeParse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createCreateGuestUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível cadastrar o convidado agora." };
  }

  redirect("/admin/convidados");
}
```

- [ ] **Step 3: Create the form component**

Create `src/components/admin/GuestForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  initialCreateGuestActionState,
  createGuestAction,
} from "@/app/admin/(protected)/convidados/actions";

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none";

export function GuestForm() {
  const [state, formAction, isPending] = useActionState(createGuestAction, initialCreateGuestActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="fullName" className="block font-sans text-sm text-ink">
          Nome completo
        </label>
        <input id="fullName" name="fullName" required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="nickname" className="block font-sans text-sm text-ink">
          Apelido (como aparece na busca, opcional)
        </label>
        <input id="nickname" name="nickname" className={inputClassName} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Cadastrar convidado"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Create the "new guest" page**

Create `src/app/admin/(protected)/convidados/novo/page.tsx`:

```tsx
import type { Metadata } from "next";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Novo Convidado | Painel Administrativo",
};

export default function NewGuestPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Novo convidado</h1>
      <div className="mt-6">
        <GuestForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the guest list page**

Replace the full contents of `src/app/admin/(protected)/convidados/page.tsx`
with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import type { Guest } from "@/domain/entities/Guest";

export const metadata: Metadata = {
  title: "Convidados | Painel Administrativo",
};

const STATUS_LABELS: Record<Guest["attendanceStatus"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
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
        <h1 className="font-serif text-3xl text-ink">Convidados</h1>
        <Link
          href="/admin/convidados/novo"
          className="font-sans text-sm uppercase tracking-widest text-gold hover:text-ink"
        >
          + Novo convidado
        </Link>
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
        <p className="mt-6 font-sans text-ink-soft">Nenhum convidado cadastrado ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Contato</th>
                <th className="py-2 pr-4">Acompanhantes</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">
                    {guest.fullName}
                    {guest.nickname && <span className="text-ink-soft"> ({guest.nickname})</span>}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{guest.companionsCount}</td>
                  <td className="py-3 pr-4 text-ink-soft">{STATUS_LABELS[guest.attendanceStatus]}</td>
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

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 7: Grep-sweep for old tokens in the files this task touched**

Run: `grep -n "rose\|cream" src/components/admin/GuestForm.tsx src/app/admin/(protected)/convidados/page.tsx src/app/admin/(protected)/convidados/novo/page.tsx`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/guestFormSchema.ts src/components/admin/GuestForm.tsx "src/app/admin/(protected)/convidados/actions.ts" "src/app/admin/(protected)/convidados/novo/page.tsx" "src/app/admin/(protected)/convidados/page.tsx"
git commit -m "feat(rsvp): add admin guest pre-registration form and status column"
```

---

## Task 12: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including every new/rewritten suite from Tasks
1–11.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Grep-sweep for old tokens across every file this plan touched**

Run: `grep -rn "rose\|cream" src/domain/entities/Guest.ts src/domain/repositories/GuestRepository.ts src/application/testing/InMemoryGuestRepository.ts src/infrastructure/supabase/SupabaseGuestRepository.ts src/application/use-cases/rsvp/ src/application/use-cases/admin/CreateGuestUseCase.ts src/application/use-cases/admin/GetDashboardSummaryUseCase.ts src/components/admin/DashboardStats.tsx src/components/admin/GuestForm.tsx src/components/rsvp/ src/shared/utils/matchGuestName.ts "src/app/admin/(protected)/convidados/" src/app/confirmar-presenca/`
Expected: no output.

- [ ] **Step 5: Grep-sweep for leftover references to the deleted form**

Run: `grep -rn "RsvpForm\|rsvpFormSchema\|attendanceConfirmed" src/`
Expected: no output (everything now uses `RsvpSearch` and
`attendanceStatus`).

- [ ] **Step 6: If any of the above required fixes, commit with an explicit file list**

```bash
git add <only the specific files you changed to fix the issue — never git add -A>
git commit -m "chore(rsvp): fix lint/build issues from RSVP guest-search plan"
```

---

## What this plan intentionally does NOT do

- Does not restyle the admin panel beyond the one new form/page needed
  for guest pre-registration — the admin panel's overall visual design is
  out of scope for this whole redesign (see the original spec).
- Does not add a public self-registration fallback for guests who aren't
  found — per the approved design, the guest list is closed; someone not
  found sees a message asking them to check spelling or contact the
  couple, with no way to add themselves.
- Does not touch gifts, dicas-e-instrucoes, or nossa-historia pages/tokens
  — those are the Secondary Pages plan's job.
- Does not remove `--color-cream`/`--color-rose` from `globals.css` —
  other pages still use them until the final cleanup plan.

## Post-implementation addendum: accepted security tradeoff

The whole-branch review flagged (Important) that `confirmRsvpAction` /
`ConfirmRsvpUseCase` have no authorization check: the public name list
ships every guest's `id` to the browser (required for client-side fuzzy
matching), and anyone who inspects the page can call the action with any
guest's `id` to confirm/decline/edit their companions count or message —
not just their own. This is the direct, inherent consequence of the
approved design (open name search, no guest login/token) — not a
regression introduced by the implementation, and every task matched its
brief exactly.

This is being recorded as a **known, accepted tradeoff** for a small,
closed-guest-list wedding site, not fixed in this plan. If the couple
wants a mitigation later, the cheapest options are: a per-guest token
appended to a personalized link (shared individually instead of one
public URL), or simply reconciling the guest list manually against
expected responses. Revisit if this site's audience or guest count grows
beyond "people we personally know."
