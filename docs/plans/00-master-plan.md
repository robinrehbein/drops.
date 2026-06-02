# Drop — Parallel Implementation Plan

**Date:** 2026-05-08
**Status:** Planning complete, awaiting prioritization

---

## Overview

22 actionable tasks grouped into 5 independent work streams. Each group can be assigned to a separate agent, PR, or developer session. **No two groups share file ownership**, so they can run fully in parallel.

---

## Dependency Graph

```
Group A (Brew Lab Core)     ──┐
Group B (Bean Management)   ──┤  All 5 groups can run
Group C (History & Tasting) ──┤  in parallel — no shared
Group D (Data & Settings)   ──┤  file mutations.
Group E (New Features)      ──┘

Soft dependency:
  E4 (bean freshness detail) benefits from B4 (freshness badge on cards)
  E1 (onboarding) benefits from A3 (recovery) being implemented
  B6 (bean detail stats) links to A5 (dialing helper)
```

---

## Task Summary Matrix

| ID | Task | Group | Files | Impact | Effort | Priority |
|----|------|-------|-------|--------|--------|----------|
| A1 | Timer Reanimated migration | A | TimerDisplay | Medium | Small | P2 |
| A2 | Extraction ring live progress | A | ExtractionRing, lab/index | High | Medium | **P1** |
| A3 | Recovery banner | A | lab/index, brew hooks/repo | **Critical** | Medium | **P0** |
| A4 | Brew recipe recall | A | brew hooks/repo, lab/index | High | Small | **P1** |
| A5 | Shot dialing helper | A | new: lab/dialing, brew hooks | **Critical** | Medium | **P0** |
| B1 | Bean edit mode | B | library/[id], BeanForm | High | Medium | **P1** |
| B2 | Update bean hook | B | beans/hooks | Medium | Tiny | P2 |
| B3 | Expand bean form | B | BeanForm, library/new | Medium | Medium | P2 |
| B4 | Days-since-roast badge | B | BeanCard | High | Tiny | **P1** |
| B5 | Bean weight tracker visual | B | BeanCard | Medium | Tiny | P2 |
| B6 | Bean detail quick stats | B | library/[id] | High | Small | **P1** |
| C1 | History grouped by day | C | lab/history | Medium | Small | **P1** |
| C2 | History bean filter | C | lab/history | Medium | Small | P2 |
| C3 | Sensory sliders | C | tasting-note, SensorySlider | **Critical** | Small | **P0** |
| C4 | Session detail tasting notes | C | session/[id], brew hooks/repo | High | Small | **P1** |
| C5 | Pull-to-refresh | C | library/index, lab/history | Low | Tiny | P3 |
| C6 | Discard confirm dialog | C | tasting-note | Medium | Tiny | P2 |
| D1 | Settings wired to preferences | D | settings, preferences/* | High | Medium | **P1** |
| D2 | Dashboard bean query fix | D | dashboard/repo | Low | Tiny | P2 |
| D3 | Best-of-today card | D | dashboard/repo, tabs/index | Medium | Small | P2 |
| D4 | Data export (JSON) | D | export/*, settings | Medium | Small | P2 |
| D5 | Diagnostic report | D | diagnostic, settings | Low | Small | P3 |
| E1 | First-launch onboarding | E | onboarding state, OnboardingScreen | High | Medium | **P1** |
| E2 | Share shot card | E | ShotCard, export/shot-card | Medium | Medium | P2 |
| E3 | Weekly recap | E | insights/*, WeeklyRecapCard | Medium | Medium | P2 |
| E4 | Bean detail freshness | E | library/[id] | Low | Tiny | P3 |

---

## Priority Tiers

### P0 — Ship before beta (trust & core loop)
These fix broken promises in the spec or fill critical UX gaps:

1. **A3 Recovery banner** — mid-pull crash with no recovery = lost data = broken trust
2. **C3 Sensory sliders** — the tasting note screen is the app's most distinctive moment; it's incomplete
3. **A5 Shot dialing helper** — the #1 reason people download espresso apps; without it the app is just a notebook

### P1 — Ship with v1 (completeness)
These make the app feel whole:

4. **A2 Live extraction ring** — the ring is the visual centerpiece of the Lab; static is underwhelming
5. **A4 Brew recipe recall** — eliminates the most annoying manual re-entry
6. **B1 Bean edit mode** — users will make typos; not being able to fix them is frustrating
7. **B4 Freshness badge** — specialty coffee users care deeply about this
8. **B6 Bean detail stats** — "is this bean working for me?" is the natural question
9. **C1 History grouped by day** — flat list doesn't scale past 20 shots
10. **C4 Session detail tasting notes** — data is saved but invisible
11. **D1 Settings wired** — preferences table is unused
12. **E1 Onboarding** — empty app with no guidance kills activation

### P2 — Nice to have for v1 (polish)
13. **A1 Timer Reanimated** — performance improvement
14. **B2 Update bean hook** — needed by B1, small standalone
15. **B3 Expand bean form** — power users only
16. **B5 Weight tracker visual** — nice but remainingPct already shown
17. **C2 History bean filter** — only matters with 50+ shots
18. **C6 Discard confirm** — edge case safety
19. **D2 Dashboard query fix** — performance, not a user-facing bug
20. **D3 Best-of-today** — nice dashboard enrichment
21. **D4 Data export** — trust-building but not core
22. **E2 Share shot card** — growth feature, not retention
23. **E3 Weekly recap** — engagement hook for post-launch

### P3 — Post-launch backlog
24. **C5 Pull-to-refresh** — minor UX improvement
25. **D5 Diagnostic report** — support tool
26. **E4 Bean freshness detail** — enrichment of B4

---

## Execution Strategy

### Phase 1: Parallel Sprint (Groups A + C + B1/B4)

Run three agents simultaneously:

| Agent | Tasks | Rationale |
|-------|-------|-----------|
| Agent 1 | A3, A5, A2, A4 | Brew Lab is the hero — fix recovery, add dialing, make ring live |
| Agent 2 | C3, C4, C1, C6 | Complete the tasting + history experience |
| Agent 3 | B1, B2, B4, B6 | Bean management essentials |

**Milestone:** All P0 + most P1 tasks complete. App is demoable.

### Phase 2: Settings + Onboarding (Group D + E1)

| Agent | Tasks |
|-------|-------|
| Agent 4 | D1, D2, D3, D4 |
| Agent 5 | E1 |

**Milestone:** Settings work, onboarding guides new users, data is exportable.

### Phase 3: Polish + Growth (remaining)

| Agent | Tasks |
|-------|-------|
| Agent 6 | A1, B3, B5, C2, C5, E2, E3 |

**Milestone:** v1 feature-complete.

---

## File Ownership Map

Verifying no conflicts between groups:

```
Group A owns:                          Group B owns:
  src/ui/primitives/TimerDisplay.tsx     app/(tabs)/library/[id].tsx
  src/ui/primitives/ExtractionRing.tsx   app/(tabs)/library/new.tsx
  app/(tabs)/lab/index.tsx              src/ui/primitives/BeanCard.tsx
  app/(tabs)/lab/_layout.tsx            src/ui/forms/BeanForm.tsx (new)
  app/(tabs)/lab/dialing.tsx (new)      src/features/beans/hooks.ts
  src/features/brew/hooks.ts            src/features/beans/repo.ts (read-only for B2)
  src/features/brew/repo.ts

Group C owns:                          Group D owns:
  app/(tabs)/lab/history.tsx            app/(modals)/settings.tsx
  app/(tabs)/(modals)/tasting-note.tsx  src/features/preferences/* (new)
  app/(tabs)/lab/session/[id].tsx       src/features/dashboard/repo.ts
  src/ui/primitives/SensorySlider.tsx    src/features/export/* (new)
                                          src/lib/diagnostic.ts (new)
Group E owns:                            app/(tabs)/index.tsx
  src/state/onboarding.ts (new)
  src/ui/screens/OnboardingScreen.tsx (new)
  src/ui/primitives/ShotCard.tsx (new)
  src/features/export/shot-card.ts (new)
  src/features/insights/* (new)
  src/ui/primitives/WeeklyRecapCard.tsx (new)
  app/_layout.tsx (only E1 touches this)
```

**Shared files (need coordination):**
- `src/features/brew/repo.ts` — A3/A4/A5 add methods; C4 adds a method. Merge carefully.
- `src/features/brew/hooks.ts` — A3/A4/A5 add hooks; C4 adds a hook. Merge carefully.
- `src/features/_provider/repos.ts` — D1 adds preferences repo. Single line addition.

These are additive (new functions/hooks), not conflicting edits. Merge by concatenation.

---

## Acceptance Gate

Before merging any group:

- [ ] `npm run typecheck` — zero errors
- [ ] `npm test` — all existing + new tests pass
- [ ] `npm run lint` — zero new warnings
- [ ] Manual smoke test on Android emulator
- [ ] No regression in existing screens

---

## Plan Files

| File | Contents |
|------|----------|
| `docs/plans/00-master-plan.md` | This file |
| `docs/plans/group-a-brew-lab-core.md` | Tasks A1–A5 |
| `docs/plans/group-b-bean-management.md` | Tasks B1–B6 |
| `docs/plans/group-c-history-tasting.md` | Tasks C1–C6 |
| `docs/plans/group-d-data-settings.md` | Tasks D1–D5 |
| `docs/plans/group-e-new-features.md` | Tasks E1–E4 |
