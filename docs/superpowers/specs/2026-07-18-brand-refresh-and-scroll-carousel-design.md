# Brand Color Refresh & Scroll-Driven Topics Carousel

Date: 2026-07-18
Status: approved, ready for implementation plan

## Context

This is the first of two sub-projects in the site's "second phase" (the
first phase was the full visual redesign covering Plans 1–5, already
shipped). The second phase overall is:

1. **Brand color refresh + scroll-driven topics carousel + nav hover**
   (this document).
2. **Admin CMS for page content** (photos/text per page/section, wedding
   date) — a much larger, separate sub-project, brainstormed and planned
   on its own after this one ships.

This document covers only sub-project 1.

## Goal

Replace the current gold/neutral design-system palette with the couple's
official wedding identity colors, and rework the Home page's last section
(currently a static flip-card grid) into a scroll-driven horizontal
carousel matching the reference site's full-height photo panels. Also
make the desktop header's nav-link hover state visually match the active
state.

## 1. Color tokens

### The identity palette (given, not to be altered)

| Name | Hex | Intended use |
|---|---|---|
| Off-White Marfim | `#FEFFED` | Main background |
| Verde Sálvia Claro | `#E3E8C8` | Secondary section backgrounds, RSVP blocks |
| Verde Oliva Suave | `#D0D7AA` | Subtle borders, dividers, discreet icons |
| Verde Musgo Profundo | `#4A5335` | H1/H2 titles, action buttons |
| Verde Floresta Escuro | `#242A16` | Long-form reading text, footer |
| Dourado Metálico | `#D4AF37` | Minimalist details, couple's initials, highlighted links (sparing use) |

### New token set (`src/app/globals.css`)

The current 10-token system (`paper`, `paper-soft`, `ink`, `ink-soft`,
`charcoal`, `gold`, `gold-soft`, `line`, `line-dark`, `danger`) is
replaced by:

```css
--color-paper: #FEFFED;
--color-paper-soft: #E3E8C8;
--color-line: #D0D7AA;
--color-moss: #4A5335;   /* new — replaces gold's old "action color" role */
--color-forest: #242A16; /* new — replaces ink's role (text + dark panels) */
--color-gold: #D4AF37;   /* kept name, new value — sparing accent only */
--color-danger: #b3413a; /* unchanged — functional error color, not brand */
```

`--color-background` maps to `--color-paper`, `--color-foreground` to
`--color-forest`.

**Removed tokens and their replacements**, applied as a repo-wide sweep:

- `ink` → `forest` (body text, footer text)
- `ink-soft` → `forest` at reduced opacity (`text-forest/70`) — no new hex
  is introduced for "soft" text; Tailwind's opacity modifier does the job
  with colors already in the palette.
- `charcoal` (dark panel backgrounds, e.g. `SplitPanel` dark tone,
  `ArchFlipCard` back face) → `forest` used as a background color
  (`bg-forest`) instead of a foreground color. `#242A16` is dark enough to
  serve both roles.
- `gold` in its old "button/CTA/active-nav" role → `moss`. The literal
  word "gold" no longer describes a green hex, so every consumer that
  used `gold` for buttons, primary links, or the active-nav script color
  moves to `moss`. The `gold` token itself is kept, but only for the
  sparing Dourado Metálico use cases the palette calls out explicitly:
  the `Monogram`/logo mark and deliberately-highlighted inline links.
- `gold-soft` (hover-lighten for buttons) → `moss` at reduced opacity
  (`hover:bg-moss/80`), not a new hex.
- `line-dark` → dropped; not in active use anywhere in the codebase today
  (confirmed by grep before implementation); if a dark-on-dark border is
  ever needed, use `border-forest` at reduced opacity.

This is a value-and-selective-rename sweep across every component file
that currently references the removed tokens — no new components, no
behavior change, purely visual re-skinning of already-built UI.

## 2. Scroll-driven topics carousel

### Current state

`InfoCards` (`src/components/home/InfoCards.tsx`) renders the last
section of the Home page: a static CSS-grid of 5 flip-cards (Cerimônia,
Traje, Hospedagem, Presentes, Nossa história), each linking to its page,
flipping in place on hover to reveal a description.

### New behavior

Replaces `InfoCards` with a new `TopicsCarousel` component:

- **Desktop** (scroll-driven): the section is taller than the viewport
  (enough scroll distance to drive the animation — e.g. `300vh`). Inside
  it, a `position: sticky; top: 0; height: 100vh` inner container holds
  the 5 topic panels laid out in a horizontal row, each panel's photo
  filling the full container height (matching
  `references/images/carrossel-de-scroll-horizontal.png`'s full-bleed
  photo treatment, with the topic title overlaid). As the user scrolls
  down through the section's height, the row translates horizontally
  (`translateX`) in proportion to how far through the section they've
  scrolled — 0% scrolled = first panel fully visible, 100% scrolled =
  last panel fully visible. Normal vertical scrolling resumes once the
  section's scroll range is exhausted, continuing to the footer. Each
  panel stays a clickable link to its page, same as today's flip-cards.
- **Mobile** (viewport below the `md` breakpoint, matching the rest of
  the site's responsive convention): no scroll-jacking. Falls back to a
  standard horizontal swipe/drag carousel using the same `embla-carousel-react`
  library already used by `HeroCarousel`, one panel per view, same
  full-height-photo-with-title treatment.
- Same 5 topics, same target routes, as today's `InfoCards` — content
  unchanged, only presentation changes.
- Photos: `PlaceholderImage` until real photos exist, consistent with
  every other image slot on the site.

### Implementation approach

No new dependency beyond `embla-carousel-react` (already installed). The
desktop scroll-driven behavior is implemented with a scroll listener (or
`requestAnimationFrame`-throttled scroll handler) reading the section's
`getBoundingClientRect()` relative to the viewport, computing a 0–1
progress value, and applying it as a CSS custom property or inline
`transform: translateX(...)` on the panel row. This is a client component
(`"use client"`), consistent with the site's existing interactive
components (`HeroCarousel`, `RsvpSearch`).

### Accessibility

- The panel row remains keyboard-navigable (each panel is a real `<a>`/
  `next/link`, tab order follows DOM order regardless of visual scroll
  position).
- `prefers-reduced-motion` should disable the scroll-jacking transform
  (fall back to the mobile swipe-carousel presentation, or a simple
  vertical stack) — motion-triggered horizontal translation is exactly
  the kind of effect `prefers-reduced-motion: reduce` exists for.

## 3. Header nav hover = active style

`Header.tsx`'s desktop nav currently renders the active link in
`font-script italic text-moss` (lowercase) and every other link in
`font-serif uppercase tracking-[0.2em] text-current/80 hover:text-moss`
(color-only hover). This changes so that **hovering an inactive link
applies the same script/lowercase/moss treatment as the active state**,
reverting on mouse-out. Implemented with Tailwind's `group-hover`/`hover:`
utility swapping the font/casing, not just the color — likely via two
overlaid spans (one serif-uppercase, one script-lowercase) cross-faded on
hover, or a single element whose classes swap via a CSS `:hover` variant
combination. Scope: desktop header only (confirmed) — mobile menu and
footer nav are unchanged.

## Testing

- Token sweep: no new tests needed (pure CSS/className value changes); a
  repo-wide grep for the removed token names (`ink`, `ink-soft`,
  `charcoal`, `gold-soft`, `line-dark`) after the sweep must return zero
  matches, mirroring the verification pattern used in the first redesign
  phase.
- `TopicsCarousel`: a component test verifying all 5 topics render with
  correct links (adapted from... there is no existing `InfoCards` test to
  adapt, consistent with this codebase's existing testing depth for Home
  components — same precedent applies here, no dedicated test file
  expected for the visual carousel mechanics, but the topic data/links
  are simple enough to warrant a lightweight render test).
- Header hover: extend `Header.test.tsx` with a test asserting the hover
  state applies the same classes as the active state (using
  `fireEvent.mouseEnter`/`mouseLeave` or CSS-only verification depending
  on implementation approach chosen at plan time).

## What this does NOT do

- Does not touch the admin CMS work — that is sub-project 2, planned
  separately.
- Does not add real photos — placeholders remain until Stéfanie and
  Jonatas provide real content.
- Does not change the RSVP flow, gifts flow, or any domain/application
  logic — this is a presentation-only phase.
