# Painel Administrativo — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin panel a stronger "admin software" feel (sidebar with icons per module, header with breadcrumb + logged-in user, content in cards) while keeping the site's forest/moss/paper identity; add an admin-uploadable logo (dark/light variants, used in the site header + mobile menu + transactional emails); and reorganize `/admin/integracoes` into tabs that only show the payment provider form matching the currently active provider.

**Architecture:** Pure UI/presentation reorganization for the layout and Integrações work — no new server actions beyond one new content-upload action for the logo. The logo feature follows the codebase's existing site-content pattern exactly (`SITE_CONTENT_SCHEMAS` slug + `resolvePhotoField` + `PhotoUploadField`), the same one used today by `conteudo/presentes`. The admin shell becomes a Server Component (`layout.tsx`) that fetches the logged-in user's e-mail and delegates rendering to a Client Component (`AdminShell.tsx`) that owns all the existing interactive nav/mobile-menu logic.

**Tech Stack:** Next.js App Router (Server/Client Components, Server Actions), React 19 (`useActionState`), Zod, Supabase (Postgres content table + Storage), Vitest + Testing Library, Tailwind.

## Global Constraints

- Keep the existing forest/moss/paper palette and Playfair/Inter typography — do not introduce a dark admin theme.
- No new npm dependencies (no icon library) — icons are inline SVGs matching the stroke style already used in `PhotoUploadField.tsx` (`fill="none"`, `strokeWidth={1.5}`, rounded caps/joins).
- No new top-level nav modules — same five groups as today (Visão geral, Convidados, Presentes, Conteúdo, Configurações).
- Favicon (`src/app/icon.tsx`) and OG image (`src/app/opengraph-image.tsx`) are explicitly out of scope — do not touch them.
- Site-wide dynamic colors are explicitly out of scope — do not touch Tailwind config or introduce CSS custom properties for theming.
- Access-profile/RBAC work is a separate future project — do not touch Supabase Auth user management.
- Every new server action must follow the existing `SiteContentActionState` (`{ status: "idle" | "error"; message?: string }`) + `redirect()`-on-success pattern used by `conteudo/presentes/actions.ts` and `conteudo/hero/actions.ts`.

---

### Task 1: `identidade-visual` content schema

**Files:**
- Modify: `src/application/content/schemas.ts`

**Interfaces:**
- Produces: `identidadeVisualContentSchema` (Zod schema), `IdentidadeVisualContent` (type), and the `"identidade-visual"` entry added to `SITE_CONTENT_SLUGS` / `SITE_CONTENT_SCHEMAS`, consumed by Tasks 2, 3, 4, 7.

- [ ] **Step 1: Add the schema, type, slug, and schema-map entry**

In `src/application/content/schemas.ts`, add this block directly after `presentesContentSchema` (after line 134, before `export const SITE_CONTENT_SLUGS = [...]`):

```ts
export const identidadeVisualContentSchema = z.object({
  logoDark: z.string().min(1).nullable().default(null),
  logoLight: z.string().min(1).nullable().default(null),
});
export type IdentidadeVisualContent = z.output<typeof identidadeVisualContentSchema>;
```

Then update `SITE_CONTENT_SLUGS` and `SITE_CONTENT_SCHEMAS` to include it:

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
  "identidade-visual",
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
  "identidade-visual": identidadeVisualContentSchema,
} satisfies Record<SiteContentSlug, z.ZodTypeAny>;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/application/content/schemas.ts
git commit -m "feat: add identidade-visual site content schema for logo uploads"
```

---

### Task 2: `updateIdentidadeVisualAction`

**Files:**
- Create: `src/app/admin/(protected)/conteudo/identidade-visual/actions.ts`
- Test: `src/app/admin/(protected)/conteudo/identidade-visual/actions.test.ts`

**Interfaces:**
- Consumes: `identidadeVisualContentSchema` (Task 1), `resolvePhotoField`, `createUpdateSiteContentUseCase` (both from `@/infrastructure/composition`, already exported), `SiteContentActionState` (from `@/application/content/actionState`, already exists).
- Produces: `updateIdentidadeVisualAction(prevState: SiteContentActionState, formData: FormData): Promise<SiteContentActionState>`, consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(protected)/conteudo/identidade-visual/actions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { updateIdentidadeVisualAction } from "./actions";

const executeMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/infrastructure/composition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/infrastructure/composition")>();
  return {
    ...actual,
    createUpdateSiteContentUseCase: () => ({ execute: executeMock }),
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateIdentidadeVisualAction", () => {
  it("saves null for both logos when nothing was ever uploaded", async () => {
    const formData = new FormData();

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", { logoDark: null, logoLight: null });
  });

  it("keeps the current logo URLs when no new file is uploaded and nothing is marked for removal", async () => {
    const formData = new FormData();
    formData.set("logoDarkCurrentUrl", "https://storage.example.com/logo-dark.png");
    formData.set("logoLightCurrentUrl", "https://storage.example.com/logo-light.png");

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", {
      logoDark: "https://storage.example.com/logo-dark.png",
      logoLight: "https://storage.example.com/logo-light.png",
    });
  });

  it("clears a logo when its remove checkbox is checked", async () => {
    const formData = new FormData();
    formData.set("logoDarkCurrentUrl", "https://storage.example.com/logo-dark.png");
    formData.set("logoDarkRemove", "on");

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", { logoDark: null, logoLight: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/conteudo/identidade-visual/actions.test.ts"`
Expected: FAIL — `Failed to resolve import "./actions"` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/app/admin/(protected)/conteudo/identidade-visual/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { identidadeVisualContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateIdentidadeVisualAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentLogoDarkUrl = (formData.get("logoDarkCurrentUrl") as string) || null;
  const logoDark = await resolvePhotoField(
    "identidade-visual",
    "logoDark",
    formData,
    currentLogoDarkUrl,
    "logoDarkFile",
    "logoDarkRemove"
  );

  const currentLogoLightUrl = (formData.get("logoLightCurrentUrl") as string) || null;
  const logoLight = await resolvePhotoField(
    "identidade-visual",
    "logoLight",
    formData,
    currentLogoLightUrl,
    "logoLightFile",
    "logoLightRemove"
  );

  const parsed = identidadeVisualContentSchema.safeParse({ logoDark, logoLight });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("identidade-visual", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/");
  revalidatePath("/admin/conteudo/identidade-visual");
  redirect("/admin/conteudo");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/conteudo/identidade-visual/actions.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/identidade-visual/actions.ts" "src/app/admin/(protected)/conteudo/identidade-visual/actions.test.ts"
git commit -m "feat: add server action to save the site's dark/light logo uploads"
```

---

### Task 3: `IdentidadeVisualForm` component

**Files:**
- Create: `src/components/admin/IdentidadeVisualForm.tsx`
- Test: `src/components/admin/IdentidadeVisualForm.test.tsx`

**Interfaces:**
- Consumes: `updateIdentidadeVisualAction` (Task 2), `PhotoUploadField` (existing, `src/components/admin/PhotoUploadField.tsx`, props `name/currentUrl/label/className`), `SiteContentActionState`, `IdentidadeVisualContent` (Task 1).
- Produces: `IdentidadeVisualForm({ defaultValues: IdentidadeVisualContent })`, consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/IdentidadeVisualForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentidadeVisualForm } from "@/components/admin/IdentidadeVisualForm";

const updateIdentidadeVisualActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/conteudo/identidade-visual/actions", () => ({
  updateIdentidadeVisualAction: (...args: unknown[]) => updateIdentidadeVisualActionMock(...args),
}));

describe("IdentidadeVisualForm", () => {
  it("renders both logo fields with their current images", () => {
    render(
      <IdentidadeVisualForm
        defaultValues={{
          logoDark: "https://example.com/logo-dark.png",
          logoLight: "https://example.com/logo-light.png",
        }}
      />
    );

    expect(screen.getByAltText("Logo (versão escura)")).toHaveAttribute(
      "src",
      "https://example.com/logo-dark.png"
    );
    expect(screen.getByAltText("Logo (versão clara)")).toHaveAttribute(
      "src",
      "https://example.com/logo-light.png"
    );
  });

  it("renders both fields empty when no logo was uploaded yet", () => {
    render(<IdentidadeVisualForm defaultValues={{ logoDark: null, logoLight: null }} />);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.queryByAltText("Logo (versão escura)")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Logo (versão clara)")).not.toBeInTheDocument();
  });

  it("shows the error message returned by the action when saving fails", async () => {
    updateIdentidadeVisualActionMock.mockResolvedValue({
      status: "error",
      message: "Não foi possível salvar agora.",
    });
    const user = userEvent.setup();
    render(<IdentidadeVisualForm defaultValues={{ logoDark: null, logoLight: null }} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar agora.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/IdentidadeVisualForm.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/admin/IdentidadeVisualForm"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/admin/IdentidadeVisualForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateIdentidadeVisualAction } from "@/app/admin/(protected)/conteudo/identidade-visual/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { IdentidadeVisualContent } from "@/application/content/schemas";

interface IdentidadeVisualFormProps {
  defaultValues: IdentidadeVisualContent;
}

const initialIdentidadeVisualActionState: SiteContentActionState = { status: "idle" };

export function IdentidadeVisualForm({ defaultValues }: IdentidadeVisualFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateIdentidadeVisualAction,
    initialIdentidadeVisualActionState
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      <div>
        <span className="block font-sans text-sm text-forest">Logo (versão escura)</span>
        <p className="mt-1 font-sans text-xs text-forest/60">
          Usada no cabeçalho do site sobre fundo claro e no menu mobile.
        </p>
        <div className="mt-1">
          <PhotoUploadField
            name="logoDark"
            currentUrl={defaultValues.logoDark}
            label="Logo (versão escura)"
            className="h-24 w-full rounded-md"
          />
        </div>
      </div>

      <div>
        <span className="block font-sans text-sm text-forest">Logo (versão clara)</span>
        <p className="mt-1 font-sans text-xs text-forest/60">
          Usada no cabeçalho sobre a foto do topo da Home, antes de rolar a página.
        </p>
        <div className="mt-1">
          <PhotoUploadField
            name="logoLight"
            currentUrl={defaultValues.logoLight}
            label="Logo (versão clara)"
            className="h-24 w-full rounded-md bg-forest"
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/IdentidadeVisualForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/IdentidadeVisualForm.tsx src/components/admin/IdentidadeVisualForm.test.tsx
git commit -m "feat: add admin form for uploading the site's dark/light logo"
```

---

### Task 4: Identidade Visual page + index link

**Files:**
- Create: `src/app/admin/(protected)/conteudo/identidade-visual/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/page.tsx`

**Interfaces:**
- Consumes: `getSiteContentOrDefault("identidade-visual")` (from `@/infrastructure/composition`, works automatically once Task 1 adds the slug), `IdentidadeVisualForm` (Task 3).

- [ ] **Step 1: Create the page**

Create `src/app/admin/(protected)/conteudo/identidade-visual/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { IdentidadeVisualForm } from "@/components/admin/IdentidadeVisualForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Identidade Visual | Painel Administrativo",
};

export default async function IdentidadeVisualContentPage() {
  const content = await getSiteContentOrDefault("identidade-visual");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Identidade Visual</h1>
      <div className="mt-6">
        <IdentidadeVisualForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add it to the content index page**

In `src/app/admin/(protected)/conteudo/page.tsx`, add a new entry to the `"Configurações gerais"` group's `sections` array (after the existing "Data do casamento" entry):

```ts
  {
    label: "Configurações gerais",
    sections: [
      {
        label: "Data do casamento",
        description: "Data e horário exibidos no contador da Home.",
        href: "/admin/conteudo/configuracoes",
      },
      {
        label: "Identidade Visual",
        description: "Logo do site (versões clara e escura).",
        href: "/admin/conteudo/identidade-visual",
      },
    ],
  },
```

- [ ] **Step 3: Typecheck and run the full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/identidade-visual/page.tsx" "src/app/admin/(protected)/conteudo/page.tsx"
git commit -m "feat: add Identidade Visual page to the content section index"
```

---

### Task 5: `Monogram` override props

**Files:**
- Modify: `src/components/ui/Monogram.tsx`
- Modify: `src/components/ui/Monogram.test.tsx`

**Interfaces:**
- Produces: `Monogram({ className?, light?, srcDark?: string | null, srcLight?: string | null })`, consumed by Task 6. When `srcDark`/`srcLight` are omitted or `null`, behavior is unchanged (falls back to `/images/logo.png` / `/images/logo-light.png`).

- [ ] **Step 1: Write the failing tests**

Add these three tests to the end of `src/components/ui/Monogram.test.tsx` (inside the existing `describe` block):

```tsx
  it("uses the srcDark override when provided", () => {
    render(<Monogram srcDark="https://example.com/logo-dark.png" />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute(
      "src",
      "https://example.com/logo-dark.png"
    );
  });

  it("uses the srcLight override only when light is true", () => {
    render(
      <Monogram
        light
        srcDark="https://example.com/logo-dark.png"
        srcLight="https://example.com/logo-light.png"
      />
    );

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute(
      "src",
      "https://example.com/logo-light.png"
    );
  });

  it("falls back to the static asset when light is true but no override is given", () => {
    render(<Monogram light />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute("src", "/images/logo-light.png");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/Monogram.test.tsx`
Expected: the 3 new tests FAIL (src still resolves to the static path regardless of the override props, since `Monogram` doesn't accept them yet — extra props are simply ignored by React).

- [ ] **Step 3: Implement the override props**

Replace the contents of `src/components/ui/Monogram.tsx`:

```tsx
import { cn } from "@/shared/utils/cn";

interface MonogramProps {
  className?: string;
  light?: boolean;
  srcDark?: string | null;
  srcLight?: string | null;
}

/**
 * The couple's official logo mark, used in Header/MobileMenu/Footer.
 * Source: references/images/logo-stefanie-jonatas.png (local design
 * reference, not in the repo — shipped copy lives at
 * public/images/logo.png). `light` swaps to the light-colored variant
 * (references/images/logo-stefanie-jonatas-300x600_claro.png, shipped at
 * public/images/logo-light.png) for use over dark backgrounds, e.g. the
 * Header's transparent state over the hero photo. `srcDark`/`srcLight`
 * let callers override either variant with an admin-uploaded logo
 * (src/app/admin/(protected)/conteudo/identidade-visual); omitting them
 * (or passing null) keeps the static file as-is.
 */
export function Monogram({ className, light, srcDark, srcLight }: MonogramProps) {
  const fallback = light ? "/images/logo-light.png" : "/images/logo.png";
  const override = light ? srcLight : srcDark;

  return (
    <img
      src={override ?? fallback}
      alt="Stéfanie & Jonatas"
      className={cn("h-10 w-auto object-contain transition-[height] duration-300", className)}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/Monogram.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Monogram.tsx src/components/ui/Monogram.test.tsx
git commit -m "feat: let Monogram accept admin-uploaded logo overrides"
```

---

### Task 6: Thread the uploaded logo through Header, MobileMenu, and the root layout

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`
- Modify: `src/components/layout/MobileMenu.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `Monogram` override props (Task 5), `getSiteContentOrDefault("identidade-visual")` (Task 1/existing helper).
- Produces: `Header({ logoDark?: string | null; logoLight?: string | null })`, `MobileMenu({ isOpen, onClose, logoDark?: string | null })`. Both props are optional so every existing call site (including tests) keeps working unchanged.

- [ ] **Step 1: Write the failing test**

Add this test to the end of `src/components/layout/Header.test.tsx` (inside the `describe` block):

```tsx
  it("forwards the admin-uploaded logo overrides to Monogram", () => {
    render(<Header logoDark="https://example.com/logo-dark.png" logoLight="https://example.com/logo-light.png" />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute(
      "src",
      "https://example.com/logo-light.png"
    );
  });
```

(The default render at the top of the page is transparent/`light`, so with both overrides passed it should show the light one — matching the existing "renders the larger logo only while transparent" test's initial state.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: FAIL — TypeScript error (Header takes no props) or, if TS is not enforced by the test runner, the image src stays `/images/logo-light.png` instead of the override.

- [ ] **Step 3: Update `Header.tsx`**

In `src/components/layout/Header.tsx`, change the function signature and the `Monogram`/`MobileMenu` usages:

```tsx
"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NAV_ITEMS } from "@/shared/navigation";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Monogram } from "@/components/ui/Monogram";
import { cn } from "@/shared/utils/cn";

const TRANSPARENT_SCROLL_THRESHOLD_PX = 80;

interface HeaderProps {
  logoDark?: string | null;
  logoLight?: string | null;
}

export function Header({ logoDark, logoLight }: HeaderProps = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled;

  useLayoutEffect(() => {
    if (!isHome) return;

    function handleScroll() {
      setIsScrolled(window.scrollY > TRANSPARENT_SCROLL_THRESHOLD_PX);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex items-center transition-[color,background-color,padding] duration-300",
        isTransparent ? "py-[25px] bg-transparent text-paper" : "py-4 border-b border-line bg-mist text-forest"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Início" className="text-current">
          <Monogram
            light={isTransparent}
            srcDark={logoDark}
            srcLight={logoLight}
            className={isTransparent ? "h-[65px] w-auto" : "h-10 w-auto"}
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? cn("font-script text-lg italic", isTransparent ? "text-paper" : "text-moss")
                    : "font-serif uppercase tracking-[0.2em] text-current/80 hover:text-moss"
                )}
              >
                {isActive ? item.label.toLowerCase() : item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex flex-col gap-1.5 md:hidden"
        >
          <span className="block h-px w-6 bg-current" />
          <span className="block h-px w-6 bg-current" />
          <span className="block h-px w-4 bg-current" />
        </button>
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} logoDark={logoDark} />
    </header>
  );
}
```

- [ ] **Step 4: Update `MobileMenu.tsx`**

In `src/components/layout/MobileMenu.tsx`, add the `logoDark` prop and forward it:

```tsx
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  logoDark?: string | null;
}

export function MobileMenu({ isOpen, onClose, logoDark }: MobileMenuProps) {
```

And update the `<Monogram />` usage inside the component:

```tsx
            <Monogram className="h-12 w-auto" srcDark={logoDark} />
```

- [ ] **Step 5: Fetch the logo content once in the root layout**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter, Alex_Brush } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageLoader } from "@/components/ui/PageLoader";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const alexBrush = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin"],
  weight: ["400"],
});

const TITLE = "Stéfanie & Jonatas | Nosso Casamento";
const DESCRIPTION =
  "Acompanhe os detalhes do casamento de Stéfanie e Jonatas: confirme presença, veja a lista de presentes e saiba tudo sobre o grande dia.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sjcasamento.site"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identidadeVisual = await getSiteContentOrDefault("identidade-visual");

  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${inter.variable} ${alexBrush.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <PageLoader />
        <Header logoDark={identidadeVisual.logoDark} logoLight={identidadeVisual.logoLight} />
        <main className="flex-1 pt-[72px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/layout/Header.test.tsx src/components/layout/MobileMenu.test.tsx`
Expected: PASS, including the new test.

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/components/layout/MobileMenu.tsx src/app/layout.tsx
git commit -m "feat: show the admin-uploaded logo in the site header and mobile menu"
```

---

### Task 7: Uploaded logo in transactional e-mails

**Files:**
- Modify: `src/infrastructure/email/ResendEmailGateway.ts`
- Modify: `src/infrastructure/email/ResendEmailGateway.test.ts`
- Modify: `src/infrastructure/composition.ts`

**Interfaces:**
- Consumes: `identidadeVisualContentSchema` (Task 1), `SiteContentRepository` (existing interface, `src/domain/repositories/SiteContentRepository.ts`).
- Produces: `resolveEmailLogoUrl(logoDark: string | null, siteUrl: string): string` (exported, tested directly); `ResendEmailGateway` constructor gains a second required parameter `siteContentRepository: SiteContentRepository`.

- [ ] **Step 1: Write the failing test**

Add this to `src/infrastructure/email/ResendEmailGateway.test.ts` (new `describe` block, alongside the existing `htmlToPlainText` import):

```ts
import { describe, expect, it } from "vitest";
import { htmlToPlainText, resolveEmailLogoUrl } from "@/infrastructure/email/ResendEmailGateway";

describe("resolveEmailLogoUrl", () => {
  it("uses the admin-uploaded logo when one is set", () => {
    expect(resolveEmailLogoUrl("https://storage.example.com/logo-dark.png", "https://sjcasamento.site")).toBe(
      "https://storage.example.com/logo-dark.png"
    );
  });

  it("falls back to the static asset under the site URL when no logo was uploaded", () => {
    expect(resolveEmailLogoUrl(null, "https://sjcasamento.site")).toBe(
      "https://sjcasamento.site/images/logo.png"
    );
  });
});
```

(Keep the existing `htmlToPlainText` tests in the file as-is — just adjust the top `import` line to also bring in `resolveEmailLogoUrl`, and add the new `describe` block below the existing one.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/email/ResendEmailGateway.test.ts`
Expected: FAIL — `resolveEmailLogoUrl` is not exported yet.

- [ ] **Step 3: Implement**

Replace the contents of `src/infrastructure/email/ResendEmailGateway.ts`:

```ts
import { Resend } from "resend";
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { identidadeVisualContentSchema } from "@/application/content/schemas";
import { getEnv } from "@/infrastructure/config/env";

const FROM_ADDRESS = "Stéfanie & Jonatas <lembretes@sjcasamento.site>";

/**
 * Derives a plain-text alternative from a template's simple body HTML
 * (only <p>, <strong>, <br/> and <a href> are ever used — see templates.ts).
 * Spam filters weigh the absence of a text/plain MIME part heavily, so
 * every email needs one alongside the HTML part, not just for looks.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Resolves which logo image an outgoing e-mail should embed: the
 * admin-uploaded dark-variant logo (src/app/admin/(protected)/conteudo/
 * identidade-visual) when one exists, otherwise the static asset shipped
 * with the site.
 */
export function resolveEmailLogoUrl(logoDark: string | null, siteUrl: string): string {
  return logoDark ?? `${siteUrl}/images/logo.png`;
}

/**
 * Wraps every outgoing notification in the site's own visual identity
 * (centered logo, light-green card on a light-green page background, the
 * same Playfair Display / Inter fonts as the site) so emails read as an
 * extension of sjcasamento.site rather than a bare text message. Email
 * clients strip <style> blocks and most external fonts, so everything is
 * inlined and font stacks fall back to system serif/sans-serif.
 */
function renderEmailShell(bodyHtml: string, logoUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin: 0; padding: 0; background-color: #e3e8c8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3e8c8;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" style="max-width: 480px; background-color: #feffed; border-radius: 12px;">
            <tr>
              <td align="center" style="padding: 32px 32px 16px;">
                <img src="${logoUrl}" alt="Stéfanie &amp; Jonatas" width="110" style="display: block; border: 0;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 40px; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #242a16; font-size: 15px; line-height: 1.7;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export class ResendEmailGateway implements EmailGateway {
  constructor(
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly siteContentRepository: SiteContentRepository
  ) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.resendApiKey) {
      throw new Error("Resend não está configurado. Configure a API Key em Integrações.");
    }

    const identitySection = await this.siteContentRepository.findBySlug("identidade-visual");
    const { logoDark } = identidadeVisualContentSchema.parse(identitySection?.content ?? {});
    const logoUrl = resolveEmailLogoUrl(logoDark, getEnv().NEXT_PUBLIC_SITE_URL);

    const client = new Resend(settings.resendApiKey);
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: renderEmailShell(input.html, logoUrl),
      text: htmlToPlainText(input.html),
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
```

- [ ] **Step 4: Update the composition root**

In `src/infrastructure/composition.ts`, `repositories()` currently builds `siteContentRepository: new SupabaseSiteContentRepository(client)` inline as one property of the returned object — there's no standalone local variable for it yet (unlike `securitySettingsRepository`, which is already pulled out above the `return`). Pull it out the same way, so both the returned object and the new `ResendEmailGateway` argument can reference it. Replace the whole function body:

```ts
function repositories() {
  const client = getSupabaseServiceRoleClient();
  const securitySettingsRepository = new SupabaseAdminSecuritySettingsRepository(client);
  const siteContentRepository = new SupabaseSiteContentRepository(client);
  return {
    guestRepository: new SupabaseGuestRepository(client),
    giftRepository: new SupabaseGiftRepository(client),
    giftContributionRepository: new SupabaseGiftContributionRepository(client),
    siteContentRepository,
    securitySettingsRepository,
    mercadoPagoGateway: new MercadoPagoGateway(securitySettingsRepository),
    infinitePayGateway: new InfinitePayGateway(securitySettingsRepository),
    notificationLogRepository: new SupabaseNotificationLogRepository(client),
    emailGateway: new ResendEmailGateway(securitySettingsRepository, siteContentRepository),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/email/ResendEmailGateway.test.ts`
Expected: PASS (all `htmlToPlainText` tests + 2 new `resolveEmailLogoUrl` tests).

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass (this touches every use case that sends e-mail, so a full run is the only way to be sure nothing else constructs `ResendEmailGateway` directly with the old single-argument signature — confirm via `grep -rn "new ResendEmailGateway" src` that `composition.ts` is the only call site).

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/email/ResendEmailGateway.ts src/infrastructure/email/ResendEmailGateway.test.ts src/infrastructure/composition.ts
git commit -m "feat: use the admin-uploaded logo in transactional emails"
```

---

### Task 8: Admin nav shared types + icons

**Files:**
- Create: `src/components/admin/adminNav.ts`
- Create: `src/components/admin/icons.tsx`

**Interfaces:**
- Produces: `AdminNavItem`, `AdminNavGroup` (types, `src/components/admin/adminNav.ts`), and `HomeIcon`, `UsersIcon`, `GiftIcon`, `DocumentIcon`, `PlugIcon` (components, `src/components/admin/icons.tsx`, each `({ className }: { className?: string }) => JSX.Element`), consumed by Tasks 9 and 10.

- [ ] **Step 1: Create the shared nav types**

Create `src/components/admin/adminNav.ts`:

```ts
import type { ComponentType } from "react";

export interface AdminNavItem {
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: AdminNavItem[];
}
```

- [ ] **Step 2: Create the icon set**

Create `src/components/admin/icons.tsx`. Each icon matches the stroke style already used in `PhotoUploadField.tsx` (`fill="none"`, `strokeWidth={1.5}`, rounded caps/joins), 24×24 viewBox:

```tsx
interface IconProps {
  className?: string;
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20a4.5 4.5 0 0 1 6-4.24" />
    </svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="9" width="16" height="4" />
      <rect x="5" y="13" width="14" height="7" />
      <path d="M12 9v11" />
      <path d="M12 9C10.5 6 8 5.5 7 6.5S7.5 9 12 9Z" />
      <path d="M12 9c1.5-3 4-3.5 5-2.5S16.5 9 12 9Z" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12.5h6M9 15.5h6M9 9.5h3" />
    </svg>
  );
}

export function PlugIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 3v5M15 3v5" />
      <path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0V8Z" />
      <path d="M12 15.5V21" />
    </svg>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (These files have no test — they're pure types/decorative SVGs, consistent with how `PhotoUploadField.tsx`'s inline SVG isn't separately tested. Their behavior is exercised indirectly by Tasks 9/10's tests.)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/adminNav.ts src/components/admin/icons.tsx
git commit -m "feat: add shared admin nav types and sidebar icon set"
```

---

### Task 9: `AdminShell` (sidebar with icons, header, card wrapper)

**Files:**
- Create: `src/components/admin/AdminShell.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/layout.test.tsx`

**Interfaces:**
- Consumes: `AdminNavItem`, `AdminNavGroup` (Task 8), `HomeIcon`/`UsersIcon`/`GiftIcon`/`DocumentIcon`/`PlugIcon` (Task 8), `AdminMobileNav` (existing, updated in Task 10 — `AdminShell` passes it the same `groups` it renders itself, so Task 10 must land its `AdminNavGroup` compatibility before or alongside this task; both consume the same Task 8 types so order between 9 and 10 doesn't matter as long as Task 8 is done first).
- Produces: `AdminShell({ userEmail: string | null; children: React.ReactNode })`, consumed by `layout.tsx`.

- [ ] **Step 1: Write the failing test**

Replace `src/app/admin/(protected)/layout.test.tsx` entirely — it now tests `AdminShell` directly (the piece that actually contains the logic), since `layout.tsx` becomes an async Server Component that RTL's `render()` cannot invoke directly:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin/dashboard"),
}));

describe("AdminShell", () => {
  it("shows the current section's group label in the mobile top bar", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("matches nested routes to their parent section", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes/123");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("falls back to a generic label outside the known sections", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/login");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Painel Administrativo");
  });

  it("shows the logged-in admin's e-mail in the desktop header", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard");
    render(<AdminShell userEmail="noiva@example.com">content</AdminShell>);

    expect(screen.getByText("noiva@example.com")).toBeInTheDocument();
  });

  it("renders the page content inside the card wrapper", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard");
    render(<AdminShell userEmail={null}>página de teste</AdminShell>);

    expect(screen.getByText("página de teste")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/layout.test.tsx"`
Expected: FAIL — `Failed to resolve import "@/components/admin/AdminShell"`.

- [ ] **Step 3: Implement `AdminShell.tsx`**

Create `src/components/admin/AdminShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { HomeIcon, UsersIcon, GiftIcon, DocumentIcon, PlugIcon } from "@/components/admin/icons";
import type { AdminNavGroup } from "@/components/admin/adminNav";
import { cn } from "@/shared/utils/cn";

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: "Visão geral", icon: HomeIcon, items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  {
    label: "Convidados",
    icon: UsersIcon,
    items: [
      { label: "Convidados", href: "/admin/convidados" },
      { label: "Mensagens", href: "/admin/mensagens" },
    ],
  },
  {
    label: "Presentes",
    icon: GiftIcon,
    items: [
      { label: "Presentes", href: "/admin/presentes" },
      { label: "Pagamentos", href: "/admin/pagamentos" },
    ],
  },
  { label: "Conteúdo", icon: DocumentIcon, items: [{ label: "Conteúdo do site", href: "/admin/conteudo" }] },
  { label: "Configurações", icon: PlugIcon, items: [{ label: "Integrações", href: "/admin/integracoes" }] },
];

function findCurrentSectionLabel(pathname: string): string {
  for (const group of ADMIN_NAV_GROUPS) {
    const hasMatch = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    if (hasMatch) return group.label;
  }
  return "Painel Administrativo";
}

interface AdminShellProps {
  userEmail: string | null;
  children: React.ReactNode;
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const currentSectionLabel = findCurrentSectionLabel(pathname);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 md:py-12">
      <div className="flex items-center justify-between md:hidden">
        <span data-testid="admin-mobile-section-label" className="font-serif text-lg text-forest">
          {currentSectionLabel}
        </span>
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Abrir menu"
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5"
        >
          <span className="block h-px w-6 bg-forest" />
          <span className="block h-px w-6 bg-forest" />
          <span className="block h-px w-4 bg-forest" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-8 md:mt-0 md:flex-row">
        <aside className="hidden flex-col gap-6 md:flex md:w-52">
          <nav className="flex flex-col gap-6">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <group.icon className="h-4 w-4 text-forest/70" />
                  <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-col gap-2 pl-6">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "font-sans text-sm uppercase tracking-widest transition-colors",
                          isActive ? "font-medium text-moss" : "text-forest/70 hover:text-moss"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              Sair
            </button>
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center justify-between border-b border-line pb-4 md:flex">
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">
              Início / {currentSectionLabel}
            </span>
            {userEmail && <span className="font-sans text-xs text-forest/70">{userEmail}</span>}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-paper p-6 md:mt-8">{children}</div>
        </div>
      </div>

      <AdminMobileNav
        groups={ADMIN_NAV_GROUPS}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Update `layout.tsx` to a Server Component that delegates to `AdminShell`**

Replace the contents of `src/app/admin/(protected)/layout.tsx`:

```tsx
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AdminShell userEmail={user?.email ?? null}>{children}</AdminShell>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/layout.test.tsx"`
Expected: PASS (5 tests). Note this file now imports and tests `AdminShell`, not `layout.tsx` — `layout.tsx` itself (an async Server Component doing an auth lookup) is exercised the same way the rest of the codebase exercises Server Component pages: no direct RTL render, covered by the fact every admin page under it renders through it in normal use.

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminShell.tsx "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/layout.test.tsx"
git commit -m "feat: redesign admin shell with sidebar icons, header, and card layout"
```

---

### Task 10: `AdminMobileNav` icons

**Files:**
- Modify: `src/components/admin/AdminMobileNav.tsx`
- Modify: `src/components/admin/AdminMobileNav.test.tsx`

**Interfaces:**
- Consumes: `AdminNavGroup` (Task 8).

- [ ] **Step 1: Update the fixtures and add a failing test for the icon**

In `src/components/admin/AdminMobileNav.test.tsx`, replace the top-level `GROUPS` fixture and its import to match the now-required `icon` field, and add a new test asserting each group header renders its icon:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { HomeIcon, GiftIcon } from "@/components/admin/icons";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/presentes",
}));

const GROUPS = [
  { label: "Visão geral", icon: HomeIcon, items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  { label: "Presentes", icon: GiftIcon, items: [{ label: "Presentes", href: "/admin/presentes" }] },
];
```

Add this test alongside the existing five `it(...)` blocks (don't change those):

```tsx
  it("renders an icon next to each group label", () => {
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThanOrEqual(GROUPS.length);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/AdminMobileNav.test.tsx`
Expected: FAIL on the new "renders an icon next to each group label" test — `AdminMobileNav` doesn't render any `<svg>` yet, so the count is `0`.

- [ ] **Step 3: Implement — import the shared type and render the icon**

In `src/components/admin/AdminMobileNav.tsx`, remove the local `AdminNavItem`/`AdminNavGroup` interfaces and import the shared ones instead:

```tsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { logoutAction } from "@/app/admin/actions";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { AdminNavGroup } from "@/components/admin/adminNav";
import { cn } from "@/shared/utils/cn";

interface AdminMobileNavProps {
  groups: AdminNavGroup[];
  isOpen: boolean;
  onClose: () => void;
}
```

And update the group-label row inside the `nav.map(...)` to render the icon next to the label:

```tsx
                <div className="flex items-center gap-2">
                  <group.icon className="h-4 w-4 text-forest/70" />
                  <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">{group.label}</span>
                </div>
```

(replacing the previous standalone `<span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">{group.label}</span>` line inside that `div`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/AdminMobileNav.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminMobileNav.tsx src/components/admin/AdminMobileNav.test.tsx
git commit -m "feat: show module icons in the admin mobile nav"
```

---

### Task 11: Integrações tabs with conditional provider form

**Files:**
- Create: `src/components/admin/IntegracoesTabs.tsx`
- Test: `src/components/admin/IntegracoesTabs.test.tsx`
- Modify: `src/app/admin/(protected)/integracoes/page.tsx`

**Interfaces:**
- Consumes: `PaymentProviderForm`, `MercadoPagoTokenForm`, `ResendApiKeyForm`, `SecretKeyForm`, `ResetSecretKeyWithTokenForm` (all existing, unchanged), `PaymentProvider` (from `@/domain/entities/PaymentProvider`), `AdminSecuritySettingsSummary` shape (from `GetAdminSecuritySettingsUseCase`, already used by the page).
- Produces: `IntegracoesTabs({ activePaymentProvider, infinitePayHandle, mercadoPagoAccessTokenLast4, resendApiKeyLast4, hasSecretKey, resetToken? })`, consumed by `integracoes/page.tsx`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/IntegracoesTabs.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegracoesTabs } from "@/components/admin/IntegracoesTabs";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updatePaymentProviderAction: vi.fn(),
  updateMercadoPagoTokenAction: vi.fn(),
  updateResendApiKeyAction: vi.fn(),
  updateSecretKeyAction: vi.fn(),
  requestSecretKeyResetAction: vi.fn(),
  resetSecretKeyWithTokenAction: vi.fn(),
}));

const baseProps = {
  activePaymentProvider: "mercado_pago" as const,
  infinitePayHandle: null,
  mercadoPagoAccessTokenLast4: "1234",
  resendApiKeyLast4: null,
  hasSecretKey: true,
};

describe("IntegracoesTabs", () => {
  it("shows the Mercado Pago form on the Pagamento tab by default when it's the active provider", () => {
    render(<IntegracoesTabs {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument();
  });

  it("hides the Mercado Pago form when Infinite Pay is the active provider", () => {
    render(<IntegracoesTabs {...baseProps} activePaymentProvider="infinite_pay" />);

    expect(screen.queryByRole("heading", { name: "Mercado Pago" })).not.toBeInTheDocument();
  });

  it("switches to the Notificações tab and shows the Resend form", async () => {
    const user = userEvent.setup();
    render(<IntegracoesTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "Notificações" }));

    expect(screen.getByRole("heading", { name: "Resend (e-mails)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mercado Pago" })).not.toBeInTheDocument();
  });

  it("switches to the Segurança tab and shows the secret key form", async () => {
    const user = userEvent.setup();
    render(<IntegracoesTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "Segurança" }));

    expect(screen.getByRole("heading", { name: "Chave secreta de segurança" })).toBeInTheDocument();
  });

  it("opens on the Segurança tab and shows the reset form when a reset token is present", () => {
    render(<IntegracoesTabs {...baseProps} resetToken="abc123" />);

    expect(screen.getByRole("tab", { name: "Segurança", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Definir nova chave secreta" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/IntegracoesTabs.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/admin/IntegracoesTabs"`.

- [ ] **Step 3: Implement**

Create `src/components/admin/IntegracoesTabs.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";
import { PaymentProviderForm } from "@/components/admin/PaymentProviderForm";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";
import { ResetSecretKeyWithTokenForm } from "@/components/admin/ResetSecretKeyWithTokenForm";
import { cn } from "@/shared/utils/cn";

type IntegracoesTab = "pagamento" | "notificacoes" | "seguranca";

const TABS: { id: IntegracoesTab; label: string }[] = [
  { id: "pagamento", label: "Pagamento" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca", label: "Segurança" },
];

interface IntegracoesTabsProps {
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
  mercadoPagoAccessTokenLast4: string | null;
  resendApiKeyLast4: string | null;
  hasSecretKey: boolean;
  resetToken?: string;
}

export function IntegracoesTabs({
  activePaymentProvider,
  infinitePayHandle,
  mercadoPagoAccessTokenLast4,
  resendApiKeyLast4,
  hasSecretKey,
  resetToken,
}: IntegracoesTabsProps) {
  const [activeTab, setActiveTab] = useState<IntegracoesTab>(resetToken ? "seguranca" : "pagamento");

  return (
    <div>
      <div role="tablist" className="flex gap-6 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "-mb-px border-b-2 pb-3 font-sans text-sm uppercase tracking-widest transition-colors",
              activeTab === tab.id ? "border-moss text-moss" : "border-transparent text-forest/70 hover:text-moss"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex max-w-md flex-col gap-10">
        {activeTab === "pagamento" && (
          <>
            <PaymentProviderForm activeProvider={activePaymentProvider} infinitePayHandle={infinitePayHandle} />
            {activePaymentProvider === "mercado_pago" && (
              <MercadoPagoTokenForm currentTokenLast4={mercadoPagoAccessTokenLast4} hasSecretKey={hasSecretKey} />
            )}
          </>
        )}

        {activeTab === "notificacoes" && (
          <ResendApiKeyForm currentApiKeyLast4={resendApiKeyLast4} hasSecretKey={hasSecretKey} />
        )}

        {activeTab === "seguranca" && (
          <>
            {resetToken && <ResetSecretKeyWithTokenForm token={resetToken} />}
            <SecretKeyForm hasSecretKey={hasSecretKey} />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/IntegracoesTabs.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Update the page to use it**

Replace the contents of `src/app/admin/(protected)/integracoes/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { IntegracoesTabs } from "@/components/admin/IntegracoesTabs";

export const metadata: Metadata = {
  title: "Integrações | Painel Administrativo",
};

interface IntegracoesPageProps {
  searchParams: Promise<{ resetToken?: string }>;
}

export default async function IntegracoesPage({ searchParams }: IntegracoesPageProps) {
  const { resetToken } = await searchParams;
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
      <div className="mt-8">
        <IntegracoesTabs
          activePaymentProvider={summary.activePaymentProvider}
          infinitePayHandle={summary.infinitePayHandle}
          mercadoPagoAccessTokenLast4={summary.mercadoPagoAccessTokenLast4}
          resendApiKeyLast4={summary.resendApiKeyLast4}
          hasSecretKey={summary.hasSecretKey}
          resetToken={resetToken}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/IntegracoesTabs.tsx src/components/admin/IntegracoesTabs.test.tsx "src/app/admin/(protected)/integracoes/page.tsx"
git commit -m "feat: reorganize Integrações into tabs with the active provider's form shown conditionally"
```

---

## Final verification (after all tasks)

- [ ] Run `npx tsc --noEmit` — no errors.
- [ ] Run `npx eslint src` — no errors.
- [ ] Run `npx vitest run` — full suite passes.
- [ ] Manually click through `/admin/dashboard`, `/admin/conteudo/identidade-visual` (upload a test image for each variant, save, confirm it shows on the public site header and in the mobile menu), and `/admin/integracoes` (switch provider, confirm only the matching form shows; open the "Esqueceu a chave secreta?" link end-to-end since it was the bug fixed earlier in this session).
