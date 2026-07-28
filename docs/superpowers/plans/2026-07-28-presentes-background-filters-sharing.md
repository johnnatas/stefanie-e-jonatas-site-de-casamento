# Presentes Page — Background Image, Translucent Cards, Filters & Sharing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public Presentes page shell (wider container, translucent frosted-glass cards, admin-editable full-page background image), and add filtering (name/category/status), sorting (name/price, both directions), a "clear filters" control, and link-sharing (individual gift + current filtered view) with a deep-link auto-open.

**Architecture:** Filtering/sorting is computed server-side inside the existing `GiftsPage` Server Component from URL search params, via new pure helper functions — no repository/use-case changes. A new client component `GiftFiltersBar` reads/writes those params via `next/navigation` and renders two CSS-toggled variants (desktop bar / mobile panel). A new site-content slug `"presentes"` (schema + admin form) stores the background image URL, reusing the existing `resolvePhotoField`/`PhotoUploadField`/`compressImage` pipeline used by every other admin content section. Sharing is a small `navigator.share`-with-clipboard-fallback utility reused by both `GiftDetailsModal` (individual gift) and `GiftFiltersBar` (current view).

**Tech Stack:** Next.js 16.2.10 App Router (Server Components, Server Actions, async `searchParams`), React (`useState`, `useEffect`, `useActionState`), TypeScript, Zod v4, Tailwind CSS v4, Vitest + React Testing Library.

## Global Constraints

- No `box-shadow` anywhere — use `border` + `bg-*/NN` opacity + `backdrop-blur-*` for the frosted-glass effect ("Regra do Chapado").
- Only existing design tokens (`moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`) and fonts (`font-serif`, `font-sans`, `font-script`) — no new colors/fonts.
- Query param names: `q`, `categoria` (repeatable), `situacao`, `ordenar`, `presente` — never reuse `status`, which already means the post-payment banner (`sucesso`/`pendente`/`falha`).
- No changes to `src/app/presentes/actions.ts`, `GiftDto.ts`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow`, `resolvePhotoField`, `PhotoUploadField`, `compressImage`, or the reserve/pay `useActionState` state machine inside `GiftDetailsModal`.
- Client components that call `useSearchParams()` must be wrapped in `<Suspense>` at their call site — this project's existing convention (see `src/app/admin/(protected)/presentes/page.tsx:59`), required to avoid a full-route de-optimization to client rendering.
- New admin route follows the exact existing pattern used by every other content section: route group `(protected)`, `page.tsx` (Server Component) + `actions.ts` (Server Action using `useActionState` contract `SiteContentActionState`), `resolvePhotoField` for the photo field, `revalidatePath` + `redirect("/admin/conteudo")` on success.
- Every `useEffect` must list every reactive value it reads in its dependency array — do not use `eslint-disable` comments to bypass `react-hooks/exhaustive-deps`; restructure the effect instead if a dependency seems awkward.

---

### Task 1: `giftFilters` — pure filter/sort/category helpers

**Files:**
- Create: `src/shared/utils/giftFilters.ts`
- Test: `src/shared/utils/giftFilters.test.ts`

**Interfaces:**
- Produces: `filterAndSortGifts(gifts: GiftDto[], params: GiftFilterParams): GiftDto[]` and `getGiftCategories(gifts: GiftDto[]): string[]`, both exported from `@/shared/utils/giftFilters`. `GiftFilterParams` is `{ q?: string; categoria?: string[]; situacao?: string; ordenar?: string }`, also exported. Task 9 (page wiring) is the only consumer.
- Consumes: `GiftDto` from `@/components/gifts/GiftDto` (already has `name: string`, `price: number`, `category: string`, `status: "available" | "reserved" | "paid"`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/shared/utils/giftFilters.test.ts
import { describe, expect, it } from "vitest";
import { filterAndSortGifts, getGiftCategories } from "@/shared/utils/giftFilters";
import { GiftDto } from "@/components/gifts/GiftDto";

function makeGift(overrides: Partial<GiftDto>): GiftDto {
  return {
    id: "1",
    name: "Jogo de panelas",
    description: "",
    imageUrl: null,
    price: 200,
    category: "cozinha",
    status: "available",
    ...overrides,
  };
}

const gifts: GiftDto[] = [
  makeGift({ id: "1", name: "Jogo de panelas", category: "cozinha", price: 200, status: "available" }),
  makeGift({ id: "2", name: "Aspirador robô", category: "casa", price: 900, status: "reserved" }),
  makeGift({ id: "3", name: "Jogo de taças", category: "cozinha", price: 80, status: "paid" }),
  makeGift({ id: "4", name: "Ferro de passar", category: "casa", price: 90, status: "available" }),
];

describe("filterAndSortGifts", () => {
  it("returns every gift unchanged (creation order) when no params are given", () => {
    expect(filterAndSortGifts(gifts, {})).toEqual(gifts);
  });

  it("filters by case-insensitive name substring", () => {
    const result = filterAndSortGifts(gifts, { q: "jogo" });
    expect(result.map((g) => g.id)).toEqual(["1", "3"]);
  });

  it("filters by a set of categories", () => {
    const result = filterAndSortGifts(gifts, { categoria: ["casa"] });
    expect(result.map((g) => g.id)).toEqual(["2", "4"]);
  });

  it("filters by status", () => {
    const result = filterAndSortGifts(gifts, { situacao: "available" });
    expect(result.map((g) => g.id)).toEqual(["1", "4"]);
  });

  it("combines name, category, and status filters", () => {
    const result = filterAndSortGifts(gifts, { q: "ferro", categoria: ["casa"], situacao: "available" });
    expect(result.map((g) => g.id)).toEqual(["4"]);
  });

  it("sorts by name ascending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "nome-asc" });
    expect(result.map((g) => g.name)).toEqual([
      "Aspirador robô",
      "Ferro de passar",
      "Jogo de panelas",
      "Jogo de taças",
    ]);
  });

  it("sorts by name descending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "nome-desc" });
    expect(result.map((g) => g.name)).toEqual([
      "Jogo de taças",
      "Jogo de panelas",
      "Ferro de passar",
      "Aspirador robô",
    ]);
  });

  it("sorts by price ascending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "valor-asc" });
    expect(result.map((g) => g.id)).toEqual(["3", "4", "1", "2"]);
  });

  it("sorts by price descending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "valor-desc" });
    expect(result.map((g) => g.id)).toEqual(["2", "1", "4", "3"]);
  });

  it("treats 'recentes' and any unrecognized value as creation order (no re-sort)", () => {
    expect(filterAndSortGifts(gifts, { ordenar: "recentes" })).toEqual(gifts);
    expect(filterAndSortGifts(gifts, { ordenar: "xpto" })).toEqual(gifts);
  });

  it("does not mutate the input array when sorting", () => {
    const copy = [...gifts];
    filterAndSortGifts(gifts, { ordenar: "nome-asc" });
    expect(gifts).toEqual(copy);
  });
});

describe("getGiftCategories", () => {
  it("returns the distinct categories, sorted", () => {
    expect(getGiftCategories(gifts)).toEqual(["casa", "cozinha"]);
  });

  it("returns an empty array for an empty gift list", () => {
    expect(getGiftCategories([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/utils/giftFilters.test.ts`
Expected: FAIL — `Cannot find module '@/shared/utils/giftFilters'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/utils/giftFilters.ts
import { GiftDto } from "@/components/gifts/GiftDto";

export interface GiftFilterParams {
  q?: string;
  categoria?: string[];
  situacao?: string;
  ordenar?: string;
}

export function filterAndSortGifts(gifts: GiftDto[], params: GiftFilterParams): GiftDto[] {
  const term = params.q?.trim().toLowerCase() ?? "";
  const categories = params.categoria ?? [];
  const situacao = params.situacao;

  const filtered = gifts.filter((gift) => {
    const matchesName = !term || gift.name.toLowerCase().includes(term);
    const matchesCategory = categories.length === 0 || categories.includes(gift.category);
    const matchesStatus = !situacao || gift.status === situacao;
    return matchesName && matchesCategory && matchesStatus;
  });

  switch (params.ordenar) {
    case "nome-asc":
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    case "nome-desc":
      return [...filtered].sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
    case "valor-asc":
      return [...filtered].sort((a, b) => a.price - b.price);
    case "valor-desc":
      return [...filtered].sort((a, b) => b.price - a.price);
    default:
      return filtered;
  }
}

export function getGiftCategories(gifts: GiftDto[]): string[] {
  return Array.from(new Set(gifts.map((gift) => gift.category))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared/utils/giftFilters.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/giftFilters.ts src/shared/utils/giftFilters.test.ts
git commit -m "feat: add pure gift filter/sort/category helpers"
```

---

### Task 2: `shareOrCopyLink` — Web Share API with clipboard fallback

**Files:**
- Create: `src/shared/utils/shareOrCopyLink.ts`
- Test: `src/shared/utils/shareOrCopyLink.test.ts`

**Interfaces:**
- Produces: `shareOrCopyLink(params: { title: string; url: string }): Promise<"shared" | "copied">`, exported from `@/shared/utils/shareOrCopyLink`. Consumed by Task 7 (`GiftDetailsModal`) and Task 8 (`GiftFiltersBar`).
- Consumes: nothing project-specific — only the global `navigator.share`/`navigator.clipboard.writeText`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/shared/utils/shareOrCopyLink.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";

describe("shareOrCopyLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses navigator.share when available and returns 'shared'", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(share).toHaveBeenCalledWith({ title: "Air fryer", url: "https://example.com/presentes" });
    expect(result).toBe("shared");
  });

  it("falls back to clipboard when navigator.share is not available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(writeText).toHaveBeenCalledWith("https://example.com/presentes");
    expect(result).toBe("copied");
  });

  it("falls back to clipboard when navigator.share throws (e.g. user cancelled)", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(writeText).toHaveBeenCalledWith("https://example.com/presentes");
    expect(result).toBe("copied");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/utils/shareOrCopyLink.test.ts`
Expected: FAIL — `Cannot find module '@/shared/utils/shareOrCopyLink'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/utils/shareOrCopyLink.ts
export async function shareOrCopyLink(params: { title: string; url: string }): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(params);
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to clipboard copy
    }
  }
  await navigator.clipboard.writeText(params.url);
  return "copied";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared/utils/shareOrCopyLink.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/shareOrCopyLink.ts src/shared/utils/shareOrCopyLink.test.ts
git commit -m "feat: add shareOrCopyLink utility (Web Share API with clipboard fallback)"
```

---

### Task 3: `presentesContentSchema` — new site-content slug for the background image

**Files:**
- Modify: `src/application/content/schemas.ts`
- Modify: `src/application/content/schemas.test.ts`

**Interfaces:**
- Produces: `presentesContentSchema` (Zod schema), `PresentesContent` (type `{ backgroundImage: string | null }`), and `"presentes"` added to both `SITE_CONTENT_SLUGS` and `SITE_CONTENT_SCHEMAS`. Task 4 (admin form/page/actions) and Task 9 (public page) both consume `getSiteContentOrDefault("presentes")` — no code change needed in `getSiteContentOrDefault` itself, it already infers from `SITE_CONTENT_SCHEMAS`.
- Consumes: `z` from `"zod"` (already imported in this file).

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/application/content/schemas.test.ts`, right after the existing `tipsHospedagemContentSchema` block (find it by searching for `describe("tipsHospedagemContentSchema"`) and before the final `describe("SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS"` block:

```ts
describe("presentesContentSchema", () => {
  it("defaults to no background image", () => {
    const result = presentesContentSchema.parse({});
    expect(result).toEqual({ backgroundImage: null });
  });

  it("accepts a non-empty background image URL", () => {
    const result = presentesContentSchema.safeParse({ backgroundImage: "https://example.com/bg.jpg" });
    expect(result.success).toBe(true);
    expect(result.data?.backgroundImage).toBe("https://example.com/bg.jpg");
  });

  it("rejects an empty-string background image", () => {
    const result = presentesContentSchema.safeParse({ backgroundImage: "" });
    expect(result.success).toBe(false);
  });
});
```

Add `presentesContentSchema` to the existing import block at the top of the file (alongside `tipsHospedagemContentSchema`, etc.).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: FAIL — `presentesContentSchema` is not exported from `@/application/content/schemas`

- [ ] **Step 3: Add the schema**

In `src/application/content/schemas.ts`, add this block immediately after `tipsHospedagemContentSchema`'s `export type TipsHospedagemContent = ...` line and before the `SITE_CONTENT_SLUGS` export:

```ts
export const presentesContentSchema = z.object({
  backgroundImage: z.string().min(1).nullable().default(null),
});
export type PresentesContent = z.output<typeof presentesContentSchema>;
```

Then update the two lists further down:

```ts
export const SITE_CONTENT_SLUGS = [
  "settings",
  "home-hero",
  "home-gallery",
  "home-topics",
  "tips-cerimonia",
  "tips-traje",
  "tips-hospedagem",
  "presentes",
] as const;
export type SiteContentSlug = (typeof SITE_CONTENT_SLUGS)[number];

export const SITE_CONTENT_SCHEMAS = {
  settings: settingsContentSchema,
  "home-hero": homeHeroContentSchema,
  "home-gallery": homeGalleryContentSchema,
  "home-topics": homeTopicsContentSchema,
  "tips-cerimonia": tipsCerimoniaContentSchema,
  "tips-traje": tipsTrajeContentSchema,
  "tips-hospedagem": tipsHospedagemContentSchema,
  presentes: presentesContentSchema,
} satisfies Record<SiteContentSlug, z.ZodTypeAny>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: PASS (all tests, including the existing `SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS` generic loop test which now also covers `"presentes"` automatically)

- [ ] **Step 5: Commit**

```bash
git add src/application/content/schemas.ts src/application/content/schemas.test.ts
git commit -m "feat: add presentes site-content schema for the background image field"
```

---

### Task 4: Admin "Presentes" content section (background image upload)

**Files:**
- Create: `src/components/admin/PresentesForm.tsx`
- Create: `src/components/admin/PresentesForm.test.tsx`
- Create: `src/app/admin/(protected)/conteudo/presentes/actions.ts`
- Create: `src/app/admin/(protected)/conteudo/presentes/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/page.tsx`

**Interfaces:**
- Consumes: `presentesContentSchema`, `PresentesContent` from Task 3; `resolvePhotoField`, `createUpdateSiteContentUseCase`, `getSiteContentOrDefault` from `@/infrastructure/composition`; `PhotoUploadField` from `@/components/admin/PhotoUploadField`; `SiteContentActionState` from `@/application/content/actionState`.
- Produces: route `/admin/conteudo/presentes`, nothing consumed by later tasks (this is a leaf feature — Task 9 only reads the *content*, via `getSiteContentOrDefault("presentes")`, not anything from this task's files directly).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/PresentesForm.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresentesForm } from "@/components/admin/PresentesForm";

const updatePresentesActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/conteudo/presentes/actions", () => ({
  updatePresentesAction: (...args: unknown[]) => updatePresentesActionMock(...args),
}));

describe("PresentesForm", () => {
  it("renders the photo field with the current background image", () => {
    render(<PresentesForm defaultValues={{ backgroundImage: "https://example.com/bg.jpg" }} />);
    expect(screen.getByAltText("Imagem de fundo")).toHaveAttribute("src", "https://example.com/bg.jpg");
  });

  it("renders the photo field with no current image", () => {
    render(<PresentesForm defaultValues={{ backgroundImage: null }} />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("shows the error message returned by the action when saving fails", async () => {
    updatePresentesActionMock.mockResolvedValue({ status: "error", message: "Não foi possível salvar agora." });
    const user = userEvent.setup();
    render(<PresentesForm defaultValues={{ backgroundImage: null }} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar agora.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/admin/PresentesForm.test.tsx`
Expected: FAIL — `Cannot find module '@/components/admin/PresentesForm'`

- [ ] **Step 3: Write the Server Action**

```ts
// src/app/admin/(protected)/conteudo/presentes/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { presentesContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updatePresentesAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("backgroundImageCurrentUrl") as string) || null;
  const backgroundImage = await resolvePhotoField(
    "presentes",
    "backgroundImage",
    formData,
    currentUrl,
    "backgroundImageFile",
    "backgroundImageRemove"
  );

  const parsed = presentesContentSchema.safeParse({ backgroundImage });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("presentes", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/presentes");
  revalidatePath("/admin/conteudo/presentes");
  redirect("/admin/conteudo");
}
```

- [ ] **Step 4: Write the form component**

```tsx
// src/components/admin/PresentesForm.tsx
"use client";

import { useActionState } from "react";
import { updatePresentesAction } from "@/app/admin/(protected)/conteudo/presentes/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { PresentesContent } from "@/application/content/schemas";

interface PresentesFormProps {
  defaultValues: PresentesContent;
}

const initialPresentesActionState: SiteContentActionState = { status: "idle" };

export function PresentesForm({ defaultValues }: PresentesFormProps) {
  const [state, formAction, isPending] = useActionState(updatePresentesAction, initialPresentesActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <span className="block font-sans text-sm text-forest">Imagem de fundo</span>
        <div className="mt-1">
          <PhotoUploadField
            name="backgroundImage"
            currentUrl={defaultValues.backgroundImage}
            label="Imagem de fundo"
            className="h-40 w-full rounded-md"
          />
        </div>
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

- [ ] **Step 5: Write the admin page**

```tsx
// src/app/admin/(protected)/conteudo/presentes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PresentesForm } from "@/components/admin/PresentesForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Presentes — Imagem de fundo | Painel Administrativo",
};

export default async function PresentesContentPage() {
  const content = await getSiteContentOrDefault("presentes");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Presentes — Imagem de fundo</h1>
      <div className="mt-6">
        <PresentesForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the content-index entry**

In `src/app/admin/(protected)/conteudo/page.tsx`, add a new group to the `CONTENT_GROUPS` array — insert it after the `"Configurações gerais"` group and before `"Home"`:

```ts
  {
    label: "Presentes",
    sections: [
      {
        label: "Imagem de fundo",
        description: "Imagem de fundo exibida atrás da lista de presentes.",
        href: "/admin/conteudo/presentes",
      },
    ],
  },
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/admin/PresentesForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/PresentesForm.tsx src/components/admin/PresentesForm.test.tsx src/app/admin/\(protected\)/conteudo/presentes/actions.ts src/app/admin/\(protected\)/conteudo/presentes/page.tsx src/app/admin/\(protected\)/conteudo/page.tsx
git commit -m "feat: add admin Presentes content section for the background image"
```

---

### Task 5: `GiftCard` — translucent styling, larger image, `autoOpen` prop

**Files:**
- Modify: `src/components/gifts/GiftCard.tsx`
- Modify: `src/components/gifts/GiftCard.test.tsx`

**Interfaces:**
- Produces: new optional prop `autoOpen?: boolean` on `GiftCard` (default `false`) — seeds the modal's initial open state. Consumed by Task 6 (`GiftGrid` passes it through).
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test**

Add this test to `src/components/gifts/GiftCard.test.tsx`, inside the existing `describe("GiftCard"`  block:

```tsx
  it("opens the modal on mount when autoOpen is true", () => {
    render(<GiftCard gift={availableGift} canReserveForLater autoOpen />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: FAIL — dialog not found (modal starts closed regardless of props today)

- [ ] **Step 3: Update `GiftCard`**

Replace the full contents of `src/components/gifts/GiftCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";

interface GiftCardProps {
  gift: GiftDto;
  canReserveForLater: boolean;
  autoOpen?: boolean;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

export function GiftCard({ gift, canReserveForLater, autoOpen = false }: GiftCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(autoOpen);
  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col items-center rounded-lg border border-line/40 bg-paper/60 p-5 text-center backdrop-blur-sm">
      <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="h-48 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-sm uppercase tracking-wide text-forest">{gift.name}</h3>
      <p className="mt-2 font-serif text-base text-forest">{formatCurrency(gift.price)}</p>

      {isAvailable ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-4 min-h-11 rounded-full border border-line px-6 py-2 font-serif text-sm italic text-forest transition-colors hover:border-moss hover:text-moss"
        >
          Ver detalhes
        </button>
      ) : (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status as Exclude<typeof gift.status, "available">]}
        </span>
      )}

      {isModalOpen && (
        <GiftDetailsModal gift={gift} canReserveForLater={canReserveForLater} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: PASS (all tests, including the new `autoOpen` case)

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftCard.tsx src/components/gifts/GiftCard.test.tsx
git commit -m "feat: translucent GiftCard styling, larger image, autoOpen prop"
```

---

### Task 6: `GiftGrid` — wider columns, `openGiftId`/`emptyMessage` props

**Files:**
- Modify: `src/components/gifts/GiftGrid.tsx`
- Create: `src/components/gifts/GiftGrid.test.tsx`

**Interfaces:**
- Consumes: `autoOpen` prop on `GiftCard` from Task 5.
- Produces: `openGiftId?: string | null` and `emptyMessage?: string` props on `GiftGrid`. Consumed by Task 9 (`page.tsx`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/gifts/GiftGrid.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { GiftDto } from "@/components/gifts/GiftDto";

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: vi.fn(),
  reserveGiftForLaterAction: vi.fn(),
}));

const gifts: GiftDto[] = [
  {
    id: "gift-1",
    name: "Air fryer",
    description: "",
    imageUrl: null,
    price: 450,
    category: "cozinha",
    status: "available",
  },
  {
    id: "gift-2",
    name: "Jogo de taças",
    description: "",
    imageUrl: null,
    price: 120,
    category: "cozinha",
    status: "available",
  },
];

describe("GiftGrid", () => {
  it("shows the default empty-state message when there are no gifts and no override is given", () => {
    render(<GiftGrid gifts={[]} canReserveForLater />);
    expect(screen.getByText("A lista de presentes ainda está sendo preparada.")).toBeInTheDocument();
  });

  it("shows a custom empty message when provided", () => {
    render(<GiftGrid gifts={[]} canReserveForLater emptyMessage="Nenhum presente encontrado com esses filtros." />);
    expect(screen.getByText("Nenhum presente encontrado com esses filtros.")).toBeInTheDocument();
  });

  it("opens the modal for the gift matching openGiftId, and no other", () => {
    render(<GiftGrid gifts={gifts} canReserveForLater openGiftId="gift-2" />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jogo de taças" })).toBeInTheDocument();
  });

  it("opens no modal when openGiftId is null", () => {
    render(<GiftGrid gifts={gifts} canReserveForLater openGiftId={null} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/gifts/GiftGrid.test.tsx`
Expected: FAIL — `openGiftId`/`emptyMessage` have no effect yet (TS may also flag the unknown props)

- [ ] **Step 3: Update `GiftGrid`**

Replace the full contents of `src/components/gifts/GiftGrid.tsx`:

```tsx
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftCard } from "@/components/gifts/GiftCard";

interface GiftGridProps {
  gifts: GiftDto[];
  canReserveForLater: boolean;
  openGiftId?: string | null;
  emptyMessage?: string;
}

export function GiftGrid({ gifts, canReserveForLater, openGiftId = null, emptyMessage }: GiftGridProps) {
  if (gifts.length === 0) {
    return (
      <p className="text-center font-sans text-forest/70">
        {emptyMessage ?? "A lista de presentes ainda está sendo preparada."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {gifts.map((gift) => (
        <GiftCard
          key={gift.id}
          gift={gift}
          canReserveForLater={canReserveForLater}
          autoOpen={gift.id === openGiftId}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/gifts/GiftGrid.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftGrid.tsx src/components/gifts/GiftGrid.test.tsx
git commit -m "feat: GiftGrid gains 4-column layout, openGiftId and emptyMessage props"
```

---

### Task 7: `GiftDetailsModal` — "Compartilhar" button

**Files:**
- Modify: `src/components/gifts/GiftDetailsModal.tsx`
- Modify: `src/components/gifts/GiftDetailsModal.test.tsx`

**Interfaces:**
- Consumes: `shareOrCopyLink` from Task 2.
- Produces: nothing new for later tasks — this is a leaf UI addition.

- [ ] **Step 1: Write the failing tests**

Add this `vi.mock` near the top of `src/components/gifts/GiftDetailsModal.test.tsx`, alongside the existing `vi.mock("@/app/presentes/actions", ...)`:

```ts
const shareOrCopyLinkMock = vi.fn();

vi.mock("@/shared/utils/shareOrCopyLink", () => ({
  shareOrCopyLink: (...args: unknown[]) => shareOrCopyLinkMock(...args),
}));
```

Add `shareOrCopyLinkMock.mockReset();` to the existing `beforeEach` block (alongside the two existing `mockReset()` calls).

Add these tests inside the existing `describe("GiftDetailsModal"` block:

```tsx
  it("shares a link containing the gift id when 'Compartilhar' is clicked", async () => {
    shareOrCopyLinkMock.mockResolvedValue("shared");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(shareOrCopyLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Air fryer",
        url: expect.stringContaining("presente=gift-1"),
      })
    );
  });

  it("shows 'Link copiado!' feedback when the share falls back to clipboard copy", async () => {
    shareOrCopyLinkMock.mockResolvedValue("copied");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(await screen.findByRole("button", { name: "Link copiado!" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: FAIL — no "Compartilhar" button exists yet

- [ ] **Step 3: Update `GiftDetailsModal`**

In `src/components/gifts/GiftDetailsModal.tsx`, add the import:

```ts
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";
```

Add local state and a handler right after the existing `dialogRef`/`useFocusTrap` lines (after `useFocusTrap(dialogRef, true, showConfirmation ? dismissConfirmation : onClose);`):

```ts
  const [copyFeedback, setCopyFeedback] = useState(false);

  async function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("presente", gift.id);
    const result = await shareOrCopyLink({ title: gift.name, url: url.toString() });
    if (result === "copied") {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }
```

Replace the existing close-button block:

```tsx
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 font-sans text-2xl leading-none text-forest/60 hover:text-forest"
        >
          &times;
        </button>
```

with:

```tsx
        <div className="absolute right-4 top-4 z-10 flex items-center gap-4">
          <button
            type="button"
            onClick={handleShare}
            className="font-sans text-xs uppercase tracking-widest text-forest/60 hover:text-forest"
          >
            {copyFeedback ? "Link copiado!" : "Compartilhar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="font-sans text-2xl leading-none text-forest/60 hover:text-forest"
          >
            &times;
          </button>
        </div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: PASS (all tests, including the 2 new share cases)

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftDetailsModal.tsx src/components/gifts/GiftDetailsModal.test.tsx
git commit -m "feat: add Compartilhar button to GiftDetailsModal"
```

---

### Task 8: `GiftFiltersBar` — desktop bar + mobile panel

**Files:**
- Create: `src/components/gifts/GiftFiltersBar.tsx`
- Create: `src/components/gifts/GiftFiltersBar.test.tsx`

**Interfaces:**
- Consumes: `shareOrCopyLink` from Task 2; `useFocusTrap` from `@/hooks/useFocusTrap` (unchanged).
- Produces: `GiftFiltersBar` component, props `{ categories: string[] }`, reading/writing `q`/`categoria`/`situacao`/`ordenar` itself via `next/navigation`. Consumed by Task 9 (`page.tsx`), which must wrap it in `<Suspense>` (it calls `useSearchParams()`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/gifts/GiftFiltersBar.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GiftFiltersBar } from "@/components/gifts/GiftFiltersBar";

const shareOrCopyLinkMock = vi.fn();
vi.mock("@/shared/utils/shareOrCopyLink", () => ({
  shareOrCopyLink: (...args: unknown[]) => shareOrCopyLinkMock(...args),
}));

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  pushMock.mockReset();
  shareOrCopyLinkMock.mockReset();
  currentSearchParams = new URLSearchParams();
  vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
  vi.mocked(usePathname).mockReturnValue("/presentes");
  vi.mocked(useSearchParams).mockImplementation(
    () => currentSearchParams as unknown as ReturnType<typeof useSearchParams>
  );
});

describe("GiftFiltersBar", () => {
  it("renders every category as a checkbox", () => {
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);
    expect(screen.getAllByRole("checkbox", { name: "casa" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "cozinha" })[0]).toBeInTheDocument();
  });

  it("pushes a categoria param when a category checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);

    await user.click(screen.getAllByRole("checkbox", { name: "casa" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?categoria=casa");
  });

  it("pushes a situacao param when the status select changes", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.selectOptions(screen.getAllByLabelText("Situação")[0], "available");

    expect(pushMock).toHaveBeenCalledWith("/presentes?situacao=available");
  });

  it("pushes a q param after the debounce delay once the user stops typing", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<GiftFiltersBar categories={[]} />);

    await user.type(screen.getAllByLabelText("Buscar")[0], "air fryer");
    expect(pushMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(pushMock).toHaveBeenCalledWith("/presentes?q=air+fryer");
    vi.useRealTimers();
  });

  it("clears every filter param but preserves an existing status param", async () => {
    currentSearchParams = new URLSearchParams("q=air&situacao=available&status=sucesso");
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?status=sucesso");
  });

  it("calls shareOrCopyLink with the current URL when 'Compartilhar' is clicked", async () => {
    shareOrCopyLinkMock.mockResolvedValue("shared");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes?situacao=available"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.click(screen.getAllByRole("button", { name: "Compartilhar" })[0]);

    expect(shareOrCopyLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://sjcasamento.site/presentes?situacao=available" })
    );
  });

  it("opens a focus-trapped panel on mobile via the Filtros button, closable via its close control", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /filtros/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/gifts/GiftFiltersBar.test.tsx`
Expected: FAIL — `Cannot find module '@/components/gifts/GiftFiltersBar'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/gifts/GiftFiltersBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";

interface GiftFiltersBarProps {
  categories: string[];
}

const SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "nome-asc", label: "Nome (A-Z)" },
  { value: "nome-desc", label: "Nome (Z-A)" },
  { value: "valor-asc", label: "Valor (menor-maior)" },
  { value: "valor-desc", label: "Valor (maior-menor)" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "paid", label: "Presenteado" },
];

const fieldClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none";
const buttonClassName =
  "min-h-11 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss";

export function GiftFiltersBar({ categories }: GiftFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const currentCategories = searchParams.getAll("categoria");
  const currentSituacao = searchParams.get("situacao") ?? "";
  const currentOrdenar = searchParams.get("ordenar") ?? "recentes";

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, isPanelOpen, () => setIsPanelOpen(false));

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput === currentQuery) return;
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set("q", searchInput);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, currentQuery, searchParams, pathname, router]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setSingleParam(key: string, value: string | null) {
    pushParams((params) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  function toggleCategory(category: string) {
    pushParams((params) => {
      const selected = new Set(params.getAll("categoria"));
      if (selected.has(category)) {
        selected.delete(category);
      } else {
        selected.add(category);
      }
      params.delete("categoria");
      selected.forEach((item) => params.append("categoria", item));
    });
  }

  function clearFilters() {
    const params = new URLSearchParams();
    const status = searchParams.get("status");
    if (status) params.set("status", status);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  async function handleShare() {
    const result = await shareOrCopyLink({ title: "Lista de Presentes", url: window.location.href });
    if (result === "copied") {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }

  const activeFilterCount =
    (currentQuery ? 1 : 0) + (currentCategories.length > 0 ? 1 : 0) + (currentSituacao ? 1 : 0);

  function renderControls(idPrefix: string) {
    return (
      <>
        <div>
          <label htmlFor={`${idPrefix}-search`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Buscar
          </label>
          <input
            id={`${idPrefix}-search`}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome do presente"
            className={fieldClassName}
          />
        </div>

        <div>
          <span className="block font-sans text-xs uppercase tracking-widest text-forest/70">Categoria</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {categories.map((category) => (
              <label key={category} className="flex items-center gap-1.5 font-sans text-sm text-forest">
                <input
                  type="checkbox"
                  checked={currentCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-situacao`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Situação
          </label>
          <select
            id={`${idPrefix}-situacao`}
            value={currentSituacao}
            onChange={(event) => setSingleParam("situacao", event.target.value || null)}
            className={fieldClassName}
          >
            <option value="">Todas</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-ordenar`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Ordenar por
          </label>
          <select
            id={`${idPrefix}-ordenar`}
            value={currentOrdenar}
            onChange={(event) => setSingleParam("ordenar", event.target.value === "recentes" ? null : event.target.value)}
            className={fieldClassName}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={clearFilters} className={buttonClassName}>
            Limpar filtros
          </button>
          <button type="button" onClick={handleShare} className={buttonClassName}>
            {copyFeedback ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="mb-8">
      <div className="hidden sm:flex sm:flex-wrap sm:items-end sm:gap-4">{renderControls("filters-desktop")}</div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="relative min-h-11 w-full rounded-full border border-line bg-paper px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest"
        >
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[10px] text-paper">
              {activeFilterCount}
            </span>
          )}
        </button>

        {isPanelOpen && (
          <div className="fixed inset-0 z-50 bg-forest/40 p-4" onClick={() => setIsPanelOpen(false)}>
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              onClick={(event) => event.stopPropagation()}
              className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-lg bg-paper p-6"
            >
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Fechar"
                className="self-end font-sans text-2xl leading-none text-forest/60 hover:text-forest"
              >
                &times;
              </button>
              {renderControls("filters-mobile")}
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="min-h-11 rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/gifts/GiftFiltersBar.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/gifts/GiftFiltersBar.tsx src/components/gifts/GiftFiltersBar.test.tsx
git commit -m "feat: add GiftFiltersBar (search/category/status/sort/clear/share, desktop bar + mobile panel)"
```

---

### Task 9: Page wiring — background image, wider container, filters integration

**Files:**
- Modify: `src/app/presentes/page.tsx`

**Interfaces:**
- Consumes: `filterAndSortGifts`, `getGiftCategories` (Task 1); `presentesContentSchema`/`"presentes"` slug (Task 3); `GiftFiltersBar` (Task 8); `GiftGrid`'s `openGiftId`/`emptyMessage` props (Task 6).
- Produces: nothing further — this is the integration point; Task 10 verifies the whole feature end-to-end.

- [ ] **Step 1: Replace `src/app/presentes/page.tsx`**

No new automated test is added for this Server Component (consistent with today — it has no dedicated test file); the manual browser smoke check in Task 10 covers it end-to-end.

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { createListGiftsUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { GiftFiltersBar } from "@/components/gifts/GiftFiltersBar";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { canReserveForLater } from "@/shared/utils/giftReservationWindow";
import { filterAndSortGifts, getGiftCategories } from "@/shared/utils/giftFilters";

export const metadata: Metadata = {
  title: "Lista de Presentes | Stéfanie & Jonatas",
};

interface GiftsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    categoria?: string | string[];
    situacao?: string;
    ordenar?: string;
    presente?: string;
  }>;
}

const STATUS_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento aprovado! Muito obrigado pelo carinho.",
  pendente: "Pagamento em processamento. Assim que for aprovado, atualizaremos a lista.",
  falha: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { status, q, categoria, situacao, ordenar, presente } = await searchParams;

  let gifts: GiftDto[] = [];
  let loadError = false;
  let allowReserveForLater = false;
  let backgroundImage: string | null = null;

  if (isBackendConfigured()) {
    try {
      const [result, settings, presentesContent] = await Promise.all([
        createListGiftsUseCase().execute(),
        getSiteContentOrDefault("settings"),
        getSiteContentOrDefault("presentes"),
      ]);
      gifts = result.map(mapGiftToDto);
      allowReserveForLater = canReserveForLater(new Date(settings.weddingDateIso));
      backgroundImage = presentesContent.backgroundImage;
    } catch {
      loadError = true;
    }
  }

  const categories = getGiftCategories(gifts);
  const visibleGifts = filterAndSortGifts(gifts, { q, categoria: toArray(categoria), situacao, ordenar });
  const openGiftId = presente && gifts.some((gift) => gift.id === presente) ? presente : null;

  return (
    <div className="pb-20 pt-16">
      {backgroundImage && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      <h1 className="sr-only">Lista de Presentes</h1>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto max-w-2xl px-6">
          <p className="rounded-md border border-moss/40 bg-moss/10 px-4 py-3 text-center font-sans text-sm text-forest">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-7xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <>
            {gifts.length > 0 && (
              <Suspense fallback={<div className="mb-8 h-11" />}>
                <GiftFiltersBar categories={categories} />
              </Suspense>
            )}
            <GiftGrid
              gifts={visibleGifts}
              canReserveForLater={allowReserveForLater}
              openGiftId={openGiftId}
              emptyMessage={gifts.length > 0 ? "Nenhum presente encontrado com esses filtros." : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS (no test targets `page.tsx` directly, but this confirms nothing else broke)

- [ ] **Step 4: Commit**

```bash
git add src/app/presentes/page.tsx
git commit -m "feat: wire background image, wider container, and filters into the Presentes page"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full grep sweep for stray old class names**

Run: `grep -rn "grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5" src/components/gifts/`
Expected: no matches (old `GiftGrid` column classes fully replaced)

Run: `grep -rn "bg-paper p-4 text-center" src/components/gifts/GiftCard.tsx`
Expected: no matches (old opaque `GiftCard` wrapper classes fully replaced)

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all PASS, 0 lint errors (pre-existing `<img>` warnings are expected and unrelated; the new `<img>` inside `PhotoUploadField`'s preview and the payment icons are already covered by that pre-existing exclusion)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds, route list includes `/admin/conteudo/presentes` and `/presentes` (still dynamic `ƒ`, since it reads `searchParams`)

- [ ] **Step 4: Manual browser smoke check**

Start the dev server and, using a real or seeded gift list with at least 2 categories and a mix of statuses:

1. Visit `/presentes` with no filters — confirm the wider container, larger translucent cards, 4-column desktop grid / 1-column full-width mobile grid, and (if a background image was set via `/admin/conteudo/presentes`) the background photo showing through the cards' blur.
2. Desktop: use the filter bar — search by name, toggle 2 categories, pick a status, change the sort order, confirm the grid updates and the URL reflects `q`/`categoria`/`situacao`/`ordenar`.
3. Click "Limpar filtros" — confirm the URL and grid reset, and that an existing `?status=sucesso` param (if present) survives the clear.
4. Resize to mobile width — confirm the "Filtros" button (with active-count badge once a filter is set) opens a focus-trapped full-screen panel with the same controls, closable via its close button, backdrop click, and Escape.
5. Open a gift's modal, click "Compartilhar" — confirm either the native share sheet appears or the link is copied (feedback text changes to "Link copiado!"); paste/open that link in a fresh tab and confirm the same gift's modal auto-opens.
6. Click "Compartilhar" in the filter bar with some filters active — confirm the copied/shared URL includes those filter params; open it in a fresh tab and confirm the grid reflects the same filters.
7. In `/admin/conteudo/presentes`, upload a background image, save, confirm the redirect to `/admin/conteudo` and that `/presentes` now shows the image; remove it and confirm `/presentes` falls back to the solid background.

- [ ] **Step 5: Update the durable progress ledger**

Append a line to `.superpowers/sdd/progress.md` recording this phase's completion (plan identifier, e.g. "P18"), summarizing the test/lint/build results and anything not verifiable in this session (e.g. no admin credentials, no seeded gift data).
