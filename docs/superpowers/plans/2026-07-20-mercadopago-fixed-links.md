# Mercado Pago Fixed Payment Links (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every gift gets a durable Mercado Pago checkout link created at registration/import time (regenerated when name/price change), reused by the public "Presentear" flow instead of creating a preference per attempt. Mercado Pago credentials and a price-change secret key become admin-editable from a new "Integrações" section, and any change to a gift's price (or to the Access Token) requires that secret key.

**Architecture:** Extends the existing Clean Architecture layering. `Gift` gains two application-populated fields (`mercadoPagoPreferenceId`, `mercadoPagoCheckoutUrl`). A new `AdminSecuritySettingsRepository` (Supabase + in-memory implementations) backs a small family of new use-cases for verifying/rotating the secret key and the Mercado Pago Access Token. `MercadoPagoGateway` now resolves its access token from that repository at request time instead of a static env var, so a rotated token takes effect without a redeploy.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Zod v4, Supabase (Postgres 17), Vitest, Node's built-in `crypto` module for password-style hashing (no new dependency).

## Global Constraints

- Never `git add -A` — stage explicit file lists only.
- `"use server"` files may only export `async function`s — no exported constants.
- The secret key is **never** stored in plaintext — only a salted hash (`crypto.scryptSync`), compared with `crypto.timingSafeEqual`.
- `external_reference` on every Mercado Pago preference — whether created eagerly at gift registration or lazily as a fallback — is always `gift.id`, never a contribution id. This is a deliberate architectural choice from the spec; do not deviate even though it means the current webhook lookup (by contribution id) will stop matching until a later phase updates it — that gap is explicitly accepted for this phase.
- Price-change secret-key enforcement applies **only** to editing an existing gift's price via the admin form — not to gift creation, not to CSV/XLSX import.
- Follow existing code patterns/style exactly (Clean Architecture, existing Tailwind class conventions, existing `useActionState` Server Action patterns).

---

## Task 1: Migration — gift payment-link columns and `admin_security_settings` table

**Files:**
- Create: `supabase/migrations/0004_gift_payment_links_and_admin_security.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Gift payment links (Mercado Pago fixed checkout links, phase 1) and
-- admin-managed security settings (Mercado Pago Access Token + the
-- secret key gating gift price changes).

alter table gifts
  add column if not exists mercado_pago_preference_id text,
  add column if not exists mercado_pago_checkout_url text;

create table if not exists admin_security_settings (
  id integer primary key default 1 check (id = 1),
  mercadopago_access_token text,
  price_change_secret_hash text,
  price_change_secret_salt text,
  updated_at timestamptz not null default now()
);

alter table admin_security_settings enable row level security;

-- Same model as every other table here: only trusted server code using
-- the service-role key reads/writes this, so no policies are granted
-- to the anon/authenticated roles.

insert into admin_security_settings (id) values (1)
  on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push` (or the project's established migration-application command — check `supabase/migrations/` for how `0003_site_content.sql` was applied and follow the same process). Verify with a query: `select * from admin_security_settings;` should return exactly one row with all three nullable columns `null`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_gift_payment_links_and_admin_security.sql
git commit -m "feat(payments): add gift payment-link columns and admin_security_settings table"
```

---

## Task 2: Domain — `Gift` entity fields, `AdminSecuritySettingsRepository`, new domain error

**Files:**
- Modify: `src/domain/entities/Gift.ts`
- Create: `src/domain/repositories/AdminSecuritySettingsRepository.ts`
- Modify: `src/domain/errors/DomainError.ts`

**Interfaces:**
- Produces: `Gift.mercadoPagoPreferenceId?: string`, `Gift.mercadoPagoCheckoutUrl: string | null`, `AdminSecuritySettings` interface, `AdminSecuritySettingsRepository` interface, `InvalidSecurityCredentialError`.

- [ ] **Step 1: Add the two new fields to `Gift`**

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

  reserve(): Gift {
    if (!this.isAvailable()) {
      throw new GiftNotAvailableError(`Gift "${this.name}" is not available.`);
    }

    return new Gift({ ...this, status: "reserved" });
  }

  markAsPaid(): Gift {
    return new Gift({ ...this, status: "paid" });
  }

  releaseToAvailable(): Gift {
    if (this.status === "paid") {
      throw new GiftNotAvailableError(`Gift "${this.name}" is already paid and cannot be released.`);
    }

    return new Gift({ ...this, status: "available" });
  }
}
```

(`reserve()`/`markAsPaid()`/`releaseToAvailable()` are unchanged — they spread `{...this, ...}`, which now automatically carries the two new fields through since they're instance properties.)

- [ ] **Step 2: Add the new domain error**

Edit `src/domain/errors/DomainError.ts`, appending after `GiftHasContributionsError`:

```ts
export class InvalidSecurityCredentialError extends DomainError {}
```

- [ ] **Step 3: Create `AdminSecuritySettingsRepository`**

Create `src/domain/repositories/AdminSecuritySettingsRepository.ts`:

```ts
export interface AdminSecuritySettings {
  mercadoPagoAccessToken: string | null;
  priceChangeSecretHash: string | null;
  priceChangeSecretSalt: string | null;
}

export interface AdminSecuritySettingsRepository {
  getSettings(): Promise<AdminSecuritySettings>;
  updateMercadoPagoAccessToken(token: string): Promise<void>;
  updateSecretKeyHash(hash: string, salt: string): Promise<void>;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in files that construct a `Gift` via positional/incomplete props elsewhere in the codebase that don't already use the `props` object shape (there should be none, since every existing call site already passes a `GiftProps`-shaped object) — and errors in `SupabaseGiftRepository.ts` if it references `GiftRow` fields that don't yet exist (expected, fixed in Task 5). No other errors should appear.

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/Gift.ts src/domain/errors/DomainError.ts src/domain/repositories/AdminSecuritySettingsRepository.ts
git commit -m "feat(payments): add Gift payment-link fields and AdminSecuritySettingsRepository interface"
```

---

## Task 3: `secretKeyHashing` — pure crypto helpers

**Files:**
- Create: `src/infrastructure/security/secretKeyHashing.ts`
- Test: `src/infrastructure/security/secretKeyHashing.test.ts`

**Interfaces:**
- Produces: `hashSecretKey(secretKey: string): { hash: string; salt: string }`, `verifySecretKeyHash(candidate: string, hash: string, salt: string): boolean` — consumed by Tasks 6-7's use-cases.

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/security/secretKeyHashing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashSecretKey, verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";

describe("secretKeyHashing", () => {
  it("verifies a correct candidate against its own hash", () => {
    const { hash, salt } = hashSecretKey("minha-chave-secreta");

    expect(verifySecretKeyHash("minha-chave-secreta", hash, salt)).toBe(true);
  });

  it("rejects an incorrect candidate", () => {
    const { hash, salt } = hashSecretKey("minha-chave-secreta");

    expect(verifySecretKeyHash("chave-errada", hash, salt)).toBe(false);
  });

  it("produces a different hash each time due to a random salt", () => {
    const first = hashSecretKey("mesma-chave");
    const second = hashSecretKey("mesma-chave");

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it("never stores the plaintext key in the hash or salt", () => {
    const { hash, salt } = hashSecretKey("segredo-visivel");

    expect(hash).not.toContain("segredo-visivel");
    expect(salt).not.toContain("segredo-visivel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/security/secretKeyHashing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/infrastructure/security/secretKeyHashing.ts`:

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashSecretKey(secretKey: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secretKey, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifySecretKeyHash(candidate: string, hash: string, salt: string): boolean {
  const candidateHash = scryptSync(candidate, salt, KEY_LENGTH);
  const storedHash = Buffer.from(hash, "hex");

  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, storedHash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/security/secretKeyHashing.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/security/secretKeyHashing.ts src/infrastructure/security/secretKeyHashing.test.ts
git commit -m "feat(payments): add secretKeyHashing crypto helpers"
```

---

## Task 4: `SupabaseAdminSecuritySettingsRepository` + in-memory test double

**Files:**
- Create: `src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts`
- Create: `src/application/testing/InMemoryAdminSecuritySettingsRepository.ts`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository` (Task 2).
- Produces: both implementations, consumed by Tasks 6-7's use-case tests and Task 11's composition wiring.

- [ ] **Step 1: Implement the Supabase repository**

Create `src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts`:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
} from "@/domain/repositories/AdminSecuritySettingsRepository";

interface SettingsRow {
  mercadopago_access_token: string | null;
  price_change_secret_hash: string | null;
  price_change_secret_salt: string | null;
}

export class SupabaseAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSettings(): Promise<AdminSecuritySettings> {
    const { data, error } = await this.client
      .from("admin_security_settings")
      .select("mercadopago_access_token, price_change_secret_hash, price_change_secret_salt")
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
    };
  }

  async updateMercadoPagoAccessToken(token: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({ mercadopago_access_token: token, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update Mercado Pago access token: ${error.message}`);
    }
  }

  async updateSecretKeyHash(hash: string, salt: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({
        price_change_secret_hash: hash,
        price_change_secret_salt: salt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update secret key: ${error.message}`);
    }
  }
}
```

- [ ] **Step 2: Implement the in-memory test double**

Create `src/application/testing/InMemoryAdminSecuritySettingsRepository.ts`:

```ts
import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
} from "@/domain/repositories/AdminSecuritySettingsRepository";

export class InMemoryAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  private settings: AdminSecuritySettings = {
    mercadoPagoAccessToken: null,
    priceChangeSecretHash: null,
    priceChangeSecretSalt: null,
  };

  async getSettings(): Promise<AdminSecuritySettings> {
    return { ...this.settings };
  }

  async updateMercadoPagoAccessToken(token: string): Promise<void> {
    this.settings.mercadoPagoAccessToken = token;
  }

  async updateSecretKeyHash(hash: string, salt: string): Promise<void> {
    this.settings.priceChangeSecretHash = hash;
    this.settings.priceChangeSecretSalt = salt;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts src/application/testing/InMemoryAdminSecuritySettingsRepository.ts
git commit -m "feat(payments): implement AdminSecuritySettingsRepository (Supabase + in-memory)"
```

---

## Task 5: `SupabaseGiftRepository` — persist the new payment-link columns

**Files:**
- Modify: `src/infrastructure/supabase/SupabaseGiftRepository.ts`

**Interfaces:**
- Consumes: `Gift.mercadoPagoPreferenceId`/`mercadoPagoCheckoutUrl` (Task 2).

- [ ] **Step 1: Update `GiftRow`, `toEntity`, and both writes**

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

(`InMemoryGiftRepository` needs **no changes** — `save`/`update` already store whatever `Gift` instance they're given, and `Gift.create`'s spread in `save()` already carries the new fields through.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/SupabaseGiftRepository.ts
git commit -m "feat(payments): persist gift payment-link columns in SupabaseGiftRepository"
```

---

## Task 6: `VerifyPriceChangeSecretUseCase` + `UpdateSecretKeyUseCase`

**Files:**
- Create: `src/application/use-cases/security/VerifyPriceChangeSecretUseCase.ts`
- Test: `src/application/use-cases/security/VerifyPriceChangeSecretUseCase.test.ts`
- Create: `src/application/use-cases/security/UpdateSecretKeyUseCase.ts`
- Test: `src/application/use-cases/security/UpdateSecretKeyUseCase.test.ts`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository` (Task 2/4), `hashSecretKey`/`verifySecretKeyHash` (Task 3), `InvalidSecurityCredentialError` (Task 2).
- Produces: `VerifyPriceChangeSecretUseCase.execute(candidate: string): Promise<boolean>`, `UpdateSecretKeyUseCase.execute(input: { currentKey?: string; newKey: string }): Promise<void>` — consumed by Task 14 (gift price gate) and Task 16 (Integrações page).

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/security/VerifyPriceChangeSecretUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VerifyPriceChangeSecretUseCase } from "@/application/use-cases/security/VerifyPriceChangeSecretUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("VerifyPriceChangeSecretUseCase", () => {
  it("returns true for the correct key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("chave-correta");

    expect(result).toBe(true);
  });

  it("returns false for an incorrect key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("chave-errada");

    expect(result).toBe(false);
  });

  it("returns false for an empty candidate", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("");

    expect(result).toBe(false);
  });

  it("returns false when no secret key has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("qualquer-coisa");

    expect(result).toBe(false);
  });
});
```

Create `src/application/use-cases/security/UpdateSecretKeyUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpdateSecretKeyUseCase } from "@/application/use-cases/security/UpdateSecretKeyUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateSecretKeyUseCase", () => {
  it("sets the key for the first time with no current key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "primeira-chave" });

    const settings = await repository.getSettings();
    expect(
      verifySecretKeyHash("primeira-chave", settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!)
    ).toBe(true);
  });

  it("changes the key when the correct current key is provided", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "chave-antiga" });

    await new UpdateSecretKeyUseCase(repository).execute({ currentKey: "chave-antiga", newKey: "chave-nova" });

    const settings = await repository.getSettings();
    expect(
      verifySecretKeyHash("chave-nova", settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!)
    ).toBe(true);
  });

  it("rejects changing the key when the current key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "chave-antiga" });

    await expect(
      new UpdateSecretKeyUseCase(repository).execute({ currentKey: "chave-errada", newKey: "chave-nova" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects a new key shorter than 6 characters", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateSecretKeyUseCase(repository).execute({ newKey: "abc" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/security/VerifyPriceChangeSecretUseCase.test.ts src/application/use-cases/security/UpdateSecretKeyUseCase.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `VerifyPriceChangeSecretUseCase`**

Create `src/application/use-cases/security/VerifyPriceChangeSecretUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";

export class VerifyPriceChangeSecretUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(candidate: string): Promise<boolean> {
    if (!candidate) {
      return false;
    }

    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.priceChangeSecretHash || !settings.priceChangeSecretSalt) {
      return false;
    }

    return verifySecretKeyHash(candidate, settings.priceChangeSecretHash, settings.priceChangeSecretSalt);
  }
}
```

- [ ] **Step 4: Implement `UpdateSecretKeyUseCase`**

Create `src/application/use-cases/security/UpdateSecretKeyUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { hashSecretKey, verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateSecretKeyInput {
  currentKey?: string;
  newKey: string;
}

export class UpdateSecretKeyUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateSecretKeyInput): Promise<void> {
    if (!input.newKey || input.newKey.length < 6) {
      throw new InvalidSecurityCredentialError("A nova chave deve ter pelo menos 6 caracteres.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const hasExistingKey = Boolean(settings.priceChangeSecretHash && settings.priceChangeSecretSalt);

    if (hasExistingKey) {
      const currentValid =
        !!input.currentKey &&
        verifySecretKeyHash(input.currentKey, settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!);
      if (!currentValid) {
        throw new InvalidSecurityCredentialError("Chave atual inválida.");
      }
    }

    const { hash, salt } = hashSecretKey(input.newKey);
    await this.securitySettingsRepository.updateSecretKeyHash(hash, salt);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/security/VerifyPriceChangeSecretUseCase.test.ts src/application/use-cases/security/UpdateSecretKeyUseCase.test.ts`
Expected: PASS (4/4 and 4/4).

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/security/VerifyPriceChangeSecretUseCase.ts src/application/use-cases/security/VerifyPriceChangeSecretUseCase.test.ts src/application/use-cases/security/UpdateSecretKeyUseCase.ts src/application/use-cases/security/UpdateSecretKeyUseCase.test.ts
git commit -m "feat(payments): add VerifyPriceChangeSecretUseCase and UpdateSecretKeyUseCase"
```

---

## Task 7: `UpdateMercadoPagoAccessTokenUseCase` + `GetAdminSecuritySettingsUseCase`

**Files:**
- Create: `src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.ts`
- Test: `src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.test.ts`
- Create: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts`
- Test: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository` (Task 2/4), `verifySecretKeyHash` (Task 3), `InvalidSecurityCredentialError` (Task 2).
- Produces: `UpdateMercadoPagoAccessTokenUseCase.execute(input: { token: string; secretKey?: string }): Promise<void>`, `AdminSecuritySettingsSummary { mercadoPagoAccessTokenLast4: string | null; hasSecretKey: boolean }`, `GetAdminSecuritySettingsUseCase.execute(): Promise<AdminSecuritySettingsSummary>` — consumed by Task 16.

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpdateMercadoPagoAccessTokenUseCase } from "@/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateMercadoPagoAccessTokenUseCase", () => {
  it("sets the token for the first time with no secret key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateMercadoPagoAccessTokenUseCase(repository).execute({ token: "APP_USR-primeiro-token" });

    const settings = await repository.getSettings();
    expect(settings.mercadoPagoAccessToken).toBe("APP_USR-primeiro-token");
  });

  it("requires the correct secret key once a token is already set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-token-antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await new UpdateMercadoPagoAccessTokenUseCase(repository).execute({
      token: "APP_USR-token-novo",
      secretKey: "chave-correta",
    });

    const settings = await repository.getSettings();
    expect(settings.mercadoPagoAccessToken).toBe("APP_USR-token-novo");
  });

  it("rejects the change when the secret key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-token-antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await expect(
      new UpdateMercadoPagoAccessTokenUseCase(repository).execute({
        token: "APP_USR-token-novo",
        secretKey: "chave-errada",
      })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects an empty token", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateMercadoPagoAccessTokenUseCase(repository).execute({ token: "" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
```

Create `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("GetAdminSecuritySettingsUseCase", () => {
  it("returns null/false when nothing has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({ mercadoPagoAccessTokenLast4: null, hasSecretKey: false });
  });

  it("returns the last 4 characters of the token and hasSecretKey true when both are set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-7812913636974826-072012-63c40beb");
    const { hash, salt } = hashSecretKey("uma-chave");
    await repository.updateSecretKeyHash(hash, salt);

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({ mercadoPagoAccessTokenLast4: "0beb", hasSecretKey: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.test.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `UpdateMercadoPagoAccessTokenUseCase`**

Create `src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateMercadoPagoAccessTokenInput {
  token: string;
  secretKey?: string;
}

export class UpdateMercadoPagoAccessTokenUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateMercadoPagoAccessTokenInput): Promise<void> {
    if (!input.token || input.token.trim().length === 0) {
      throw new InvalidSecurityCredentialError("Informe o Access Token do Mercado Pago.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const isFirstTimeSetup = !settings.mercadoPagoAccessToken;

    if (!isFirstTimeSetup) {
      const secretValid =
        !!input.secretKey &&
        !!settings.priceChangeSecretHash &&
        !!settings.priceChangeSecretSalt &&
        verifySecretKeyHash(input.secretKey, settings.priceChangeSecretHash, settings.priceChangeSecretSalt);
      if (!secretValid) {
        throw new InvalidSecurityCredentialError("Chave secreta inválida ou não informada.");
      }
    }

    await this.securitySettingsRepository.updateMercadoPagoAccessToken(input.token.trim());
  }
}
```

- [ ] **Step 4: Implement `GetAdminSecuritySettingsUseCase`**

Create `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";

export interface AdminSecuritySettingsSummary {
  mercadoPagoAccessTokenLast4: string | null;
  hasSecretKey: boolean;
}

export class GetAdminSecuritySettingsUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(): Promise<AdminSecuritySettingsSummary> {
    const settings = await this.securitySettingsRepository.getSettings();
    return {
      mercadoPagoAccessTokenLast4: settings.mercadoPagoAccessToken
        ? settings.mercadoPagoAccessToken.slice(-4)
        : null,
      hasSecretKey: Boolean(settings.priceChangeSecretHash),
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.test.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
Expected: PASS (4/4 and 2/2).

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.ts src/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase.test.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts
git commit -m "feat(payments): add UpdateMercadoPagoAccessTokenUseCase and GetAdminSecuritySettingsUseCase"
```

---

## Task 8: `RefreshGiftPaymentLinkUseCase`

**Files:**
- Create: `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.ts`
- Test: `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`

**Interfaces:**
- Consumes: `GiftRepository` (existing), `PaymentGateway`/`FakePaymentGateway` (existing).
- Produces: `RefreshGiftPaymentLinkUseCase.execute(gift: Gift): Promise<Gift>` — consumed by Task 9 (indirectly, via callers), Task 13 (import), Task 14 (`upsertGiftAction`).

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("RefreshGiftPaymentLinkUseCase", () => {
  it("creates a preference using the gift's own id as the external reference and persists the link", async () => {
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

    const updated = await new RefreshGiftPaymentLinkUseCase(repository, gateway).execute(gift);

    expect(updated.mercadoPagoPreferenceId).toBeDefined();
    expect(updated.mercadoPagoCheckoutUrl).toContain(`ref=${gift.id}`);

    const persisted = await repository.findById(gift.id!);
    expect(persisted?.mercadoPagoCheckoutUrl).toBe(updated.mercadoPagoCheckoutUrl);
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
      getPayment: async () => {
        throw new Error("not used");
      },
    };

    await expect(new RefreshGiftPaymentLinkUseCase(repository, failingGateway).execute(gift)).rejects.toThrow(
      "Mercado Pago indisponível"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export class RefreshGiftPaymentLinkUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(gift: Gift): Promise<Gift> {
    const preference = await this.paymentGateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: gift.id!,
    });

    const giftWithLink = Gift.create({
      ...gift,
      mercadoPagoPreferenceId: preference.preferenceId,
      mercadoPagoCheckoutUrl: preference.checkoutUrl,
    });

    return this.giftRepository.update(giftWithLink);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.ts src/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase.test.ts
git commit -m "feat(payments): add RefreshGiftPaymentLinkUseCase"
```

---

## Task 9: `UpsertGiftUseCase` — return `{ gift, nameOrPriceChanged }`

**Files:**
- Modify: `src/application/use-cases/admin/UpsertGiftUseCase.ts`
- Modify: `src/application/use-cases/admin/UpsertGiftUseCase.test.ts`

**Interfaces:**
- Produces: `UpsertGiftResult { gift: Gift; nameOrPriceChanged: boolean }`, `UpsertGiftUseCase.execute(input): Promise<UpsertGiftResult>` (return type changed from `Promise<Gift>`) — this is a breaking change to the two existing callers, fixed in Tasks 13-14.

- [ ] **Step 1: Update the test first**

Replace the full content of `src/application/use-cases/admin/UpsertGiftUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";

const baseInput = {
  name: "Jogo de facas",
  description: "Conjunto de facas profissionais",
  imageUrl: "/placeholder.jpg",
  price: 180,
  category: "cozinha",
};

describe("UpsertGiftUseCase", () => {
  it("creates a new gift when no id is provided, flagged as name/price changed", async () => {
    const repository = new InMemoryGiftRepository();

    const result = await new UpsertGiftUseCase(repository).execute(baseInput);

    expect(result.gift.id).toBeDefined();
    expect(result.gift.status).toBe("available");
    expect(result.nameOrPriceChanged).toBe(true);
  });

  it("updates an existing gift preserving its current status, flagging a price change", async () => {
    const repository = new InMemoryGiftRepository();
    const created = (await new UpsertGiftUseCase(repository).execute(baseInput)).gift;
    const reserved = await repository.update(created.reserve());

    const result = await new UpsertGiftUseCase(repository).execute({ ...baseInput, id: reserved.id, price: 220 });

    expect(result.gift.price).toBe(220);
    expect(result.gift.status).toBe("reserved");
    expect(result.nameOrPriceChanged).toBe(true);
  });

  it("does not flag a change when only description/category are edited", async () => {
    const repository = new InMemoryGiftRepository();
    const created = (await new UpsertGiftUseCase(repository).execute(baseInput)).gift;

    const result = await new UpsertGiftUseCase(repository).execute({
      ...baseInput,
      id: created.id,
      description: "Nova descrição",
      category: "casa",
    });

    expect(result.nameOrPriceChanged).toBe(false);
  });

  it("throws when updating a gift that does not exist", async () => {
    const repository = new InMemoryGiftRepository();

    await expect(
      new UpsertGiftUseCase(repository).execute({ ...baseInput, id: "missing" })
    ).rejects.toThrow(InvalidGiftDataError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/admin/UpsertGiftUseCase.test.ts`
Expected: FAIL — `result.gift` is undefined (current code returns a `Gift` directly, not `{ gift, ... }`).

- [ ] **Step 3: Implement the new return shape**

Replace the full content of `src/application/use-cases/admin/UpsertGiftUseCase.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";

export interface UpsertGiftInput {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
}

export interface UpsertGiftResult {
  gift: Gift;
  nameOrPriceChanged: boolean;
}

export class UpsertGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(input: UpsertGiftInput): Promise<UpsertGiftResult> {
    if (!input.id) {
      const created = await this.giftRepository.save(Gift.create(input));
      return { gift: created, nameOrPriceChanged: true };
    }

    const existingGift = await this.giftRepository.findById(input.id);
    if (!existingGift) {
      throw new InvalidGiftDataError(`Gift with id ${input.id} was not found.`);
    }

    const updatedGift = Gift.create({
      ...input,
      status: existingGift.status,
      mercadoPagoPreferenceId: existingGift.mercadoPagoPreferenceId,
      mercadoPagoCheckoutUrl: existingGift.mercadoPagoCheckoutUrl,
    });
    const saved = await this.giftRepository.update(updatedGift);

    const nameOrPriceChanged = existingGift.name !== saved.name || existingGift.price !== saved.price;
    return { gift: saved, nameOrPriceChanged };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/admin/UpsertGiftUseCase.test.ts`
Expected: PASS (4/4).

Note: `npx tsc --noEmit` will now show errors in `src/app/admin/(protected)/presentes/actions.ts` and `src/app/admin/(protected)/presentes/importar/actions.ts` (both still call `.execute()` expecting the old `Gift` return shape) — this is expected and fixed in Tasks 13-14.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/UpsertGiftUseCase.ts src/application/use-cases/admin/UpsertGiftUseCase.test.ts
git commit -m "feat(payments): UpsertGiftUseCase returns { gift, nameOrPriceChanged }"
```

---

## Task 10: `MercadoPagoGateway` reads the token from the repository; `env.ts` drops the requirement

**Files:**
- Modify: `src/infrastructure/payments/MercadoPagoGateway.ts`
- Modify: `src/infrastructure/config/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository` (Task 2/4).
- Produces: `MercadoPagoGateway` constructor now takes `(securitySettingsRepository: AdminSecuritySettingsRepository)` instead of reading `getEnv().MERCADOPAGO_ACCESS_TOKEN` — consumed by Task 11's composition wiring.

- [ ] **Step 1: Update `MercadoPagoGateway`**

Replace the full content of `src/infrastructure/payments/MercadoPagoGateway.ts`:

```ts
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import {
  CreatePreferenceInput,
  CreatePreferenceOutput,
  PaymentDetails,
  PaymentGateway,
  PaymentStatus,
} from "@/application/ports/PaymentGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { getEnv } from "@/infrastructure/config/env";

function mapStatus(mercadoPagoStatus: string | undefined): PaymentStatus {
  if (mercadoPagoStatus === "approved") return "approved";
  if (mercadoPagoStatus === "rejected" || mercadoPagoStatus === "cancelled") return "rejected";
  return "pending";
}

export class MercadoPagoGateway implements PaymentGateway {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  private async getClient(): Promise<MercadoPagoConfig> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.mercadoPagoAccessToken) {
      throw new Error("Mercado Pago não está configurado. Configure o Access Token em Integrações.");
    }
    return new MercadoPagoConfig({ accessToken: settings.mercadoPagoAccessToken });
  }

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
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
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

  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const client = await this.getClient();
    const payment = new Payment(client);
    const result = await payment.get({ id: paymentId });

    if (!result.id || !result.external_reference) {
      throw new Error(`Mercado Pago payment ${paymentId} is missing required fields.`);
    }

    return {
      paymentId: String(result.id),
      status: mapStatus(result.status),
      externalReference: result.external_reference,
    };
  }
}
```

- [ ] **Step 2: Drop `MERCADOPAGO_ACCESS_TOKEN` from `env.ts`**

Replace the full content of `src/infrastructure/config/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Parsed lazily (not at module load) so `next build` and unit tests can run
 * before real Supabase credentials exist in `.env.local`.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid environment variables: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}. Copy .env.example to .env.local and fill in the values.`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isBackendConfigured(): boolean {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return parsed.success;
}
```

(Mercado Pago configuration is now a separate, DB-backed concern — `isBackendConfigured()` was always about Supabase reachability, and dropping `MERCADOPAGO_ACCESS_TOKEN` from it is a correction, not a regression: gift creation/purchase already has its own explicit error path when the token isn't set, via `MercadoPagoGateway.getClient()`.)

- [ ] **Step 3: Update `.env.example`**

Edit `.env.example`, replacing the Mercado Pago section:

```
# Mercado Pago Access Token is no longer set via environment variable —
# configure it from the admin panel at /admin/integracoes after first
# setting a price-change secret key there.
```

(Remove the old `MERCADOPAGO_ACCESS_TOKEN=your-mercadopago-access-token` line entirely; keep everything else in the file unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `src/infrastructure/composition.ts` (still constructs `MercadoPagoGateway` with no arguments) — expected, fixed in Task 11.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/payments/MercadoPagoGateway.ts src/infrastructure/config/env.ts .env.example
git commit -m "feat(payments): MercadoPagoGateway reads the Access Token from admin_security_settings"
```

---

## Task 11: Wire everything into the composition root

**Files:**
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: everything from Tasks 2, 4, 6, 7, 8, 10.
- Produces: `createRefreshGiftPaymentLinkUseCase()`, `createVerifyPriceChangeSecretUseCase()`, `createUpdateSecretKeyUseCase()`, `createUpdateMercadoPagoAccessTokenUseCase()`, `createGetAdminSecuritySettingsUseCase()` — consumed by Tasks 13, 14, 16.

- [ ] **Step 1: Update imports and `repositories()`**

Edit `src/infrastructure/composition.ts`. Add these imports after the existing `SupabaseSiteContentRepository` import:

```ts
import { SupabaseAdminSecuritySettingsRepository } from "@/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository";
```

Add these imports after the existing `UpsertGiftUseCase` import:

```ts
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { VerifyPriceChangeSecretUseCase } from "@/application/use-cases/security/VerifyPriceChangeSecretUseCase";
import { UpdateSecretKeyUseCase } from "@/application/use-cases/security/UpdateSecretKeyUseCase";
import { UpdateMercadoPagoAccessTokenUseCase } from "@/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
```

Replace the `repositories()` function:

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
    paymentGateway: new MercadoPagoGateway(securitySettingsRepository),
  };
}
```

- [ ] **Step 2: Add the new factory functions**

Add after `createUpsertGiftUseCase`:

```ts
export function createRefreshGiftPaymentLinkUseCase(): RefreshGiftPaymentLinkUseCase {
  const { giftRepository, paymentGateway } = repositories();
  return new RefreshGiftPaymentLinkUseCase(giftRepository, paymentGateway);
}

export function createVerifyPriceChangeSecretUseCase(): VerifyPriceChangeSecretUseCase {
  return new VerifyPriceChangeSecretUseCase(repositories().securitySettingsRepository);
}

export function createUpdateSecretKeyUseCase(): UpdateSecretKeyUseCase {
  return new UpdateSecretKeyUseCase(repositories().securitySettingsRepository);
}

export function createUpdateMercadoPagoAccessTokenUseCase(): UpdateMercadoPagoAccessTokenUseCase {
  return new UpdateMercadoPagoAccessTokenUseCase(repositories().securitySettingsRepository);
}

export function createGetAdminSecuritySettingsUseCase(): GetAdminSecuritySettingsUseCase {
  return new GetAdminSecuritySettingsUseCase(repositories().securitySettingsRepository);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `src/app/admin/(protected)/presentes/actions.ts`, `src/app/admin/(protected)/presentes/importar/actions.ts`, and `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts` (return-shape/field mismatches, all expected — fixed in Tasks 12-14). No errors in `composition.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/composition.ts
git commit -m "feat(payments): wire security-settings and payment-link use-cases into composition root"
```

---

## Task 12: `CreateGiftContributionUseCase` — reuse the stored checkout link

**Files:**
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts`
- Modify: `src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`

**Interfaces:**
- Consumes: `Gift.mercadoPagoPreferenceId`/`mercadoPagoCheckoutUrl` (Task 2).
- Produces: same public interface (`CreateGiftContributionInput`/`CreateGiftContributionOutput` unchanged) — internal behavior changes only.

- [ ] **Step 1: Update the test first**

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: FAIL — the "reuses the gift's stored checkout url" test fails (current code always calls `createPreference`, ignoring any pre-existing link; `externalReference` is currently `contribution.id`, not `gift.id`).

- [ ] **Step 3: Implement the reuse-with-fallback logic**

Replace the full content of `src/application/use-cases/gifts/CreateGiftContributionUseCase.ts`:

```ts
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
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

    const reservedGift = await this.giftRepository.update(gift.reserve());

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        amount: gift.price,
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/gifts/CreateGiftContributionUseCase.ts src/application/use-cases/gifts/CreateGiftContributionUseCase.test.ts
git commit -m "feat(payments): reuse a gift's stored checkout link instead of creating one per attempt"
```

---

## Task 13: Gift import — best-effort payment link, `withoutPaymentLink` count

**Files:**
- Modify: `src/app/admin/(protected)/presentes/importar/actions.ts`
- Modify: `src/components/admin/ImportGiftsForm.tsx`

**Interfaces:**
- Consumes: `RefreshGiftPaymentLinkUseCase` (Task 8), `UpsertGiftUseCase`'s new return shape (Task 9), `createRefreshGiftPaymentLinkUseCase` (Task 11).
- Produces: `ImportResult` gains `withoutPaymentLink: number`, `importGiftRows` gains a 4th parameter.

- [ ] **Step 1: Update `importGiftRows`/`importGiftsAction`**

Replace the full content of `src/app/admin/(protected)/presentes/importar/actions.ts`:

```ts
"use server";

import {
  createListGiftsUseCase,
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
} from "@/infrastructure/composition";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { parseXlsx } from "@/shared/utils/parseXlsx";

export interface ImportResult {
  created: number;
  skipped: number;
  withoutPaymentLink: number;
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

/** Exported for testing: processes already-parsed rows against injected repository/use-cases. */
export async function importGiftRows(
  rows: { [column: string]: string }[],
  giftRepository: Pick<GiftRepository, "findAll">,
  upsertGiftUseCase: Pick<UpsertGiftUseCase, "execute">,
  refreshGiftPaymentLinkUseCase: Pick<RefreshGiftPaymentLinkUseCase, "execute">
): Promise<ImportResult> {
  const existingNames = new Set((await giftRepository.findAll()).map((gift) => gift.name.toLowerCase()));
  const result: ImportResult = { created: 0, skipped: 0, withoutPaymentLink: 0, errors: [] };

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

    const { gift } = await upsertGiftUseCase.execute({ name, description, category, price, imageUrl: null });
    existingNames.add(name.toLowerCase());
    result.created++;

    try {
      await refreshGiftPaymentLinkUseCase.execute(gift);
    } catch {
      result.withoutPaymentLink++;
    }
  }

  return result;
}

export async function importGiftsAction(
  _prevState: ImportGiftsActionState,
  formData: FormData
): Promise<ImportGiftsActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo Excel (.xlsx)." };
  }

  const fileBuffer = await file.arrayBuffer();
  const rows = await parseXlsx(fileBuffer);

  try {
    const result = await importGiftRows(
      rows,
      { findAll: () => createListGiftsUseCase().execute() },
      createUpsertGiftUseCase(),
      createRefreshGiftPaymentLinkUseCase()
    );
    return { status: "done", result };
  } catch {
    return { status: "error", message: "Não foi possível importar os presentes agora." };
  }
}
```

- [ ] **Step 2: Show the `withoutPaymentLink` count in the import summary**

Edit `src/components/admin/ImportGiftsForm.tsx`, changing the result summary block:

```tsx
      {state.status === "done" && state.result && (
        <div className="rounded-md border border-line bg-paper p-4 font-sans text-sm text-forest">
          <p>{state.result.created} presente(s) importado(s).</p>
          <p>{state.result.skipped} ignorado(s) por já existir.</p>
          {state.result.withoutPaymentLink > 0 && (
            <p>
              {state.result.withoutPaymentLink} presente(s) importado(s) sem link de pagamento — edite e salve
              para gerar.
            </p>
          )}
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
```

(Only the summary block's JSX changes — the surrounding form/imports in `ImportGiftsForm.tsx` stay exactly as they are.)

- [ ] **Step 3: Write a test covering `withoutPaymentLink`**

Create `src/app/admin/(protected)/presentes/importar/actions.test.ts` if it does not already exist; if it exists, append this test inside the existing `describe("importGiftRows", ...)` block instead of creating a new file. Either way, the test body:

```ts
import { describe, expect, it } from "vitest";
import { importGiftRows } from "@/app/admin/(protected)/presentes/importar/actions";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";

describe("importGiftRows", () => {
  it("creates the gift and counts it as withoutPaymentLink when the payment gateway fails", async () => {
    const repository = new InMemoryGiftRepository();
    const upsertUseCase = new UpsertGiftUseCase(repository);
    const failingGateway = {
      createPreference: async () => {
        throw new Error("Mercado Pago indisponível");
      },
      getPayment: async () => {
        throw new Error("not used");
      },
    };
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, failingGateway);

    const result = await importGiftRows(
      [{ Nome: "Jogo de toalhas", Descrição: "4 toalhas", Categoria: "casa", Valor: "150" }],
      repository,
      upsertUseCase,
      refreshUseCase
    );

    expect(result.created).toBe(1);
    expect(result.withoutPaymentLink).toBe(1);
    const gifts = await repository.findAll();
    expect(gifts[0].mercadoPagoCheckoutUrl).toBeNull();
  });

  it("creates the gift with a payment link when the gateway succeeds", async () => {
    const repository = new InMemoryGiftRepository();
    const upsertUseCase = new UpsertGiftUseCase(repository);
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway());

    const result = await importGiftRows(
      [{ Nome: "Jogo de talheres", Descrição: "24 peças", Categoria: "cozinha", Valor: "200" }],
      repository,
      upsertUseCase,
      refreshUseCase
    );

    expect(result.created).toBe(1);
    expect(result.withoutPaymentLink).toBe(0);
    const gifts = await repository.findAll();
    expect(gifts[0].mercadoPagoCheckoutUrl).toContain("mercadopago.test");
  });
});
```

If `src/app/admin/(protected)/presentes/importar/actions.test.ts` already exists with other tests (skip-duplicate, invalid-value, invalid-fields cases from the earlier guests/gifts plan), update its `importGiftRows(...)` calls to pass a 4th argument — reuse the same pattern as this task's new tests: `new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway())` for the happy-path tests, since those tests don't care about payment-link behavior specifically.

- [ ] **Step 4: Run the full gift-import test file**

Run: `npx vitest run "src/app/admin/(protected)/presentes/importar/actions.test.ts"`
Expected: all tests PASS, including the pre-existing ones (now updated to pass the 4th argument) and the two new ones.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `presentes/importar/actions.ts` or `ImportGiftsForm.tsx`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(protected)/presentes/importar/actions.ts" "src/app/admin/(protected)/presentes/importar/actions.test.ts" src/components/admin/ImportGiftsForm.tsx
git commit -m "feat(payments): best-effort payment-link generation during gift import"
```

---

## Task 14: Gift admin form — price-change secret key gate + link generation

**Files:**
- Modify: `src/app/admin/(protected)/presentes/actions.ts`
- Modify: `src/components/admin/GiftForm.tsx`
- Modify: `src/app/admin/(protected)/presentes/[id]/page.tsx`

**Interfaces:**
- Consumes: `createVerifyPriceChangeSecretUseCase`, `createRefreshGiftPaymentLinkUseCase`, `createListGiftsUseCase` (all from Task 11), `UpsertGiftUseCase`'s new return shape (Task 9).
- Produces: `GiftForm` gains a `checkoutUrl?: string | null` prop and, in edit mode, a "Chave secreta" field.

- [ ] **Step 1: Update `upsertGiftAction`**

Replace the full content of `src/app/admin/(protected)/presentes/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import {
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createVerifyPriceChangeSecretUseCase,
  createListGiftsUseCase,
  resolvePhotoField,
} from "@/infrastructure/composition";
import { giftFormSchema } from "@/components/admin/giftFormSchema";

export interface UpsertGiftActionState {
  status: "idle" | "error";
  message?: string;
}

export async function upsertGiftAction(
  _prevState: UpsertGiftActionState,
  formData: FormData
): Promise<UpsertGiftActionState> {
  const currentImageUrl = (formData.get("imageCurrentUrl") as string) || null;
  const imageUrl = await resolvePhotoField("gifts", "image", formData, currentImageUrl, "imageFile", "imageRemove");

  if (!imageUrl) {
    return { status: "error", message: "Selecione uma foto para o presente." };
  }

  const parsed = giftFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl,
    price: formData.get("price"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  if (parsed.data.id) {
    const existingGifts = await createListGiftsUseCase().execute();
    const existingGift = existingGifts.find((gift) => gift.id === parsed.data.id);

    if (existingGift && existingGift.price !== parsed.data.price) {
      const secretKey = (formData.get("secretKey") as string) || "";
      const isValid = await createVerifyPriceChangeSecretUseCase().execute(secretKey);
      if (!isValid) {
        return { status: "error", message: "Chave secreta inválida ou não informada." };
      }
    }
  }

  let upsertResult;
  try {
    upsertResult = await createUpsertGiftUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar o presente agora." };
  }

  if (upsertResult.nameOrPriceChanged) {
    try {
      await createRefreshGiftPaymentLinkUseCase().execute(upsertResult.gift);
    } catch {
      return {
        status: "error",
        message:
          "Presente salvo, mas não foi possível gerar o link de pagamento agora. Edite e salve novamente para tentar de novo.",
      };
    }
  }

  redirect("/admin/presentes");
}
```

- [ ] **Step 2: Add the secret-key field and checkout-link display to `GiftForm`**

Replace the full content of `src/components/admin/GiftForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
  checkoutUrl?: string | null;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

export function GiftForm({ defaultValues, checkoutUrl }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="name" className="block font-sans text-sm text-forest">
          Nome
        </label>
        <input id="name" name="name" defaultValue={defaultValues?.name} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="description" className="block font-sans text-sm text-forest">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
          required
          rows={3}
          className={inputClassName}
        />
      </div>

      <PhotoUploadField
        name="image"
        currentUrl={defaultValues?.imageUrl ?? null}
        label="Foto do presente"
        className="h-40 w-full rounded-md"
        showRemoveCheckbox={false}
      />

      <div>
        <label htmlFor="price" className="block font-sans text-sm text-forest">
          Valor (R$)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues?.price}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="category" className="block font-sans text-sm text-forest">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category}
          required
          className={inputClassName}
        />
      </div>

      {defaultValues?.id && (
        <div>
          <label htmlFor="secretKey" className="block font-sans text-sm text-forest">
            Chave secreta (obrigatória se alterar o valor)
          </label>
          <input
            id="secretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      )}

      {defaultValues?.id && checkoutUrl && (
        <div>
          <label htmlFor="checkoutUrl" className="block font-sans text-sm text-forest">
            Link de pagamento
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="checkoutUrl"
              type="text"
              readOnly
              value={checkoutUrl}
              onFocus={(event) => event.target.select()}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(checkoutUrl)}
              className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
            >
              Copiar link
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar presente"}
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

- [ ] **Step 3: Pass `checkoutUrl` from the edit page**

Edit `src/app/admin/(protected)/presentes/[id]/page.tsx`, changing the `<GiftForm ... />` call:

```tsx
        <GiftForm
          defaultValues={{
            id: gift.id,
            name: gift.name,
            description: gift.description,
            imageUrl: gift.imageUrl,
            price: gift.price,
            category: gift.category,
          }}
          checkoutUrl={gift.mercadoPagoCheckoutUrl}
        />
```

(Only this one JSX block changes — the rest of the file, including the `isBackendConfigured()`/try-catch guard from the earlier plan, stays as-is.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/presentes/actions.ts" src/components/admin/GiftForm.tsx "src/app/admin/(protected)/presentes/[id]/page.tsx"
git commit -m "feat(payments): gate gift price changes behind the secret key, show the checkout link on edit"
```

---

## Task 15: New "Integrações" admin section

**Files:**
- Create: `src/app/admin/(protected)/integracoes/actions.ts`
- Create: `src/app/admin/(protected)/integracoes/page.tsx`
- Create: `src/components/admin/MercadoPagoTokenForm.tsx`
- Create: `src/components/admin/SecretKeyForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `createUpdateMercadoPagoAccessTokenUseCase`, `createUpdateSecretKeyUseCase`, `createGetAdminSecuritySettingsUseCase` (Task 11), `InvalidSecurityCredentialError` (Task 2).

- [ ] **Step 1: Create the Server Actions**

Create `src/app/admin/(protected)/integracoes/actions.ts`:

```ts
"use server";

import {
  createUpdateMercadoPagoAccessTokenUseCase,
  createUpdateSecretKeyUseCase,
} from "@/infrastructure/composition";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateMercadoPagoTokenActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateMercadoPagoTokenAction(
  _prevState: UpdateMercadoPagoTokenActionState,
  formData: FormData
): Promise<UpdateMercadoPagoTokenActionState> {
  const token = (formData.get("token") as string) || "";
  const secretKey = (formData.get("secretKey") as string) || "";

  try {
    await createUpdateMercadoPagoAccessTokenUseCase().execute({ token, secretKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar o Access Token agora." };
  }

  return { status: "success", message: "Access Token atualizado com sucesso." };
}

export interface UpdateSecretKeyActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateSecretKeyAction(
  _prevState: UpdateSecretKeyActionState,
  formData: FormData
): Promise<UpdateSecretKeyActionState> {
  const currentKey = (formData.get("currentKey") as string) || undefined;
  const newKey = (formData.get("newKey") as string) || "";
  const confirmKey = (formData.get("confirmKey") as string) || "";

  if (newKey !== confirmKey) {
    return { status: "error", message: "As chaves novas não coincidem." };
  }

  try {
    await createUpdateSecretKeyUseCase().execute({ currentKey, newKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar a chave secreta agora." };
  }

  return { status: "success", message: "Chave secreta atualizada com sucesso." };
}
```

- [ ] **Step 2: Create `MercadoPagoTokenForm`**

Create `src/components/admin/MercadoPagoTokenForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  updateMercadoPagoTokenAction,
  type UpdateMercadoPagoTokenActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface MercadoPagoTokenFormProps {
  currentTokenLast4: string | null;
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateMercadoPagoTokenActionState = { status: "idle" };

export function MercadoPagoTokenForm({ currentTokenLast4, hasSecretKey }: MercadoPagoTokenFormProps) {
  const [state, formAction, isPending] = useActionState(updateMercadoPagoTokenAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Mercado Pago</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          {currentTokenLast4
            ? `Access Token atual: termina em ${currentTokenLast4}`
            : "Access Token não configurado."}
        </p>
      </div>

      <div>
        <label htmlFor="token" className="block font-sans text-sm text-forest">
          Novo Access Token
        </label>
        <input id="token" name="token" type="password" required autoComplete="off" className={inputClassName} />
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="mpSecretKey" className="block font-sans text-sm text-forest">
            Chave secreta
          </label>
          <input id="mpSecretKey" name="secretKey" type="password" autoComplete="off" className={inputClassName} />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar Access Token"}
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

- [ ] **Step 3: Create `SecretKeyForm`**

Create `src/components/admin/SecretKeyForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  updateSecretKeyAction,
  type UpdateSecretKeyActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface SecretKeyFormProps {
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateSecretKeyActionState = { status: "idle" };

export function SecretKeyForm({ hasSecretKey }: SecretKeyFormProps) {
  const [state, formAction, isPending] = useActionState(updateSecretKeyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Chave secreta de segurança</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          Exigida para alterar o valor de um presente já cadastrado e para trocar o Access Token do Mercado
          Pago.
        </p>
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="currentKey" className="block font-sans text-sm text-forest">
            Chave atual
          </label>
          <input id="currentKey" name="currentKey" type="password" autoComplete="off" className={inputClassName} />
        </div>
      )}

      <div>
        <label htmlFor="newKey" className="block font-sans text-sm text-forest">
          Nova chave
        </label>
        <input
          id="newKey"
          name="newKey"
          type="password"
          required
          minLength={6}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="confirmKey" className="block font-sans text-sm text-forest">
          Confirmar nova chave
        </label>
        <input
          id="confirmKey"
          name="confirmKey"
          type="password"
          required
          minLength={6}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : hasSecretKey ? "Trocar chave" : "Definir chave"}
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

- [ ] **Step 4: Create the Integrações page**

Create `src/app/admin/(protected)/integracoes/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";

export const metadata: Metadata = {
  title: "Integrações | Painel Administrativo",
};

export default async function IntegracoesPage() {
  const backendConfigured = isBackendConfigured();

  if (!backendConfigured) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Integrações</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para gerenciar integrações." />
        </div>
      </div>
    );
  }

  let summary;
  try {
    summary = await createGetAdminSecuritySettingsUseCase().execute();
  } catch {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Integrações</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Não foi possível carregar as integrações agora." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Integrações</h1>

      <div className="mt-8 flex max-w-md flex-col gap-10">
        <MercadoPagoTokenForm
          currentTokenLast4={summary.mercadoPagoAccessTokenLast4}
          hasSecretKey={summary.hasSecretKey}
        />
        <SecretKeyForm hasSecretKey={summary.hasSecretKey} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add the nav item**

Edit `src/app/admin/(protected)/layout.tsx`, changing `ADMIN_NAV`:

```ts
const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Convidados", href: "/admin/convidados" },
  { label: "Presentes", href: "/admin/presentes" },
  { label: "Conteúdo", href: "/admin/conteudo" },
  { label: "Integrações", href: "/admin/integracoes" },
];
```

- [ ] **Step 6: Component tests for both forms**

Create `src/components/admin/MercadoPagoTokenForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateMercadoPagoTokenAction: vi.fn(),
}));

describe("MercadoPagoTokenForm", () => {
  it("shows 'not configured' when no token is set yet and hides the secret-key field", () => {
    render(<MercadoPagoTokenForm currentTokenLast4={null} hasSecretKey={false} />);

    expect(screen.getByText("Access Token não configurado.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Chave secreta")).not.toBeInTheDocument();
  });

  it("shows the last 4 characters and the secret-key field when a token and key already exist", () => {
    render(<MercadoPagoTokenForm currentTokenLast4="0beb" hasSecretKey={true} />);

    expect(screen.getByText("Access Token atual: termina em 0beb")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave secreta")).toBeInTheDocument();
  });
});
```

Create `src/components/admin/SecretKeyForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateSecretKeyAction: vi.fn(),
}));

describe("SecretKeyForm", () => {
  it("hides the 'chave atual' field on first-time setup", () => {
    render(<SecretKeyForm hasSecretKey={false} />);

    expect(screen.queryByLabelText("Chave atual")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir chave" })).toBeInTheDocument();
  });

  it("shows the 'chave atual' field once a key already exists", () => {
    render(<SecretKeyForm hasSecretKey={true} />);

    expect(screen.getByLabelText("Chave atual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar chave" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the new component tests**

Run: `npx vitest run src/components/admin/MercadoPagoTokenForm.test.tsx src/components/admin/SecretKeyForm.test.tsx`
Expected: PASS (2/2 and 2/2).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/integracoes" src/components/admin/MercadoPagoTokenForm.tsx src/components/admin/MercadoPagoTokenForm.test.tsx src/components/admin/SecretKeyForm.tsx src/components/admin/SecretKeyForm.test.tsx "src/app/admin/(protected)/layout.tsx"
git commit -m "feat(payments): add the Integrações admin section (Mercado Pago token + secret key)"
```

---

## Task 16: Final verification

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
Expected: build succeeds, `/admin/integracoes` appears in the route list.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, log into `/admin`, then:
- Visit `/admin/integracoes`. Set the secret key first (no "Chave atual" field should appear). Then set the Mercado Pago Access Token (the secret-key field should now appear and be required) — use the test Access Token already in `.env.local` from earlier in this project's setup, or a fresh one.
- Create a new gift via `/admin/presentes/novo`. Confirm it redirects successfully and, back on `/admin/presentes/[id]` for that gift, a "Link de pagamento" field with a working "Copiar link" button appears.
- Edit that gift's price. Confirm the save is rejected without a secret key, and succeeds with the correct one — and confirm the payment link visibly changes (regenerated).
- Edit only the gift's description (not price). Confirm it saves without asking for the secret key, and the payment link stays the same.
- Import a small `.xlsx` with 1-2 gift rows via `/admin/presentes/importar`. Confirm the import summary shows correct created/withoutPaymentLink counts and that the imported gift(s) got payment links (or the summary correctly reports if not).
- On the public `/presentes` page, click "Presentear" on a gift with a stored link; confirm you're redirected to a real Mercado Pago checkout page reflecting the correct price.

- [ ] **Step 6: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
