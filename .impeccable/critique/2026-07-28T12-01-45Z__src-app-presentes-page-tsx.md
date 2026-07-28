---
target: presentes page (filters, cards, glass effect)
total_score: 26
p0_count: 2
p1_count: 1
timestamp: 2026-07-28T12-01-45Z
slug: src-app-presentes-page-tsx
---
Method: dual-agent (A: general-purpose/opus design-review · B: general-purpose/sonnet detector+browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Mobile has an active-filter badge; desktop gives no result count or "filtered by" feedback after applying filters |
| 2 | Match System / Real World | 3 | Copy and flow are natural; no jargon |
| 3 | User Control and Freedom | 3 | "Limpar filtros" and modal close/backdrop/Escape all work |
| 4 | Consistency and Standards | 1 | Filter controls (native select/checkbox) look like an unstyled admin form dropped onto an otherwise custom-designed page |
| 5 | Error Prevention | 3 | Solid; forms validate, reservation flow guards required fields |
| 6 | Recognition Rather Than Recall | 3 | Filters and sort options are all visible, nothing hidden |
| 7 | Flexibility and Efficiency | 3 | Filter/sort/share cover the useful paths without extra complexity |
| 8 | Aesthetic and Minimalist Design | 2 | Frosted-glass card effect reads as washed-out/unfinished rather than a deliberate look; native controls break visual cohesion |
| 9 | Error Recovery | 3 | Empty-filtered state has a clear, distinct message |
| 10 | Help and Documentation | 2 | No visible page title/intro — first-timers land straight on a filter bar and grid with no framing |
| **Total** | | **26/40** | **Acceptable — solid mechanics, weak visual execution on two specific surfaces** |

## Anti-Patterns Verdict

**LLM assessment**: The gift-details modal is genuinely on-brand — forest/moss button hierarchy, script caption, payment icons, correctly full-screen after the portal fix. The **desktop filter bar reads as AI slop**: bare native `<select>` chevrons, a lone default-styled checkbox for a single category, four controls at mismatched heights with no container tying them together. The **frosted-glass cards** also register as "unfinished default" rather than an intentional effect — `bg-paper/60` (paper is near-white, `#feffed`) over a pale background leaves almost no visible contrast or blur, so the signature moment the reference image promised doesn't land.

**Deterministic scan** (`detect.mjs` against the 5 Presentes files, exit code 2):
- `design-system-font-size` — `GiftFiltersBar.tsx:211`, a `text-[10px]` badge size off the DESIGN.md type ramp. (Already surfaced and accepted as low-risk during the prior implementation review; still open.)
- `skipped-heading` — the page's `<h1>` is followed directly by gift-card `<h3>`s with no `<h2>` in between.
- `overused-font` — Inter carries 37% of visible text (expected for a body/label-heavy filter bar + card grid; not necessarily a defect on its own).
- `flat-type-hierarchy` — sizes cluster at 12/14/16/18px, a 1.5:1 ratio; consistent with the filter bar having no real typographic hierarchy of its own.
- `layout-transition` ("transition: padding") — could not be traced to any of the 5 scanned files' own `transition-*` utilities (all use `transition-colors`); likely misattributed to a native form-control default or a false positive. Not acted on.

**Browser evidence**: Screenshots confirm the modal now opens correctly centered and full-viewport at both 1280px and 390px (the portal fix holds), with no clipping or overflow at either width. They also directly confirm the native, unstyled `<select>`/checkbox appearance on desktop, and that the mobile "Filtros" collapse hides this problem responsively (no raw native controls visible at 390px). One additional finding, unrelated to the design detector: a recurring React hydration-mismatch console error on the search input and category checkbox, both involving a `caret-color: transparent` style neither this project's source code nor its Tailwind classes reference anywhere — most likely injected by a browser extension in the review session's browser profile, not a real app bug. Worth a quick check in a clean browser profile if it persists for you, but not something to chase in the codebase.

## Overall Impression

The mechanics are solid — filtering, sorting, sharing, the mobile panel, and the reservation flow all work correctly and are well-tested. The visual execution is uneven: the modal (the moment of actually choosing a gift) is warm and on-brand, but the browsing experience that leads up to it currently undercuts that with washed-out cards and a completely unstyled filter bar. The biggest opportunity is closing that gap so the first impression matches the commit moment, not the reverse.

## What's Working
1. **The gift-details modal** — correct brand button hierarchy (moss/forest), script caption, payment icons, and (post-fix) proper full-screen centering with no clipping at any width.
2. **Mobile filter pattern** — the "FILTROS" pill + active-count badge + full-screen focus-trapped panel + "Aplicar" is a clean, on-brand solution that hides the desktop bar's problems entirely on the width most guests will actually use.
3. **Palette discipline** — moss stays reserved for interactive/active states, no stray decorative color, no wedding-site cliché (pastel/cursive-everywhere) anywhere on this page.

## Priority Issues

**[P0] Desktop filter bar has no design applied**
- **Why it matters**: it's the single biggest "AI made this" tell on the page and the user's own explicit complaint — native select chevrons, a lone default checkbox, mismatched control heights with no shared container or baseline.
- **Fix**: wrap the bar in a bordered `bg-paper`/`paper-soft` panel; replace native `<select>` chrome with a custom-styled trigger (custom arrow, brand border/focus ring matching `PhotoUploadField`/form input conventions already used elsewhere); turn the category checkbox into a pill-toggle matching the "Ver detalhes" button language; align every control to one shared height/baseline.
- **Suggested command**: `/impeccable polish`

**[P0] Frosted-glass card effect reads as washed-out, not intentional**
- **Why it matters**: this was the specific effect the user asked for twice, referencing an example image — as shipped it's nearly invisible against `paper`'s near-white tone.
- **Fix**: needs either a richer/darker background photo to blur against, a stronger card opacity/border to read as a distinct panel, or both — the current combination sits in an uncanny middle between "flat paper card" and "visible glass."
- **Suggested command**: `/impeccable polish`

**[P1] Frosted-glass + full-bleed photo is a systemic departure from this project's own flat-design rule**
- **Why it matters**: DESIGN.md explicitly bans `backdrop-filter`/glassmorphism sitewide ("chapado" by decision) — this page is now the one exception. That's fine as a deliberate, user-directed choice (made twice, explicitly, with a reference image), but it needs to read as confident and intentional, or it will look like an inconsistent patch rather than a considered new moment for this one page.
- **Fix**: execute the effect with enough visual confidence (see above) that it reads as "the one place this site does something different, on purpose" rather than an unfinished default.
- **Suggested command**: `/impeccable polish`

**[P2] No visible page framing for first-time visitors**
- **Why it matters**: the `<h1>` is `sr-only`; a first-timer lands straight on a filter bar with no visible title, intro line, or explanation of what "Ver detalhes" leads to.
- **Fix**: add a visible serif heading + one warm intro line above the filter bar, consistent with the site's "com carinho" voice.
- **Suggested command**: `/impeccable polish`

**[P2] No result-count / active-filter feedback on desktop**
- **Why it matters**: mobile has the active-filter badge; desktop gives no confirmation that a filter actually changed the visible set beyond the grid itself re-rendering.
- **Fix**: show a small "N presentes" or active-filter summary near the bar.
- **Suggested command**: `/impeccable polish`

## Persona Red Flags

**Jordan (First-Timer)**: Lands on a pale, low-contrast grid with no visible title or explanation of how gifting works; the washed-out cards don't visually signal "tap me," and there's no cue that "Ver detalhes" is the path to actually contributing.

**Casey (Distracted Mobile User)**: Best served overall — the FILTROS collapse and single-column cards work well responsively. But the faint card/background contrast is a real legibility risk in bright outdoor light on a phone screen, and the recurring console hydration warning (if it turns out to be real rather than extension noise) is exactly the kind of thing that silently breaks on some devices without an obvious visible symptom.

## Minor Observations
- Single-category checkbox currently looks like a stray control rather than a filter, since there's only one category in the current seed data.
- `text-[10px]` badge size (mobile filter-count) is off the documented type ramp — cosmetic, already known.
- No `<h2>` between the page's `<h1>` and the card `<h3>`s — a heading-level skip worth closing while touching this page's markup anyway.
- Native `<input type="date">` in the reserve-for-later form is unstyled relative to the rest of the brand's form fields — out of scope for this page's own filter/card work, but worth a follow-up note.

## Questions to Consider
1. If a genuinely rich, darker reference photo isn't available yet, would confident flat paper-soft cards (the site's native language) look more intentional than a faint blur over a light background — at least until a stronger photo is chosen?
2. Should "Categoria" be visually de-emphasized (or hidden) until there are enough categories to make filtering by it meaningful?
3. The modal already nails "com carinho" — what's the smallest change that carries even some of that warmth up into the very first thing a guest sees on this page?
