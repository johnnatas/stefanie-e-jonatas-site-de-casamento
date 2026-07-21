# Guest Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests who reserve a gift for later get a friendly, low-pressure trail of email reminders that stops the moment they pay. Confirmed guests who haven't given anything get gentle nudges as the wedding approaches. Everyone confirmed gets a warm note on the wedding day.

**Architecture:** A new `EmailGateway` port (implemented by `ResendEmailGateway`, credentials admin-editable like the Mercado Pago token) plus a `NotificationLogRepository` for idempotent sending. Four small use cases — one immediate (reservation confirmation, fired synchronously from the reservation Server Action) and three scheduled (reservation reminders, gift-suggestion reminders, wedding-day notification) — all invoked daily by one Vercel Cron Route Handler.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Zod v4, Supabase Postgres 17, Vitest, Resend (new dependency), Vercel Cron.

## Global Constraints

- Never `git add -A` — stage explicit file lists only.
- Sender address: `Stéfanie & Jonatas <lembretes@sjcasamento.site>`.
- The Resend API key is stored in `admin_security_settings` (DB-backed, admin-editable from `/admin/integracoes`), never an env var — changing it after first-time setup requires the same admin secret key as the Mercado Pago token and price changes.
- Cron runs daily at 08:30 Brasília time (`30 11 * * *` UTC — Brazil has had no DST since 2019, so this offset is fixed).
- Reservation reminders fire at exactly 10, 7, 3, 1, and 0 days before `expectedPaymentDate`; gift-suggestion reminders at exactly 90, 60, 30, 15, and 3 days before the wedding; each kind fires at most once per entity, tracked via `notification_log`.
- No unsubscribe link, no admin-facing notification history page — explicitly out of scope per the approved spec.
- Follow existing code patterns/style exactly (Clean Architecture, existing admin Integrações UI conventions, existing Server Action error-handling shape).

---

## Task 1: Domain ports + test doubles

**Files:**
- Create: `src/application/ports/EmailGateway.ts`
- Create: `src/domain/repositories/NotificationLogRepository.ts`
- Create: `src/application/testing/FakeEmailGateway.ts`
- Create: `src/application/testing/InMemoryNotificationLogRepository.ts`

**Interfaces:**
- Produces: `EmailGateway.sendEmail({to, subject, html}): Promise<void>`, `NotificationKind` (12-value union), `NotificationEntityType` ("gift_contribution" | "guest"), `NotificationLogRepository.hasBeenSent/markSent` — consumed by every task from here on.

- [ ] **Step 1: Create the `EmailGateway` port**

Create `src/application/ports/EmailGateway.ts`:

```ts
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailGateway {
  sendEmail(input: SendEmailInput): Promise<void>;
}
```

- [ ] **Step 2: Create the `NotificationLogRepository` interface**

Create `src/domain/repositories/NotificationLogRepository.ts`:

```ts
export type NotificationKind =
  | "reservation_confirmation"
  | "reservation_reminder_t10"
  | "reservation_reminder_t7"
  | "reservation_reminder_t3"
  | "reservation_reminder_t1"
  | "reservation_reminder_t0"
  | "gift_suggestion_t90"
  | "gift_suggestion_t60"
  | "gift_suggestion_t30"
  | "gift_suggestion_t15"
  | "gift_suggestion_t3"
  | "wedding_day";

export type NotificationEntityType = "gift_contribution" | "guest";

export interface NotificationLogRepository {
  hasBeenSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<boolean>;
  markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void>;
}
```

- [ ] **Step 3: Create `FakeEmailGateway`**

Create `src/application/testing/FakeEmailGateway.ts`:

```ts
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";

export class FakeEmailGateway implements EmailGateway {
  readonly sentEmails: SendEmailInput[] = [];

  async sendEmail(input: SendEmailInput): Promise<void> {
    this.sentEmails.push(input);
  }
}
```

- [ ] **Step 4: Create `InMemoryNotificationLogRepository`**

Create `src/application/testing/InMemoryNotificationLogRepository.ts`:

```ts
import {
  NotificationEntityType,
  NotificationKind,
  NotificationLogRepository,
} from "@/domain/repositories/NotificationLogRepository";

export class InMemoryNotificationLogRepository implements NotificationLogRepository {
  private sent = new Set<string>();

  private key(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): string {
    return `${kind}:${entityType}:${entityId}`;
  }

  async hasBeenSent(
    kind: NotificationKind,
    entityType: NotificationEntityType,
    entityId: string
  ): Promise<boolean> {
    return this.sent.has(this.key(kind, entityType, entityId));
  }

  async markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void> {
    this.sent.add(this.key(kind, entityType, entityId));
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (these files aren't consumed by anything yet).

- [ ] **Step 6: Commit**

```bash
git add src/application/ports/EmailGateway.ts src/domain/repositories/NotificationLogRepository.ts src/application/testing/FakeEmailGateway.ts src/application/testing/InMemoryNotificationLogRepository.ts
git commit -m "feat(notifications): add EmailGateway/NotificationLogRepository ports and test doubles"
```

---

## Task 2: Infra persistence — Resend, notification log, Resend API key storage

**Files:**
- Modify: `src/domain/repositories/AdminSecuritySettingsRepository.ts`
- Modify: `src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts`
- Modify: `src/application/testing/InMemoryAdminSecuritySettingsRepository.ts`
- Create: `src/infrastructure/email/ResendEmailGateway.ts`
- Create: `src/infrastructure/supabase/SupabaseNotificationLogRepository.ts`
- Create: `supabase/migrations/0006_notifications.sql`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `EmailGateway`, `NotificationLogRepository` (Task 1).
- Produces: `AdminSecuritySettings.resendApiKey`, `AdminSecuritySettingsRepository.updateResendApiKey(key)`, `repositories().emailGateway`, `repositories().notificationLogRepository` — consumed by every later task.

- [ ] **Step 1: Install the Resend SDK**

Run: `npm install resend`

- [ ] **Step 2: Extend `AdminSecuritySettingsRepository`**

Replace the full content of `src/domain/repositories/AdminSecuritySettingsRepository.ts`:

```ts
export interface AdminSecuritySettings {
  mercadoPagoAccessToken: string | null;
  priceChangeSecretHash: string | null;
  priceChangeSecretSalt: string | null;
  resendApiKey: string | null;
}

export interface AdminSecuritySettingsRepository {
  getSettings(): Promise<AdminSecuritySettings>;
  updateMercadoPagoAccessToken(token: string): Promise<void>;
  updateSecretKeyHash(hash: string, salt: string): Promise<void>;
  updateResendApiKey(key: string): Promise<void>;
}
```

- [ ] **Step 3: Update `SupabaseAdminSecuritySettingsRepository`**

Replace the full content of `src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts`:

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
  resend_api_key: string | null;
}

export class SupabaseAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSettings(): Promise<AdminSecuritySettings> {
    const { data, error } = await this.client
      .from("admin_security_settings")
      .select("mercadopago_access_token, price_change_secret_hash, price_change_secret_salt, resend_api_key")
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

  async updateResendApiKey(key: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({ resend_api_key: key, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update Resend API key: ${error.message}`);
    }
  }
}
```

- [ ] **Step 4: Update `InMemoryAdminSecuritySettingsRepository`**

Replace the full content of `src/application/testing/InMemoryAdminSecuritySettingsRepository.ts`:

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
    resendApiKey: null,
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

  async updateResendApiKey(key: string): Promise<void> {
    this.settings.resendApiKey = key;
  }
}
```

- [ ] **Step 5: Implement `ResendEmailGateway`**

Create `src/infrastructure/email/ResendEmailGateway.ts`:

```ts
import { Resend } from "resend";
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";

const FROM_ADDRESS = "Stéfanie & Jonatas <lembretes@sjcasamento.site>";

export class ResendEmailGateway implements EmailGateway {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.resendApiKey) {
      throw new Error("Resend não está configurado. Configure a API Key em Integrações.");
    }

    const client = new Resend(settings.resendApiKey);
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
```

- [ ] **Step 6: Implement `SupabaseNotificationLogRepository`**

Create `src/infrastructure/supabase/SupabaseNotificationLogRepository.ts`:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import {
  NotificationEntityType,
  NotificationKind,
  NotificationLogRepository,
} from "@/domain/repositories/NotificationLogRepository";

export class SupabaseNotificationLogRepository implements NotificationLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async hasBeenSent(
    kind: NotificationKind,
    entityType: NotificationEntityType,
    entityId: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("notification_log")
      .select("id")
      .eq("kind", kind)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check notification log: ${error.message}`);
    }

    return data !== null;
  }

  async markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void> {
    const { error } = await this.client
      .from("notification_log")
      .insert({ kind, entity_type: entityType, entity_id: entityId });

    if (error) {
      throw new Error(`Failed to record sent notification: ${error.message}`);
    }
  }
}
```

- [ ] **Step 7: Create the migration**

Create `supabase/migrations/0006_notifications.sql`:

```sql
alter table admin_security_settings
  add column resend_api_key text;

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  entity_type text not null check (entity_type in ('gift_contribution', 'guest')),
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (kind, entity_type, entity_id)
);

alter table notification_log enable row level security;

-- Same model as every other table here: only trusted server code using
-- the service-role key reads/writes this, so no policies are granted
-- to the anon/authenticated roles.
```

- [ ] **Step 8: Apply the migration to the live Supabase project**

Run the migration file's SQL via the Supabase MCP `execute_sql` tool.

- [ ] **Step 9: Verify**

Run via `execute_sql`:

```sql
select column_name from information_schema.columns where table_name = 'admin_security_settings' and column_name = 'resend_api_key';
select table_name from information_schema.tables where table_name = 'notification_log';
```

Expected: both queries return one row each.

- [ ] **Step 10: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add these imports after the existing `SupabaseAdminSecuritySettingsRepository` import:

```ts
import { SupabaseNotificationLogRepository } from "@/infrastructure/supabase/SupabaseNotificationLogRepository";
import { ResendEmailGateway } from "@/infrastructure/email/ResendEmailGateway";
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
    notificationLogRepository: new SupabaseNotificationLogRepository(client),
    emailGateway: new ResendEmailGateway(securitySettingsRepository),
  };
}
```

- [ ] **Step 11: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 12: Run the full test suite**

Run: `npm run test`
Expected: all pass (no test file references `resendApiKey` yet, so nothing new to break).

- [ ] **Step 13: Commit**

```bash
git add src/domain/repositories/AdminSecuritySettingsRepository.ts src/infrastructure/supabase/SupabaseAdminSecuritySettingsRepository.ts src/application/testing/InMemoryAdminSecuritySettingsRepository.ts src/infrastructure/email/ResendEmailGateway.ts src/infrastructure/supabase/SupabaseNotificationLogRepository.ts supabase/migrations/0006_notifications.sql src/infrastructure/composition.ts package.json package-lock.json
git commit -m "feat(notifications): add Resend email gateway and notification log persistence"
```

---

## Task 3: Brasília calendar-day helpers

**Files:**
- Create: `src/shared/utils/brasiliaCalendarDays.ts`
- Create: `src/shared/utils/brasiliaCalendarDays.test.ts`

**Interfaces:**
- Produces: `daysBetweenBrasiliaDates(from: Date, to: Date): number`, `formatBrasiliaDate(date: Date): string` — consumed by Tasks 6-9 (all four notification use cases) and Task 10 (cron route).

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/brasiliaCalendarDays.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";

describe("daysBetweenBrasiliaDates", () => {
  it("returns 0 for the same calendar day", () => {
    const from = new Date("2027-05-01T09:00:00-03:00");
    const to = new Date("2027-05-01T23:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(0);
  });

  it("returns a positive count when 'to' is in the future", () => {
    const from = new Date("2027-05-01T12:00:00-03:00");
    const to = new Date("2027-05-11T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(10);
  });

  it("returns a negative count when 'to' is in the past", () => {
    const from = new Date("2027-05-11T12:00:00-03:00");
    const to = new Date("2027-05-01T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(-10);
  });

  it("counts correctly across a month boundary", () => {
    const from = new Date("2027-04-25T12:00:00-03:00");
    const to = new Date("2027-05-05T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(10);
  });
});

describe("formatBrasiliaDate", () => {
  it("formats a date as dd/mm/yyyy in Brasília time", () => {
    expect(formatBrasiliaDate(new Date("2027-05-01T23:59:59-03:00"))).toBe("01/05/2027");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/utils/brasiliaCalendarDays.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/shared/utils/brasiliaCalendarDays.ts`:

```ts
function toBrasiliaDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function daysBetweenBrasiliaDates(from: Date, to: Date): number {
  const fromMidnight = new Date(`${toBrasiliaDateOnly(from)}T00:00:00-03:00`);
  const toMidnight = new Date(`${toBrasiliaDateOnly(to)}T00:00:00-03:00`);
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatBrasiliaDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/utils/brasiliaCalendarDays.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/brasiliaCalendarDays.ts src/shared/utils/brasiliaCalendarDays.test.ts
git commit -m "feat(notifications): add Brasília calendar-day helpers"
```

---

## Task 4: Email templates

**Files:**
- Create: `src/infrastructure/email/templates.ts`
- Create: `src/infrastructure/email/templates.test.ts`

**Interfaces:**
- Produces: `EmailContent { subject: string; html: string }`, `reservationConfirmationEmail(params)`, `reservationReminderEmail(params)`, `giftSuggestionEmail(params)`, `weddingDayEmail(params)` — consumed by Tasks 6-9.

- [ ] **Step 1: Write the failing tests**

Create `src/infrastructure/email/templates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  giftSuggestionEmail,
  reservationConfirmationEmail,
  reservationReminderEmail,
  weddingDayEmail,
} from "@/infrastructure/email/templates";

describe("email templates", () => {
  it("builds the reservation confirmation email", () => {
    const result = reservationConfirmationEmail({
      guestName: "Carla",
      giftName: "Liquidificador",
      formattedDate: "01/05/2027",
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(result.subject).toBe("Reserva confirmada: Liquidificador 🎁");
    expect(result.html).toContain("Carla");
    expect(result.html).toContain("Liquidificador");
    expect(result.html).toContain("01/05/2027");
    expect(result.html).toContain("https://mercadopago.test/checkout");
  });

  it("builds the reservation reminder email", () => {
    const result = reservationReminderEmail({
      guestName: "Carla",
      giftName: "Liquidificador",
      formattedDate: "01/05/2027",
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(result.subject).toBe("Lembrete: sua reserva de Liquidificador");
    expect(result.html).toContain("01/05/2027");
    expect(result.html).toContain("https://mercadopago.test/checkout");
  });

  it("builds the gift suggestion email", () => {
    const result = giftSuggestionEmail({
      guestName: "Carla",
      daysUntilWedding: 30,
      formattedWeddingDate: "19/06/2027",
      giftsUrl: "https://sjcasamento.site/presentes",
    });

    expect(result.subject).toBe("Faltam 30 dias para o nosso casamento!");
    expect(result.html).toContain("19/06/2027");
    expect(result.html).toContain("https://sjcasamento.site/presentes");
  });

  it("builds the wedding day email", () => {
    const result = weddingDayEmail({ guestName: "Carla" });

    expect(result.subject).toBe("Hoje é o grande dia! 💍");
    expect(result.html).toContain("Carla");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/email/templates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/infrastructure/email/templates.ts`:

```ts
export interface EmailContent {
  subject: string;
  html: string;
}

function wrapHtml(bodyHtml: string): string {
  return `<div style="font-family: sans-serif; color: #2f3e2e; line-height: 1.6;">${bodyHtml}</div>`;
}

function ctaButton(label: string, url: string): string {
  return `<p><a href="${url}" style="display: inline-block; background: #4a5d3a; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none;">${label}</a></p>`;
}

export function reservationConfirmationEmail(params: {
  guestName: string;
  giftName: string;
  formattedDate: string;
  checkoutUrl: string;
}): EmailContent {
  return {
    subject: `Reserva confirmada: ${params.giftName} 🎁`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Reservamos <strong>${params.giftName}</strong> para você, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Quando quiser, é só clicar no link abaixo para concluir o pagamento. Vamos te lembrar mais perto da data, sem pressa!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function reservationReminderEmail(params: {
  guestName: string;
  giftName: string;
  formattedDate: string;
  checkoutUrl: string;
}): EmailContent {
  return {
    subject: `Lembrete: sua reserva de ${params.giftName}`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Passando para lembrar que você reservou <strong>${params.giftName}</strong>, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Se ainda não pagou e quiser fazer isso agora, é só clicar aqui — sem pressa nenhuma, é só um lembrete carinhoso!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function giftSuggestionEmail(params: {
  guestName: string;
  daysUntilWedding: number;
  formattedWeddingDate: string;
  giftsUrl: string;
}): EmailContent {
  return {
    subject: `Faltam ${params.daysUntilWedding} dias para o nosso casamento!`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Estamos muito felizes que você vai estar com a gente no dia ${params.formattedWeddingDate}.</p>
      <p>Se quiser nos ajudar a começar essa nova fase, preparamos uma lista de presentes com carinho — mas o mais importante é ter você lá com a gente!</p>
      ${ctaButton("Ver lista de presentes", params.giftsUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function weddingDayEmail(params: { guestName: string }): EmailContent {
  return {
    subject: "Hoje é o grande dia! 💍",
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Hoje é o dia do nosso casamento e queremos muito aproveitar cada momento ao lado de quem a gente ama.</p>
      <p>Mal podemos esperar para te ver na cerimônia!</p>
      <p>Com todo carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/email/templates.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/email/templates.ts src/infrastructure/email/templates.test.ts
git commit -m "feat(notifications): add email copy templates"
```

---

## Task 5: Admin credential UI for the Resend API key

**Files:**
- Create: `src/application/use-cases/security/UpdateResendApiKeyUseCase.ts`
- Create: `src/application/use-cases/security/UpdateResendApiKeyUseCase.test.ts`
- Modify: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts`
- Modify: `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`
- Create: `src/components/admin/ResendApiKeyForm.tsx`
- Create: `src/components/admin/ResendApiKeyForm.test.tsx`
- Modify: `src/app/admin/(protected)/integracoes/actions.ts`
- Modify: `src/app/admin/(protected)/integracoes/page.tsx`

**Interfaces:**
- Consumes: `AdminSecuritySettingsRepository.updateResendApiKey` (Task 2).
- Produces: `AdminSecuritySettingsSummary.resendApiKeyLast4`, `updateResendApiKeyAction`, `<ResendApiKeyForm>`.

- [ ] **Step 1: Write the failing test for `UpdateResendApiKeyUseCase`**

Create `src/application/use-cases/security/UpdateResendApiKeyUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpdateResendApiKeyUseCase } from "@/application/use-cases/security/UpdateResendApiKeyUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateResendApiKeyUseCase", () => {
  it("sets the key for the first time with no secret key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "re_primeiro" });

    const settings = await repository.getSettings();
    expect(settings.resendApiKey).toBe("re_primeiro");
  });

  it("requires the correct secret key once a key is already set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await new UpdateResendApiKeyUseCase(repository).execute({
      apiKey: "re_novo",
      secretKey: "chave-correta",
    });

    const settings = await repository.getSettings();
    expect(settings.resendApiKey).toBe("re_novo");
  });

  it("rejects the change when the secret key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await expect(
      new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "re_novo", secretKey: "chave-errada" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects an empty key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/security/UpdateResendApiKeyUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `UpdateResendApiKeyUseCase`**

Create `src/application/use-cases/security/UpdateResendApiKeyUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateResendApiKeyInput {
  apiKey: string;
  secretKey?: string;
}

export class UpdateResendApiKeyUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateResendApiKeyInput): Promise<void> {
    if (!input.apiKey || input.apiKey.trim().length === 0) {
      throw new InvalidSecurityCredentialError("Informe a API Key do Resend.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const isFirstTimeSetup = !settings.resendApiKey;

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

    await this.securitySettingsRepository.updateResendApiKey(input.apiKey.trim());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/security/UpdateResendApiKeyUseCase.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Update `GetAdminSecuritySettingsUseCase` and its test**

Replace the full content of `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts`:

```ts
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";

export interface AdminSecuritySettingsSummary {
  mercadoPagoAccessTokenLast4: string | null;
  resendApiKeyLast4: string | null;
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
      resendApiKeyLast4: settings.resendApiKey ? settings.resendApiKey.slice(-4) : null,
      hasSecretKey: Boolean(settings.priceChangeSecretHash),
    };
  }
}
```

Replace the full content of `src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("GetAdminSecuritySettingsUseCase", () => {
  it("returns null/false when nothing has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({
      mercadoPagoAccessTokenLast4: null,
      resendApiKeyLast4: null,
      hasSecretKey: false,
    });
  });

  it("returns the last 4 characters of the token and hasSecretKey true when both are set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-7812913636974826-072012-63c40beb");
    const { hash, salt } = hashSecretKey("uma-chave");
    await repository.updateSecretKeyHash(hash, salt);

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({
      mercadoPagoAccessTokenLast4: "0beb",
      resendApiKeyLast4: null,
      hasSecretKey: true,
    });
  });

  it("returns the last 4 characters of the Resend API key when set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_123456789_abcd");

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.resendApiKeyLast4).toBe("abcd");
  });
});
```

- [ ] **Step 6: Run the updated test**

Run: `npx vitest run src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts`
Expected: PASS (3/3).

- [ ] **Step 7: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after `UpdateMercadoPagoAccessTokenUseCase`:

```ts
import { UpdateResendApiKeyUseCase } from "@/application/use-cases/security/UpdateResendApiKeyUseCase";
```

Add this factory after `createUpdateMercadoPagoAccessTokenUseCase`:

```ts
export function createUpdateResendApiKeyUseCase(): UpdateResendApiKeyUseCase {
  return new UpdateResendApiKeyUseCase(repositories().securitySettingsRepository);
}
```

- [ ] **Step 8: Write the failing test for `ResendApiKeyForm`**

Create `src/components/admin/ResendApiKeyForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateResendApiKeyAction: vi.fn(),
}));

describe("ResendApiKeyForm", () => {
  it("shows 'not configured' when no key is set yet and hides the secret-key field", () => {
    render(<ResendApiKeyForm currentApiKeyLast4={null} hasSecretKey={false} />);

    expect(screen.getByText("API Key não configurada.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Chave secreta")).not.toBeInTheDocument();
  });

  it("shows the last 4 characters and the secret-key field when a key already exists", () => {
    render(<ResendApiKeyForm currentApiKeyLast4="abcd" hasSecretKey={true} />);

    expect(screen.getByText("API Key atual: termina em abcd")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave secreta")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npx vitest run src/components/admin/ResendApiKeyForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 10: Implement `ResendApiKeyForm`**

Create `src/components/admin/ResendApiKeyForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  updateResendApiKeyAction,
  type UpdateResendApiKeyActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface ResendApiKeyFormProps {
  currentApiKeyLast4: string | null;
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateResendApiKeyActionState = { status: "idle" };

export function ResendApiKeyForm({ currentApiKeyLast4, hasSecretKey }: ResendApiKeyFormProps) {
  const [state, formAction, isPending] = useActionState(updateResendApiKeyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Resend (e-mails)</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          {currentApiKeyLast4 ? `API Key atual: termina em ${currentApiKeyLast4}` : "API Key não configurada."}
        </p>
      </div>

      <div>
        <label htmlFor="apiKey" className="block font-sans text-sm text-forest">
          Nova API Key
        </label>
        <input id="apiKey" name="apiKey" type="password" required autoComplete="off" className={inputClassName} />
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="resendSecretKey" className="block font-sans text-sm text-forest">
            Chave secreta
          </label>
          <input
            id="resendSecretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar API Key"}
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

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run src/components/admin/ResendApiKeyForm.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 12: Wire the Server Action**

Edit `src/app/admin/(protected)/integracoes/actions.ts`. Replace the import block:

```ts
import {
  createUpdateMercadoPagoAccessTokenUseCase,
  createUpdateResendApiKeyUseCase,
  createUpdateSecretKeyUseCase,
} from "@/infrastructure/composition";
```

Append at the end of the file:

```ts
export interface UpdateResendApiKeyActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateResendApiKeyAction(
  _prevState: UpdateResendApiKeyActionState,
  formData: FormData
): Promise<UpdateResendApiKeyActionState> {
  const apiKey = (formData.get("apiKey") as string) || "";
  const secretKey = (formData.get("secretKey") as string) || "";

  try {
    await createUpdateResendApiKeyUseCase().execute({ apiKey, secretKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar a API Key agora." };
  }

  return { status: "success", message: "API Key atualizada com sucesso." };
}
```

- [ ] **Step 13: Wire the Integrações page**

Edit `src/app/admin/(protected)/integracoes/page.tsx`. Add this import after `MercadoPagoTokenForm`:

```ts
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";
```

Add the new form after `<MercadoPagoTokenForm ... />` and before `<SecretKeyForm ... />`:

```tsx
        <MercadoPagoTokenForm
          currentTokenLast4={summary.mercadoPagoAccessTokenLast4}
          hasSecretKey={summary.hasSecretKey}
        />
        <ResendApiKeyForm currentApiKeyLast4={summary.resendApiKeyLast4} hasSecretKey={summary.hasSecretKey} />
        <SecretKeyForm hasSecretKey={summary.hasSecretKey} />
```

- [ ] **Step 14: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 15: Commit**

```bash
git add src/application/use-cases/security/UpdateResendApiKeyUseCase.ts src/application/use-cases/security/UpdateResendApiKeyUseCase.test.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.ts src/application/use-cases/security/GetAdminSecuritySettingsUseCase.test.ts src/infrastructure/composition.ts src/components/admin/ResendApiKeyForm.tsx src/components/admin/ResendApiKeyForm.test.tsx "src/app/admin/(protected)/integracoes/actions.ts" "src/app/admin/(protected)/integracoes/page.tsx"
git commit -m "feat(notifications): add admin-editable Resend API key to Integrações"
```

---

## Task 6: `SendReservationConfirmationUseCase`

**Files:**
- Create: `src/application/use-cases/notifications/SendReservationConfirmationUseCase.ts`
- Create: `src/application/use-cases/notifications/SendReservationConfirmationUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `EmailGateway`, `NotificationLogRepository` (Task 1), `reservationConfirmationEmail` (Task 4), `formatBrasiliaDate` (Task 3).
- Produces: `createSendReservationConfirmationUseCase()` — consumed by Task 10 (wiring into `reserveGiftForLaterAction`).

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/notifications/SendReservationConfirmationUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SendReservationConfirmationUseCase } from "@/application/use-cases/notifications/SendReservationConfirmationUseCase";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";

describe("SendReservationConfirmationUseCase", () => {
  it("sends the confirmation email and records it as sent", async () => {
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendReservationConfirmationUseCase(emailGateway, notificationLogRepository);

    await useCase.execute({
      contributionId: "contribution-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      giftName: "Liquidificador",
      expectedPaymentDate: new Date("2027-05-01T23:59:59-03:00"),
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("carla@example.com");
    expect(emailGateway.sentEmails[0].subject).toBe("Reserva confirmada: Liquidificador 🎁");
    expect(
      await notificationLogRepository.hasBeenSent("reservation_confirmation", "gift_contribution", "contribution-1")
    ).toBe(true);
  });

  it("does not send twice for the same contribution", async () => {
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendReservationConfirmationUseCase(emailGateway, notificationLogRepository);
    const input = {
      contributionId: "contribution-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      giftName: "Liquidificador",
      expectedPaymentDate: new Date("2027-05-01T23:59:59-03:00"),
      checkoutUrl: "https://mercadopago.test/checkout",
    };

    await useCase.execute(input);
    await useCase.execute(input);

    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/notifications/SendReservationConfirmationUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/application/use-cases/notifications/SendReservationConfirmationUseCase.ts`:

```ts
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { reservationConfirmationEmail } from "@/infrastructure/email/templates";
import { formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";

export interface SendReservationConfirmationInput {
  contributionId: string;
  guestName: string;
  guestEmail: string;
  giftName: string;
  expectedPaymentDate: Date;
  checkoutUrl: string;
}

export class SendReservationConfirmationUseCase {
  constructor(
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(input: SendReservationConfirmationInput): Promise<void> {
    const alreadySent = await this.notificationLogRepository.hasBeenSent(
      "reservation_confirmation",
      "gift_contribution",
      input.contributionId
    );
    if (alreadySent) {
      return;
    }

    const { subject, html } = reservationConfirmationEmail({
      guestName: input.guestName,
      giftName: input.giftName,
      formattedDate: formatBrasiliaDate(input.expectedPaymentDate),
      checkoutUrl: input.checkoutUrl,
    });

    await this.emailGateway.sendEmail({ to: input.guestEmail, subject, html });
    await this.notificationLogRepository.markSent(
      "reservation_confirmation",
      "gift_contribution",
      input.contributionId
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/notifications/SendReservationConfirmationUseCase.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after `ListGiftContributionsUseCase`:

```ts
import { SendReservationConfirmationUseCase } from "@/application/use-cases/notifications/SendReservationConfirmationUseCase";
```

Add this factory after `createListGiftContributionsUseCase`:

```ts
export function createSendReservationConfirmationUseCase(): SendReservationConfirmationUseCase {
  const { emailGateway, notificationLogRepository } = repositories();
  return new SendReservationConfirmationUseCase(emailGateway, notificationLogRepository);
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/notifications/SendReservationConfirmationUseCase.ts src/application/use-cases/notifications/SendReservationConfirmationUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat(notifications): add SendReservationConfirmationUseCase"
```

---

## Task 7: `SendReservationRemindersUseCase`

**Files:**
- Create: `src/application/use-cases/notifications/SendReservationRemindersUseCase.ts`
- Create: `src/application/use-cases/notifications/SendReservationRemindersUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `GiftContributionRepository.findAll` (existing), `GiftRepository.findById` (existing), `EmailGateway`, `NotificationLogRepository` (Task 1), `reservationReminderEmail` (Task 4), `daysBetweenBrasiliaDates`/`formatBrasiliaDate` (Task 3).
- Produces: `SendReservationRemindersUseCase.execute(today?: Date): Promise<number>`, `createSendReservationRemindersUseCase()` — consumed by Task 10 (cron route).

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/notifications/SendReservationRemindersUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { SendReservationRemindersUseCase } from "@/application/use-cases/notifications/SendReservationRemindersUseCase";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("SendReservationRemindersUseCase", () => {
  let contributionRepository: InMemoryGiftContributionRepository;
  let giftRepository: InMemoryGiftRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendReservationRemindersUseCase;

  beforeEach(async () => {
    contributionRepository = new InMemoryGiftContributionRepository();
    giftRepository = new InMemoryGiftRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendReservationRemindersUseCase(
      contributionRepository,
      giftRepository,
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
        mercadoPagoCheckoutUrl: "https://mercadopago.test/checkout/gift-1",
      })
    );
  });

  it("sends a reminder when today is exactly 7 days before the expected payment date", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("carla@example.com");
    expect(
      await notificationLogRepository.hasBeenSent("reservation_reminder_t7", "gift_contribution", "contribution-1")
    ).toBe(true);
  });

  it("does not send when today doesn't match any threshold", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-15T23:59:59-03:00"),
      })
    );

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice for the same threshold", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );

    await useCase.execute(today);
    const secondRunSentCount = await useCase.execute(today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });

  it("does not send for a contribution that is no longer pending", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    const contribution = await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );
    await contributionRepository.update(contribution.approve("payment-1"));

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/notifications/SendReservationRemindersUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/application/use-cases/notifications/SendReservationRemindersUseCase.ts`:

```ts
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationKind, NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";
import { reservationReminderEmail } from "@/infrastructure/email/templates";

const REMINDER_THRESHOLDS: Record<number, NotificationKind> = {
  10: "reservation_reminder_t10",
  7: "reservation_reminder_t7",
  3: "reservation_reminder_t3",
  1: "reservation_reminder_t1",
  0: "reservation_reminder_t0",
};

export class SendReservationRemindersUseCase {
  constructor(
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly giftRepository: GiftRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(today: Date = new Date()): Promise<number> {
    const contributions = await this.giftContributionRepository.findAll();
    const pendingWithDate = contributions.filter(
      (contribution) => contribution.status === "pending" && contribution.expectedPaymentDate !== null
    );

    let sentCount = 0;

    for (const contribution of pendingWithDate) {
      const daysUntil = daysBetweenBrasiliaDates(today, contribution.expectedPaymentDate!);
      const kind = REMINDER_THRESHOLDS[daysUntil];
      if (!kind) {
        continue;
      }

      const alreadySent = await this.notificationLogRepository.hasBeenSent(
        kind,
        "gift_contribution",
        contribution.id!
      );
      if (alreadySent) {
        continue;
      }

      const gift = await this.giftRepository.findById(contribution.giftId);
      if (!gift || !gift.mercadoPagoCheckoutUrl) {
        continue;
      }

      const { subject, html } = reservationReminderEmail({
        guestName: contribution.guestName,
        giftName: gift.name,
        formattedDate: formatBrasiliaDate(contribution.expectedPaymentDate!),
        checkoutUrl: gift.mercadoPagoCheckoutUrl,
      });

      await this.emailGateway.sendEmail({ to: contribution.guestEmail, subject, html });
      await this.notificationLogRepository.markSent(kind, "gift_contribution", contribution.id!);
      sentCount++;
    }

    return sentCount;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/notifications/SendReservationRemindersUseCase.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after `SendReservationConfirmationUseCase`:

```ts
import { SendReservationRemindersUseCase } from "@/application/use-cases/notifications/SendReservationRemindersUseCase";
```

Add this factory after `createSendReservationConfirmationUseCase`:

```ts
export function createSendReservationRemindersUseCase(): SendReservationRemindersUseCase {
  const { giftContributionRepository, giftRepository, emailGateway, notificationLogRepository } = repositories();
  return new SendReservationRemindersUseCase(
    giftContributionRepository,
    giftRepository,
    emailGateway,
    notificationLogRepository
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/notifications/SendReservationRemindersUseCase.ts src/application/use-cases/notifications/SendReservationRemindersUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat(notifications): add SendReservationRemindersUseCase"
```

---

## Task 8: `SendGiftSuggestionRemindersUseCase`

**Files:**
- Create: `src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.ts`
- Create: `src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `GuestRepository.findAll` (existing), `GiftContributionRepository.findAll` (existing), `EmailGateway`, `NotificationLogRepository` (Task 1), `giftSuggestionEmail` (Task 4), `daysBetweenBrasiliaDates`/`formatBrasiliaDate` (Task 3).
- Produces: `SendGiftSuggestionRemindersUseCase.execute(weddingDate, giftsUrl, today?): Promise<number>`, `createSendGiftSuggestionRemindersUseCase()` — consumed by Task 10.

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { SendGiftSuggestionRemindersUseCase } from "@/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Guest } from "@/domain/entities/Guest";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("SendGiftSuggestionRemindersUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendGiftSuggestionRemindersUseCase;

  const weddingDate = new Date("2027-06-19T16:00:00-03:00");
  const giftsUrl = "https://sjcasamento.site/presentes";

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendGiftSuggestionRemindersUseCase(
      guestRepository,
      contributionRepository,
      emailGateway,
      notificationLogRepository
    );
  });

  it("sends a suggestion to a confirmed guest without a gift 30 days before the wedding", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails[0].to).toBe("bruna@example.com");
  });

  it("does not send when today doesn't match any threshold", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-25T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(0);
  });

  it("does not send to a guest who already has an active gift contribution", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Bruna Lima",
        guestEmail: "bruna@example.com",
        amount: 200,
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(0);
  });

  it("does not send to a guest who hasn't confirmed attendance", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice for the same threshold", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    await useCase.execute(weddingDate, giftsUrl, today);
    const secondRunSentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.ts`:

```ts
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationKind, NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";
import { giftSuggestionEmail } from "@/infrastructure/email/templates";

const SUGGESTION_THRESHOLDS: Record<number, NotificationKind> = {
  90: "gift_suggestion_t90",
  60: "gift_suggestion_t60",
  30: "gift_suggestion_t30",
  15: "gift_suggestion_t15",
  3: "gift_suggestion_t3",
};

export class SendGiftSuggestionRemindersUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(weddingDate: Date, giftsUrl: string, today: Date = new Date()): Promise<number> {
    const daysUntilWedding = daysBetweenBrasiliaDates(today, weddingDate);
    const kind = SUGGESTION_THRESHOLDS[daysUntilWedding];
    if (!kind) {
      return 0;
    }

    const [guests, contributions] = await Promise.all([
      this.guestRepository.findAll(),
      this.giftContributionRepository.findAll(),
    ]);

    const emailsWithActiveContribution = new Set(
      contributions
        .filter((contribution) => contribution.status === "pending" || contribution.status === "approved")
        .map((contribution) => contribution.guestEmail)
    );

    const confirmedGuestsWithoutGift = guests.filter(
      (guest) =>
        guest.attendanceStatus === "confirmed" && guest.email && !emailsWithActiveContribution.has(guest.email)
    );

    let sentCount = 0;

    for (const guest of confirmedGuestsWithoutGift) {
      const alreadySent = await this.notificationLogRepository.hasBeenSent(kind, "guest", guest.id!);
      if (alreadySent) {
        continue;
      }

      const { subject, html } = giftSuggestionEmail({
        guestName: guest.fullName,
        daysUntilWedding,
        formattedWeddingDate: formatBrasiliaDate(weddingDate),
        giftsUrl,
      });

      await this.emailGateway.sendEmail({ to: guest.email!, subject, html });
      await this.notificationLogRepository.markSent(kind, "guest", guest.id!);
      sentCount++;
    }

    return sentCount;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after `SendReservationRemindersUseCase`:

```ts
import { SendGiftSuggestionRemindersUseCase } from "@/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase";
```

Add this factory after `createSendReservationRemindersUseCase`:

```ts
export function createSendGiftSuggestionRemindersUseCase(): SendGiftSuggestionRemindersUseCase {
  const { guestRepository, giftContributionRepository, emailGateway, notificationLogRepository } = repositories();
  return new SendGiftSuggestionRemindersUseCase(
    guestRepository,
    giftContributionRepository,
    emailGateway,
    notificationLogRepository
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.ts src/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat(notifications): add SendGiftSuggestionRemindersUseCase"
```

---

## Task 9: `SendWeddingDayNotificationUseCase`

**Files:**
- Create: `src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.ts`
- Create: `src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `GuestRepository.findAll` (existing), `EmailGateway`, `NotificationLogRepository` (Task 1), `weddingDayEmail` (Task 4), `daysBetweenBrasiliaDates` (Task 3).
- Produces: `SendWeddingDayNotificationUseCase.execute(weddingDate, today?): Promise<number>`, `createSendWeddingDayNotificationUseCase()` — consumed by Task 10.

- [ ] **Step 1: Write the failing tests**

Create `src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { SendWeddingDayNotificationUseCase } from "@/application/use-cases/notifications/SendWeddingDayNotificationUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Guest } from "@/domain/entities/Guest";

describe("SendWeddingDayNotificationUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendWeddingDayNotificationUseCase;

  const weddingDate = new Date("2027-06-19T16:00:00-03:00");

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendWeddingDayNotificationUseCase(guestRepository, emailGateway, notificationLogRepository);
  });

  it("sends the wedding-day email to confirmed guests with an email on the wedding day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails[0].subject).toBe("Hoje é o grande dia! 💍");
  });

  it("does not send on a day other than the wedding day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-18T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(0);
  });

  it("does not send to a guest who hasn't confirmed attendance", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice on the same day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    await useCase.execute(weddingDate, today);
    const secondRunSentCount = await useCase.execute(weddingDate, today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.ts`:

```ts
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates } from "@/shared/utils/brasiliaCalendarDays";
import { weddingDayEmail } from "@/infrastructure/email/templates";

export class SendWeddingDayNotificationUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(weddingDate: Date, today: Date = new Date()): Promise<number> {
    if (daysBetweenBrasiliaDates(today, weddingDate) !== 0) {
      return 0;
    }

    const guests = await this.guestRepository.findAll();
    const confirmedGuestsWithEmail = guests.filter(
      (guest) => guest.attendanceStatus === "confirmed" && guest.email
    );

    let sentCount = 0;

    for (const guest of confirmedGuestsWithEmail) {
      const alreadySent = await this.notificationLogRepository.hasBeenSent("wedding_day", "guest", guest.id!);
      if (alreadySent) {
        continue;
      }

      const { subject, html } = weddingDayEmail({ guestName: guest.fullName });

      await this.emailGateway.sendEmail({ to: guest.email!, subject, html });
      await this.notificationLogRepository.markSent("wedding_day", "guest", guest.id!);
      sentCount++;
    }

    return sentCount;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Wire the composition root**

Edit `src/infrastructure/composition.ts`. Add this import after `SendGiftSuggestionRemindersUseCase`:

```ts
import { SendWeddingDayNotificationUseCase } from "@/application/use-cases/notifications/SendWeddingDayNotificationUseCase";
```

Add this factory after `createSendGiftSuggestionRemindersUseCase`:

```ts
export function createSendWeddingDayNotificationUseCase(): SendWeddingDayNotificationUseCase {
  const { guestRepository, emailGateway, notificationLogRepository } = repositories();
  return new SendWeddingDayNotificationUseCase(guestRepository, emailGateway, notificationLogRepository);
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.ts src/application/use-cases/notifications/SendWeddingDayNotificationUseCase.test.ts src/infrastructure/composition.ts
git commit -m "feat(notifications): add SendWeddingDayNotificationUseCase"
```

---

## Task 10: Cron route + wiring the confirmation email into the reservation flow

**Files:**
- Create: `src/app/api/cron/daily-notifications/route.ts`
- Create: `src/app/api/cron/daily-notifications/route.test.ts`
- Create: `vercel.json`
- Modify: `src/app/presentes/actions.ts`

**Interfaces:**
- Consumes: `createSendReservationRemindersUseCase`, `createSendGiftSuggestionRemindersUseCase`, `createSendWeddingDayNotificationUseCase`, `createSendReservationConfirmationUseCase`, `getSiteContentOrDefault` (all from composition), `getEnv` (existing).

- [ ] **Step 1: Write the failing test for the cron route**

Create `src/app/api/cron/daily-notifications/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/infrastructure/composition", () => ({
  createSendReservationRemindersUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  createSendGiftSuggestionRemindersUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  createSendWeddingDayNotificationUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  getSiteContentOrDefault: vi.fn().mockResolvedValue({ weddingDateIso: "2027-06-19T16:00:00-03:00" }),
}));

describe("GET /api/cron/daily-notifications", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects requests without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/daily-notifications/route");
    const request = new NextRequest("http://localhost/api/cron/daily-notifications", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects requests with no Authorization header at all", async () => {
    const { GET } = await import("@/app/api/cron/daily-notifications/route");
    const request = new NextRequest("http://localhost/api/cron/daily-notifications");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/cron/daily-notifications/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Route Handler**

Create `src/app/api/cron/daily-notifications/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/infrastructure/config/env";
import {
  createSendGiftSuggestionRemindersUseCase,
  createSendReservationRemindersUseCase,
  createSendWeddingDayNotificationUseCase,
  getSiteContentOrDefault,
} from "@/infrastructure/composition";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteContentOrDefault("settings");
  const weddingDate = new Date(settings.weddingDateIso);
  const giftsUrl = `${getEnv().NEXT_PUBLIC_SITE_URL}/presentes`;

  const results = { reservationReminders: 0, giftSuggestions: 0, weddingDay: 0 };

  try {
    results.reservationReminders = await createSendReservationRemindersUseCase().execute();
  } catch (error) {
    console.error("Failed to send reservation reminders", error);
  }

  try {
    results.giftSuggestions = await createSendGiftSuggestionRemindersUseCase().execute(weddingDate, giftsUrl);
  } catch (error) {
    console.error("Failed to send gift suggestion reminders", error);
  }

  try {
    results.weddingDay = await createSendWeddingDayNotificationUseCase().execute(weddingDate);
  } catch (error) {
    console.error("Failed to send wedding day notification", error);
  }

  return NextResponse.json({ received: true, ...results });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/cron/daily-notifications/route.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Add the Vercel Cron configuration**

Create `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/daily-notifications", "schedule": "30 11 * * *" }]
}
```

- [ ] **Step 6: Wire the confirmation email into `reserveGiftForLaterAction`**

Edit `src/app/presentes/actions.ts`. Replace the import block:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createGiftContributionUseCase,
  createListGiftsUseCase,
  createSendReservationConfirmationUseCase,
  getSiteContentOrDefault,
} from "@/infrastructure/composition";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";
import {
  canReserveForLater,
  latestReservableDate,
  parseExpectedPaymentDateEndOfDay,
} from "@/shared/utils/giftReservationWindow";
```

Replace the body of `reserveGiftForLaterAction`'s success path — find this block:

```ts
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
```

and replace it with:

```ts
  try {
    const result = await createGiftContributionUseCase().execute({
      giftId: parsed.data.giftId,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      expectedPaymentDate,
    });

    revalidatePath("/presentes");

    try {
      const gifts = await createListGiftsUseCase().execute();
      const gift = gifts.find((candidate) => candidate.id === parsed.data.giftId);
      if (gift) {
        await createSendReservationConfirmationUseCase().execute({
          contributionId: result.contribution.id!,
          guestName: parsed.data.guestName,
          guestEmail: parsed.data.guestEmail,
          giftName: gift.name,
          expectedPaymentDate,
          checkoutUrl: result.checkoutUrl,
        });
      }
    } catch (emailError) {
      console.error("Failed to send reservation confirmation email", emailError);
    }

    return {
      status: "success",
      checkoutUrl: result.checkoutUrl,
      guestName: parsed.data.guestName,
      expectedPaymentDate: parsed.data.expectedPaymentDate,
    };
  } catch (error) {
```

- [ ] **Step 7: Run the existing `presentes/actions` consumers to confirm nothing broke**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: PASS (5/5) — `reserveGiftForLaterAction` is mocked in this test, so the new internal email call is not exercised there, but this confirms the action module still compiles/exports correctly.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/cron/daily-notifications/route.ts src/app/api/cron/daily-notifications/route.test.ts vercel.json src/app/presentes/actions.ts
git commit -m "feat(notifications): add daily cron route and wire the reservation confirmation email"
```

---

## Task 11: Final verification

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
Expected: build succeeds, `/api/cron/daily-notifications` appears in the route list.

- [ ] **Step 5: Set the `CRON_SECRET` environment variable**

This is a new required env var not covered by `isBackendConfigured()`/`getEnv()`'s existing schema (it's read directly via `process.env.CRON_SECRET` in the route handler, deliberately not added to the shared `Env` schema — see Task 10 Step 3). Generate a random value (e.g. `openssl rand -hex 32` or equivalent) and set it in the Vercel project's environment variables for Production (and Preview, if you want cron-adjacent testing there too). Vercel automatically sends this same value as the `Authorization: Bearer` header when it invokes the configured cron job — no separate configuration needed on the Vercel side beyond `vercel.json`'s `crons` entry.

- [ ] **Step 6: Verify Resend domain configuration**

In the Resend dashboard, verify the `sjcasamento.site` domain (add the SPF/DKIM DNS records Resend provides) so `lembretes@sjcasamento.site` can send without landing in spam. This is a manual step outside this codebase — note it as done or pending.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`, log into `/admin`:
- Go to `/admin/integracoes` and confirm the new "Resend (e-mails)" card renders, accepts a key on first save (no secret key required), and requires the secret key to change it afterward.
- On `/presentes`, submit "Reservar para depois" with a real email address you control. Confirm the confirmation email arrives (once Resend is configured) — or, if Resend isn't configured yet, confirm the reservation still succeeds (the email failure is caught and logged, never blocking).
- Manually invoke the cron endpoint locally: `curl -H "Authorization: Bearer <your CRON_SECRET>" http://localhost:3000/api/cron/daily-notifications` and confirm it returns `{"received":true,"reservationReminders":0,"giftSuggestions":0,"weddingDay":0}` (or non-zero counts, if any real data happens to match a threshold that day).

Note: as in previous phases, a full end-to-end walkthrough (real Resend send, real cron invocation from Vercel) may require credentials or a deployed environment this session doesn't have — note any step skipped for that reason rather than assuming it passed.

- [ ] **Step 8: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
