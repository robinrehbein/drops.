# Dialing Coach — Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorm)
**Scope:** Espresso only (v1). No new DB columns, no recipe-schema change, no ML.

## 1. Overview

Brewlog captures rich per-shot signal (dose, yield, shot time, pre-infusion, first-drop,
star rating, and five tasting axes) but never translates it into an actionable next step.
The Dialing screen today is a **passive comparison table** — it shows *what* changed
between shots but never tells the user *what to do next*.

The **Dialing Coach** closes the espresso feedback loop: a pure, deterministic function
turns the latest shot (plus a target from the bean's recipe, or espresso defaults) into
**one** concrete next action — e.g. *"Grind ~2 steps finer."* It surfaces in two places and
is paired with a one-tap **"Repeat last shot"** path that pre-fills the next shot, with an
optional grind nudge.

### Goals
- Translate captured shot data into a single, confident next step.
- Make the next shot one tap away (repeat + optional grind nudge).
- Stay deterministic, testable, and inside the existing v1 scope.

### Non-goals
- Espresso only — no pour-over/other methods.
- No new DB columns; no recipe-schema change.
- No machine learning — rules only.
- No automatic detection of grinder click sizing beyond numeric parsing.

## 2. Domain logic — `src/domain/dialing.ts`

Pure module, 100% unit coverage (matches the rest of `src/domain/`).

### Input
```ts
type ShotSignal = {
  doseG: number;
  yieldG: number | null;
  durationS: number | null;
  acidity?: number | null;     // 1–5
  bitterness?: number | null;  // 1–5
  balance?: number | null;     // 1–5
  rating?: number | null;
};

type DialingTarget = {
  ratioTarget: number;       // default 2.0 (1:2)
  durationTargetS: number;   // default 27, acceptable window 25–30s
};
// Recipe overrides defaults when present (ratioTarget, durationTargetS).
```

### Output
```ts
type Lever =
  | 'grind-finer' | 'grind-coarser'
  | 'ratio-up' | 'ratio-down'
  | 'temp-up' | 'temp-down'
  | 'dialed-in';

type DialingAdvice = {
  verdict: 'too-fast' | 'too-slow' | 'sour' | 'bitter' | 'in-range' | 'dialed-in';
  primary: { lever: Lever; magnitude: 'small' | 'medium'; text: string };
  secondary?: { lever: Lever; text: string };
  confidence: 'low' | 'high';
  rationale: string; // e.g. "22s for 1:2 — ran fast"
};
```

### Rules (taste wins on conflict)
- **Taste** (when acidity/bitterness present): `net = acidity − bitterness`.
  - `net ≥ +1.5` → sour / under-extracted → **grind finer**.
  - `net ≤ −1.5` → bitter / over-extracted → **grind coarser**.
  - `|net| < 1.5` and `balance ≥ 4` → taste-side dialed-in.
- **Time:** actual shot time vs window `[25, 30]s` (or recipe target ± window).
  - `< 25s` → too fast / under → grind finer.
  - `> 30s` → too slow / over → grind coarser.
  - in window → ok.
- **Combination:**
  - Taste drives `primary` when available; time **corroborates** (→ `confidence: 'high'`)
    or supplies the `rationale`.
  - Without taste axes, time drives `primary` (`confidence` may be `'low'`).
  - Both ok / balanced → `verdict: 'dialed-in'`; `secondary` suggests a ratio experiment.
- **Magnitude:** just outside threshold → `small` (≈1 step); clearly off → `medium` (≈2 steps).

### Edge cases
- Missing `yieldG`/`durationS` → skip the time branch, `confidence: 'low'`.
- No shot at all → no advice (caller renders nothing).
- Non-numeric grind → handled in UI (nudge becomes advisory text); domain is grind-string-agnostic.

## 3. UI surfaces

### `CoachCard` — new primitive (`src/ui/primitives/CoachCard.tsx`)
- Renders verdict headline + `primary.text` + `rationale`.
- Status color from existing tokens: `forest` (dialed-in / in-range), `amber` (one axis off),
  `danger` (clearly off). Token discipline enforced (no raw colors).
- States: advice present, low-confidence (muted), none (renders null).

### Lab IdleSetup — `app/(tabs)/lab/index.tsx`
- CoachCard for the selected bean's most recent shot, placed directly above the start button.
- Includes the **"Repeat last shot"** action (see §4).
- No selected bean / no prior shot → no card.

### Dialing screen — `app/(tabs)/lab/dialing.tsx`
- Same CoachCard as a headline **above** the existing comparison table.
- The table is retained as supporting evidence; no change to its logic.

## 4. Repeat last shot + grind nudge

- **"Repeat last shot"** dispatches `configure` to the brew store with the last shot's
  `doseG`, `targetYieldG`, `grindSetting`, `grinderLabel`, `waterTempC`.
- If `grindSetting` parses as a number **and** the coach recommends finer/coarser, render
  **nudge chips** (e.g. "−2 finer") that rewrite the pre-filled grind value directly
  (number → string). Direction/steps come from `primary.lever` + `magnitude`.
- Non-numeric grind → no chips; the coach text remains advisory.

## 5. Testing strategy

- `src/domain/dialing.ts` — exhaustive: every `verdict`, taste-vs-time conflict (taste wins),
  missing-data → low confidence, dialed-in, magnitude thresholds, ratio-off. → 100% coverage.
- `CoachCard` — component tests for present / low-confidence / none states and color mapping.
- Store/hook test for repeat + numeric grind nudge (and non-numeric fallback).

## 6. Affected files

| File | Change |
|---|---|
| `src/domain/dialing.ts` | new pure module |
| `src/domain/index.ts` | export new module |
| `src/ui/primitives/CoachCard.tsx` | new primitive |
| `app/(tabs)/lab/index.tsx` | render CoachCard + Repeat action |
| `app/(tabs)/lab/dialing.tsx` | render CoachCard above table |
| `src/features/brew/store.ts` | repeat-last-shot prefill + grind nudge (if needed) |
| tests under `tests/domain/`, `tests/ui/primitives/`, `tests/state/` | new coverage |
