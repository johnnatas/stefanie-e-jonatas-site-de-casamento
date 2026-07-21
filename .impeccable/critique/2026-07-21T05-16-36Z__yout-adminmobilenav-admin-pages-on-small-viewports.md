---
target: mobile admin layout
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-07-21T05-16-36Z
slug: yout-adminmobilenav-admin-pages-on-small-viewports
---
⚠️ DEGRADED: single-context (subagent spawn limit 200/200 exhausted)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/pending states already established in forms |
| 2 | Match System / Real World | 3 | Clear Portuguese labels |
| 3 | User Control and Freedom | 3 | Mobile nav (just added) already has close/Esc/focus trap |
| 4 | Consistency and Standards | 2 | Presentes/Convidados headers break the responsive pattern the rest of admin follows |
| 5 | Error Prevention | 3 | Destructive-action confirmations already established |
| 6 | Recognition Rather Than Recall | 3 | Mobile nav correctly labeled |
| 7 | Flexibility and Efficiency | 2 | Two input+button rows in GiftForm risk horizontal overflow on narrow screens |
| 8 | Aesthetic and Minimalist Design | 3 | No clutter, but header overflow visibly breaks around 360px |
| 9 | Error Recovery | 3 | Already established |
| 10 | Help and Documentation | 3 | N/A for this scope |
| **Total** | | **28/40** | **Good** |

## Anti-Patterns Verdict
No AI-slop tells; product register, familiarity is the goal. detect.mjs --scope layout returned []. Manual grep found 3 concrete hits the detector doesn't cover (missing flex-wrap, missing min-w-0 on input+button rows): presentes/page.tsx:28, convidados/page.tsx:28, GiftForm.tsx (productLink ~L100, checkoutUrl ~L262).

## Overall Impression
The mobile nav fix (prior task) solved the worst problem — content is now reachable immediately. What remains is pointed: two list headers that don't stack on narrow screens, and two input+button pairs that can force horizontal scroll.

## Priority Issues

**[P1] Presentes/Convidados list headers lack flex-wrap**
- Why it matters: `flex items-center justify-between` holding h1 + ("Importar" + pill button) overflows on ~360-375px screens (available width ~312px after layout padding) with no wrap fallback.
- Fix: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`.
- Suggested command: /impeccable adapt

**[P1] GiftForm input+button rows missing min-w-0**
- Why it matters: productLink and checkoutUrl rows pair a w-full input with a shrink-0 button; without min-w-0 the input won't yield below its intrinsic content width, forcing overflow on narrow screens.
- Fix: add min-w-0 to the input's className in both rows.
- Suggested command: /impeccable adapt

**[P3] Filter fields (GiftsTable/GuestsTable) tight at 320px**
- Why it matters: flex-wrap already present so it doesn't break, but min-w-[200px] alone nearly fills the available width on very narrow (320px) phones.
- Fix: low priority, consider min-w-[160px] if it becomes a complaint.
- Suggested command: /impeccable polish

## Persona Red Flags

**Alex (Power User)**: The two GiftForm input+button pairs are exactly the fast-entry actions (paste link -> fetch data) most likely to be used on mobile right after copying a product link from a store app.

**Sam (Accessibility)**: "Importar" link has no min-h-11 unlike the public site's buttons fixed earlier this session — a small mobile touch target.

**Casey (Distracted Mobile)**: The missing flex-wrap only shows up in real device use, not desktop preview — first screen she'd hit would already look broken.

## Minor Observations
- DashboardStats, conteudo index, and integracoes already follow good mobile patterns (single column, no fixed widths).
- Tables (pagamentos, GiftsTable, GuestsTable) already use overflow-x-auto — an accepted, already-standardized pattern for dense data in this project.
