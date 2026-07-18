# Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Home page (`/`) into one continuous hero+countdown dark
photo section that the header floats transparently over, closed by a torn
paper divider into a "Save the date!" section with arch-shaped flip cards
for the 3 relationship milestones, followed by the restyled info-card grid.

**Architecture:** The header becomes `fixed` (out of flow) so it can
genuinely overlay the hero photo — this finishes the transparency feature
that Plan 2 had to defer. `HeroCarousel` is narrowed to a pure background
layer; a new `HomeHero` component composes it with the name/CTA block and
`CountdownTimer` inside one tall section closed by `TornPaperDivider`. The 3
relationship milestones move out of `StoryTimeline`'s local constant into a
shared `src/shared/milestones.ts` so both the new `SaveTheDateSection` (this
plan) and the existing Nossa História page (`StoryTimeline`, unchanged
here) read the same data.

**Tech Stack:** Next.js 16.2.10 (App Router, TypeScript), Tailwind CSS v4,
React 19, Framer Motion, Embla Carousel, Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` for current App Router conventions before
  touching `src/app/` (per `AGENTS.md`).
- New/modified code in this plan must use only: `paper`, `paper-soft`,
  `ink`, `ink-soft`, `charcoal`, `gold`, `gold-soft`, `line`, `line-dark`,
  `danger` — never `rose`, `rose-dark`, `cream`, or `cream-dark`.
- The header's fixed height is **72px** everywhere in this plan
  (`h-[72px]` on `<header>`, `pt-[72px]` on `<main>`, `-mt-[72px]` on the
  hero section) — these three numbers must stay in sync; if you change
  one, change all three.
- Use `PillButton` (`@/components/ui/PillButton`), `TornPaperDivider`
  (`@/components/ui/TornPaperDivider`), and `ArchFlipCard`
  (`@/components/ui/ArchFlipCard`) from Plan 1 — don't rebuild pill
  buttons, dividers, or flip cards from scratch.
- Use the existing `cn()` helper (`src/shared/utils/cn.ts`) for
  conditional Tailwind class merging.
- Run `npm run test` and `npm run lint` before every commit.
- Plans 1 and 2 are already merged: color tokens, `PillButton`,
  `TornPaperDivider`, `ArchFlipCard`, `Monogram`, and the restyled
  Header/MobileMenu/Footer (currently always-solid, per Plan 2's
  addendum) exist and are available.

---

## Task 1: Header → fixed positioning + reintroduce hero transparency

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `Monogram`, `NAV_ITEMS`, `cn` (unchanged imports).
- Produces: `Header` keeps its no-prop signature. Behavior: fixed at the
  top of the viewport (`fixed inset-x-0 top-0`, `h-[72px]`) on every page.
  On `pathname === "/"`, before scrolling past 80px, it's transparent with
  `text-paper`; otherwise (any other route, or past 80px on `/`) it's
  solid `bg-paper/90 backdrop-blur text-ink`. `<main>` in the root layout
  gets `pt-[72px]` so every page's content clears the now-out-of-flow
  header by default — Task 6 of this plan will have `HomeHero` cancel
  that padding out with `-mt-[72px]` so the hero photo extends up behind
  the header instead.

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

  it("is fixed out of flow with a 72px height so it can overlay page content", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("fixed", "inset-x-0", "top-0", "h-[72px]");
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

  it("renders solid immediately when the page loads already scrolled past the hero", () => {
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    render(<Header />);

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
Expected: the 2 mobile-menu tests still PASS; the 4 new tests FAIL
(current `Header` is `sticky`, always solid, no transparency logic).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/components/layout/Header.tsx` with:

```tsx
"use client";

import { useLayoutEffect, useState } from "react";
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
        "fixed inset-x-0 top-0 z-40 flex h-[72px] items-center transition-colors",
        isTransparent ? "bg-transparent text-paper" : "border-b border-line bg-paper/90 text-ink backdrop-blur"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
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

- [ ] **Step 4: Compensate `<main>` for the now-fixed header**

In `src/app/layout.tsx`, change:

```tsx
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
```

to:

```tsx
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1 pt-[72px]">{children}</main>
        <Footer />
      </body>
```

- [ ] **Step 5: Run the tests to verify they all pass**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: Run the full suite**

Run: `npm run test`
Expected: all tests pass. Every page currently renders with an extra
72px gap at the very top until Task 6 of this plan gives `HomeHero` a
`-mt-[72px]` to cancel it on the home page specifically — that's expected
at this point in the plan, not a regression to fix here.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/app/layout.tsx
git commit -m "feat(header): make header fixed and reintroduce hero-overlay transparency"
```

---

## Task 2: Restyle `PlaceholderImage` tokens

**Files:**
- Modify: `src/components/ui/PlaceholderImage.tsx`

**Interfaces:**
- Consumes: `cn`.
- Produces: same `PlaceholderImage(props: { label: string; className?:
  string }): JSX.Element` signature — only the gradient colors change.
  `ArchFlipCard` (Task 7 of this plan) and `StoryTimeline` (Task 3) both
  render photos through this component.

- [ ] **Step 1: Update the gradient classes**

In `src/components/ui/PlaceholderImage.tsx`, change:

```tsx
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-rose/25 via-cream-dark to-gold/25",
        className
      )}
```

to:

```tsx
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-gold/25 via-paper-soft to-charcoal/15",
        className
      )}
```

Also update the label text color from `text-ink-soft` to keep as-is (`ink-soft` is already a permitted token, no change needed there).

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `PlaceholderImage`
directly — this is a visual-only token swap).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PlaceholderImage.tsx
git commit -m "feat(design-system): restyle PlaceholderImage with new tokens"
```

---

## Task 3: Extract shared `MILESTONES` and touch up `StoryTimeline` tokens

**Files:**
- Create: `src/shared/milestones.ts`
- Modify: `src/components/home/StoryTimeline.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MILESTONES: Milestone[]` and `type Milestone = { date:
  string; title: string; description: string }` exported from
  `@/shared/milestones`. `StoryTimeline` imports and uses it instead of a
  local constant — its own props (`showReadMoreLink`, `showHeading`) and
  rendering (photo beside text, per milestone) are unchanged, so the
  Nossa História page (`src/app/nossa-historia/page.tsx`, calling
  `<StoryTimeline showHeading={false} showReadMoreLink={false} />`,
  **not modified by this plan**) keeps working exactly as before. Task 8
  of this plan (`SaveTheDateSection`) imports the same `MILESTONES` for
  the Home page's arch-card layout.

- [ ] **Step 1: Create the shared milestones module**

Create `src/shared/milestones.ts`:

```ts
export interface Milestone {
  date: string;
  title: string;
  description: string;
}

export const MILESTONES: Milestone[] = [
  {
    date: "10 de abril de 2018",
    title: "O começo",
    description:
      "Um encontro casual que mudou tudo. Foi o início de uma amizade que, aos poucos, se transformou em amor.",
  },
  {
    date: "18 de novembro de 2025",
    title: "O pedido",
    description:
      "Um pedido cheio de emoção, cercado por quem a gente ama, selando a decisão de caminhar juntos para sempre.",
  },
  {
    date: "19 de junho de 2027",
    title: "O casamento",
    description:
      "O dia em que vamos celebrar tudo o que vivemos até aqui e começar um novo capítulo, lado a lado.",
  },
];
```

- [ ] **Step 2: Update `StoryTimeline` to use it**

In `src/components/home/StoryTimeline.tsx`, remove the local `Milestone`
interface and `MILESTONES` constant (the block from `interface Milestone
{` through the closing `];` of the array), and add this import at the
top instead:

```tsx
import { MILESTONES } from "@/shared/milestones";
```

Then, in the same file, change the date-label span's class from
`text-rose` to `text-gold`:

```tsx
              <span className="font-sans text-xs uppercase tracking-widest text-gold">
```

Leave everything else in the file (the `showReadMoreLink`/`showHeading`
props, the `motion.div` layout, the wave-divider heading) unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `StoryTimeline` directly).

- [ ] **Step 4: Verify Nossa História still renders the milestones**

Run: `npm run build`
Expected: build succeeds — this confirms `nossa-historia/page.tsx` still
resolves `StoryTimeline`'s props correctly against the refactored file.

- [ ] **Step 5: Commit**

```bash
git add src/shared/milestones.ts src/components/home/StoryTimeline.tsx
git commit -m "refactor(home): extract shared MILESTONES data, restyle StoryTimeline date label"
```

---

## Task 4: `HeroCarousel` → background-only

**Files:**
- Modify: `src/components/home/HeroCarousel.tsx`

**Interfaces:**
- Consumes: `useEmblaCarousel`, `PlaceholderImage`.
- Produces: `HeroCarousel(): JSX.Element` — same no-prop signature, but
  now renders ONLY the absolutely-positioned photo layer, dark overlay,
  and slide-position dots; the couple's-names/date/CTA text block and the
  scroll-cue arrow move to the new `HomeHero` (Task 6). `HeroCarousel`
  must be rendered inside a `relative`-positioned parent — Task 6's
  `HomeHero` section provides that.

- [ ] **Step 1: Replace the implementation**

Replace the full contents of `src/components/home/HeroCarousel.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

const SLIDE_LABELS = ["Foto do casal 1", "Foto do casal 2", "Foto do casal 3"];
const AUTOPLAY_INTERVAL_MS = 5000;

/**
 * Pure background layer for the home hero: rotating photo carousel, dark
 * overlay, and slide-position dots. Must render inside a `relative`
 * parent — see HomeHero, which composes this with the foreground content.
 */
export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

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
          {SLIDE_LABELS.map((label) => (
            <div key={label} className="relative h-full min-w-0 flex-[0_0_100%]">
              <PlaceholderImage label={label} className="h-full w-full grayscale" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-charcoal/50" />

      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDE_LABELS.map((label, index) => (
          <span
            key={label}
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

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `HeroCarousel` directly —
consistent with this codebase's existing testing depth for Home
components). Note `src/app/page.tsx` still imports `HeroCarousel` and
renders it directly at this point in the plan, which will now render
with no visible text over it (since the text block moved out) — that's
expected and gets fixed by Task 9, when `page.tsx` switches to
`HomeHero`.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HeroCarousel.tsx
git commit -m "refactor(home): narrow HeroCarousel to a pure background layer"
```

---

## Task 5: Restyle `CountdownTimer` tokens for the dark hero background

**Files:**
- Modify: `src/components/home/CountdownTimer.tsx`

**Interfaces:**
- Consumes: `useCountdown` (unchanged), `WEDDING_DATE_ISO` (unchanged).
- Produces: same no-prop `CountdownTimer(): JSX.Element` signature. Only
  text colors change, since it will render over the dark hero photo
  inside `HomeHero` (Task 6) instead of the plain cream section it sat in
  before.

- [ ] **Step 1: Update the token classes**

Replace the full contents of `src/components/home/CountdownTimer.tsx`
with:

```tsx
"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { WEDDING_DATE_ISO } from "@/shared/navigation";

const UNITS = [
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Minutos" },
  { key: "seconds", label: "Segundos" },
] as const;

export function CountdownTimer() {
  const countdown = useCountdown(WEDDING_DATE_ISO);

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
      <p className="font-script text-3xl text-gold">mal podemos esperar</p>
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (`useCountdown.test.ts` tests the hook, not this
component; no component-level test exists for `CountdownTimer`).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/CountdownTimer.tsx
git commit -m "feat(home): restyle CountdownTimer for the dark hero background"
```

---

## Task 6: `HomeHero` — composed hero + countdown + torn paper section

**Files:**
- Create: `src/components/home/HomeHero.tsx`

**Interfaces:**
- Consumes: `HeroCarousel` (Task 4), `CountdownTimer` (Task 5),
  `PillButton` (`@/components/ui/PillButton`, Plan 1),
  `TornPaperDivider` (`@/components/ui/TornPaperDivider`, Plan 1),
  `COUPLE_NAMES`/`WEDDING_DATE_LABEL`/`WEDDING_LOCATION_LABEL` from
  `@/shared/navigation`.
- Produces: `HomeHero(): JSX.Element` — the full hero section: names/CTA
  block, countdown block, both over the `HeroCarousel` background, closed
  by a `TornPaperDivider`. This is what Task 9 renders at the top of the
  Home page in place of the old inline hero+countdown markup.

- [ ] **Step 1: Create the component**

Create `src/components/home/HomeHero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { PillButton } from "@/components/ui/PillButton";
import { TornPaperDivider } from "@/components/ui/TornPaperDivider";
import { COUPLE_NAMES, WEDDING_DATE_LABEL, WEDDING_LOCATION_LABEL } from "@/shared/navigation";

export function HomeHero() {
  return (
    <section className="relative -mt-[72px] overflow-hidden">
      <HeroCarousel />

      <div className="relative flex flex-col items-center gap-20 px-6 pb-28 pt-[136px] text-center text-paper">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-paper/90">
            Estamos nos casando
          </span>
          <h1 className="font-serif text-5xl sm:text-7xl">{COUPLE_NAMES}</h1>
          <span aria-hidden="true" className="h-px w-16 bg-gold" />
          <p className="font-script text-2xl text-paper/90">nas ditas linhas em que nos encontramos</p>
          <p className="font-serif text-sm uppercase tracking-widest text-paper/90">
            {WEDDING_DATE_LABEL} · {WEDDING_LOCATION_LABEL}
          </p>
          <PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <CountdownTimer />
        </motion.div>
      </div>

      <TornPaperDivider
        fill="var(--color-paper)"
        className="absolute inset-x-0 bottom-0 h-16 w-full sm:h-24 md:h-32"
      />
    </section>
  );
}
```

Note: `pt-[136px]` = the 72px the fixed header would otherwise cover,
plus 64px of breathing room above the name block, so the heading doesn't
sit flush under the header.

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `HomeHero` directly,
consistent with this codebase's existing testing depth for Home
components — it's a composition of already-covered/visual-only pieces).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeHero.tsx
git commit -m "feat(home): add HomeHero composing carousel, countdown, and torn paper divider"
```

---

## Task 7: `SaveTheDateSection`

**Files:**
- Create: `src/components/home/SaveTheDateSection.tsx`

**Interfaces:**
- Consumes: `ArchFlipCard` (`@/components/ui/ArchFlipCard`, Plan 1),
  `PlaceholderImage` (`@/components/ui/PlaceholderImage`, Task 2),
  `MILESTONES` (`@/shared/milestones`, Task 3).
- Produces: `SaveTheDateSection(): JSX.Element` — the stacked "Save the
  date!" heading beside 3 `ArchFlipCard`s, one per milestone. Task 9
  renders this on the Home page directly below `HomeHero`.

- [ ] **Step 1: Create the component**

Create `src/components/home/SaveTheDateSection.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { MILESTONES } from "@/shared/milestones";

const HEADING_LINES = [
  { text: "Save", color: "var(--color-ink)" },
  { text: "the", color: "var(--color-ink-soft)" },
  { text: "date!", color: "var(--color-line)" },
];

export function SaveTheDateSection() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-24 md:flex-row md:items-center md:gap-16">
      <div className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
        {HEADING_LINES.map((line) => (
          <span
            key={line.text}
            className="font-serif text-6xl uppercase leading-none sm:text-7xl"
            style={{ color: line.color }}
          >
            {line.text}
          </span>
        ))}
      </div>

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
                <PlaceholderImage
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
    </section>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no dedicated test file, consistent with this
codebase's existing testing depth for Home page-composition components;
`ArchFlipCard`'s own rendering is already covered by its Plan 1 test).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/SaveTheDateSection.tsx
git commit -m "feat(home): add SaveTheDateSection with arch flip cards for the 3 milestones"
```

---

## Task 8: Restyle `InfoCards` tokens

**Files:**
- Modify: `src/components/home/InfoCards.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: same `InfoCards(): JSX.Element` signature and same 5-card
  data (Cerimônia, Traje, Hospedagem, Lista de presentes, Nossa história
  — Álbum de Fotos already removed in Plan 2). Only token classes change.

- [ ] **Step 1: Update the token classes**

In `src/components/home/InfoCards.tsx`, change the section background
and the two flip-card face classes:

```tsx
export function InfoCards() {
  return (
    <section className="bg-paper-soft py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="flip-card h-48">
            <div className="flip-card-inner h-full w-full">
              <div className="flip-card-front flex h-full flex-col items-center justify-center border border-line bg-paper px-6 text-center">
                <h3 className="font-serif text-2xl text-ink">{card.title}</h3>
              </div>
              <div className="flip-card-back flex h-full flex-col items-center justify-center border border-gold bg-paper px-6 text-center">
                <h3 className="font-serif text-xl text-gold">{card.title}</h3>
                <p className="mt-3 font-sans text-sm text-ink-soft">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

(This drops `rounded-lg` in favor of square corners, matching the more
editorial look used elsewhere in this redesign — everything else about
the component, including the `CARDS` data array, is unchanged.)

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `InfoCards` directly).

- [ ] **Step 3: Grep-sweep for old tokens**

Run: `grep -n "rose\|cream" src/components/home/InfoCards.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/InfoCards.tsx
git commit -m "feat(home): restyle InfoCards with new tokens"
```

---

## Task 9: Recompose the Home page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `HomeHero` (Task 6), `SaveTheDateSection` (Task 7),
  `InfoCards` (Task 8, already existed).
- Produces: `HomePage(): JSX.Element` (default export, unchanged route
  `/`) — replaces the old `HeroCarousel` + inline countdown section +
  `StoryTimeline` composition with `HomeHero` + `SaveTheDateSection` +
  `InfoCards`.

- [ ] **Step 1: Replace the page**

Replace the full contents of `src/app/page.tsx` with:

```tsx
import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { InfoCards } from "@/components/home/InfoCards";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <SaveTheDateSection />
      <InfoCards />
    </>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(home): recompose Home page with HomeHero and SaveTheDateSection"
```

---

## Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Grep-sweep for old tokens across every file this plan touched**

Run: `grep -n "rose\|cream" src/components/layout/Header.tsx src/app/layout.tsx src/components/ui/PlaceholderImage.tsx src/components/home/StoryTimeline.tsx src/components/home/HeroCarousel.tsx src/components/home/CountdownTimer.tsx src/components/home/HomeHero.tsx src/components/home/SaveTheDateSection.tsx src/components/home/InfoCards.tsx src/app/page.tsx`
Expected: no output.

- [ ] **Step 5: Commit (only if any of the above required fixes)**

```bash
git add -A
git commit -m "chore(home): fix lint/build issues from home page redesign plan"
```

---

## What this plan intentionally does NOT do

- Does not restyle Nossa História's own page chrome (heading, intro
  paragraph) — `StoryTimeline` itself keeps working there unchanged
  beyond the one `text-rose` → `text-gold` touch-up in Task 3; the page's
  own `text-rose` label (line 12 of `src/app/nossa-historia/page.tsx`)
  and surrounding layout are the Secondary Pages plan's job.
- Does not touch RSVP, gifts, dicas-e-instrucoes, or admin pages/tokens.
- Does not remove `--color-cream`/`--color-rose` from `globals.css` —
  those pages still reference them until the final cleanup plan.
- Does not add new automated visual/contrast checks for the header
  transparency; this plan repeats the same class-based test strategy Plan
  2 used, now with an added "already scrolled on load" test to close the
  gap the Plan 2 review flagged. If a future review finds another gap
  here, treat it the same way Plan 2's flicker bug was handled — confirm
  with the human before shipping a fix.
