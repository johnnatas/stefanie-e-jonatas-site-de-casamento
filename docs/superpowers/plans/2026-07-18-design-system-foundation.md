# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the new neutral/gold design tokens and the three shared UI
primitives (`PillButton`, `TornPaperDivider`, `ArchFlipCard`) that every
later redesign plan (Header/Nav, Home, RSVP, secondary pages) will build on.

**Architecture:** Purely additive — new CSS custom properties are added
alongside the existing `cream`/`rose` tokens (which stay defined and in use
until later plans migrate their consumers off them), and three new
presentational components are added under `src/components/ui/`. No existing
page or component is modified in this plan, so the site keeps rendering
exactly as it does today; only the new pieces become available for the next
plan to consume.

**Tech Stack:** Next.js 16.2.10 (App Router, TypeScript), Tailwind CSS v4
(`@theme inline` tokens in `src/app/globals.css`, no `tailwind.config.js`),
React 19, Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — before
  touching anything under `src/app/`, skim `node_modules/next/dist/docs/`
  for current App Router conventions (per `AGENTS.md`).
- Tailwind v4: colors are declared as CSS custom properties in
  `src/app/globals.css` inside `:root` and re-exposed in `@theme inline` —
  there is no `tailwind.config.js` to edit.
- New components must use only the new tokens (`paper`, `paper-soft`,
  `ink`, `ink-soft`, `charcoal`, `gold`, `gold-soft`, `line`, `line-dark`,
  `danger`) — never `rose`, `rose-dark`, `cream`, or `cream-dark`.
- Use the existing `cn()` helper (`src/shared/utils/cn.ts`) for conditional
  Tailwind class merging — don't hand-roll string concatenation.
- Any component with interactivity (`onClick`, internal state, hooks other
  than none) must start with `"use client";`.
- Run `npm run test` and `npm run lint` before every commit in this plan.

---

## Task 1: Add new design tokens to `globals.css`

**Files:**
- Modify: `src/app/globals.css:1-37`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--color-paper`, `--color-paper-soft`,
  `--color-charcoal`, `--color-gold-soft`, `--color-line-dark`,
  `--color-danger`, and matching Tailwind color utilities `bg-paper`,
  `text-paper`, `bg-paper-soft`, `bg-charcoal`, `text-charcoal`,
  `text-gold-soft`, `border-gold-soft`, `border-line-dark`, `text-danger`,
  `border-danger` (via the existing `--color-*` → Tailwind utility
  convention already used by `gold`/`ink`/`line`). Existing tokens
  (`cream`, `cream-dark`, `rose`, `rose-dark`, `ink`, `ink-soft`, `gold`,
  `line`) are untouched and keep working.

This task has no unit to test in isolation (it's CSS custom properties), so
instead of a Vitest step it's verified by a full build.

- [ ] **Step 1: Add the new custom properties to `:root`**

In `src/app/globals.css`, extend the `:root` block (keep every existing
line, just add the new ones after `--color-line`):

```css
:root {
  --color-cream: #faf7f2;
  --color-cream-dark: #f1e6d8;
  --color-ink: #2a2622;
  --color-ink-soft: #5c554d;
  --color-rose: #b76e79;
  --color-rose-dark: #995563;
  --color-gold: #c9a66b;
  --color-line: #e4dcd1;
  --color-paper: #ffffff;
  --color-paper-soft: #f4f2ee;
  --color-charcoal: #14130f;
  --color-gold-soft: #d8c391;
  --color-line-dark: #3a362f;
  --color-danger: #b3413a;
}
```

- [ ] **Step 2: Expose the new tokens as Tailwind utilities**

In the same file, extend the `@theme inline` block (keep every existing
line, just add the new mappings after `--color-line: var(--color-line);`):

```css
@theme inline {
  --color-background: var(--color-cream);
  --color-foreground: var(--color-ink);
  --color-cream: var(--color-cream);
  --color-cream-dark: var(--color-cream-dark);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
  --color-rose: var(--color-rose);
  --color-rose-dark: var(--color-rose-dark);
  --color-gold: var(--color-gold);
  --color-line: var(--color-line);
  --color-paper: var(--color-paper);
  --color-paper-soft: var(--color-paper-soft);
  --color-charcoal: var(--color-charcoal);
  --color-gold-soft: var(--color-gold-soft);
  --color-line-dark: var(--color-line-dark);
  --color-danger: var(--color-danger);
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-inter);
  --font-script: var(--font-alex-brush);
}
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds with no CSS/type errors (the existing pages don't
reference the new tokens yet, so output is visually unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design-system): add paper/charcoal/gold-soft/danger color tokens"
```

---

## Task 2: `PillButton` component

**Files:**
- Create: `src/components/ui/PillButton.tsx`
- Test: `src/components/ui/PillButton.test.tsx`

**Interfaces:**
- Consumes: `cn` from `src/shared/utils/cn.ts`; `Link` from `next/link`.
- Produces: `PillButton` (named export) and `PillButtonVariant` (named
  type export) from `@/components/ui/PillButton`.
  `PillButton(props: { variant?: PillButtonVariant; className?: string;
  children: ReactNode; href?: string; type?: "button" | "submit";
  disabled?: boolean; onClick?: MouseEventHandler }): JSX.Element`.
  Renders a `<Link>` when `href` is provided, otherwise a `<button>`.
  Later plans (Header CTA, RSVP confirm/decline, Home hero CTA, InfoCards)
  will import this instead of writing their own pill-button classes.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/PillButton.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillButton } from "@/components/ui/PillButton";

describe("PillButton", () => {
  it("renders as a link when href is provided", () => {
    render(<PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>);

    const link = screen.getByRole("link", { name: "Confirme sua presença" });
    expect(link).toHaveAttribute("href", "/confirmar-presenca");
  });

  it("renders as a button and fires onClick when href is not provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PillButton onClick={onClick} variant="secondary">
        Não poderei ir
      </PillButton>
    );

    const button = screen.getByRole("button", { name: "Não poderei ir" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button and blocks clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PillButton onClick={onClick} disabled>
        Enviando...
      </PillButton>
    );

    const button = screen.getByRole("button", { name: "Enviando..." });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/PillButton.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/PillButton'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/ui/PillButton.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export type PillButtonVariant = "primary" | "secondary";

interface PillButtonProps {
  variant?: PillButtonVariant;
  className?: string;
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: MouseEventHandler;
}

const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
  primary: "border-gold text-gold hover:bg-gold hover:text-paper",
  secondary: "border-line-dark/20 text-ink-soft hover:border-ink-soft hover:text-ink",
};

export function PillButton({
  variant = "primary",
  className,
  children,
  href,
  type = "button",
  disabled,
  onClick,
}: PillButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full border px-8 py-3 font-serif text-base italic transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASSES[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/PillButton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/PillButton.tsx src/components/ui/PillButton.test.tsx
git commit -m "feat(design-system): add PillButton shared component"
```

---

## Task 3: `TornPaperDivider` component

**Files:**
- Create: `src/components/ui/TornPaperDivider.tsx`
- Test: `src/components/ui/TornPaperDivider.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React.
- Produces: `TornPaperDivider(props: { fill?: string; className?: string
  }): JSX.Element` from `@/components/ui/TornPaperDivider` — an `<svg>`
  with `data-testid="torn-paper-divider"` containing one `<path>` whose
  `fill` attribute equals the `fill` prop (default `"var(--color-paper)"`).
  The Home plan will place this absolutely-positioned at the bottom of the
  hero/countdown section.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/TornPaperDivider.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TornPaperDivider } from "@/components/ui/TornPaperDivider";

describe("TornPaperDivider", () => {
  it("defaults to the paper color when no fill is given", () => {
    render(<TornPaperDivider />);

    const path = screen.getByTestId("torn-paper-divider").querySelector("path");
    expect(path).toHaveAttribute("fill", "var(--color-paper)");
  });

  it("renders an svg path with a custom fill color", () => {
    render(<TornPaperDivider fill="#14130f" />);

    const path = screen.getByTestId("torn-paper-divider").querySelector("path");
    expect(path).toHaveAttribute("fill", "#14130f");
  });

  it("forwards the className prop to the svg element", () => {
    render(<TornPaperDivider className="h-24 w-full" />);

    expect(screen.getByTestId("torn-paper-divider")).toHaveClass("h-24", "w-full");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/TornPaperDivider.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/TornPaperDivider'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/ui/TornPaperDivider.tsx`:

```tsx
"use client";

import { useId } from "react";

interface TornPaperDividerProps {
  fill?: string;
  className?: string;
}

const TORN_EDGE_PATH =
  "M0 40 C 40 10, 80 70, 120 35 S 200 5, 240 45 S 320 75, 360 30 S 440 0, 480 40 " +
  "S 560 80, 600 35 S 680 5, 720 42 S 800 78, 840 33 S 920 3, 960 44 " +
  "S 1040 76, 1080 32 S 1160 4, 1200 42 S 1280 74, 1320 34 S 1400 6, 1440 40 " +
  "V120 H0 Z";

/**
 * Full-width irregular "torn paper" edge, used to close a dark photo
 * section into the lighter section below it (see references/images/
 * efeito-papel-rasgado.png — not in the repo, local design reference).
 */
export function TornPaperDivider({ fill = "var(--color-paper)", className }: TornPaperDividerProps) {
  const filterId = useId();

  return (
    <svg
      aria-hidden="true"
      data-testid="torn-paper-divider"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={className}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
      </filter>
      <path d={TORN_EDGE_PATH} fill={fill} filter={`url(#${filterId})`} />
    </svg>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/TornPaperDivider.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TornPaperDivider.tsx src/components/ui/TornPaperDivider.test.tsx
git commit -m "feat(design-system): add TornPaperDivider shared component"
```

---

## Task 4: `ArchFlipCard` component

**Files:**
- Create: `src/components/ui/ArchFlipCard.tsx`
- Test: `src/components/ui/ArchFlipCard.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React; reuses the existing `.flip-card` /
  `.flip-card-inner` / `.flip-card-front` / `.flip-card-back` CSS classes
  already defined in `src/app/globals.css` (used today by `InfoCards`).
- Produces: `ArchFlipCard(props: { number: string; image: ReactNode; title:
  string; date: string; description: string; className?: string }):
  JSX.Element` from `@/components/ui/ArchFlipCard`. The Home plan will feed
  it the 3 `StoryTimeline` milestones (`O começo` / `O pedido` / `O
  casamento`) for the "Save the date" section, and the Nossa História plan
  will reuse it for the same 3 milestones.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/ArchFlipCard.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";

describe("ArchFlipCard", () => {
  it("renders the number on the front face and the details on the back face", () => {
    render(
      <ArchFlipCard
        number="01."
        image={<span>foto do começo</span>}
        title="O começo"
        date="10 de abril de 2018"
        description="Um encontro casual que mudou tudo."
      />
    );

    expect(screen.getByText("01.")).toBeInTheDocument();
    expect(screen.getByText("foto do começo")).toBeInTheDocument();
    expect(screen.getByText("O começo")).toBeInTheDocument();
    expect(screen.getByText("10 de abril de 2018")).toBeInTheDocument();
    expect(screen.getByText("Um encontro casual que mudou tudo.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/ArchFlipCard.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/ArchFlipCard'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/ui/ArchFlipCard.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface ArchFlipCardProps {
  number: string;
  image: ReactNode;
  title: string;
  date: string;
  description: string;
  className?: string;
}

/**
 * Arch-shaped (rounded top, square base) photo card that flips on
 * hover/focus to reveal the milestone details — reuses the .flip-card
 * mechanics already used by InfoCards, just with the arch silhouette and
 * photo-forward front face from the reference site's "Save the date"
 * timeline.
 */
export function ArchFlipCard({ number, image, title, date, description, className }: ArchFlipCardProps) {
  return (
    <div className={cn("flip-card h-80 w-full", className)}>
      <div className="flip-card-inner h-full w-full">
        <div className="flip-card-front relative h-full w-full overflow-hidden rounded-t-[999px] rounded-b-lg grayscale transition-[filter] duration-500 hover:grayscale-0">
          {image}
          <span className="absolute bottom-3 right-4 font-serif text-3xl text-paper">{number}</span>
        </div>
        <div className="flip-card-back flex h-full w-full flex-col items-center justify-center gap-2 rounded-t-[999px] rounded-b-lg bg-charcoal px-6 text-center">
          <span className="font-sans text-xs uppercase tracking-widest text-gold-soft">{date}</span>
          <h3 className="font-serif text-2xl text-paper">{title}</h3>
          <p className="font-sans text-sm leading-relaxed text-paper/80">{description}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/ArchFlipCard.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ArchFlipCard.tsx src/components/ui/ArchFlipCard.test.tsx
git commit -m "feat(design-system): add ArchFlipCard shared component"
```

---

## Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the 3 new suites from Tasks 2–4.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit (only if any of the above required fixes)**

```bash
git add -A
git commit -m "chore(design-system): fix lint/build issues from foundation plan"
```

---

## What this plan intentionally does NOT do

- Does not touch `Header`, `MobileMenu`, `Footer`, `HeroCarousel`,
  `CountdownTimer`, `StoryTimeline`, `InfoCards`, `PlaceholderImage`, the
  RSVP form, or any `app/**/page.tsx` — those are migrated to the new
  tokens/components in the follow-up plans (Header/Nav, Home, RSVP,
  Secondary Pages).
- Does not remove `--color-cream`, `--color-cream-dark`, `--color-rose`,
  `--color-rose-dark` — they stay defined and in use until the last
  follow-up plan finishes migrating every consumer, at which point a final
  cleanup task deletes them.
- Does not remove the Álbum de Fotos route/nav item — that happens in the
  Header/Nav plan.
