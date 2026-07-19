# Brand Refresh & Scroll-Driven Topics Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the whole site with the wedding's official identity
palette, replace the Home page's flip-card topic grid with a scroll-driven
horizontal carousel, and make the header's nav-link hover state match the
active-link style.

**Architecture:** Two new color tokens (`moss`, `forest`) are added
alongside the existing token set; `paper`, `paper-soft`, `line`, and `gold`
keep their names but get new hex values. Every component that referenced
the tokens being retired (`ink`, `ink-soft`, `charcoal`, `gold-soft`,
`line-dark`) is swept to the new names, area by area, so each task stays
independently reviewable and the site never breaks mid-plan (old tokens
stay defined until the final task removes them). A new `TopicsCarousel`
component replaces `InfoCards`, reusing `embla-carousel-react` (already a
dependency) for the mobile/reduced-motion fallback and a scroll-position
listener for the desktop scroll-jacking effect.

**Tech Stack:** Next.js 16.2.10, Tailwind CSS v4, TypeScript, React 19,
`embla-carousel-react`, Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` for current App Router conventions before
  touching `src/app/` (per `AGENTS.md`).
- **Global token substitution table** — every task below applies these
  exact replacements to the files it lists (the token *names*, not
  arbitrary text — match the full class string, e.g. `text-ink-soft` is a
  single token, don't match `text-ink` as a substring of it):
  - `text-ink-soft` → `text-forest/70`
  - `text-ink` → `text-forest`
  - `bg-ink` → `bg-forest`
  - `border-ink` → `border-forest`
  - `bg-charcoal` → `bg-forest`
  - `text-charcoal` → `text-forest`
  - `text-gold` → `text-moss`
  - `bg-gold` → `bg-moss`
  - `border-gold` → `border-moss`
  - `focus:border-gold` → `focus:border-moss`
  - `hover:bg-gold` → `hover:bg-moss`
  - `hover:text-gold` → `hover:text-moss`
  - `text-gold-soft` → `text-moss`
  - `hover:bg-gold-soft` → `hover:bg-moss/80`
  - `hover:border-gold-soft` → `hover:border-moss/80`
  - `border-line-dark/20` → `border-forest/20`
  - `hover:border-ink-soft` → `hover:border-forest/70`
  - `var(--color-gold-soft)` → `var(--color-moss)`
  No other className on any touched line changes — this is a pure token
  substitution, not a restyle. If a file has a token reference not covered
  by this table, stop and ask rather than guessing a replacement.
- New/modified code must never reference `ink`, `ink-soft`, `charcoal`,
  `gold-soft`, or `line-dark` once its task is done.
- **When committing, always `git add` an explicit file list — never `git
  add -A`.**
- Run `npm run test` and `npm run lint` before every commit.
- The current design-system plans (1–5) are already merged.

---

## Task 1: Design tokens

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: new tokens `--color-moss: #4A5335` and `--color-forest:
  #242A16`; updated values for `--color-paper` (`#FEFFED`),
  `--color-paper-soft` (`#E3E8C8`), `--color-line` (`#D0D7AA`),
  `--color-gold` (`#D4AF37`); `--color-foreground` now maps to
  `var(--color-forest)`. `--color-ink`, `--color-ink-soft`,
  `--color-charcoal`, `--color-gold-soft`, `--color-line-dark` are **kept
  defined with their current values** for now — later tasks migrate their
  consumers off them; the very last task in this plan removes them once
  nothing references them.

- [ ] **Step 1: Update `:root`**

In `src/app/globals.css`, replace the `:root` block:

```css
:root {
  --color-ink: #2a2622;
  --color-ink-soft: #5c554d;
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

with:

```css
:root {
  --color-ink: #2a2622;
  --color-ink-soft: #5c554d;
  --color-gold: #d4af37;
  --color-line: #d0d7aa;
  --color-paper: #feffed;
  --color-paper-soft: #e3e8c8;
  --color-charcoal: #14130f;
  --color-gold-soft: #d8c391;
  --color-line-dark: #3a362f;
  --color-danger: #b3413a;
  --color-moss: #4a5335;
  --color-forest: #242a16;
}
```

- [ ] **Step 2: Update `@theme inline`**

Replace:

```css
@theme inline {
  --color-background: var(--color-paper);
  --color-foreground: var(--color-ink);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
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

with:

```css
@theme inline {
  --color-background: var(--color-paper);
  --color-foreground: var(--color-forest);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
  --color-gold: var(--color-gold);
  --color-line: var(--color-line);
  --color-paper: var(--color-paper);
  --color-paper-soft: var(--color-paper-soft);
  --color-charcoal: var(--color-charcoal);
  --color-gold-soft: var(--color-gold-soft);
  --color-line-dark: var(--color-line-dark);
  --color-danger: var(--color-danger);
  --color-moss: var(--color-moss);
  --color-forest: var(--color-forest);
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-inter);
  --font-script: var(--font-alex-brush);
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: succeeds. The whole site's backgrounds/borders/accent color
(`paper`, `paper-soft`, `line`, `gold`) visually update immediately since
those token *names* are unchanged — only `moss`/`forest` are net-new and
unused until later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(brand): add moss/forest tokens and update paper/line/gold to the wedding palette"
```

---

## Task 2: Home components sweep

**Files:**
- Modify: `src/components/home/HeroCarousel.tsx`
- Modify: `src/components/home/CountdownTimer.tsx`
- Modify: `src/components/home/HomeHero.tsx`
- Modify: `src/components/home/SaveTheDateSection.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: no behavior/prop changes — pure token substitution per the
  Global Constraints table. `InfoCards.tsx` is intentionally NOT included
  here — Task 8 deletes it.

- [ ] **Step 1: `HeroCarousel.tsx`**

Change the dark overlay from `bg-charcoal/50` to `bg-forest/50`.

- [ ] **Step 2: `CountdownTimer.tsx`**

Change the caption's class from `text-gold` to `text-moss`:

```tsx
      <p className="font-script text-3xl text-moss">mal podemos esperar</p>
```

- [ ] **Step 3: `HomeHero.tsx`**

Change the divider line's class from `bg-gold` to `bg-moss`:

```tsx
          <span aria-hidden="true" className="h-px w-16 bg-moss" />
```

- [ ] **Step 4: `SaveTheDateSection.tsx`**

Change the third heading line's inline color from
`"var(--color-gold-soft)"` to `"var(--color-moss)"`:

```tsx
const HEADING_LINES = [
  { text: "Save", color: "var(--color-ink)" },
  { text: "the", color: "var(--color-ink-soft)" },
  { text: "date!", color: "var(--color-moss)" },
];
```

(`var(--color-ink)` and `var(--color-ink-soft)` on the first two lines
stay as-is — they're inline CSS values, not Tailwind classes, and are out
of scope for this task; a later task in this plan does not touch this
file again, so if you believe these should also change, stop and ask
rather than guessing — the plan author's intent was to leave the
lightest/darkest gradient ends alone here and only fix the one token that
no longer exists.)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (none of these 4 files has a dedicated test
file).

- [ ] **Step 6: Grep-sweep for retired tokens in these 4 files**

Run: `grep -n "gold-soft\|charcoal" src/components/home/HeroCarousel.tsx src/components/home/CountdownTimer.tsx src/components/home/HomeHero.tsx src/components/home/SaveTheDateSection.tsx`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/HeroCarousel.tsx src/components/home/CountdownTimer.tsx src/components/home/HomeHero.tsx src/components/home/SaveTheDateSection.tsx
git commit -m "feat(brand): sweep Home hero/countdown/save-the-date components to moss/forest tokens"
```

---

## Task 3: Shared UI primitives sweep

**Files:**
- Modify: `src/components/ui/PillButton.tsx`
- Modify: `src/components/ui/ArchFlipCard.tsx`
- Modify: `src/components/ui/SplitPanel.tsx`
- Modify: `src/components/ui/SplitPanel.test.tsx`
- Modify: `src/components/ui/PlaceholderImage.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: no prop/behavior changes to any of these 5 components — pure
  token substitution. Every later task in this plan depends on these
  primitives already using the new tokens.

- [ ] **Step 1: `PillButton.tsx`**

In the `VARIANT_CLASSES` record, change:

```tsx
const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
  primary: "border-gold text-gold hover:bg-gold hover:text-paper",
  secondary: "border-line-dark/20 text-ink-soft hover:border-ink-soft hover:text-ink",
};
```

to:

```tsx
const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
  primary: "border-moss text-moss hover:bg-moss hover:text-paper",
  secondary: "border-forest/20 text-forest/70 hover:border-forest/70 hover:text-forest",
};
```

- [ ] **Step 2: `ArchFlipCard.tsx`**

Change `bg-charcoal` to `bg-forest` (back-face background) and
`text-gold-soft` to `text-moss` (date label on the back face).

- [ ] **Step 3: `SplitPanel.tsx`**

Change every `bg-charcoal`/`text-charcoal` to `bg-forest`/`text-forest`,
every `text-gold`/`text-gold-soft` to `text-moss`, and the dark-tone CTA
override classes (`border-paper/40 text-paper hover:bg-paper
hover:text-charcoal`) — only `hover:text-charcoal` in that string changes,
to `hover:text-forest`.

- [ ] **Step 4: `SplitPanel.test.tsx`**

Update the dark-tone test's assertion from
`toHaveClass("bg-charcoal", "text-paper")` to `toHaveClass("bg-forest",
"text-paper")`.

- [ ] **Step 5: `PlaceholderImage.tsx`**

Change the gradient class from
`bg-gradient-to-br from-gold/25 via-paper-soft to-charcoal/15` to
`bg-gradient-to-br from-moss/25 via-paper-soft to-forest/15`.

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the updated `SplitPanel.test.tsx` and
the existing `PillButton.test.tsx`/`ArchFlipCard.test.tsx` (neither
asserts on the specific token classes changed here, so they should pass
unmodified — if either fails, that test WAS asserting on a class you
changed; re-check Steps 1–2 against the actual test expectations before
proceeding).

- [ ] **Step 7: Grep-sweep for retired tokens in these files**

Run: `grep -n "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/components/ui/PillButton.tsx src/components/ui/ArchFlipCard.tsx src/components/ui/SplitPanel.tsx src/components/ui/PlaceholderImage.tsx`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/PillButton.tsx src/components/ui/ArchFlipCard.tsx src/components/ui/SplitPanel.tsx src/components/ui/SplitPanel.test.tsx src/components/ui/PlaceholderImage.tsx
git commit -m "feat(brand): sweep shared UI primitives to moss/forest tokens"
```

---

## Task 4: Header/Footer/MobileMenu sweep + hover-matches-active

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Header.test.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/components/layout/MobileMenu.tsx`

**Interfaces:**
- Consumes: `cn` (unchanged), tokens from Task 1.
- Produces: `Header` keeps its no-prop signature. New behavior: hovering
  a non-active desktop nav link now applies the exact same visual
  treatment as the active link (script, italic, lowercase, `moss`
  color), reverting on mouse-leave. `Footer`/`MobileMenu` get token
  substitution only, no behavior change.

- [ ] **Step 1: Write the failing tests for the hover behavior**

Add these two tests to the end of the `describe("Header", ...)` block in
`src/components/layout/Header.test.tsx` (keep every existing test in the
file as-is, just add these two after them):

```tsx
  it("applies the active-link style to a nav item on hover", async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    const link = screen.getByRole("link", { name: "Nossa História" });
    expect(link).toHaveClass("font-serif", "uppercase");

    await user.hover(link);

    expect(link).toHaveClass("font-script", "italic", "text-moss");
    expect(link).toHaveTextContent("nossa história");
  });

  it("reverts to the inactive style when the mouse leaves", async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    const link = screen.getByRole("link", { name: "Nossa História" });
    await user.hover(link);
    await user.unhover(link);

    expect(link).toHaveClass("font-serif", "uppercase");
    expect(link).toHaveTextContent("Nossa História");
  });
```

- [ ] **Step 2: Run the tests to verify the 2 new ones fail**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: the pre-existing tests still PASS; the 2 new tests FAIL (no
hover behavior exists yet).

- [ ] **Step 3: Implement the hover behavior and token sweep in `Header.tsx`**

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
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
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
        isTransparent ? "bg-transparent text-paper" : "border-b border-line bg-paper/90 text-forest backdrop-blur"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Início" className="text-current">
          <Monogram />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const showActiveStyle = isActive || hoveredHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredHref(item.href)}
                onMouseLeave={() => setHoveredHref(null)}
                className={cn(
                  "text-sm transition-colors",
                  showActiveStyle
                    ? "font-script text-lg italic text-moss"
                    : "font-serif uppercase tracking-[0.2em] text-current/80"
                )}
              >
                {showActiveStyle ? item.label.toLowerCase() : item.label}
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

(The only functional additions vs. the current file are `hoveredHref`
state and `showActiveStyle`; `text-ink` → `text-forest` on the solid
header background is the only other change, per the token table.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS (9 tests: the 7 pre-existing plus the 2 new hover tests).

- [ ] **Step 5: Sweep `Footer.tsx`**

Change `text-ink-soft` → `text-forest/70` (both the nav links and the
closing paragraph) and `hover:text-gold` → `hover:text-moss`.

- [ ] **Step 6: Sweep `MobileMenu.tsx`**

Change `bg-paper` (menu background) stays as-is (not a retired token);
change `text-gold` → `text-moss` (active link) and `text-ink` →
`text-forest` (inactive link, close button).

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 8: Grep-sweep for retired tokens**

Run: `grep -n "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/components/layout/Header.tsx src/components/layout/Footer.tsx src/components/layout/MobileMenu.tsx`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx src/components/layout/Footer.tsx src/components/layout/MobileMenu.tsx
git commit -m "feat(brand): sweep Header/Footer/MobileMenu to moss/forest tokens, hover matches active nav style"
```

---

## Task 5: RSVP sweep

**Files:**
- Modify: `src/components/rsvp/RsvpSearch.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: no behavior change — pure token substitution.

- [ ] **Step 1: Sweep the file**

Apply the Global Constraints substitution table to every occurrence in
`src/components/rsvp/RsvpSearch.tsx`: `text-ink` → `text-forest`,
`text-ink-soft` → `text-forest/70`, `focus:border-gold` →
`focus:border-moss`, `text-gold` → `text-moss` (the matched-name script
text). The decorative background's `text-line` class is unchanged (`line`
keeps its name).

- [ ] **Step 2: Run the RsvpSearch test suite**

Run: `npx vitest run src/components/rsvp/RsvpSearch.test.tsx`
Expected: PASS (4 tests — none assert on these classes, so this confirms
nothing broke).

- [ ] **Step 3: Grep-sweep for retired tokens**

Run: `grep -n "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/components/rsvp/RsvpSearch.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsvp/RsvpSearch.tsx
git commit -m "feat(brand): sweep RsvpSearch to moss/forest tokens"
```

---

## Task 6: Secondary pages sweep

**Files:**
- Modify: `src/app/nossa-historia/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/layout.tsx`
- Modify: `src/app/dicas-e-instrucoes/cerimonia/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/hospedagem/page.tsx`
- Modify: `src/app/presentes/page.tsx`
- Modify: `src/components/gifts/GiftCard.tsx`
- Modify: `src/components/gifts/GiftGrid.tsx`

**Interfaces:**
- Consumes: tokens from Task 1, `SplitPanel` (already swept in Task 3).
- Produces: no behavior change — pure token substitution across all 8
  files.

- [ ] **Step 1: `nossa-historia/page.tsx`**

`text-gold` → `text-moss` (eyebrow label), `text-ink` → `text-forest`
(h1, each milestone's h2), `text-ink-soft` → `text-forest/70` (both
paragraphs and each milestone's description).

- [ ] **Step 2: `dicas-e-instrucoes/layout.tsx`**

`text-gold` → `text-moss` (eyebrow label), `text-ink` → `text-forest`
(h1), `text-ink-soft` → `text-forest/70` (tab links), `hover:text-gold` →
`hover:text-moss` (tab links).

- [ ] **Step 3: the 3 Dicas sub-pages**

None of `cerimonia/page.tsx`, `codigo-de-vestimenta/page.tsx`,
`hospedagem/page.tsx` reference any retired token directly (they only use
`SplitPanel`'s `tone`/`eyebrow`/`title` props and plain text) — confirm
with `grep -n "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/app/dicas-e-instrucoes/cerimonia/page.tsx src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx src/app/dicas-e-instrucoes/hospedagem/page.tsx` and expect no output. No edits needed to these 3 files.

- [ ] **Step 4: `presentes/page.tsx`**

`text-gold` → `text-moss` (eyebrow label), `text-ink` → `text-forest` (h1
— note: `presentes/page.tsx`'s visible `h1` is `sr-only`, still update
its class), `text-ink-soft` → `text-forest/70` (intro paragraph), and the
status-message banner's `border-gold/40 bg-gold/10` → `border-moss/40
bg-moss/10`.

- [ ] **Step 5: `GiftCard.tsx`**

`text-ink` → `text-forest` (gift name), `text-ink-soft` → `text-forest/70`
(description, status badge), `text-gold` → `text-moss` (price),
`bg-gold`/`hover:bg-gold-soft` → `bg-moss`/`hover:bg-moss/80` (both
buttons), `focus:border-gold` → `focus:border-moss` (both inputs).

- [ ] **Step 6: `GiftGrid.tsx`**

`text-ink-soft` → `text-forest/70` (empty-state message).

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including `GiftCard.test.tsx` (asserts on text
content/roles, not classes).

- [ ] **Step 8: Grep-sweep for retired tokens**

Run: `grep -rn "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/app/nossa-historia/ src/app/dicas-e-instrucoes/ src/app/presentes/ src/components/gifts/`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/app/nossa-historia/page.tsx src/app/dicas-e-instrucoes/layout.tsx src/app/presentes/page.tsx src/components/gifts/GiftCard.tsx src/components/gifts/GiftGrid.tsx
git commit -m "feat(brand): sweep Nossa História/Dicas/Presentes/gifts to moss/forest tokens"
```

---

## Task 7: Admin sweep

**Files:**
- Modify: `src/components/admin/DashboardStats.tsx`
- Modify: `src/components/admin/GiftForm.tsx`
- Modify: `src/components/admin/GuestForm.tsx`
- Modify: `src/components/admin/LoginForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/dashboard/page.tsx`
- Modify: `src/app/admin/(protected)/convidados/page.tsx`
- Modify: `src/app/admin/(protected)/convidados/novo/page.tsx`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`
- Modify: `src/app/admin/(protected)/presentes/novo/page.tsx`
- Modify: `src/app/admin/(protected)/presentes/[id]/page.tsx`
- Modify: `src/app/admin/login/page.tsx`
- Modify: `src/components/ui/ConfigurationNotice.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: no behavior change anywhere — pure token substitution, 13
  files, same pattern as the previous redesign's admin sweep (Plan 5,
  Task 5).

- [ ] **Step 1: `DashboardStats.tsx`**

`text-ink` → `text-forest` (each stat value), `text-ink-soft` →
`text-forest/70` (each stat label).

- [ ] **Step 2: `GiftForm.tsx`**

`focus:border-gold` → `focus:border-moss` (input class constant),
`bg-gold`/`hover:bg-gold-soft` → `bg-moss`/`hover:bg-moss/80` (submit
button).

- [ ] **Step 3: `GuestForm.tsx`**

Same substitutions as Step 2 (identical `inputClassName` pattern and
submit button pattern).

- [ ] **Step 4: `LoginForm.tsx`**

Same substitutions as Step 2, applied to both inputs and the submit
button.

- [ ] **Step 5: `admin/(protected)/layout.tsx`**

`hover:text-gold` → `hover:text-moss` (both nav links and the "Sair"
button).

- [ ] **Step 6: the 6 remaining admin page files**

For each of `dashboard/page.tsx`, `convidados/page.tsx`,
`convidados/novo/page.tsx`, `presentes/page.tsx`, `presentes/novo/page.tsx`,
`presentes/[id]/page.tsx`: change every `text-ink` → `text-forest` (page
`h1`s) and every `text-ink-soft` → `text-forest/70` (secondary/table
text). In `presentes/page.tsx` specifically, also change
`bg-gold`/`hover:bg-gold-soft` → `bg-moss`/`hover:bg-moss/80` (the "Novo
presente" link) and `text-gold hover:text-gold-soft` → `text-moss
hover:text-moss/80` (the "Editar" link).

- [ ] **Step 7: `admin/login/page.tsx`**

`text-ink` → `text-forest` (h1), `text-ink-soft` → `text-forest/70`
(subtitle).

- [ ] **Step 8: `ConfigurationNotice.tsx`**

`text-ink-soft` → `text-forest/70`. (`bg-paper-soft`, already the
background, is unchanged — not a retired token.)

- [ ] **Step 9: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including `DashboardStats.test.tsx`.

- [ ] **Step 10: Grep-sweep for retired tokens**

Run: `grep -rln "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/components/admin/ "src/app/admin/" src/components/ui/ConfigurationNotice.tsx`
Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add src/components/admin/DashboardStats.tsx src/components/admin/GiftForm.tsx src/components/admin/GuestForm.tsx src/components/admin/LoginForm.tsx "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/dashboard/page.tsx" "src/app/admin/(protected)/convidados/page.tsx" "src/app/admin/(protected)/convidados/novo/page.tsx" "src/app/admin/(protected)/presentes/page.tsx" "src/app/admin/(protected)/presentes/novo/page.tsx" "src/app/admin/(protected)/presentes/[id]/page.tsx" src/app/admin/login/page.tsx src/components/ui/ConfigurationNotice.tsx
git commit -m "feat(brand): sweep admin panel to moss/forest tokens"
```

---

## Task 8: `TopicsCarousel` — scroll-driven desktop, swipe fallback

**Files:**
- Create: `src/components/home/TopicsCarousel.tsx`
- Create: `src/components/home/TopicsCarousel.test.tsx`
- Delete: `src/components/home/InfoCards.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `PlaceholderImage` (`@/components/ui/PlaceholderImage`),
  `useEmblaCarousel` (`embla-carousel-react`, already a dependency).
- Produces: `TopicsCarousel(): JSX.Element` — replaces `InfoCards` as the
  last section of the Home page. Same 5 topics/routes as the old
  `InfoCards.CARDS` data.

- [ ] **Step 1: Confirm `InfoCards` has no other consumers**

Run: `grep -rln "InfoCards" src/ --include=*.tsx --include=*.ts`
Expected: exactly two files — `src/components/home/InfoCards.tsx` itself
and `src/app/page.tsx`. If a third file appears, STOP and report BLOCKED
— do not delete `InfoCards` if something else depends on it.

- [ ] **Step 2: Write the failing test**

Create `src/components/home/TopicsCarousel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";

describe("TopicsCarousel", () => {
  it("renders all 5 topics as links to their pages", () => {
    render(<TopicsCarousel />);

    const expected: [string, string][] = [
      ["Cerimônia", "/dicas-e-instrucoes/cerimonia"],
      ["Traje", "/dicas-e-instrucoes/codigo-de-vestimenta"],
      ["Hospedagem", "/dicas-e-instrucoes/hospedagem"],
      ["Lista de presentes", "/presentes"],
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

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/home/TopicsCarousel.test.tsx`
Expected: FAIL — `Cannot find module '@/components/home/TopicsCarousel'`

- [ ] **Step 4: Write the implementation**

Create `src/components/home/TopicsCarousel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

interface Topic {
  title: string;
  description: string;
  href: string;
}

const TOPICS: Topic[] = [
  {
    title: "Cerimônia",
    description: "Horário, local e tudo sobre a celebração.",
    href: "/dicas-e-instrucoes/cerimonia",
  },
  {
    title: "Traje",
    description: "Código de vestimenta para o grande dia.",
    href: "/dicas-e-instrucoes/codigo-de-vestimenta",
  },
  {
    title: "Hospedagem",
    description: "Sugestões de hotéis e pousadas próximas.",
    href: "/dicas-e-instrucoes/hospedagem",
  },
  {
    title: "Lista de presentes",
    description: "Ajude a construir o começo da nossa nova casa.",
    href: "/presentes",
  },
  {
    title: "Nossa história",
    description: "Como tudo começou até chegarmos aqui.",
    href: "/nossa-historia",
  },
];

function TopicPanel({ topic, className }: { topic: Topic; className?: string }) {
  return (
    <Link href={topic.href} className={`group relative block h-full overflow-hidden ${className ?? ""}`}>
      <PlaceholderImage label={`Foto — ${topic.title}`} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-forest/40 transition-colors group-hover:bg-forest/55" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-8 text-paper">
        <h3 className="font-serif text-3xl">{topic.title}</h3>
        <p className="font-sans text-sm text-paper/80">{topic.description}</p>
      </div>
    </Link>
  );
}

function useScrollDrivenTranslate(sectionRef: RefObject<HTMLElement | null>, maxTranslateVw: number) {
  const [translateVw, setTranslateVw] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const section = sectionRef.current;
      if (!section) return;

      const scrollableDistance = section.offsetHeight - window.innerHeight;
      if (scrollableDistance <= 0) return;

      const rect = section.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollableDistance);
      setTranslateVw((scrolled / scrollableDistance) * maxTranslateVw);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionRef, maxTranslateVw]);

  return translateVw;
}

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}

function DesktopScrollCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const rowWidthVw = TOPICS.length * 50;
  const maxTranslateVw = Math.max(rowWidthVw - 100, 0);
  const translateVw = useScrollDrivenTranslate(sectionRef, maxTranslateVw);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${translateVw}vw)`, width: `${rowWidthVw}vw` }}
        >
          {TOPICS.map((topic) => (
            <TopicPanel key={topic.href} topic={topic} className="w-[50vw] flex-shrink-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SwipeCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: false, align: "start" });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex h-[70vh]">
        {TOPICS.map((topic) => (
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

/**
 * Last section of the Home page. Desktop: scroll-jacked horizontal
 * carousel (vertical scroll drives horizontal panel movement). Mobile
 * and prefers-reduced-motion: a standard swipe/drag carousel instead —
 * see references/images/carrossel-de-scroll-horizontal.png for the
 * full-height photo treatment this mirrors (local design reference, not
 * in the repo).
 */
export function TopicsCarousel() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <div className="hidden md:block">
        {prefersReducedMotion ? <SwipeCarousel /> : <DesktopScrollCarousel />}
      </div>
      <div className="md:hidden">
        <SwipeCarousel />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/home/TopicsCarousel.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Delete `InfoCards` and update the Home page**

```bash
git rm src/components/home/InfoCards.tsx
```

Replace the full contents of `src/app/page.tsx` with:

```tsx
import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <SaveTheDateSection />
      <TopicsCarousel />
    </>
  );
}
```

- [ ] **Step 7: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests pass, build succeeds, `/` still builds successfully
with no reference to the deleted `InfoCards`.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/TopicsCarousel.tsx src/components/home/TopicsCarousel.test.tsx src/app/page.tsx
git commit -m "feat(home): replace InfoCards flip-card grid with scroll-driven TopicsCarousel"
```

---

## Task 9: Final cleanup and full verification

**Files:**
- Modify: `src/app/globals.css` (conditionally)

**Interfaces:** none.

- [ ] **Step 1: Confirm the retired tokens have zero remaining consumers**

Run: `grep -rn "\bink\b\|ink-soft\|charcoal\|gold-soft\|line-dark" src/ --include=*.tsx --include=*.ts`
Expected: no output. If anything is found, STOP — do not proceed to Step
2 until you've either fixed the stray reference (with an explicit `git
add` of only that file) or determined it's a false positive (e.g. a
variable name that happens to contain "ink" — read the match carefully).

- [ ] **Step 2: Remove the retired tokens from `globals.css`**

In `src/app/globals.css`, remove these 5 lines from `:root`:
`--color-ink`, `--color-ink-soft`, `--color-charcoal`,
`--color-gold-soft`, `--color-line-dark`. Remove the matching 5 lines
from `@theme inline` too (`--color-ink: var(--color-ink);` etc.). Leave
every other line untouched.

- [ ] **Step 3: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. If the build fails referencing an undefined color
utility, Step 1's grep missed something — re-run it and fix before
retrying.

- [ ] **Step 4: Visual route sanity check**

Run: `npm run build` (if not already run in Step 3) and confirm the
printed route list is unchanged from before this plan (same routes as
the end of the previous redesign — `/`, `/nossa-historia`,
`/confirmar-presenca`, `/presentes`, the 3 `/dicas-e-instrucoes/*`
routes, and every `/admin/*` route).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(brand): remove retired ink/charcoal/gold-soft/line-dark tokens"
```

---

## What this plan intentionally does NOT do

- Does not touch the admin CMS work (page/section content editing,
  wedding date field) — that is a separate sub-project, planned on its
  own after this one ships.
- Does not add real photos — `PlaceholderImage` stays until Stéfanie and
  Jonatas provide real content.
- Does not change any RSVP/gifts domain or application logic — this
  plan is presentation-only (colors + one component's layout mechanics +
  one hover interaction).
- Does not change the mobile menu or footer nav's hover behavior — only
  the desktop header nav gets the hover-matches-active treatment, per
  the approved design.
