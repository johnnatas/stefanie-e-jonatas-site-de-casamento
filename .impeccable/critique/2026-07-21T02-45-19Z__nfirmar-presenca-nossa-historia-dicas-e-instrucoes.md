---
target: public pages (home, presentes, confirmar-presenca, nossa-historia, dicas-e-instrucoes)
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-07-21T02-45-19Z
slug: nfirmar-presenca-nossa-historia-dicas-e-instrucoes
---
⚠️ DEGRADED: single-context (subagent spawn limit 200/200 exhausted)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good pending states; countdown aria-live fires every second (noisy) |
| 2 | Match System / Real World | 4 | Warm natural Portuguese copy, no jargon |
| 3 | User Control and Freedom | 2 | RSVP "done" screen is a dead end; mobile menu and reservation modal lack Esc/focus trap |
| 4 | Consistency and Standards | 2 | Nav active link has no aria-current; hardcoded hex colors bypass design tokens |
| 5 | Error Prevention | 3 | HTML5 validation well applied |
| 6 | Recognition Rather Than Recall | 3 | Text nav labels, clear |
| 7 | Flexibility and Efficiency | 3 | Fuzzy name search is a smart shortcut |
| 8 | Aesthetic and Minimalist Design | 3 | Strong authored identity, small token leaks |
| 9 | Error Recovery | 3 | Inline role="alert" errors, form state preserved |
| 10 | Help and Documentation | 3 | Dicas e Instruções acts as integrated documentation |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict

No absolute bans triggered (no gradient text, no glassmorphism, no identical-card-grid laziness, no out-of-context numbered markers — ArchFlipCard's 01/02/03 is a real timeline). Strong authored identity (torn-paper hero texture, restrained script font, scroll-jacked desktop carousel with swipe fallback on mobile, shuffled decorative RSVP text).

Caveat: the "eyebrow" kicker (small uppercase tracked span above heading) appears on 5 of 7 public pages (Home, Presentes, Cerimônia, Traje, Hospedagem via SplitPanel/content.eyebrow). Text varies per page so it's borderline brand-voice vs. AI scaffolding reflex — flagged P2, not P0.

Deterministic scan (detect.mjs): 2 advisory hits — CountdownTimer.tsx:27 text-[10px] off type ramp; SaveTheDateSection.tsx:23 #f8f8f8 outside DESIGN.md palette. Manual grep also found Header.tsx:36 bg-[#ffffff] hardcoded instead of bg-paper token, and HomeHero.tsx's -mt-[72px]/pt-[136px] magic values tied to the fixed header height.

## Overall Impression

The site has real personality — the bigger risk is a handful of accessibility and consistency leaks a real user will feel more than a visual critic will see. Biggest opportunity: close the interaction loops (RSVP dead end, non-trap-focused modals, unlabeled inputs) before polishing the surface further.

## What's Working

- Cohesive authored visual identity (torn-paper texture, restrained script font, scroll-jacked/swipe carousel).
- RSVP fuzzy name search with shuffled decorative background text — genuine personality most wedding sites skip.
- Inline loading/error states on gift forms avoid the "swallowed error" trap.

## Priority Issues

**[P1] Name/email fields in gift forms have no associated `<label>`**
- Why it matters: GiftCard.tsx ("now" and "later" forms) use only `placeholder` for "Seu nome"/"Seu e-mail" — no `<label htmlFor>`. Screen readers lose the field's purpose once text is entered. Violates WCAG 1.3.1/3.3.2.
- Fix: add a `<label className="sr-only">` (or visible) per input, `htmlFor` matched to `id`.
- Suggested command: /impeccable audit

**[P1] Mobile menu and reservation-confirmation modal aren't real modals**
- Why it matters: MobileMenu.tsx and GiftCard.tsx's `fixed inset-0` overlay lack `role="dialog"`/`aria-modal`, don't trap focus, and don't close on Esc. Keyboard/screen-reader users can get stuck or lose context.
- Fix: use native `<dialog>` or add focus-trap + Esc handler + `aria-modal="true"`.
- Suggested command: /impeccable audit

**[P2] Design-token drift in 3 spots**
- Why it matters: text-[10px] (CountdownTimer), #f8f8f8 (SaveTheDateSection), bg-[#ffffff] (Header) escape the documented DESIGN.md palette/type ramp.
- Fix: replace with text-xs (or a documented smaller step), bg-paper-soft or bg-paper as appropriate.
- Suggested command: /impeccable polish

**[P2] Countdown timer's aria-live fires every second**
- Why it matters: screen readers announce days/hours/minutes/seconds continuously — unusable for screen-reader users.
- Fix: remove aria-live from the per-second spans, or isolate one discrete "X days left" announcement outside the seconds loop.
- Suggested command: /impeccable audit

**[P3] Active nav link has no aria-current="page"**
- Why it matters: admin nav already adopted aria-current this session; public Header only signals "active" via a font swap, not announced to screen readers. Cross-surface inconsistency.
- Fix: add `aria-current={isActive ? "page" : undefined}`.
- Suggested command: /impeccable polish

## Persona Red Flags

**Jordan (First-Timer)**: After confirming/declining, the "done" screen shows only a thank-you sentence — no link back to home or elsewhere. "Fale com a gente" in the no-match message isn't a clickable contact.

**Sam (Accessibility-Dependent)**: Unlabeled gift form inputs; mobile menu and reservation modal lack keyboard/focus-trap support; countdown timer floods the screen reader every second.

**Casey (Distracted Mobile)**: RSVP search input uses `autoComplete="off"`, fighting the phone's own autofill. Counterbalanced by a real swipe-carousel fallback on mobile (good responsive design).

## Minor Observations

- HomeHero's -mt-[72px]/pt-[136px] magic values aren't tied to a shared constant with the header's h-[72px] — a header height change would silently break both.
- RSVP's decorativeText renders every guest's full name (shuffled) into the DOM — not sensitive for this use case, but worth a note if the guest list grows to include privacy-conscious guests.
- "Later" gift reservation date input has no sensible max/min beyond type="date" — nothing stops picking a past date client-side.
