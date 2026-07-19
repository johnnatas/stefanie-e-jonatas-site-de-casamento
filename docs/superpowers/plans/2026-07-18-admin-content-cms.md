# Admin Content CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the couple edit specific text fields and upload photos for a
fixed set of page sections (wedding date/location, Home Hero, Save the
Date milestone photos, Home topics carousel, and the 3 Dicas e Instruções
pages) through the admin panel, with no code changes required.

**Architecture:** One generic `site_content` table (`slug` + `content
jsonb`), one Domain entity, one repository, two reusable use cases
(`GetSiteContentUseCase`/`UpdateSiteContentUseCase`), and one Zod schema
per slug that is simultaneously the validation rule, the admin form's
field list, and (via `.default(...)`) the fallback content shown when a
row doesn't exist yet. Photos go to a new public Supabase Storage bucket
(`site-content`); uploads always go through the existing service-role
Supabase client from Server Actions, matching how Gift/Guest writes work
today. Public-facing pages become `async` Server Components that fetch
content and pass it as props into the existing (mostly `"use client"`)
presentational components.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Tailwind CSS v4,
Supabase (Postgres 17 + Storage), Zod, Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` before writing App Router / Server
  Action code (per `AGENTS.md`).
- Follow the existing Clean Architecture layering exactly:
  `src/domain` → `src/application` → `src/infrastructure` →
  `src/app`/`src/components`. Server Actions and Server Components only
  ever call into `src/infrastructure/composition.ts` — never construct a
  repository or Supabase client directly.
- **`"use server"` files may only export `async function`s** (Next.js
  16 rejects any other export, including `const`/`interface` object
  values — `type`/`interface` exports are fine, they're erased at
  compile time). Any `initial*ActionState` constant a form needs must
  live in the consuming Client Component file, not the action file —
  this is an established, previously-hit bug in this codebase.
- Every new Server Action follows the existing `upsertGiftAction`
  pattern exactly: parse `FormData` with a Zod schema via `safeParse`,
  return `{ status: "error", message: "..." }` on failure, call the
  matching `composition.ts` factory, `redirect(...)` on success.
- **When committing, always `git add` an explicit file list — never
  `git add -A`.**
- Run `npm run test` and `npm run lint` before every commit.
- All new admin-facing text is Portuguese, matching the rest of the
  admin panel.
- The `site_content` table's Row Level Security follows the exact
  convention already used by `guests`/`gifts`/`gift_contributions`/
  `admin_users`: RLS enabled, **no policies granted** to `anon`/
  `authenticated` — every read and write goes through the service-role
  client from trusted server code, so no policy is needed. The
  `site-content` Storage bucket is created as **public** (so uploaded
  photos load without a signed URL) with writes only ever performed by
  the same service-role client.
- **Migration application is a live-infrastructure action, not something
  a task's implementer applies themselves.** Task 4 below creates the
  migration *file* only. Applying it to the real Supabase project (via
  the Supabase MCP `apply_migration` tool) is a manual step the plan's
  controller performs directly after Task 4's file is written and
  reviewed — flag this explicitly when Task 4 completes.

---

## Task 1: Domain layer — `SiteContentSection` entity + repository interface

**Files:**
- Create: `src/domain/entities/SiteContentSection.ts`
- Create: `src/domain/entities/SiteContentSection.test.ts`
- Create: `src/domain/repositories/SiteContentRepository.ts`
- Modify: `src/domain/errors/DomainError.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SiteContentSection.create(props): SiteContentSection` with
  `readonly slug: string`, `readonly content: Record<string, unknown>`,
  `readonly updatedAt: Date`. `SiteContentRepository` interface with
  `findBySlug(slug: string): Promise<SiteContentSection | null>` and
  `upsert(slug: string, content: Record<string, unknown>):
  Promise<SiteContentSection>`.

- [ ] **Step 1: Add the domain error**

In `src/domain/errors/DomainError.ts`, add one line after the existing
error class exports:

```ts
export class InvalidSiteContentError extends DomainError {}
```

- [ ] **Step 2: Write the failing entity tests**

Create `src/domain/entities/SiteContentSection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { InvalidSiteContentError } from "@/domain/errors/DomainError";

describe("SiteContentSection", () => {
  it("creates a section with the given slug and content", () => {
    const section = SiteContentSection.create({ slug: "settings", content: { a: 1 } });

    expect(section.slug).toBe("settings");
    expect(section.content).toEqual({ a: 1 });
    expect(section.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults updatedAt to now when not provided", () => {
    const before = new Date();
    const section = SiteContentSection.create({ slug: "settings", content: {} });
    const after = new Date();

    expect(section.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(section.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("rejects an empty slug", () => {
    expect(() => SiteContentSection.create({ slug: "", content: {} })).toThrow(InvalidSiteContentError);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/domain/entities/SiteContentSection.test.ts`
Expected: FAIL — `Cannot find module '@/domain/entities/SiteContentSection'`

- [ ] **Step 4: Implement the entity**

Create `src/domain/entities/SiteContentSection.ts`:

```ts
import { InvalidSiteContentError } from "@/domain/errors/DomainError";

export interface SiteContentSectionProps {
  slug: string;
  content: Record<string, unknown>;
  updatedAt?: Date;
}

export class SiteContentSection {
  readonly slug: string;
  readonly content: Record<string, unknown>;
  readonly updatedAt: Date;

  private constructor(props: SiteContentSectionProps) {
    this.slug = props.slug;
    this.content = props.content;
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: SiteContentSectionProps): SiteContentSection {
    if (!props.slug || props.slug.trim().length === 0) {
      throw new InvalidSiteContentError("Site content slug is required.");
    }

    return new SiteContentSection(props);
  }
}
```

- [ ] **Step 5: Create the repository interface**

Create `src/domain/repositories/SiteContentRepository.ts`:

```ts
import { SiteContentSection } from "@/domain/entities/SiteContentSection";

export interface SiteContentRepository {
  findBySlug(slug: string): Promise<SiteContentSection | null>;
  upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection>;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/domain/entities/SiteContentSection.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/domain/entities/SiteContentSection.ts src/domain/entities/SiteContentSection.test.ts src/domain/repositories/SiteContentRepository.ts src/domain/errors/DomainError.ts
git commit -m "feat(content): add SiteContentSection entity and repository interface"
```

---

## Task 2: Application layer — per-slug content schemas

**Files:**
- Create: `src/application/content/schemas.ts`
- Create: `src/application/content/schemas.test.ts`
- Create: `src/application/content/actionState.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SITE_CONTENT_SLUGS: readonly string[]`, `SiteContentSlug`
  union type, `SITE_CONTENT_SCHEMAS` (an object literal, one Zod schema
  per slug, `satisfies Record<SiteContentSlug, z.ZodTypeAny>`), and the
  named schema/type exports below — every later task imports from this
  file. `SiteContentActionState` (`{ status: "idle" | "error"; message?:
  string }`) — every Server Action in this plan uses this shared type.

- [ ] **Step 1: Write the shared action-state type**

Create `src/application/content/actionState.ts`:

```ts
export interface SiteContentActionState {
  status: "idle" | "error";
  message?: string;
}
```

- [ ] **Step 2: Write the failing schema tests**

Create `src/application/content/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  settingsContentSchema,
  homeHeroContentSchema,
  homeMilestonePhotosContentSchema,
  homeTopicsContentSchema,
  tipsCerimoniaContentSchema,
  SITE_CONTENT_SLUGS,
  SITE_CONTENT_SCHEMAS,
} from "@/application/content/schemas";

describe("settingsContentSchema", () => {
  it("applies defaults matching today's hardcoded copy when parsing an empty object", () => {
    const result = settingsContentSchema.parse({});

    expect(result).toEqual({
      weddingDateIso: "2027-06-19T16:00:00-03:00",
      weddingLocationLabel: "Minas Gerais, Brasil",
    });
  });

  it("rejects an empty wedding date", () => {
    const result = settingsContentSchema.safeParse({ weddingDateIso: "", weddingLocationLabel: "x" });
    expect(result.success).toBe(false);
  });
});

describe("homeHeroContentSchema", () => {
  it("defaults to zero photos (fallback to 3 placeholder slides is a rendering concern)", () => {
    const result = homeHeroContentSchema.parse({});
    expect(result.photos).toEqual([]);
    expect(result.eyebrow).toBe("Estamos nos casando");
    expect(result.tagline).toBe("nas ditas linhas em que nos encontramos");
  });

  it("rejects more than 5 photos", () => {
    const result = homeHeroContentSchema.safeParse({ photos: ["a", "b", "c", "d", "e", "f"] });
    expect(result.success).toBe(false);
  });

  it("accepts 1 to 5 photos", () => {
    const result = homeHeroContentSchema.safeParse({ photos: ["a", "b"] });
    expect(result.success).toBe(true);
  });
});

describe("homeMilestonePhotosContentSchema", () => {
  it("defaults all three milestone photos to null", () => {
    const result = homeMilestonePhotosContentSchema.parse({});
    expect(result).toEqual({ beginning: null, proposal: null, wedding: null });
  });
});

describe("homeTopicsContentSchema", () => {
  it("defaults all 5 topics to today's hardcoded copy with null photos", () => {
    const result = homeTopicsContentSchema.parse({});

    expect(result.cerimonia).toEqual({
      title: "Cerimônia",
      description: "Horário, local e tudo sobre a celebração.",
      photo: null,
    });
    expect(result.presentes.title).toBe("Lista de presentes");
    expect(result.traje.title).toBe("Traje");
    expect(result.hospedagem.title).toBe("Hospedagem");
    expect(result.nossaHistoria.title).toBe("Nossa história");
  });

  it("rejects a topic missing its required title", () => {
    const result = homeTopicsContentSchema.safeParse({
      cerimonia: { description: "x", photo: null },
    });
    expect(result.success).toBe(false);
  });
});

describe("tipsCerimoniaContentSchema", () => {
  it("defaults to today's hardcoded copy", () => {
    const result = tipsCerimoniaContentSchema.parse({});

    expect(result.eyebrow).toBe("O grande dia");
    expect(result.title).toBe("Local e horário");
    expect(result.body).toContain("**16h**");
    expect(result.photo).toBeNull();
  });
});

describe("SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS", () => {
  it("has one schema per declared slug", () => {
    for (const slug of SITE_CONTENT_SLUGS) {
      expect(SITE_CONTENT_SCHEMAS[slug]).toBeDefined();
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: FAIL — `Cannot find module '@/application/content/schemas'`

- [ ] **Step 4: Implement the schemas**

Create `src/application/content/schemas.ts`:

```ts
import { z } from "zod";

export const settingsContentSchema = z.object({
  weddingDateIso: z.string().min(1).default("2027-06-19T16:00:00-03:00"),
  weddingLocationLabel: z.string().min(1).default("Minas Gerais, Brasil"),
});
export type SettingsContent = z.output<typeof settingsContentSchema>;

export const homeHeroContentSchema = z.object({
  eyebrow: z.string().min(1).default("Estamos nos casando"),
  tagline: z.string().min(1).default("nas ditas linhas em que nos encontramos"),
  photos: z.array(z.string().min(1)).max(5).default([]),
});
export type HomeHeroContent = z.output<typeof homeHeroContentSchema>;

export const homeMilestonePhotosContentSchema = z.object({
  beginning: z.string().min(1).nullable().default(null),
  proposal: z.string().min(1).nullable().default(null),
  wedding: z.string().min(1).nullable().default(null),
});
export type HomeMilestonePhotosContent = z.output<typeof homeMilestonePhotosContentSchema>;

const topicEntrySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  photo: z.string().min(1).nullable().default(null),
});
export type TopicEntry = z.output<typeof topicEntrySchema>;

export const homeTopicsContentSchema = z.object({
  cerimonia: topicEntrySchema.default({
    title: "Cerimônia",
    description: "Horário, local e tudo sobre a celebração.",
    photo: null,
  }),
  presentes: topicEntrySchema.default({
    title: "Lista de presentes",
    description: "Ajude a construir o começo da nossa nova casa.",
    photo: null,
  }),
  traje: topicEntrySchema.default({
    title: "Traje",
    description: "Código de vestimenta para o grande dia.",
    photo: null,
  }),
  hospedagem: topicEntrySchema.default({
    title: "Hospedagem",
    description: "Sugestões de hotéis e pousadas próximas.",
    photo: null,
  }),
  nossaHistoria: topicEntrySchema.default({
    title: "Nossa história",
    description: "Como tudo começou até chegarmos aqui.",
    photo: null,
  }),
});
export type HomeTopicsContent = z.output<typeof homeTopicsContentSchema>;

export const tipsCerimoniaContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("O grande dia"),
  title: z.string().min(1).default("Local e horário"),
  body: z
    .string()
    .min(1)
    .default(
      "A cerimônia acontecerá às **16h**, seguida da recepção no mesmo local. Chegue com 30 minutos de antecedência para aproveitar cada instante.\n\n*Endereço a confirmar.*"
    ),
  photo: z.string().min(1).nullable().default(null),
});
export type TipsContent = z.output<typeof tipsCerimoniaContentSchema>;

export const tipsTrajeContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("Como se vestir"),
  title: z.string().min(1).default("Traje esporte fino"),
  body: z
    .string()
    .min(1)
    .default(
      "Pedimos que evitem branco e tons muito claros, para não competir com o vestido da noiva. Tons terrosos, pastéis e clássicos são muito bem-vindos.\n\nA festa acontece em ambiente misto (aberto e fechado) — leve um casaco leve para a noite."
    ),
  photo: z.string().min(1).nullable().default(null),
});

export const tipsHospedagemContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("Fique por perto"),
  title: z.string().min(1).default("Onde se hospedar"),
  body: z
    .string()
    .min(1)
    .default(
      "Separamos algumas sugestões de hotéis e pousadas próximas ao local da cerimônia, com conforto para todos os orçamentos.\n\n*Lista de hospedagens a confirmar.*"
    ),
  photo: z.string().min(1).nullable().default(null),
});

export const SITE_CONTENT_SLUGS = [
  "settings",
  "home-hero",
  "home-milestone-photos",
  "home-topics",
  "tips-cerimonia",
  "tips-traje",
  "tips-hospedagem",
] as const;
export type SiteContentSlug = (typeof SITE_CONTENT_SLUGS)[number];

export const SITE_CONTENT_SCHEMAS = {
  settings: settingsContentSchema,
  "home-hero": homeHeroContentSchema,
  "home-milestone-photos": homeMilestonePhotosContentSchema,
  "home-topics": homeTopicsContentSchema,
  "tips-cerimonia": tipsCerimoniaContentSchema,
  "tips-traje": tipsTrajeContentSchema,
  "tips-hospedagem": tipsHospedagemContentSchema,
} satisfies Record<SiteContentSlug, z.ZodTypeAny>;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add src/application/content/schemas.ts src/application/content/schemas.test.ts src/application/content/actionState.ts
git commit -m "feat(content): add per-slug Zod content schemas with hardcoded-copy defaults"
```

---

## Task 3: Application layer — Get/Update use cases + in-memory test double

**Files:**
- Create: `src/application/use-cases/content/GetSiteContentUseCase.ts`
- Create: `src/application/use-cases/content/GetSiteContentUseCase.test.ts`
- Create: `src/application/use-cases/content/UpdateSiteContentUseCase.ts`
- Create: `src/application/use-cases/content/UpdateSiteContentUseCase.test.ts`
- Create: `src/application/testing/InMemorySiteContentRepository.ts`

**Interfaces:**
- Consumes: `SiteContentRepository`, `SiteContentSection` (Task 1);
  `SITE_CONTENT_SCHEMAS`, `SiteContentSlug` (Task 2).
- Produces: `GetSiteContentUseCase.execute<Slug extends
  SiteContentSlug>(slug: Slug): Promise<z.output<typeof
  SITE_CONTENT_SCHEMAS[Slug]>>` — always returns validated, defaulted
  content, even when no row exists. `UpdateSiteContentUseCase.execute
  <Slug extends SiteContentSlug>(slug: Slug, content: z.input<typeof
  SITE_CONTENT_SCHEMAS[Slug]>): Promise<void>`.

- [ ] **Step 1: Write the in-memory repository test double**

Create `src/application/testing/InMemorySiteContentRepository.ts`:

```ts
import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";

export class InMemorySiteContentRepository implements SiteContentRepository {
  private sections = new Map<string, SiteContentSection>();

  async findBySlug(slug: string): Promise<SiteContentSection | null> {
    return this.sections.get(slug) ?? null;
  }

  async upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection> {
    const section = SiteContentSection.create({ slug, content, updatedAt: new Date() });
    this.sections.set(slug, section);
    return section;
  }
}
```

- [ ] **Step 2: Write the failing use case tests**

Create `src/application/use-cases/content/GetSiteContentUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { InMemorySiteContentRepository } from "@/application/testing/InMemorySiteContentRepository";

describe("GetSiteContentUseCase", () => {
  it("returns the schema's defaults when no row exists for the slug", async () => {
    const useCase = new GetSiteContentUseCase(new InMemorySiteContentRepository());

    const result = await useCase.execute("settings");

    expect(result).toEqual({
      weddingDateIso: "2027-06-19T16:00:00-03:00",
      weddingLocationLabel: "Minas Gerais, Brasil",
    });
  });

  it("returns the stored content when a row exists", async () => {
    const repository = new InMemorySiteContentRepository();
    await repository.upsert("settings", {
      weddingDateIso: "2028-01-01T12:00:00-03:00",
      weddingLocationLabel: "São Paulo, Brasil",
    });
    const useCase = new GetSiteContentUseCase(repository);

    const result = await useCase.execute("settings");

    expect(result.weddingDateIso).toBe("2028-01-01T12:00:00-03:00");
    expect(result.weddingLocationLabel).toBe("São Paulo, Brasil");
  });
});
```

Create `src/application/use-cases/content/UpdateSiteContentUseCase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { UpdateSiteContentUseCase } from "@/application/use-cases/content/UpdateSiteContentUseCase";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { InMemorySiteContentRepository } from "@/application/testing/InMemorySiteContentRepository";

describe("UpdateSiteContentUseCase", () => {
  it("persists content that can be read back through GetSiteContentUseCase", async () => {
    const repository = new InMemorySiteContentRepository();
    const updateUseCase = new UpdateSiteContentUseCase(repository);
    const getUseCase = new GetSiteContentUseCase(repository);

    await updateUseCase.execute("settings", {
      weddingDateIso: "2028-01-01T12:00:00-03:00",
      weddingLocationLabel: "São Paulo, Brasil",
    });
    const result = await getUseCase.execute("settings");

    expect(result.weddingDateIso).toBe("2028-01-01T12:00:00-03:00");
    expect(result.weddingLocationLabel).toBe("São Paulo, Brasil");
  });

  it("rejects content that fails the slug's schema", async () => {
    const updateUseCase = new UpdateSiteContentUseCase(new InMemorySiteContentRepository());

    await expect(
      updateUseCase.execute("settings", { weddingDateIso: "", weddingLocationLabel: "" })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/application/use-cases/content/`
Expected: FAIL — modules don't exist yet

- [ ] **Step 4: Implement the use cases**

Create `src/application/use-cases/content/GetSiteContentUseCase.ts`:

```ts
import { z } from "zod";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";

export class GetSiteContentUseCase {
  constructor(private readonly repository: SiteContentRepository) {}

  async execute<Slug extends SiteContentSlug>(
    slug: Slug
  ): Promise<z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>> {
    const section = await this.repository.findBySlug(slug);
    const schema = SITE_CONTENT_SCHEMAS[slug];
    return schema.parse(section?.content ?? {}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }
}
```

Create `src/application/use-cases/content/UpdateSiteContentUseCase.ts`:

```ts
import { z } from "zod";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";

export class UpdateSiteContentUseCase {
  constructor(private readonly repository: SiteContentRepository) {}

  async execute<Slug extends SiteContentSlug>(
    slug: Slug,
    content: z.input<(typeof SITE_CONTENT_SCHEMAS)[Slug]>
  ): Promise<void> {
    const schema = SITE_CONTENT_SCHEMAS[slug];
    const parsed = schema.parse(content);
    await this.repository.upsert(slug, parsed as Record<string, unknown>);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/application/use-cases/content/`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/content/GetSiteContentUseCase.ts src/application/use-cases/content/GetSiteContentUseCase.test.ts src/application/use-cases/content/UpdateSiteContentUseCase.ts src/application/use-cases/content/UpdateSiteContentUseCase.test.ts src/application/testing/InMemorySiteContentRepository.ts
git commit -m "feat(content): add GetSiteContentUseCase and UpdateSiteContentUseCase"
```

---

## Task 4: Migration file + Supabase repository + composition wiring

**Files:**
- Create: `supabase/migrations/0003_site_content.sql`
- Create: `src/infrastructure/supabase/SupabaseSiteContentRepository.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `SiteContentRepository`, `SiteContentSection` (Task 1);
  `SITE_CONTENT_SCHEMAS`, `SiteContentSlug` (Task 2);
  `GetSiteContentUseCase`, `UpdateSiteContentUseCase` (Task 3);
  `getSupabaseServiceRoleClient` (existing,
  `src/infrastructure/supabase/serviceRoleClient.ts`); `isBackendConfigured`
  (existing, `src/infrastructure/config/env.ts`).
- Produces: `createGetSiteContentUseCase(): GetSiteContentUseCase`,
  `createUpdateSiteContentUseCase(): UpdateSiteContentUseCase`, and
  `getSiteContentOrDefault<Slug extends SiteContentSlug>(slug: Slug):
  Promise<z.output<typeof SITE_CONTENT_SCHEMAS[Slug]>>` — the function
  every Server Component in this plan calls to fetch content, falling
  back to the schema's defaults when the backend isn't configured or the
  fetch fails, so pages never break.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0003_site_content.sql`:

```sql
-- Generic content-block store for admin-editable page/section text and
-- photos (wedding date, Home Hero, Save the Date milestone photos, Home
-- topics carousel, and the 3 Dicas e Instruções pages).

create table if not exists site_content (
  slug text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table site_content enable row level security;

-- Same model as guests/gifts/gift_contributions/admin_users: the
-- application only reads/writes this table from trusted server code
-- using the service-role key (which bypasses RLS), so no policies are
-- granted to the anon/authenticated roles here.

insert into storage.buckets (id, name, public)
values ('site-content', 'site-content', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Implement the Supabase repository**

Create `src/infrastructure/supabase/SupabaseSiteContentRepository.ts`:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";

interface SiteContentRow {
  slug: string;
  content: Record<string, unknown>;
  updated_at: string;
}

function toEntity(row: SiteContentRow): SiteContentSection {
  return SiteContentSection.create({
    slug: row.slug,
    content: row.content,
    updatedAt: new Date(row.updated_at),
  });
}

export class SupabaseSiteContentRepository implements SiteContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySlug(slug: string): Promise<SiteContentSection | null> {
    const { data, error } = await this.client.from("site_content").select().eq("slug", slug).maybeSingle();

    if (error) {
      throw new Error(`Failed to find site content "${slug}": ${error.message}`);
    }

    return data ? toEntity(data as SiteContentRow) : null;
  }

  async upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection> {
    const { data, error } = await this.client
      .from("site_content")
      .upsert({ slug, content }, { onConflict: "slug" })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save site content "${slug}": ${error.message}`);
    }

    return toEntity(data as SiteContentRow);
  }
}
```

- [ ] **Step 3: Wire composition.ts**

In `src/infrastructure/composition.ts`, add these imports near the top
(after the existing repository imports):

```ts
import { SupabaseSiteContentRepository } from "@/infrastructure/supabase/SupabaseSiteContentRepository";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { UpdateSiteContentUseCase } from "@/application/use-cases/content/UpdateSiteContentUseCase";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";
import { z } from "zod";
```

In the `repositories()` function, add `siteContentRepository` to the
returned object:

```ts
function repositories() {
  const client = getSupabaseServiceRoleClient();
  return {
    guestRepository: new SupabaseGuestRepository(client),
    giftRepository: new SupabaseGiftRepository(client),
    giftContributionRepository: new SupabaseGiftContributionRepository(client),
    siteContentRepository: new SupabaseSiteContentRepository(client),
    paymentGateway: new MercadoPagoGateway(),
  };
}
```

At the end of the file, add:

```ts
export function createGetSiteContentUseCase(): GetSiteContentUseCase {
  return new GetSiteContentUseCase(repositories().siteContentRepository);
}

export function createUpdateSiteContentUseCase(): UpdateSiteContentUseCase {
  return new UpdateSiteContentUseCase(repositories().siteContentRepository);
}

/**
 * Fetches content for a slug, falling back to the slug's schema defaults
 * when Supabase isn't configured or the fetch fails — public pages must
 * never break because content hasn't been saved yet.
 */
export async function getSiteContentOrDefault<Slug extends SiteContentSlug>(
  slug: Slug
): Promise<z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>> {
  const schema = SITE_CONTENT_SCHEMAS[slug];

  if (!isBackendConfigured()) {
    return schema.parse({}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }

  try {
    return await createGetSiteContentUseCase().execute(slug);
  } catch {
    return schema.parse({}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }
}
```

- [ ] **Step 4: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all pass (this task adds no new tests of its own — Task 3's
tests already cover the use cases against the in-memory repository; this
task's correctness is verified by the build's type-checking and by
Task 14's end-to-end verification once pages actually call
`getSiteContentOrDefault`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_site_content.sql src/infrastructure/supabase/SupabaseSiteContentRepository.ts src/infrastructure/composition.ts
git commit -m "feat(content): add site_content migration, Supabase repository, and composition wiring"
```

- [ ] **Step 6: Flag the migration for manual application**

This step is NOT performed by the task's implementer. Report back to the
plan's controller: "Migration file `supabase/migrations/0003_site_content.sql`
is ready — apply it to the live Supabase project via the Supabase MCP
`apply_migration` tool before Task 12/13 are tested end-to-end against
real data (Tasks 1-11 and their tests do not require the live table)."

---

## Task 5: Photo upload infrastructure

**Files:**
- Create: `src/infrastructure/supabase/uploadSiteContentPhoto.ts`
- Create: `src/infrastructure/supabase/resolvePhotoField.ts`
- Create: `src/infrastructure/supabase/resolvePhotoField.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `getSupabaseServiceRoleClient` (existing).
- Produces: `uploadSiteContentPhoto(slug: string, field: string, file:
  File): Promise<string>` (throws `InvalidPhotoUploadError` for a
  wrong-type or oversized file; returns the object's public URL on
  success). `resolvePhotoField(slug: string, field: string, formData:
  FormData, currentUrl: string | null, fileFieldName: string,
  removeFieldName: string): Promise<string | null>` — the shared
  "upload new file, or honor the remove checkbox, or keep the existing
  URL" logic every photo-bearing Server Action in this plan uses.

- [ ] **Step 1: Implement the upload helper**

Create `src/infrastructure/supabase/uploadSiteContentPhoto.ts`:

```ts
import { randomUUID } from "crypto";
import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRoleClient";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class InvalidPhotoUploadError extends Error {}

export async function uploadSiteContentPhoto(slug: string, field: string, file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new InvalidPhotoUploadError(`Tipo de arquivo não suportado: ${file.type || "desconhecido"}.`);
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new InvalidPhotoUploadError("A imagem deve ter no máximo 5 MB.");
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const path = `${slug}/${field}-${randomUUID()}.${extension}`;
  const client = getSupabaseServiceRoleClient();

  const { error } = await client.storage.from("site-content").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  const { data } = client.storage.from("site-content").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Write the failing `resolvePhotoField` tests**

Create `src/infrastructure/supabase/resolvePhotoField.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolvePhotoField } from "@/infrastructure/supabase/resolvePhotoField";
import * as uploadModule from "@/infrastructure/supabase/uploadSiteContentPhoto";

describe("resolvePhotoField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads and returns a new URL when a file is provided", async () => {
    vi.spyOn(uploadModule, "uploadSiteContentPhoto").mockResolvedValue("https://example.com/new.jpg");
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("photoFile", file);

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBe("https://example.com/new.jpg");
  });

  it("returns null when the remove checkbox is checked and no file is provided", async () => {
    const formData = new FormData();
    formData.set("photoRemove", "on");

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBeNull();
  });

  it("keeps the current URL when no file is provided and remove isn't checked", async () => {
    const formData = new FormData();

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBe("https://example.com/old.jpg");
  });

  it("returns null when there was no current URL and nothing is provided", async () => {
    const formData = new FormData();

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, null, "photoFile", "photoRemove");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/infrastructure/supabase/resolvePhotoField.test.ts`
Expected: FAIL — `Cannot find module '@/infrastructure/supabase/resolvePhotoField'`

- [ ] **Step 4: Implement `resolvePhotoField`**

Create `src/infrastructure/supabase/resolvePhotoField.ts`:

```ts
import { uploadSiteContentPhoto } from "@/infrastructure/supabase/uploadSiteContentPhoto";

export async function resolvePhotoField(
  slug: string,
  field: string,
  formData: FormData,
  currentUrl: string | null,
  fileFieldName: string,
  removeFieldName: string
): Promise<string | null> {
  const file = formData.get(fileFieldName);

  if (file instanceof File && file.size > 0) {
    return uploadSiteContentPhoto(slug, field, file);
  }

  if (formData.get(removeFieldName) === "on") {
    return null;
  }

  return currentUrl;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/infrastructure/supabase/resolvePhotoField.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Re-export the upload helper from composition.ts**

In `src/infrastructure/composition.ts`, add near the other imports:

```ts
export { uploadSiteContentPhoto, InvalidPhotoUploadError } from "@/infrastructure/supabase/uploadSiteContentPhoto";
export { resolvePhotoField } from "@/infrastructure/supabase/resolvePhotoField";
```

(Server Actions in later tasks import `resolvePhotoField` from
`@/infrastructure/composition`, matching the existing convention of
Server Actions only ever importing from `composition.ts`.)

- [ ] **Step 7: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/supabase/uploadSiteContentPhoto.ts src/infrastructure/supabase/resolvePhotoField.ts src/infrastructure/supabase/resolvePhotoField.test.ts src/infrastructure/composition.ts
git commit -m "feat(content): add photo upload infrastructure (Storage upload + resolvePhotoField)"
```

---

## Task 6: Shared utilities — wedding date formatting, Markdown rendering, photo-or-placeholder

**Files:**
- Create: `src/shared/utils/formatWeddingDateLabel.ts`
- Create: `src/shared/utils/formatWeddingDateLabel.test.ts`
- Create: `src/shared/utils/renderMarkdown.tsx`
- Create: `src/shared/utils/renderMarkdown.test.tsx`
- Create: `src/components/ui/PhotoOrPlaceholder.tsx`
- Create: `src/components/ui/PhotoOrPlaceholder.test.tsx`

**Interfaces:**
- Consumes: `PlaceholderImage` (existing, `@/components/ui/PlaceholderImage`).
- Produces: `formatWeddingDateLabel(iso: string): string` (Portuguese
  long-form date, e.g. `"19 de junho de 2027"`, timezone-safe via
  `Intl.DateTimeFormat` pinned to `America/Sao_Paulo`).
  `renderMarkdown(markdown: string): ReactNode` (supports `**bold**`,
  `*italic*`, blank-line-separated paragraphs; never parses or injects
  raw HTML). `PhotoOrPlaceholder({ src: string | null; label: string;
  className?: string }): JSX.Element` — renders a real `<img>` when
  `src` is set, otherwise falls back to `PlaceholderImage`. This is the
  shared photo-or-placeholder pattern every content-driven photo slot in
  this plan uses.

- [ ] **Step 1: Write the failing `formatWeddingDateLabel` test**

Create `src/shared/utils/formatWeddingDateLabel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatWeddingDateLabel } from "@/shared/utils/formatWeddingDateLabel";

describe("formatWeddingDateLabel", () => {
  it("formats an ISO datetime as a Portuguese long-form date", () => {
    expect(formatWeddingDateLabel("2027-06-19T16:00:00-03:00")).toBe("19 de junho de 2027");
  });

  it("formats a different month/day correctly", () => {
    expect(formatWeddingDateLabel("2028-01-01T12:00:00-03:00")).toBe("1 de janeiro de 2028");
  });

  it("is stable across a date that would shift under a naive UTC read near midnight", () => {
    expect(formatWeddingDateLabel("2027-12-31T23:30:00-03:00")).toBe("31 de dezembro de 2027");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/shared/utils/formatWeddingDateLabel.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `formatWeddingDateLabel`**

Create `src/shared/utils/formatWeddingDateLabel.ts`:

```ts
const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatWeddingDateLabel(iso: string): string {
  return formatter.format(new Date(iso));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/shared/utils/formatWeddingDateLabel.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing `renderMarkdown` test**

Create `src/shared/utils/renderMarkdown.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";

describe("renderMarkdown", () => {
  it("renders bold and italic segments within a single paragraph", () => {
    render(<div>{renderMarkdown("Chegue às **16h** em ponto, *por favor*.")}</div>);

    expect(screen.getByText("16h").tagName).toBe("STRONG");
    expect(screen.getByText("por favor.").tagName).toBe("EM");
  });

  it("splits blank-line-separated text into separate paragraphs", () => {
    const { container } = render(<div>{renderMarkdown("Primeiro parágrafo.\n\nSegundo parágrafo.")}</div>);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("Primeiro parágrafo.");
    expect(paragraphs[1]).toHaveTextContent("Segundo parágrafo.");
  });

  it("never renders raw HTML tags as markup — they show as literal text", () => {
    render(<div>{renderMarkdown("<script>alert('x')</script>")}</div>);

    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/alert/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/shared/utils/renderMarkdown.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `renderMarkdown`**

Create `src/shared/utils/renderMarkdown.tsx`:

```tsx
import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((token) => token.length > 0);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <span key={key}>{token}</span>;
  });
}

/**
 * Minimal, dependency-free Markdown renderer supporting only **bold**,
 * *italic*, and blank-line-separated paragraphs. Builds React elements
 * directly from matched tokens — never parses or injects raw HTML, so
 * admin-authored content can't execute arbitrary markup.
 */
export function renderMarkdown(markdown: string): ReactNode {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-3" : undefined}>
          {renderInline(paragraph, `p${index}`)}
        </p>
      ))}
    </>
  );
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/shared/utils/renderMarkdown.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Write the failing `PhotoOrPlaceholder` test**

Create `src/components/ui/PhotoOrPlaceholder.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";

describe("PhotoOrPlaceholder", () => {
  it("renders a real img when src is provided", () => {
    render(<PhotoOrPlaceholder src="https://example.com/photo.jpg" label="Foto" className="h-10 w-10" />);

    const img = screen.getByRole("img", { hidden: true });
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(img).toHaveClass("object-cover", "h-10", "w-10");
  });

  it("falls back to PlaceholderImage when src is null", () => {
    render(<PhotoOrPlaceholder src={null} label="Foto do casal" className="h-10 w-10" />);

    expect(screen.getByText("Foto do casal")).toBeInTheDocument();
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run to verify it fails**

Run: `npx vitest run src/components/ui/PhotoOrPlaceholder.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 11: Implement `PhotoOrPlaceholder`**

Create `src/components/ui/PhotoOrPlaceholder.tsx`:

```tsx
import { cn } from "@/shared/utils/cn";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

interface PhotoOrPlaceholderProps {
  src: string | null;
  label: string;
  className?: string;
}

export function PhotoOrPlaceholder({ src, label, className }: PhotoOrPlaceholderProps) {
  if (src) {
    return <img src={src} alt="" className={cn("object-cover", className)} />;
  }

  return <PlaceholderImage label={label} className={className} />;
}
```

- [ ] **Step 12: Run to verify it passes**

Run: `npx vitest run src/components/ui/PhotoOrPlaceholder.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 13: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 14: Commit**

```bash
git add src/shared/utils/formatWeddingDateLabel.ts src/shared/utils/formatWeddingDateLabel.test.ts src/shared/utils/renderMarkdown.tsx src/shared/utils/renderMarkdown.test.tsx src/components/ui/PhotoOrPlaceholder.tsx src/components/ui/PhotoOrPlaceholder.test.tsx
git commit -m "feat(content): add formatWeddingDateLabel, renderMarkdown, and PhotoOrPlaceholder utilities"
```

---

## Task 7: Admin CMS index page + nav link + Settings section

**Files:**
- Create: `src/app/admin/(protected)/conteudo/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/configuracoes/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/configuracoes/actions.ts`
- Create: `src/components/admin/SettingsForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault`, `createUpdateSiteContentUseCase`
  (Task 4); `settingsContentSchema`, `SettingsContent`,
  `SiteContentActionState` (Task 2).
- Produces: `/admin/conteudo` (index of all 7 sections),
  `/admin/conteudo/configuracoes` (edit wedding date + location), and a
  new "Conteúdo" link in the admin nav. Establishes the page/form/action
  file pattern every later admin CMS task in this plan follows.

- [ ] **Step 1: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, update `ADMIN_NAV`:

```tsx
const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Convidados", href: "/admin/convidados" },
  { label: "Presentes", href: "/admin/presentes" },
  { label: "Conteúdo", href: "/admin/conteudo" },
];
```

- [ ] **Step 2: Create the CMS index page**

Create `src/app/admin/(protected)/conteudo/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conteúdo do Site | Painel Administrativo",
};

const CONTENT_SECTIONS = [
  { label: "Configurações (data do casamento)", href: "/admin/conteudo/configuracoes" },
  { label: "Hero da Home", href: "/admin/conteudo/hero" },
  { label: "Fotos dos Marcos (Save the Date)", href: "/admin/conteudo/marcos" },
  { label: "Carrossel da Home", href: "/admin/conteudo/carrossel" },
  { label: "Dicas — Cerimônia", href: "/admin/conteudo/dicas-cerimonia" },
  { label: "Dicas — Traje", href: "/admin/conteudo/dicas-traje" },
  { label: "Dicas — Hospedagem", href: "/admin/conteudo/dicas-hospedagem" },
];

export default function ContentIndexPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Conteúdo do Site</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {CONTENT_SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create the Settings form component**

Create `src/components/admin/SettingsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/admin/(protected)/conteudo/configuracoes/actions";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { SettingsContent } from "@/application/content/schemas";

interface SettingsFormProps {
  defaultValues: SettingsContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialSettingsActionState: SiteContentActionState = { status: "idle" };

function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16);
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSettingsAction, initialSettingsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="weddingDate" className="block font-sans text-sm text-forest">
          Data e horário do casamento
        </label>
        <input
          id="weddingDate"
          name="weddingDate"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(defaultValues.weddingDateIso)}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="weddingLocationLabel" className="block font-sans text-sm text-forest">
          Local (texto exibido no site)
        </label>
        <input
          id="weddingLocationLabel"
          name="weddingLocationLabel"
          defaultValue={defaultValues.weddingLocationLabel}
          required
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
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

- [ ] **Step 4: Create the Settings Server Action**

Create `src/app/admin/(protected)/conteudo/configuracoes/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { settingsContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateSettingsAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const weddingDate = formData.get("weddingDate");

  const parsed = settingsContentSchema.safeParse({
    weddingDateIso: typeof weddingDate === "string" && weddingDate ? `${weddingDate}:00-03:00` : undefined,
    weddingLocationLabel: formData.get("weddingLocationLabel"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("settings", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

- [ ] **Step 5: Create the Settings edit page**

Create `src/app/admin/(protected)/conteudo/configuracoes/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Configurações | Painel Administrativo",
};

export default async function SettingsContentPage() {
  const content = await getSiteContentOrDefault("settings");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Configurações</h1>
      <div className="mt-6">
        <SettingsForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass; build's route list includes `/admin/conteudo` and
`/admin/conteudo/configuracoes` (the other 6 CMS routes referenced from
the index page don't exist yet until later tasks — that's expected and
doesn't break the build, since `Link` doesn't validate route existence
at build time in this Next.js version; confirm no build error appears
for it).

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/page.tsx" "src/app/admin/(protected)/conteudo/configuracoes/page.tsx" "src/app/admin/(protected)/conteudo/configuracoes/actions.ts" src/components/admin/SettingsForm.tsx "src/app/admin/(protected)/layout.tsx"
git commit -m "feat(admin): add Content CMS index page and the Settings (wedding date) section"
```

---

## Task 8: Admin CMS — Home Hero section

**Files:**
- Create: `src/app/admin/(protected)/conteudo/hero/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/hero/actions.ts`
- Create: `src/components/admin/HomeHeroForm.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault`, `createUpdateSiteContentUseCase`,
  `resolvePhotoField` (Task 4/5); `homeHeroContentSchema`,
  `HomeHeroContent`, `SiteContentActionState` (Task 2);
  `PhotoOrPlaceholder` (Task 6).
- Produces: `/admin/conteudo/hero` — edit the Hero's eyebrow, tagline,
  and 1-5 carousel photos (5 fixed form rows; the final saved `photos`
  array only contains rows that end up with a real photo, in row order,
  so the array's length is exactly how many slides the public Hero
  carousel will show).

- [ ] **Step 1: Create the Home Hero form component**

Create `src/components/admin/HomeHeroForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateHomeHeroAction } from "@/app/admin/(protected)/conteudo/hero/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeHeroContent } from "@/application/content/schemas";

interface HomeHeroFormProps {
  defaultValues: HomeHeroContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_PHOTOS = 5;

const initialHomeHeroActionState: SiteContentActionState = { status: "idle" };

export function HomeHeroForm({ defaultValues }: HomeHeroFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeHeroAction, initialHomeHeroActionState);
  const existingPhotos = defaultValues.photos;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="eyebrow" className="block font-sans text-sm text-forest">
          Texto de destaque
        </label>
        <input
          id="eyebrow"
          name="eyebrow"
          defaultValue={defaultValues.eyebrow}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="tagline" className="block font-sans text-sm text-forest">
          Frase de efeito
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={defaultValues.tagline}
          required
          className={inputClassName}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-sans text-sm text-forest">Fotos do carrossel (1 a {MAX_PHOTOS})</legend>

        {Array.from({ length: MAX_PHOTOS }, (_, index) => {
          const currentUrl = existingPhotos[index] ?? null;
          return (
            <div key={index} className="flex flex-col gap-2 border-b border-line pb-4">
              <input type="hidden" name={`photo${index}CurrentUrl`} value={currentUrl ?? ""} />
              <PhotoOrPlaceholder src={currentUrl} label={`Foto ${index + 1}`} className="h-24 w-full rounded-md" />
              <input
                type="file"
                name={`photo${index}File`}
                accept="image/*"
                className="font-sans text-sm text-forest"
              />
              {currentUrl && (
                <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                  <input type="checkbox" name={`photo${index}Remove`} />
                  Remover esta foto
                </label>
              )}
            </div>
          );
        })}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
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

- [ ] **Step 2: Create the Home Hero Server Action**

Create `src/app/admin/(protected)/conteudo/hero/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeHeroContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_PHOTOS = 5;

export async function updateHomeHeroAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const photos: string[] = [];

  for (let index = 0; index < MAX_PHOTOS; index++) {
    const currentUrl = (formData.get(`photo${index}CurrentUrl`) as string) || null;
    const resolved = await resolvePhotoField(
      "home-hero",
      `photo${index}`,
      formData,
      currentUrl,
      `photo${index}File`,
      `photo${index}Remove`
    );
    if (resolved) {
      photos.push(resolved);
    }
  }

  const parsed = homeHeroContentSchema.safeParse({
    eyebrow: formData.get("eyebrow"),
    tagline: formData.get("tagline"),
    photos,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  if (parsed.data.photos.length === 0) {
    return { status: "error", message: "Adicione pelo menos uma foto." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-hero", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Create the Home Hero edit page**

Create `src/app/admin/(protected)/conteudo/hero/page.tsx`:

```tsx
import type { Metadata } from "next";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Hero da Home | Painel Administrativo",
};

export default async function HomeHeroContentPage() {
  const content = await getSiteContentOrDefault("home-hero");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Hero da Home</h1>
      <div className="mt-6">
        <HomeHeroForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/hero/page.tsx" "src/app/admin/(protected)/conteudo/hero/actions.ts" src/components/admin/HomeHeroForm.tsx
git commit -m "feat(admin): add Home Hero content section (eyebrow, tagline, 1-5 carousel photos)"
```

---

## Task 9: Admin CMS — Save the Date milestone photos

**Files:**
- Create: `src/app/admin/(protected)/conteudo/marcos/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/marcos/actions.ts`
- Create: `src/components/admin/HomeMilestonePhotosForm.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault`, `createUpdateSiteContentUseCase`,
  `resolvePhotoField` (Task 4/5); `homeMilestonePhotosContentSchema`,
  `HomeMilestonePhotosContent`, `SiteContentActionState` (Task 2);
  `PhotoOrPlaceholder` (Task 6); `MILESTONES` (existing,
  `@/shared/milestones` — used only for display labels/titles here,
  not modified).
- Produces: `/admin/conteudo/marcos` — edit the 3 milestone photos
  (`beginning`, `proposal`, `wedding`, matching `MILESTONES[0..2]` in
  that exact order). Milestone text stays hardcoded, unchanged by this
  task.

- [ ] **Step 1: Create the form component**

Create `src/components/admin/HomeMilestonePhotosForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateHomeMilestonePhotosAction } from "@/app/admin/(protected)/conteudo/marcos/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { MILESTONES } from "@/shared/milestones";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeMilestonePhotosContent } from "@/application/content/schemas";

interface HomeMilestonePhotosFormProps {
  defaultValues: HomeMilestonePhotosContent;
}

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

const initialMilestonePhotosActionState: SiteContentActionState = { status: "idle" };

export function HomeMilestonePhotosForm({ defaultValues }: HomeMilestonePhotosFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateHomeMilestonePhotosAction,
    initialMilestonePhotosActionState
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {MILESTONE_KEYS.map((key, index) => {
        const currentUrl = defaultValues[key];
        const milestone = MILESTONES[index];
        return (
          <div key={key} className="flex flex-col gap-2 border-b border-line pb-4">
            <span className="font-sans text-sm text-forest">{milestone.title}</span>
            <input type="hidden" name={`${key}CurrentUrl`} value={currentUrl ?? ""} />
            <PhotoOrPlaceholder
              src={currentUrl}
              label={`Foto — ${milestone.title}`}
              className="h-24 w-full rounded-md"
            />
            <input type="file" name={`${key}File`} accept="image/*" className="font-sans text-sm text-forest" />
            {currentUrl && (
              <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                <input type="checkbox" name={`${key}Remove`} />
                Remover esta foto
              </label>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
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

- [ ] **Step 2: Create the Server Action**

Create `src/app/admin/(protected)/conteudo/marcos/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeMilestonePhotosContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

export async function updateHomeMilestonePhotosAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const content: Record<string, string | null> = {};

  for (const key of MILESTONE_KEYS) {
    const currentUrl = (formData.get(`${key}CurrentUrl`) as string) || null;
    content[key] = await resolvePhotoField(
      "home-milestone-photos",
      key,
      formData,
      currentUrl,
      `${key}File`,
      `${key}Remove`
    );
  }

  const parsed = homeMilestonePhotosContentSchema.safeParse(content);

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-milestone-photos", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Create the edit page**

Create `src/app/admin/(protected)/conteudo/marcos/page.tsx`:

```tsx
import type { Metadata } from "next";
import { HomeMilestonePhotosForm } from "@/components/admin/HomeMilestonePhotosForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Fotos dos Marcos | Painel Administrativo",
};

export default async function MilestonePhotosContentPage() {
  const content = await getSiteContentOrDefault("home-milestone-photos");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Fotos dos Marcos (Save the Date)</h1>
      <div className="mt-6">
        <HomeMilestonePhotosForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/marcos/page.tsx" "src/app/admin/(protected)/conteudo/marcos/actions.ts" src/components/admin/HomeMilestonePhotosForm.tsx
git commit -m "feat(admin): add Save the Date milestone photos content section"
```

---

## Task 10: Admin CMS — Home Topics carousel

**Files:**
- Create: `src/app/admin/(protected)/conteudo/carrossel/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/carrossel/actions.ts`
- Create: `src/components/admin/HomeTopicsForm.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault`, `createUpdateSiteContentUseCase`,
  `resolvePhotoField` (Task 4/5); `homeTopicsContentSchema`,
  `HomeTopicsContent` (Task 2); `PhotoOrPlaceholder` (Task 6).
- Produces: `/admin/conteudo/carrossel` — edit title/description/photo
  for each of the 5 fixed topic cards (`cerimonia`, `presentes`,
  `traje`, `hospedagem`, `nossaHistoria`). Routes for each card stay
  hardcoded in `TopicsCarousel` (Task 12), not part of this form.

- [ ] **Step 1: Create the form component**

Create `src/components/admin/HomeTopicsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateHomeTopicsAction } from "@/app/admin/(protected)/conteudo/carrossel/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeTopicsContent } from "@/application/content/schemas";

interface HomeTopicsFormProps {
  defaultValues: HomeTopicsContent;
}

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;
const TOPIC_LABELS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "Cerimônia",
  presentes: "Lista de presentes",
  traje: "Traje",
  hospedagem: "Hospedagem",
  nossaHistoria: "Nossa história",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialHomeTopicsActionState: SiteContentActionState = { status: "idle" };

export function HomeTopicsForm({ defaultValues }: HomeTopicsFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeTopicsAction, initialHomeTopicsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      {TOPIC_KEYS.map((key) => {
        const entry = defaultValues[key];
        return (
          <fieldset key={key} className="flex flex-col gap-3 border-b border-line pb-6">
            <legend className="font-sans text-sm uppercase tracking-widest text-moss">{TOPIC_LABELS[key]}</legend>

            <div>
              <label htmlFor={`${key}Title`} className="block font-sans text-sm text-forest">
                Título
              </label>
              <input
                id={`${key}Title`}
                name={`${key}Title`}
                defaultValue={entry.title}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor={`${key}Description`} className="block font-sans text-sm text-forest">
                Descrição
              </label>
              <input
                id={`${key}Description`}
                name={`${key}Description`}
                defaultValue={entry.description}
                required
                className={inputClassName}
              />
            </div>

            <input type="hidden" name={`${key}CurrentUrl`} value={entry.photo ?? ""} />
            <PhotoOrPlaceholder
              src={entry.photo}
              label={`Foto — ${TOPIC_LABELS[key]}`}
              className="h-24 w-full rounded-md"
            />
            <input type="file" name={`${key}File`} accept="image/*" className="font-sans text-sm text-forest" />
            {entry.photo && (
              <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                <input type="checkbox" name={`${key}Remove`} />
                Remover esta foto
              </label>
            )}
          </fieldset>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
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

- [ ] **Step 2: Create the Server Action**

Create `src/app/admin/(protected)/conteudo/carrossel/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeTopicsContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;

export async function updateHomeTopicsAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const content: Record<string, unknown> = {};

  for (const key of TOPIC_KEYS) {
    const currentUrl = (formData.get(`${key}CurrentUrl`) as string) || null;
    const photo = await resolvePhotoField("home-topics", key, formData, currentUrl, `${key}File`, `${key}Remove`);

    content[key] = {
      title: formData.get(`${key}Title`),
      description: formData.get(`${key}Description`),
      photo,
    };
  }

  const parsed = homeTopicsContentSchema.safeParse(content);

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-topics", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Create the edit page**

Create `src/app/admin/(protected)/conteudo/carrossel/page.tsx`:

```tsx
import type { Metadata } from "next";
import { HomeTopicsForm } from "@/components/admin/HomeTopicsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Carrossel da Home | Painel Administrativo",
};

export default async function TopicsContentPage() {
  const content = await getSiteContentOrDefault("home-topics");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Carrossel da Home</h1>
      <div className="mt-6">
        <HomeTopicsForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/carrossel/page.tsx" "src/app/admin/(protected)/conteudo/carrossel/actions.ts" src/components/admin/HomeTopicsForm.tsx
git commit -m "feat(admin): add Home Topics carousel content section"
```

---

## Task 11: Admin CMS — the 3 Dicas e Instruções sections

**Files:**
- Create: `src/components/admin/TipsContentForm.tsx`
- Create: `src/app/admin/(protected)/conteudo/dicas-cerimonia/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/dicas-cerimonia/actions.ts`
- Create: `src/app/admin/(protected)/conteudo/dicas-traje/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/dicas-traje/actions.ts`
- Create: `src/app/admin/(protected)/conteudo/dicas-hospedagem/page.tsx`
- Create: `src/app/admin/(protected)/conteudo/dicas-hospedagem/actions.ts`

**Interfaces:**
- Consumes: `getSiteContentOrDefault`, `createUpdateSiteContentUseCase`,
  `resolvePhotoField` (Task 4/5); `tipsCerimoniaContentSchema`,
  `tipsTrajeContentSchema`, `tipsHospedagemContentSchema`, `TipsContent`,
  `SiteContentActionState` (Task 2); `PhotoOrPlaceholder` (Task 6).
- Produces: `/admin/conteudo/dicas-cerimonia`,
  `/admin/conteudo/dicas-traje`, `/admin/conteudo/dicas-hospedagem` —
  each edits eyebrow/title/Markdown body/photo for its page. All 3 share
  one form component (`TipsContentForm`), since their field shape is
  identical; only the slug, schema, and default photo label differ.

- [ ] **Step 1: Create the shared form component**

Create `src/components/admin/TipsContentForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { TipsContent } from "@/application/content/schemas";

interface TipsContentFormProps {
  defaultValues: TipsContent;
  action: (prevState: SiteContentActionState, formData: FormData) => Promise<SiteContentActionState>;
  photoLabel: string;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialTipsActionState: SiteContentActionState = { status: "idle" };

export function TipsContentForm({ defaultValues, action, photoLabel }: TipsContentFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialTipsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="eyebrow" className="block font-sans text-sm text-forest">
          Texto de destaque (opcional)
        </label>
        <input id="eyebrow" name="eyebrow" defaultValue={defaultValues.eyebrow ?? ""} className={inputClassName} />
      </div>

      <div>
        <label htmlFor="title" className="block font-sans text-sm text-forest">
          Título
        </label>
        <input id="title" name="title" defaultValue={defaultValues.title} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="body" className="block font-sans text-sm text-forest">
          Texto (use **negrito** e *itálico*; linha em branco separa parágrafos)
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={defaultValues.body}
          required
          rows={6}
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-2">
        <input type="hidden" name="photoCurrentUrl" value={defaultValues.photo ?? ""} />
        <PhotoOrPlaceholder src={defaultValues.photo} label={photoLabel} className="h-32 w-full rounded-md" />
        <input type="file" name="photoFile" accept="image/*" className="font-sans text-sm text-forest" />
        {defaultValues.photo && (
          <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
            <input type="checkbox" name="photoRemove" />
            Remover esta foto
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
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

- [ ] **Step 2: Create the Cerimônia action and page**

Create `src/app/admin/(protected)/conteudo/dicas-cerimonia/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsCerimoniaAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField("tips-cerimonia", "photo", formData, currentUrl, "photoFile", "photoRemove");

  const parsed = tipsCerimoniaContentSchema.safeParse({
    eyebrow: formData.get("eyebrow") || null,
    title: formData.get("title"),
    body: formData.get("body"),
    photo,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-cerimonia", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

Create `src/app/admin/(protected)/conteudo/dicas-cerimonia/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsCerimoniaAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Cerimônia | Painel Administrativo",
};

export default async function TipsCerimoniaContentPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Dicas — Cerimônia</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsCerimoniaAction} photoLabel="Local da cerimônia" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the Traje action and page**

Create `src/app/admin/(protected)/conteudo/dicas-traje/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsTrajeContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsTrajeAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField("tips-traje", "photo", formData, currentUrl, "photoFile", "photoRemove");

  const parsed = tipsTrajeContentSchema.safeParse({
    eyebrow: formData.get("eyebrow") || null,
    title: formData.get("title"),
    body: formData.get("body"),
    photo,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-traje", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

Create `src/app/admin/(protected)/conteudo/dicas-traje/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsTrajeAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Traje | Painel Administrativo",
};

export default async function TipsTrajeContentPage() {
  const content = await getSiteContentOrDefault("tips-traje");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Dicas — Traje</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsTrajeAction} photoLabel="Inspiração de traje" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the Hospedagem action and page**

Create `src/app/admin/(protected)/conteudo/dicas-hospedagem/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsHospedagemAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField(
    "tips-hospedagem",
    "photo",
    formData,
    currentUrl,
    "photoFile",
    "photoRemove"
  );

  const parsed = tipsHospedagemContentSchema.safeParse({
    eyebrow: formData.get("eyebrow") || null,
    title: formData.get("title"),
    body: formData.get("body"),
    photo,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-hospedagem", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
```

Create `src/app/admin/(protected)/conteudo/dicas-hospedagem/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsHospedagemAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Hospedagem | Painel Administrativo",
};

export default async function TipsHospedagemContentPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Dicas — Hospedagem</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsHospedagemAction} photoLabel="Hospedagem" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. All 7 CMS routes linked from `/admin/conteudo` now
exist.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/TipsContentForm.tsx "src/app/admin/(protected)/conteudo/dicas-cerimonia" "src/app/admin/(protected)/conteudo/dicas-traje" "src/app/admin/(protected)/conteudo/dicas-hospedagem"
git commit -m "feat(admin): add the 3 Dicas e Instruções content sections"
```

---

## Task 12: Wire the Home page to fetched content

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/home/HomeHero.tsx`
- Modify: `src/components/home/HeroCarousel.tsx`
- Modify: `src/components/home/CountdownTimer.tsx`
- Modify: `src/components/home/SaveTheDateSection.tsx`
- Modify: `src/components/home/TopicsCarousel.tsx`
- Modify: `src/components/home/TopicsCarousel.test.tsx`
- Modify: `src/shared/navigation.ts`
- Create: `src/components/home/HeroCarousel.test.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault` (Task 4); `HomeHeroContent`,
  `SettingsContent`, `HomeMilestonePhotosContent`, `HomeTopicsContent`
  (Task 2); `formatWeddingDateLabel`, `PhotoOrPlaceholder` (Task 6);
  `MILESTONES` (existing, unchanged).
- Produces: `HomeHero({ heroContent: HomeHeroContent; settings:
  SettingsContent }): JSX.Element`. `HeroCarousel({ photos: string[]
  }): JSX.Element` (renders exactly `photos.length` slides, or 3
  placeholder slides when `photos` is empty). `CountdownTimer({
  weddingDateIso: string }): JSX.Element`. `SaveTheDateSection({
  milestonePhotos: HomeMilestonePhotosContent }): JSX.Element`.
  `TopicsCarousel({ content: HomeTopicsContent }): JSX.Element`.

- [ ] **Step 1: Remove the now-dynamic constants from `shared/navigation.ts`**

In `src/shared/navigation.ts`, remove these two lines (they're now
sourced from `settings` content, not hardcoded):

```ts
export const WEDDING_DATE_ISO = "2027-06-19T16:00:00-03:00";
export const WEDDING_DATE_LABEL = "19 de junho de 2027";
export const WEDDING_LOCATION_LABEL = "Minas Gerais, Brasil";
```

Keep `NavItem`, `NAV_ITEMS`, and `COUPLE_NAMES` — those are unaffected by
this plan.

- [ ] **Step 2: Update `HeroCarousel`**

Replace the full contents of `src/components/home/HeroCarousel.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";

const AUTOPLAY_INTERVAL_MS = 5000;
const FALLBACK_SLIDE_COUNT = 3;

interface HeroCarouselProps {
  photos: string[];
}

/**
 * Pure background layer for the home hero: rotating photo carousel, dark
 * overlay, and slide-position dots. Must render inside a `relative`
 * parent — see HomeHero, which composes this with the foreground content.
 * Renders exactly `photos.length` slides, or `FALLBACK_SLIDE_COUNT`
 * placeholder slides when no photos have been uploaded yet.
 */
export function HeroCarousel({ photos }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const slides: (string | null)[] = photos.length > 0 ? photos : Array.from({ length: FALLBACK_SLIDE_COUNT }, () => null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    const timeoutId = setTimeout(onSelect, 0);
    return () => clearTimeout(timeoutId);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const intervalId = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [emblaApi]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="hero-carousel">
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((photo, index) => (
            <div key={index} className="relative h-full min-w-0 flex-[0_0_100%]">
              <PhotoOrPlaceholder
                src={photo}
                label={`Foto do casal ${index + 1}`}
                className="h-full w-full grayscale"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-forest/50" />

      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              index === selectedIndex ? "bg-paper" : "bg-paper/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the new `HeroCarousel` test**

Create `src/components/home/HeroCarousel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCarousel } from "@/components/home/HeroCarousel";

describe("HeroCarousel", () => {
  it("renders exactly one real photo slide per photo provided", () => {
    render(<HeroCarousel photos={["https://example.com/a.jpg", "https://example.com/b.jpg"]} />);

    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(2);
  });

  it("falls back to 3 placeholder slides when no photos are provided", () => {
    render(<HeroCarousel photos={[]} />);

    expect(screen.getByText("Foto do casal 1")).toBeInTheDocument();
    expect(screen.getByText("Foto do casal 2")).toBeInTheDocument();
    expect(screen.getByText("Foto do casal 3")).toBeInTheDocument();
  });

  it("renders 5 slides when 5 photos are provided", () => {
    const photos = Array.from({ length: 5 }, (_, i) => `https://example.com/${i}.jpg`);
    render(<HeroCarousel photos={photos} />);

    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(5);
  });
});
```

Run: `npx vitest run src/components/home/HeroCarousel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 4: Update `CountdownTimer`**

Replace the full contents of `src/components/home/CountdownTimer.tsx`:

```tsx
"use client";

import { useCountdown } from "@/hooks/useCountdown";

const UNITS = [
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Minutos" },
  { key: "seconds", label: "Segundos" },
] as const;

interface CountdownTimerProps {
  weddingDateIso: string;
}

export function CountdownTimer({ weddingDateIso }: CountdownTimerProps) {
  const countdown = useCountdown(weddingDateIso);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-4 sm:gap-10">
        {UNITS.map((unit) => (
          <div key={unit.key} className="flex flex-col items-center">
            <span className="font-serif text-4xl text-paper sm:text-5xl" aria-live="polite">
              {String(countdown[unit.key]).padStart(2, "0")}
            </span>
            <span className="mt-1 font-serif text-[10px] uppercase tracking-widest text-paper/80 sm:text-xs">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="font-script text-3xl text-moss">mal podemos esperar</p>
    </div>
  );
}
```

- [ ] **Step 5: Update `HomeHero`**

Replace the full contents of `src/components/home/HomeHero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { PillButton } from "@/components/ui/PillButton";
import { Monogram } from "@/components/ui/Monogram";
import { formatWeddingDateLabel } from "@/shared/utils/formatWeddingDateLabel";
import type { HomeHeroContent, SettingsContent } from "@/application/content/schemas";

interface HomeHeroProps {
  heroContent: HomeHeroContent;
  settings: SettingsContent;
}

export function HomeHero({ heroContent, settings }: HomeHeroProps) {
  return (
    <section
      className="relative -mt-[72px] overflow-hidden after:pointer-events-none after:absolute after:inset-0
        after:h-full after:w-full after:bg-[url('/images/torn-paper.png')] after:bg-contain after:bg-bottom
        after:bg-no-repeat after:content-['']"
    >
      <HeroCarousel photos={heroContent.photos} />

      <div className="relative flex flex-col items-center gap-20 px-6 pb-28 pt-[136px] text-center text-paper">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-paper/90">{heroContent.eyebrow}</span>
          <h1>
            <Monogram light className="h-32 w-auto sm:h-44" />
          </h1>
          <span aria-hidden="true" className="h-px w-16 bg-moss" />
          <p className="font-script text-2xl text-paper/90">{heroContent.tagline}</p>
          <p className="font-serif text-sm uppercase tracking-widest text-paper/90">
            {formatWeddingDateLabel(settings.weddingDateIso)} · {settings.weddingLocationLabel}
          </p>
          <PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <CountdownTimer weddingDateIso={settings.weddingDateIso} />
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Update `SaveTheDateSection`**

Replace the full contents of `src/components/home/SaveTheDateSection.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { MILESTONES } from "@/shared/milestones";
import type { HomeMilestonePhotosContent } from "@/application/content/schemas";

const HEADING_LINES = [
  { text: "Save", color: "var(--color-forest)", opacity: 1 },
  { text: "the", color: "var(--color-forest)", opacity: 0.7 },
  { text: "date!", color: "var(--color-moss)", opacity: 1 },
];

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

interface SaveTheDateSectionProps {
  milestonePhotos: HomeMilestonePhotosContent;
}

export function SaveTheDateSection({ milestonePhotos }: SaveTheDateSectionProps) {
  return (
    <section className="bg-[#ffffff] px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:items-center md:gap-16">
        <h2 className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
          {HEADING_LINES.map((line) => (
            <span
              key={line.text}
              className="font-serif text-6xl uppercase leading-none sm:text-7xl"
              style={{ color: line.color, opacity: line.opacity }}
            >
              {line.text}
            </span>
          ))}
        </h2>

        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-3">
          {MILESTONES.map((milestone, index) => (
            <motion.div
              key={milestone.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ArchFlipCard
                number={`0${index + 1}.`}
                image={
                  <PhotoOrPlaceholder
                    src={milestonePhotos[MILESTONE_KEYS[index]]}
                    label={`Foto — ${milestone.title}`}
                    className="absolute inset-0 h-full w-full"
                  />
                }
                title={milestone.title}
                date={milestone.date}
                description={milestone.description}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Update `TopicsCarousel`**

In `src/components/home/TopicsCarousel.tsx`, replace the `TOPICS`
constant and the `TopicPanel`/carousel components that consume it. The
`interface Topic` and the `TopicPanel`, `useScrollDrivenTranslate`,
`getPrefersReducedMotion`, `usePrefersReducedMotion` functions stay
exactly as they are — only the data source and top-level
`TopicsCarousel` export change. Replace from the top of the file down to
(and including) the `interface Topic { ... }` block and the `const
TOPICS: Topic[] = [...]` block with:

```tsx
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { HomeTopicsContent } from "@/application/content/schemas";

interface Topic {
  title: string;
  description: string;
  photo: string | null;
  href: string;
}

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;

const TOPIC_HREFS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "/dicas-e-instrucoes/cerimonia",
  presentes: "/presentes",
  traje: "/dicas-e-instrucoes/codigo-de-vestimenta",
  hospedagem: "/dicas-e-instrucoes/hospedagem",
  nossaHistoria: "/nossa-historia",
};

function buildTopics(content: HomeTopicsContent): Topic[] {
  return TOPIC_KEYS.map((key) => ({
    title: content[key].title,
    description: content[key].description,
    photo: content[key].photo,
    href: TOPIC_HREFS[key],
  }));
}
```

Then, in `TopicPanel`, replace the `PlaceholderImage` import and usage
with `PhotoOrPlaceholder`:

```tsx
function TopicPanel({ topic, className }: { topic: Topic; className?: string }) {
  return (
    <Link href={topic.href} className={`group relative block h-full overflow-hidden ${className ?? ""}`}>
      <PhotoOrPlaceholder
        src={topic.photo}
        label={`Foto — ${topic.title}`}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-forest/40 transition-colors group-hover:bg-forest/55" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-8 text-paper">
        <h3 className="font-serif text-3xl">{topic.title}</h3>
        <p className="font-sans text-sm text-paper/80">{topic.description}</p>
      </div>
    </Link>
  );
}
```

`useScrollDrivenTranslate`, `getPrefersReducedMotion`,
`usePrefersReducedMotion` stay unchanged. In `DesktopScrollCarousel` and
`SwipeCarousel`, replace every `TOPICS.map(...)` with `topics.map(...)`
and add a `topics: Topic[]` prop to both:

```tsx
function DesktopScrollCarousel({ topics }: { topics: Topic[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const rowWidthVw = topics.length * 50;
  const maxTranslateVw = Math.max(rowWidthVw - 100, 0);
  const translateVw = useScrollDrivenTranslate(sectionRef, maxTranslateVw);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${translateVw}vw)`, width: `${rowWidthVw}vw` }}
        >
          {topics.map((topic) => (
            <TopicPanel key={topic.href} topic={topic} className="w-[50vw] flex-shrink-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SwipeCarousel({ topics }: { topics: Topic[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: false, align: "start" });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex h-[70vh]">
        {topics.map((topic) => (
          <TopicPanel
            key={topic.href}
            topic={topic}
            className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%]"
          />
        ))}
      </div>
    </div>
  );
}
```

Finally, replace the exported `TopicsCarousel` function:

```tsx
interface TopicsCarouselProps {
  content: HomeTopicsContent;
}

export function TopicsCarousel({ content }: TopicsCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const topics = buildTopics(content);

  return (
    <>
      <div className="hidden md:block">
        {prefersReducedMotion ? <SwipeCarousel topics={topics} /> : <DesktopScrollCarousel topics={topics} />}
      </div>
      <div className="md:hidden">
        <SwipeCarousel topics={topics} />
      </div>
    </>
  );
}
```

- [ ] **Step 8: Update `TopicsCarousel.test.tsx`**

Replace the full contents of `src/components/home/TopicsCarousel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";
import { homeTopicsContentSchema } from "@/application/content/schemas";

describe("TopicsCarousel", () => {
  it("renders all 5 topics as links to their pages, using the supplied content", () => {
    const content = homeTopicsContentSchema.parse({
      cerimonia: { title: "Cerimônia Custom", description: "d1", photo: null },
    });
    render(<TopicsCarousel content={content} />);

    const expected: [string, string][] = [
      ["Cerimônia Custom", "/dicas-e-instrucoes/cerimonia"],
      ["Lista de presentes", "/presentes"],
      ["Traje", "/dicas-e-instrucoes/codigo-de-vestimenta"],
      ["Hospedagem", "/dicas-e-instrucoes/hospedagem"],
      ["Nossa história", "/nossa-historia"],
    ];

    for (const [title, href] of expected) {
      const links = screen.getAllByRole("link", { name: new RegExp(title, "i") });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", href);
    }
  });
});
```

- [ ] **Step 9: Update `src/app/page.tsx`**

Replace the full contents of `src/app/page.tsx`:

```tsx
import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function HomePage() {
  const [settings, heroContent, milestonePhotos, topicsContent] = await Promise.all([
    getSiteContentOrDefault("settings"),
    getSiteContentOrDefault("home-hero"),
    getSiteContentOrDefault("home-milestone-photos"),
    getSiteContentOrDefault("home-topics"),
  ]);

  return (
    <>
      <HomeHero heroContent={heroContent} settings={settings} />
      <SaveTheDateSection milestonePhotos={milestonePhotos} />
      <TopicsCarousel content={topicsContent} />
    </>
  );
}
```

- [ ] **Step 10: Grep for now-dangling imports**

Run: `grep -rln "WEDDING_DATE_ISO\|WEDDING_DATE_LABEL\|WEDDING_LOCATION_LABEL" src/`
Expected: no output (Step 1 removed the only definitions, and this
task's steps removed every consumer).

- [ ] **Step 11: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass; `/` still builds as a route.

- [ ] **Step 12: Commit**

```bash
git add src/app/page.tsx src/components/home/HomeHero.tsx src/components/home/HeroCarousel.tsx src/components/home/HeroCarousel.test.tsx src/components/home/CountdownTimer.tsx src/components/home/SaveTheDateSection.tsx src/components/home/TopicsCarousel.tsx src/components/home/TopicsCarousel.test.tsx src/shared/navigation.ts
git commit -m "feat(home): wire Home page sections to fetched site content"
```

---

## Task 13: Wire the 3 Dicas e Instruções pages to fetched content

**Files:**
- Modify: `src/app/dicas-e-instrucoes/cerimonia/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/hospedagem/page.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault` (Task 4); `renderMarkdown`,
  `PhotoOrPlaceholder` (Task 6); `SplitPanel` (existing, unchanged).
- Produces: all 3 pages become `async` Server Components rendering
  fetched eyebrow/title/body/photo instead of hardcoded JSX. `tone` and
  `imageSide` stay hardcoded per page, matching the design spec.

- [ ] **Step 1: Update the Cerimônia page**

Replace the full contents of `src/app/dicas-e-instrucoes/cerimonia/page.tsx`:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function CeremonyPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");

  return (
    <SplitPanel
      eyebrow={content.eyebrow ?? undefined}
      title={content.title}
      tone="dark"
      image={
        <PhotoOrPlaceholder
          src={content.photo}
          label="Local da cerimônia"
          className="absolute inset-0 h-full w-full"
        />
      }
    >
      {renderMarkdown(content.body)}
    </SplitPanel>
  );
}
```

- [ ] **Step 2: Update the Traje page**

Replace the full contents of `src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx`:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function DressCodePage() {
  const content = await getSiteContentOrDefault("tips-traje");

  return (
    <SplitPanel
      eyebrow={content.eyebrow ?? undefined}
      title={content.title}
      tone="light"
      imageSide="left"
      image={
        <PhotoOrPlaceholder
          src={content.photo}
          label="Inspiração de traje"
          className="absolute inset-0 h-full w-full"
        />
      }
    >
      {renderMarkdown(content.body)}
    </SplitPanel>
  );
}
```

- [ ] **Step 3: Update the Hospedagem page**

Replace the full contents of `src/app/dicas-e-instrucoes/hospedagem/page.tsx`:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function LodgingPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <SplitPanel
      eyebrow={content.eyebrow ?? undefined}
      title={content.title}
      tone="dark"
      image={<PhotoOrPlaceholder src={content.photo} label="Hospedagem" className="absolute inset-0 h-full w-full" />}
    >
      {renderMarkdown(content.body)}
    </SplitPanel>
  );
}
```

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass; the 3 Dicas routes still build.

- [ ] **Step 5: Commit**

```bash
git add src/app/dicas-e-instrucoes/cerimonia/page.tsx src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx src/app/dicas-e-instrucoes/hospedagem/page.tsx
git commit -m "feat(dicas): wire the 3 Dicas e Instruções pages to fetched site content"
```

---

## Task 14: Final verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Confirm no stray references to removed constants remain**

Run: `grep -rn "WEDDING_DATE_ISO\|WEDDING_DATE_LABEL\|WEDDING_LOCATION_LABEL" src/`
Expected: no output.

- [ ] **Step 2: Confirm `PlaceholderImage` is only used where a real
  photo genuinely can't exist yet (i.e., via `PhotoOrPlaceholder`, not
  directly, in every file this plan touched)**

Run: `grep -rln "PlaceholderImage" src/components/home/ src/app/dicas-e-instrucoes/`
Expected: only `src/components/ui/PhotoOrPlaceholder.tsx` (and its test)
reference `PlaceholderImage` directly within these directories — every
content-driven call site goes through it instead.

- [ ] **Step 3: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. Confirm the build's route list is unchanged from
before this plan, plus the 8 new `/admin/conteudo*` routes:
`/admin/conteudo`, `/admin/conteudo/configuracoes`,
`/admin/conteudo/hero`, `/admin/conteudo/marcos`,
`/admin/conteudo/carrossel`, `/admin/conteudo/dicas-cerimonia`,
`/admin/conteudo/dicas-traje`, `/admin/conteudo/dicas-hospedagem`.

- [ ] **Step 4: Confirm the migration was applied**

Ask the plan's controller to confirm Task 4's Step 6 flag was acted on
(migration `0003_site_content.sql` applied to the live Supabase project
via the Supabase MCP `apply_migration` tool, and the `site-content`
bucket exists). If not yet applied, apply it now and re-verify with
`mcp__plugin_supabase_supabase__list_tables` that `site_content` exists
and `list_migrations` shows `0003_site_content`.

- [ ] **Step 5: No commit needed for this task** — it is verification
  only. If any step above surfaces an issue, fix it in a follow-up
  commit with an explicit file list and re-run this task's steps.

## What this plan intentionally does NOT do

- Does not make Nossa História's timeline text, or any of its other
  content, editable.
- Does not make the Save the Date heading copy ("Save the date!"), the
  milestone **text**, the Hero CTA button, or the logo mark editable.
- Does not let admins add, remove, or reorder Topics-carousel cards or
  Dicas pages, or change their routes.
- Does not build a general-purpose page/section builder or a
  drag-and-drop layout tool.
- Does not clean up orphaned Storage objects left behind when a photo is
  replaced.
- Does not add image resizing/optimization — uploaded photos are stored
  and served as-is, subject to the 5 MB cap.
