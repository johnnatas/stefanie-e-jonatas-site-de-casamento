# Header / Nav / Footer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Álbum de Fotos page/nav entry, and restyle `Header`,
`MobileMenu`, and `Footer` to the new editorial design system (serif
uppercase nav, script active item, oval monogram, transparent-over-hero
header) — the first visible change on every page of the site.

**Architecture:** A new shared `Monogram` primitive (oval outline + "S&J"
in script) is added under `src/components/ui/`, following the same pattern
as Plan 1's `PillButton`/`TornPaperDivider`/`ArchFlipCard`. `Header`,
`MobileMenu`, and `Footer` are modified in place to consume it and the new
color tokens from Plan 1. `NAV_ITEMS` in `src/shared/navigation.ts` stays
the single source of truth all three components already read from, so
removing the Álbum de Fotos entry there fixes all three at once.

**Tech Stack:** Next.js 16.2.10 (App Router, TypeScript), Tailwind CSS v4,
React 19, Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` for current App Router conventions before
  touching `src/app/` (per `AGENTS.md`).
- New/modified code in this plan must use only: `paper`, `paper-soft`,
  `ink`, `ink-soft`, `charcoal`, `gold`, `gold-soft`, `line`, `line-dark`,
  `danger` — never `rose`, `rose-dark`, `cream`, or `cream-dark` (those
  stay defined in `globals.css` for not-yet-migrated pages until the final
  cleanup plan).
- `NAV_ITEMS` in `src/shared/navigation.ts` is the single source of truth
  for site navigation — `Header`, `MobileMenu`, and `Footer` all map over
  it; don't hardcode nav labels anywhere else.
- Preserve the existing accessible names `"Abrir menu"` / `"Fechar menu"`
  on the mobile menu toggle/close buttons — later tests and this plan's
  own tests depend on them.
- Use the existing `cn()` helper (`src/shared/utils/cn.ts`) for
  conditional Tailwind class merging.
- Run `npm run test` and `npm run lint` before every commit.
- Plan 1 (`docs/superpowers/plans/2026-07-18-design-system-foundation.md`)
  is already merged: `PillButton`, `TornPaperDivider`, `ArchFlipCard`, and
  the new color tokens exist and are available to import.

---

## Task 1: Remove Álbum de Fotos

**Files:**
- Modify: `src/shared/navigation.ts`
- Modify: `src/components/home/InfoCards.tsx`
- Test: `src/shared/navigation.test.ts` (new)
- Delete: `src/app/album-de-fotos/page.tsx` (and the now-empty
  `src/app/album-de-fotos/` directory)

**Interfaces:**
- Consumes: nothing new.
- Produces: `NAV_ITEMS` (`src/shared/navigation.ts`) shrinks from 6 to 5
  entries. `Header`, `MobileMenu`, and `Footer` (all already `NAV_ITEMS.map(...)`)
  automatically drop the link with no further changes needed from this task —
  their own restyling happens in Tasks 3–5.

- [ ] **Step 1: Write the failing test**

Create `src/shared/navigation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/shared/navigation";

describe("NAV_ITEMS", () => {
  it("does not include the Álbum de Fotos entry", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    const labels = NAV_ITEMS.map((item) => item.label);

    expect(hrefs).not.toContain("/album-de-fotos");
    expect(labels).not.toContain("Álbum de Fotos");
  });

  it("has exactly the 5 expected entries in order", () => {
    expect(NAV_ITEMS).toEqual([
      { label: "Início", href: "/" },
      { label: "Nossa História", href: "/nossa-historia" },
      { label: "Confirme Presença", href: "/confirmar-presenca" },
      { label: "Presentes", href: "/presentes" },
      { label: "Dicas e Instruções", href: "/dicas-e-instrucoes/cerimonia" },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/navigation.test.ts`
Expected: FAIL — `NAV_ITEMS` still has 6 entries, includes `/album-de-fotos`.

- [ ] **Step 3: Remove the entry from `NAV_ITEMS`**

In `src/shared/navigation.ts`, delete the `{ label: "Álbum de Fotos", href:
"/album-de-fotos" }` line so the array reads:

```ts
export const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Nossa História", href: "/nossa-historia" },
  { label: "Confirme Presença", href: "/confirmar-presenca" },
  { label: "Presentes", href: "/presentes" },
  { label: "Dicas e Instruções", href: "/dicas-e-instrucoes/cerimonia" },
];
```

Leave the rest of the file (`COUPLE_NAMES`, `WEDDING_DATE_ISO`, etc.)
untouched.

- [ ] **Step 4: Remove the dangling card from `InfoCards`**

In `src/components/home/InfoCards.tsx`, delete this entry from the
`CARDS` array (it would otherwise link to a page that no longer exists):

```ts
  {
    title: "Álbum de fotos",
    description: "Relembre os melhores momentos da nossa história.",
    href: "/album-de-fotos",
  },
```

Do not otherwise change `InfoCards.tsx` — its full visual restyle happens
in a later plan (Home Page Redesign).

- [ ] **Step 5: Delete the route**

```bash
rm -rf src/app/album-de-fotos
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/shared/navigation.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Grep-sweep for leftover references**

Run: `grep -rn "album-de-fotos\|Álbum de Fotos" src/`
Expected: no output (nothing found). If anything is found outside the
files this task already touched, investigate before proceeding — it means
another component links to the removed page.

- [ ] **Step 8: Commit**

```bash
git add src/shared/navigation.ts src/shared/navigation.test.ts src/components/home/InfoCards.tsx
git rm -r src/app/album-de-fotos
git commit -m "feat(nav): remove Álbum de Fotos page and nav entry"
```

---

## Task 2: `Monogram` component

**Files:**
- Create: `src/components/ui/Monogram.tsx`
- Test: `src/components/ui/Monogram.test.tsx`

**Interfaces:**
- Consumes: `cn` from `src/shared/utils/cn.ts`.
- Produces: `Monogram(props: { className?: string }): JSX.Element` from
  `@/components/ui/Monogram` — an oval outline (SVG) with the couple's
  initials "S&J" in script overlaid, sized via `className`, colored via
  `currentColor`/`text-*` on the wrapper. Tasks 3–5 (Header, MobileMenu,
  Footer) each wrap this in their own `<Link href="/">` and control its
  color via a text-color className.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Monogram.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Monogram } from "@/components/ui/Monogram";

describe("Monogram", () => {
  it("renders the couple's initials inside the oval mark", () => {
    render(<Monogram />);

    expect(screen.getByText("S&J")).toBeInTheDocument();
  });

  it("forwards className to the wrapper for sizing/coloring", () => {
    render(<Monogram className="text-gold" />);

    expect(screen.getByText("S&J").parentElement).toHaveClass("text-gold");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/Monogram.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/Monogram'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/ui/Monogram.tsx`:

```tsx
import { cn } from "@/shared/utils/cn";

interface MonogramProps {
  className?: string;
}

/**
 * Oval-outline monogram mark with the couple's initials in script,
 * replacing the old loose "S & J" wordmark in Header/MobileMenu/Footer.
 */
export function Monogram({ className }: MonogramProps) {
  return (
    <span
      className={cn("relative inline-flex h-10 w-8 items-center justify-center text-current", className)}
    >
      <svg viewBox="0 0 64 88" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <ellipse cx="32" cy="44" rx="26" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="relative font-script text-lg leading-none">S&amp;J</span>
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/Monogram.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Monogram.tsx src/components/ui/Monogram.test.tsx
git commit -m "feat(design-system): add Monogram shared component"
```

---

## Task 3: Header restyle (tokens, typography, Monogram, hero transparency)

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `Monogram` from `@/components/ui/Monogram` (Task 2); `NAV_ITEMS`
  from `@/shared/navigation` (unchanged shape); `cn` from
  `@/shared/utils/cn`.
- Produces: `Header` keeps its existing no-prop signature — nothing else
  in the app passes props to it (it's rendered once, in
  `src/app/layout.tsx`). Behavior changes: on `pathname === "/"` and
  before the page scrolls past 80px, the header renders transparent with
  white (`text-paper`) content, overlaying the hero; otherwise (any other
  route, or after scrolling past 80px on `/`) it renders with a solid
  `bg-paper/90 backdrop-blur` and `text-ink` content, matching today's
  look. The accessible names `"Abrir menu"` / `"Fechar menu"` are
  unchanged.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/components/layout/Header.test.tsx` with:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

describe("Header", () => {
  it("opens the mobile menu when the hamburger button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.queryByLabelText("Fechar menu")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Abrir menu"));

    expect(await screen.findByLabelText("Fechar menu")).toBeInTheDocument();
  });

  it("closes the mobile menu when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Abrir menu"));
    await user.click(await screen.findByLabelText("Fechar menu"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Fechar menu")).not.toBeInTheDocument();
    });
  });

  it("renders transparent over the hero on the home page before scrolling", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-transparent", "text-paper");
  });

  it("switches to a solid background once the page scrolls past the hero", () => {
    render(<Header />);

    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    fireEvent.scroll(window);

    expect(screen.getByRole("banner")).toHaveClass("bg-paper/90", "text-ink");
  });

  it("renders solid on non-home pages regardless of scroll position", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-paper/90", "text-ink");
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: the 2 pre-existing tests still PASS; the 3 new transparency
tests FAIL (current `Header` has no scroll/transparency behavior).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/components/layout/Header.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/shared/navigation";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Monogram } from "@/components/ui/Monogram";
import { cn } from "@/shared/utils/cn";

const TRANSPARENT_SCROLL_THRESHOLD_PX = 80;

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled;

  useEffect(() => {
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
        "sticky top-0 z-40 transition-colors",
        isTransparent ? "bg-transparent text-paper" : "border-b border-line bg-paper/90 text-ink backdrop-blur"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Início" className="text-current">
          <Monogram />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm",
                  isActive
                    ? "font-script text-lg italic text-gold"
                    : "font-serif uppercase tracking-[0.2em] text-current/80 transition-colors hover:text-gold"
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

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
}
```

- [ ] **Step 4: Run the tests to verify they all pass**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx
git commit -m "feat(header): restyle nav with new tokens, Monogram, and hero transparency"
```

---

## Task 4: MobileMenu restyle

**Files:**
- Modify: `src/components/layout/MobileMenu.tsx`

**Interfaces:**
- Consumes: `Monogram` from `@/components/ui/Monogram` (Task 2); `NAV_ITEMS`
  from `@/shared/navigation`.
- Produces: same `MobileMenu(props: { isOpen: boolean; onClose: () => void
  }): JSX.Element` signature as today — Task 3's `Header` already calls it
  with these exact props, unchanged. The existing `Header.test.tsx` tests
  (Task 3) exercise this component's open/close behavior end-to-end, so no
  new dedicated test file is added here, consistent with this component
  having no test file today.

- [ ] **Step 1: Update the implementation**

Replace the full contents of `src/components/layout/MobileMenu.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_ITEMS } from "@/shared/navigation";
import { Monogram } from "@/components/ui/Monogram";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-paper md:hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Monogram className="h-12 w-10 text-gold" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="text-ink text-3xl leading-none"
            >
              &times;
            </button>
          </div>
          <nav className="flex flex-col items-center gap-8 pt-12">
            {NAV_ITEMS.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.25 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`font-serif text-2xl uppercase tracking-wide ${
                    pathname === item.href ? "text-gold" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Run the Header test suite to verify MobileMenu still works**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS (5 tests) — these tests open/close the mobile menu and
would fail if `MobileMenu` broke.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileMenu.tsx
git commit -m "feat(header): restyle MobileMenu with new tokens and Monogram"
```

---

## Task 5: Footer restyle

**Files:**
- Modify: `src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `Monogram` from `@/components/ui/Monogram` (Task 2); `NAV_ITEMS`
  from `@/shared/navigation`.
- Produces: same no-prop `Footer(): JSX.Element` signature as today.

- [ ] **Step 1: Update the implementation**

Replace the full contents of `src/components/layout/Footer.tsx` with:

```tsx
import Link from "next/link";
import { NAV_ITEMS } from "@/shared/navigation";
import { Monogram } from "@/components/ui/Monogram";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 text-center">
        <Monogram className="h-12 w-10 text-gold" />

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-serif text-xs uppercase tracking-[0.2em] text-ink-soft hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="font-sans text-xs text-ink-soft">
          Feito com carinho para celebrar o nosso grande dia.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `Footer` directly today —
this is a visual-only change consistent with the existing convention of
not testing static presentational layout components).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(header): restyle Footer with new tokens and Monogram"
```

---

## Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `navigation.test.ts`,
`Monogram.test.tsx`, and the expanded `Header.test.tsx`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds. Confirm the route list it prints no longer
includes `/album-de-fotos`.

- [ ] **Step 4: Grep-sweep for old tokens in the files this plan touched**

Run: `grep -n "rose\|cream" src/components/layout/Header.tsx src/components/layout/MobileMenu.tsx src/components/layout/Footer.tsx src/components/ui/Monogram.tsx`
Expected: no output.

- [ ] **Step 5: Commit (only if any of the above required fixes)**

```bash
git add -A
git commit -m "chore(header): fix lint/build issues from header/nav/footer plan"
```

---

## What this plan intentionally does NOT do

- Does not restyle `HeroCarousel`, `CountdownTimer`, `StoryTimeline`, or
  `InfoCards` beyond the single dangling-card removal in Task 1 — that's
  the Home Page Redesign plan.
- Does not touch the RSVP form, gifts pages, Nossa História page content,
  Dicas e Instruções pages, or the admin panel — those are later plans.
- Does not remove `--color-cream`/`--color-rose` tokens from
  `globals.css` — other pages still use them until the final cleanup
  plan.
- Does not add a test file for `MobileMenu` or `Footer` in isolation —
  `Header.test.tsx` already exercises `MobileMenu`'s behavior, and
  `Footer` has no interactive behavior to test, consistent with this
  codebase's existing testing depth for static layout components.

## Post-implementation addendum

Task 3, as originally written above, specified scroll+pathname-based
header transparency (transparent white header over the home hero before
scrolling 80px, solid otherwise). This was implemented, task-reviewed, and
approved — but the plan's whole-branch review caught a Critical defect:
`header` uses `position: sticky`, which keeps it in normal document flow
rather than overlaying the hero image below it, so the "transparent" state
actually rendered invisible white nav/logo/hamburger on the page's cream
body background instead of over a photo.

Decision (confirmed with the site owner): the transparency feature was
removed. `Header` now unconditionally renders its solid style
(`bg-paper/90 text-ink`) on every page, including home. The real
transparent-over-hero effect is deferred to the **Home Page Redesign**
plan, which must take the header out of normal flow (`fixed`/`absolute`)
and have the Hero section occupy the space behind it — the two need to be
designed together. That plan should re-add the scroll+pathname
transparency logic and its tests (transparent-before-scroll,
solid-after-scroll, solid-on-non-home) once the Hero markup actually
supports being overlaid.
