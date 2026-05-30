# Dialing Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Brewlog's passive shot data into one concrete next dialing action ("grind ~2 steps finer"), surfaced in the Lab and Dialing screens, with a one-tap "Repeat last shot" + grind nudge.

**Architecture:** All decision logic is pure code in `src/domain/dialing.ts` (target resolution, signal assembly, advice, grind nudge) at 100% coverage. A thin hook in `src/features/dialing/hooks.ts` composes the latest shot, its tasting note, the bean's recipe, and preferences into a `DialingAdvice`. A `CoachCard` primitive renders it. Screens wire the card + repeat/nudge via the existing brew-store `configure` event. A configurable target-time window is added to preferences via a Drizzle migration.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`), Expo Router, Drizzle ORM + expo-sqlite, Zustand, TanStack Query, jest + jest-expo + RNTL.

**Verification gates (run after every task that touches code):**
- `npm run typecheck` — catches zod/exactOptionalPropertyTypes drift.
- `npm test` — full suite, never `--passWithNoTests`.
- If any `src/domain/**` file changed: confirm it stays at 100% coverage (`npm run test:coverage`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/dialing.ts` | **new** — pure: `resolveDialingTarget`, `buildShotSignal`, `dialingAdvice`, `nudgeGrind` + types |
| `src/domain/index.ts` | export `./dialing` |
| `tests/domain/dialing.test.ts` | **new** — exhaustive unit tests |
| `src/db/schema.ts` | add `dialTimeMinS` / `dialTimeMaxS` columns to `preferences` |
| `src/db/migrations/0004_*.sql` + `bundle.json` + `meta/` | **generated** by `npm run db:prepare` |
| `src/features/preferences/repo.ts` | seed defaults (25/30) + add to `PreferencesUpdate` |
| `tests/features/preferences/repo.test.ts` | assert new defaults (extend if exists, else create) |
| `src/features/dialing/hooks.ts` | **new** — `useDialingAdvice(beanId)` thin wiring hook |
| `src/ui/primitives/CoachCard.tsx` | **new** — renders advice / low-confidence / empty-tip states |
| `tests/ui/primitives/CoachCard.test.tsx` | **new** — component states |
| `app/(tabs)/lab/index.tsx` | render `CoachCard` + Repeat-last-shot + grind nudge in IdleSetup |
| `app/(tabs)/lab/dialing.tsx` | render `CoachCard` headline above the comparison table |
| `app/(modals)/settings.tsx` | two steppers for dialing target-time window |

---

## Task 1: Domain — `src/domain/dialing.ts`

**Files:**
- Create: `src/domain/dialing.ts`
- Create: `tests/domain/dialing.test.ts`
- Modify: `src/domain/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/domain/dialing.test.ts`:

```ts
import {
  resolveDialingTarget,
  buildShotSignal,
  dialingAdvice,
  nudgeGrind,
  type DialingTarget,
} from '@/domain/dialing';

const TARGET: DialingTarget = { ratioTarget: 2, timeMinS: 25, timeMaxS: 30 };

describe('resolveDialingTarget', () => {
  const prefs = { dialTimeMinS: 25, dialTimeMaxS: 30, defaultRatio: 2 };

  it('uses prefs window and default ratio when no recipe', () => {
    expect(resolveDialingTarget(null, prefs)).toEqual({ ratioTarget: 2, timeMinS: 25, timeMaxS: 30 });
  });

  it('recipe ratioTarget overrides defaultRatio', () => {
    expect(resolveDialingTarget({ ratioTarget: 2.5, durationTargetS: null }, prefs).ratioTarget).toBe(2.5);
  });

  it('recipe durationTargetS recenters the window keeping prefs half-width', () => {
    // prefs half-width = (30-25)/2 = 2.5; centered on 32 → [29.5, 34.5]
    expect(resolveDialingTarget({ ratioTarget: null, durationTargetS: 32 }, prefs)).toEqual({
      ratioTarget: 2,
      timeMinS: 29.5,
      timeMaxS: 34.5,
    });
  });
});

describe('buildShotSignal', () => {
  it('merges session fields with tasting axes', () => {
    const sig = buildShotSignal(
      { doseG: 18, yieldG: 36, durationS: 27, rating: 4 },
      { acidity: 3, bitterness: 3, balance: 4 },
    );
    expect(sig).toEqual({ doseG: 18, yieldG: 36, durationS: 27, rating: 4, acidity: 3, bitterness: 3, balance: 4 });
  });

  it('tolerates a missing tasting note', () => {
    const sig = buildShotSignal({ doseG: 18, yieldG: 36, durationS: 27, rating: null }, null);
    expect(sig.acidity).toBeNull();
    expect(sig.bitterness).toBeNull();
  });
});

describe('dialingAdvice', () => {
  it('returns null when there is no shot', () => {
    expect(dialingAdvice(null, TARGET)).toBeNull();
  });

  it('sour taste → grind finer, taste wins, time corroborates → high confidence', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 22, acidity: 5, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('sour');
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.confidence).toBe('high'); // sour + fast agree
  });

  it('bitter taste → grind coarser, magnitude medium for strong net', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 34, acidity: 1, bitterness: 5, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('bitter');
    expect(a.primary.lever).toBe('grind-coarser');
    expect(a.primary.magnitude).toBe('medium');
  });

  it('taste wins on conflict (sour but slow) → finer, low confidence', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 34, acidity: 5, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.confidence).toBe('low');
  });

  it('no taste, time too fast → finer from time only', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 20 }, TARGET)!;
    expect(a.verdict).toBe('too-fast');
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.primary.magnitude).toBe('medium'); // off by 5s (>4)
  });

  it('no taste, time too slow but only slightly → coarser, small, low confidence', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 32 }, TARGET)!;
    expect(a.verdict).toBe('too-slow');
    expect(a.primary.magnitude).toBe('small'); // off by 2s
    expect(a.confidence).toBe('low');
  });

  it('balanced taste + in-range time → dialed-in with a ratio secondary', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(a.verdict).toBe('dialed-in');
    expect(a.primary.lever).toBe('dialed-in');
    expect(a.secondary?.lever).toBe('ratio-up');
  });

  it('no duration and no taste → low confidence in-range fallback', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: null, durationS: null }, TARGET)!;
    expect(a.confidence).toBe('low');
    expect(a.verdict).toBe('in-range');
  });
});

describe('nudgeGrind', () => {
  const finer = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 20 }, TARGET)!; // grind-finer, medium
  it('decrements a numeric grind for finer by the magnitude steps', () => {
    expect(nudgeGrind('12', finer)).toBe('10'); // medium = 2 steps, finer = minus
  });
  it('increments for coarser', () => {
    const coarser = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 32 }, TARGET)!; // small coarser
    expect(nudgeGrind('12', coarser)).toBe('13'); // small = 1 step, coarser = plus
  });
  it('leaves non-numeric grind unchanged', () => {
    expect(nudgeGrind('fine-3', finer)).toBe('fine-3');
  });
  it('returns the current value unchanged when advice is not a grind lever', () => {
    const dialed = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(nudgeGrind('12', dialed)).toBe('12');
  });
  it('returns null when grind is null', () => {
    expect(nudgeGrind(null, finer)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dialing`
Expected: FAIL — `Cannot find module '@/domain/dialing'`.

- [ ] **Step 3: Implement `src/domain/dialing.ts`**

```ts
/**
 * Dialing Coach — pure espresso dialing logic.
 *
 * Conventions:
 * - "finer" decreases a numeric grind value, "coarser" increases it. This matches the
 *   most common espresso grinder dialing (lower number = finer). Non-numeric grind
 *   settings are left untouched and the advice text stays advisory.
 * - Taste wins over time on conflict (the barista rule).
 */

export type ShotSignal = {
  doseG: number;
  yieldG: number | null;
  durationS: number | null;
  acidity?: number | null;
  bitterness?: number | null;
  balance?: number | null;
  rating?: number | null;
};

export type DialingTarget = {
  ratioTarget: number;
  timeMinS: number;
  timeMaxS: number;
};

export type Lever =
  | 'grind-finer'
  | 'grind-coarser'
  | 'ratio-up'
  | 'ratio-down'
  | 'temp-up'
  | 'temp-down'
  | 'dialed-in';

export type Verdict = 'too-fast' | 'too-slow' | 'sour' | 'bitter' | 'in-range' | 'dialed-in';

export type DialingAdvice = {
  verdict: Verdict;
  primary: { lever: Lever; magnitude: 'small' | 'medium'; text: string };
  secondary?: { lever: Lever; text: string };
  confidence: 'low' | 'high';
  rationale: string;
};

const TASTE_THRESHOLD = 1.5; // |acidity - bitterness| at/above this is a clear taste signal
const TASTE_MEDIUM = 2.5; // net at/above this nudges by 2 steps
const BALANCE_GOOD = 4; // balance at/above this counts as taste-side dialed-in
const TIME_MEDIUM_S = 4; // seconds outside the window that warrant a 2-step move

type PrefsLike = { dialTimeMinS: number; dialTimeMaxS: number; defaultRatio: number };
type RecipeLike = { durationTargetS?: number | null; ratioTarget?: number | null };

export function resolveDialingTarget(recipe: RecipeLike | null, prefs: PrefsLike): DialingTarget {
  const ratioTarget = recipe?.ratioTarget ?? prefs.defaultRatio;
  const halfWidth = (prefs.dialTimeMaxS - prefs.dialTimeMinS) / 2;
  if (recipe?.durationTargetS != null) {
    return {
      ratioTarget,
      timeMinS: recipe.durationTargetS - halfWidth,
      timeMaxS: recipe.durationTargetS + halfWidth,
    };
  }
  return { ratioTarget, timeMinS: prefs.dialTimeMinS, timeMaxS: prefs.dialTimeMaxS };
}

type SessionLike = Pick<ShotSignal, 'doseG' | 'yieldG' | 'durationS' | 'rating'>;
type NoteLike = { acidity?: number | null; bitterness?: number | null; balance?: number | null };

export function buildShotSignal(session: SessionLike, note: NoteLike | null): ShotSignal {
  return {
    doseG: session.doseG,
    yieldG: session.yieldG,
    durationS: session.durationS,
    rating: session.rating ?? null,
    acidity: note?.acidity ?? null,
    bitterness: note?.bitterness ?? null,
    balance: note?.balance ?? null,
  };
}

function grindText(lever: 'grind-finer' | 'grind-coarser', magnitude: 'small' | 'medium'): string {
  const steps = magnitude === 'medium' ? 2 : 1;
  const dir = lever === 'grind-finer' ? 'finer' : 'coarser';
  return `Grind ~${steps} step${steps > 1 ? 's' : ''} ${dir}`;
}

export function dialingAdvice(shot: ShotSignal | null, target: DialingTarget): DialingAdvice | null {
  if (!shot) return null;

  const hasTaste = shot.acidity != null && shot.bitterness != null;
  const net = hasTaste ? shot.acidity! - shot.bitterness! : null;
  const hasTime = shot.durationS != null;
  const ratioLabel = `1:${target.ratioTarget.toFixed(1)}`;
  const actualRatio = shot.yieldG != null && shot.doseG > 0 ? shot.yieldG / shot.doseG : null;
  const ratioStr = actualRatio != null ? `1:${actualRatio.toFixed(1)}` : ratioLabel;

  // Time branch
  let timeDir: 'fast' | 'slow' | 'ok' | null = null;
  let timeMag: 'small' | 'medium' = 'small';
  if (hasTime) {
    const d = shot.durationS!;
    if (d < target.timeMinS) {
      timeDir = 'fast';
      timeMag = target.timeMinS - d > TIME_MEDIUM_S ? 'medium' : 'small';
    } else if (d > target.timeMaxS) {
      timeDir = 'slow';
      timeMag = d - target.timeMaxS > TIME_MEDIUM_S ? 'medium' : 'small';
    } else {
      timeDir = 'ok';
    }
  }

  // Taste branch
  let tasteDir: 'sour' | 'bitter' | 'balanced' | null = null;
  let tasteMag: 'small' | 'medium' = 'small';
  if (hasTaste) {
    if (net! >= TASTE_THRESHOLD) {
      tasteDir = 'sour';
      tasteMag = net! >= TASTE_MEDIUM ? 'medium' : 'small';
    } else if (net! <= -TASTE_THRESHOLD) {
      tasteDir = 'bitter';
      tasteMag = net! <= -TASTE_MEDIUM ? 'medium' : 'small';
    } else {
      tasteDir = (shot.balance ?? 0) >= BALANCE_GOOD ? 'balanced' : null;
    }
  }

  // Taste drives when it gives a clear sour/bitter signal.
  if (tasteDir === 'sour' || tasteDir === 'bitter') {
    const lever = tasteDir === 'sour' ? 'grind-finer' : 'grind-coarser';
    const corroborates =
      (tasteDir === 'sour' && timeDir === 'fast') || (tasteDir === 'bitter' && timeDir === 'slow');
    const conflicts =
      (tasteDir === 'sour' && timeDir === 'slow') || (tasteDir === 'bitter' && timeDir === 'fast');
    const confidence: 'low' | 'high' = conflicts ? 'low' : 'high';
    const timeNote = hasTime ? ` · ${shot.durationS!.toFixed(0)}s` : '';
    return {
      verdict: tasteDir,
      primary: { lever, magnitude: tasteMag, text: grindText(lever, tasteMag) },
      confidence,
      rationale: `${ratioStr}${timeNote} · tastes ${tasteDir} → ${
        tasteDir === 'sour' ? 'under' : 'over'
      }-extracted${corroborates ? ' (time agrees)' : ''}`,
    };
  }

  // No clear taste signal: fall back to time.
  if (timeDir === 'fast' || timeDir === 'slow') {
    const lever = timeDir === 'fast' ? 'grind-finer' : 'grind-coarser';
    const verdict: Verdict = timeDir === 'fast' ? 'too-fast' : 'too-slow';
    // Balanced taste contradicting the clock → keep confidence low.
    const confidence: 'low' | 'high' = tasteDir === 'balanced' ? 'low' : timeMag === 'medium' ? 'high' : 'low';
    return {
      verdict,
      primary: { lever, magnitude: timeMag, text: grindText(lever, timeMag) },
      confidence,
      rationale: `${shot.durationS!.toFixed(0)}s for ${ratioStr} — ran ${timeDir}`,
    };
  }

  // Everything in range / balanced → dialed in.
  if (tasteDir === 'balanced' || timeDir === 'ok') {
    return {
      verdict: 'dialed-in',
      primary: { lever: 'dialed-in', magnitude: 'small', text: 'Dialed in — nice shot' },
      secondary: { lever: 'ratio-up', text: 'To explore: try a longer ratio (e.g. 1:2.5)' },
      confidence: 'high',
      rationale: `${ratioStr}${hasTime ? ` · ${shot.durationS!.toFixed(0)}s` : ''} — in the zone`,
    };
  }

  // No usable signal (no time, no taste).
  return {
    verdict: 'in-range',
    primary: { lever: 'dialed-in', magnitude: 'small', text: 'Log shot time or taste for tips' },
    confidence: 'low',
    rationale: 'Not enough signal yet',
  };
}

export function nudgeGrind(current: string | null, advice: DialingAdvice | null): string | null {
  if (current == null || !advice) return current;
  const { lever, magnitude } = advice.primary;
  if (lever !== 'grind-finer' && lever !== 'grind-coarser') return current;
  const n = Number(current);
  if (!Number.isFinite(n) || current.trim() === '') return current;
  const steps = magnitude === 'medium' ? 2 : 1;
  const next = lever === 'grind-finer' ? n - steps : n + steps;
  return String(next);
}
```

- [ ] **Step 4: Export from the domain barrel**

Modify `src/domain/index.ts` — add alongside the existing exports:

```ts
export * from './dialing';
```

(If `index.ts` re-exports explicitly per-symbol rather than `export *`, match that style and add the four functions + types.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- dialing`
Expected: PASS (all cases green).

- [ ] **Step 6: Verify type + coverage**

Run: `npm run typecheck` → no errors.
Run: `npm run test:coverage -- dialing` → `src/domain/dialing.ts` at 100% statements/branches.

- [ ] **Step 7: Commit**

```bash
git add src/domain/dialing.ts src/domain/index.ts tests/domain/dialing.test.ts
git commit -m "feat(domain): dialing coach logic (target/advice/nudge)"
```

---

## Task 2: Preferences — configurable target-time window

**Files:**
- Modify: `src/db/schema.ts` (preferences table)
- Modify: `src/features/preferences/repo.ts`
- Generated: `src/db/migrations/0004_*.sql`, `bundle.json`, `meta/`
- Test: `tests/features/preferences/repo.test.ts`

- [ ] **Step 1: Add columns to the schema**

In `src/db/schema.ts`, inside the `preferences` table definition, add after `dailyCupsGoal`:

```ts
  dialTimeMinS: integer('dial_time_min_s').notNull().default(25),
  dialTimeMaxS: integer('dial_time_max_s').notNull().default(30),
```

- [ ] **Step 2: Generate the migration + bundle**

Run: `npm run db:prepare`
Expected: a new `src/db/migrations/0004_*.sql` containing two `ALTER TABLE preferences ADD COLUMN ...` statements, `meta/_journal.json` gains an `idx: 4` entry, and `bundle.json` gains the 0004 entry. Inspect the generated SQL to confirm it only adds the two columns.

- [ ] **Step 3: Seed defaults + extend the update type in the repo**

In `src/features/preferences/repo.ts`:

Add to `PreferencesUpdate`:
```ts
  dialTimeMinS?: number;
  dialTimeMaxS?: number;
```

Add to the seed `db.insert(preferences).values({ ... })` (after `caffeineTargetMg: null,`):
```ts
          dialTimeMinS: 25,
          dialTimeMaxS: 30,
```

- [ ] **Step 4: Write/extend the repo test**

`tests/features/preferences/repo.test.ts` already exists and uses `makeTestDb()` from
`@tests/helpers/test-db`. **Note:** that helper builds the in-memory tables by replaying
`bundle.json` migrations — so these tests only pass once Step 2 (`npm run db:prepare`) has
regenerated the bundle with migration 0004. Run tasks in order. Add these two cases inside the
existing `describe('preferences repo', ...)` block, matching the file's style:

```ts
  it('seeds the dialing target-time window defaults', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    const prefs = await repo.get();
    expect(prefs.dialTimeMinS).toBe(25);
    expect(prefs.dialTimeMaxS).toBe(30);
  });

  it('updates the dialing window', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    await repo.get();
    const updated = await repo.update({ dialTimeMinS: 27, dialTimeMaxS: 33 });
    expect(updated.dialTimeMinS).toBe(27);
    expect(updated.dialTimeMaxS).toBe(33);
  });
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- preferences`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrations src/features/preferences/repo.ts tests/features/preferences
git commit -m "feat(prefs): configurable dialing target-time window (migration 0004)"
```

---

## Task 3: Wiring hook — `useDialingAdvice`

**Files:**
- Create: `src/features/dialing/hooks.ts`

This hook is thin glue (queries + pure-domain calls). The logic it calls is already covered by Task 1; no new unit test here — it is verified through the screen tasks and manual run.

- [ ] **Step 1: Implement the hook**

Create `src/features/dialing/hooks.ts`:

```ts
import { useLastShotForBean, useTastingNotes } from '@/features/brew/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useRecipeForBean } from '@/features/recipes/hooks';
import {
  buildShotSignal,
  dialingAdvice,
  resolveDialingTarget,
  type DialingAdvice,
} from '@/domain/dialing';

export type DialingAdviceResult = {
  advice: DialingAdvice | null;
  lastShot: ReturnType<typeof useLastShotForBean>['data'];
};

/**
 * Composes the bean's latest shot, its tasting note, the bean recipe, and preferences
 * into a DialingAdvice. Returns `{ advice: null }` until data is loaded or when the bean
 * has no prior shot (the screen then shows the empty espresso tip).
 */
export function useDialingAdvice(beanId: string | null): DialingAdviceResult {
  const { data: lastShot } = useLastShotForBean(beanId);
  const { data: note } = useTastingNotes(lastShot?.id ?? '');
  const { data: recipe } = useRecipeForBean(beanId);
  const { data: prefs } = usePreferences();

  if (!lastShot || !prefs) return { advice: null, lastShot };

  const target = resolveDialingTarget(recipe ?? null, {
    dialTimeMinS: prefs.dialTimeMinS,
    dialTimeMaxS: prefs.dialTimeMaxS,
    defaultRatio: prefs.defaultRatio,
  });
  const signal = buildShotSignal(lastShot, note ?? null);
  return { advice: dialingAdvice(signal, target), lastShot };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (Confirm `useTastingNotes` returns a single `TastingNoteRow | null` — it does per `brew/repo.ts`. With `enabled: !!sessionId`, passing `''` keeps it disabled until a shot exists.)

- [ ] **Step 3: Commit**

```bash
git add src/features/dialing/hooks.ts
git commit -m "feat(dialing): useDialingAdvice composition hook"
```

---

## Task 4: `CoachCard` primitive

**Files:**
- Create: `src/ui/primitives/CoachCard.tsx`
- Create: `tests/ui/primitives/CoachCard.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `tests/ui/primitives/CoachCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { CoachCard } from '@/ui/primitives/CoachCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import type { DialingAdvice } from '@/domain/dialing';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const sour: DialingAdvice = {
  verdict: 'sour',
  primary: { lever: 'grind-finer', magnitude: 'medium', text: 'Grind ~2 steps finer' },
  confidence: 'high',
  rationale: '1:2.0 · 22s · tastes sour → under-extracted (time agrees)',
};

describe('CoachCard', () => {
  it('renders the primary action and rationale for advice', () => {
    wrap(<CoachCard advice={sour} />);
    expect(screen.getByText('Grind ~2 steps finer')).toBeTruthy();
    expect(screen.getByText(/under-extracted/)).toBeTruthy();
  });

  it('shows the general espresso tip when advice is null', () => {
    wrap(<CoachCard advice={null} />);
    expect(screen.getByTestId('coach-empty-tip')).toBeTruthy();
  });

  it('marks low-confidence advice', () => {
    wrap(<CoachCard advice={{ ...sour, confidence: 'low' }} />);
    expect(screen.getByTestId('coach-low-confidence')).toBeTruthy();
  });

  it('renders a secondary suggestion when present', () => {
    wrap(
      <CoachCard
        advice={{
          verdict: 'dialed-in',
          primary: { lever: 'dialed-in', magnitude: 'small', text: 'Dialed in — nice shot' },
          secondary: { lever: 'ratio-up', text: 'To explore: try a longer ratio (e.g. 1:2.5)' },
          confidence: 'high',
          rationale: '1:2.0 · 27s — in the zone',
        }}
      />,
    );
    expect(screen.getByText(/longer ratio/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- CoachCard`
Expected: FAIL — `Cannot find module '@/ui/primitives/CoachCard'`.

- [ ] **Step 3: Implement `src/ui/primitives/CoachCard.tsx`**

```tsx
import { View } from 'react-native';

import type { DialingAdvice, Verdict } from '@/domain/dialing';
import { useTheme } from '@/ui/theme/useTheme';
import { Surface } from './Surface';
import { Text } from './Text';

const EMPTY_TIP = 'Aim for ~1:2 in 25–30s. Tastes sour → grind finer; bitter → grind coarser.';

function accentFor(verdict: Verdict, t: ReturnType<typeof useTheme>): string {
  switch (verdict) {
    case 'dialed-in':
    case 'in-range':
      return t.colors.forest;
    case 'sour':
    case 'too-fast':
    case 'bitter':
    case 'too-slow':
      return t.colors.amber;
    default:
      return t.colors.forest;
  }
}

export function CoachCard({
  advice,
  children,
}: {
  advice: DialingAdvice | null;
  children?: React.ReactNode;
}) {
  const t = useTheme();

  if (!advice) {
    return (
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <Text variant="label">COACH</Text>
        <Text testID="coach-empty-tip" variant="body" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {EMPTY_TIP}
        </Text>
      </Surface>
    );
  }

  const accent = accentFor(advice.verdict, t);

  return (
    <Surface bg="paperDeep" padding="md" radius="md" bordered>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label">COACH</Text>
        {advice.confidence === 'low' ? (
          <Text testID="coach-low-confidence" variant="caption" color={t.colors.inkFaint}>
            low confidence
          </Text>
        ) : null}
      </View>
      <Text variant="heading" color={accent} style={{ marginTop: t.space.xs }}>
        {advice.primary.text}
      </Text>
      <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: 2 }}>
        {advice.rationale}
      </Text>
      {advice.secondary ? (
        <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {advice.secondary.text}
        </Text>
      ) : null}
      {children ? <View style={{ marginTop: t.space.md }}>{children}</View> : null}
    </Surface>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- CoachCard`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → no errors.

```bash
git add src/ui/primitives/CoachCard.tsx tests/ui/primitives/CoachCard.test.tsx
git commit -m "feat(ui): CoachCard primitive (advice / low-conf / empty-tip)"
```

---

## Task 5: Wire CoachCard + Repeat + grind nudge into the Lab & Dialing screens

**Files:**
- Modify: `app/(tabs)/lab/index.tsx`
- Modify: `app/(tabs)/lab/dialing.tsx`

- [ ] **Step 1: Lab IdleSetup — imports**

In `app/(tabs)/lab/index.tsx`, add imports:

```ts
import { useDialingAdvice } from '@/features/dialing/hooks';
import { nudgeGrind } from '@/domain/dialing';
import { CoachCard } from '@/ui/primitives/CoachCard';
```

- [ ] **Step 2: Lab IdleSetup — read advice**

Inside the component, after `const selectedBean = ...`:

```ts
  const { advice, lastShot } = useDialingAdvice(draft.beanId);

  const repeatLastShot = () => {
    if (!lastShot) return;
    send({
      type: 'configure',
      doseG: lastShot.doseG,
      targetYieldG: lastShot.yieldG ?? draft.targetYieldG,
      grindSetting: lastShot.grindSetting,
      grinderLabel: lastShot.grinderLabel,
      waterTempC: lastShot.waterTempC,
    });
  };

  const applyNudge = () => {
    const next = nudgeGrind(draft.grindSetting, advice);
    if (next !== draft.grindSetting) send({ type: 'configure', grindSetting: next });
  };

  const grindIsNumeric =
    draft.grindSetting != null &&
    draft.grindSetting.trim() !== '' &&
    Number.isFinite(Number(draft.grindSetting));
  const showNudge =
    grindIsNumeric &&
    (advice?.primary.lever === 'grind-finer' || advice?.primary.lever === 'grind-coarser');
  const nudgeDir = advice?.primary.lever === 'grind-finer' ? 'finer' : 'coarser';
  const nudgeSteps = advice?.primary.magnitude === 'medium' ? 2 : 1;
```

- [ ] **Step 3: Lab IdleSetup — render the card**

Inside the `status === 'IdleSetup'` block, as the FIRST child of its `<View style={{ marginTop: t.space.xl, gap: t.space.lg }}>` (above the Dose stepper):

```tsx
            <CoachCard advice={advice}>
              {lastShot ? (
                <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
                  <Pill label="Repeat last shot" variant="ghost" onPress={repeatLastShot} />
                  {showNudge ? (
                    <Pill
                      label={`${nudgeDir} (${advice!.primary.lever === 'grind-finer' ? '−' : '+'}${nudgeSteps})`}
                      variant="primary"
                      onPress={applyNudge}
                    />
                  ) : null}
                </View>
              ) : null}
            </CoachCard>
```

(`Pill` and `View` are already imported in this file.)

- [ ] **Step 4: Dialing screen — headline card**

In `app/(tabs)/lab/dialing.tsx`, add imports:

```ts
import { useDialingAdvice } from '@/features/dialing/hooks';
import { CoachCard } from '@/ui/primitives/CoachCard';
```

After `const { data: shots } = useShotsForBean(beanId ?? null, 5);` add:

```ts
  const { advice } = useDialingAdvice(beanId ?? null);
```

Then inside the populated `<ScrollView contentContainerStyle={...}>`, as the FIRST child (above the `<Text variant="caption">{shots.length} shots …</Text>`):

```tsx
        <CoachCard advice={advice} />
```

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm run typecheck` → no errors.
Run: `npm test` → all suites green (existing lab/dialing render tests still pass).

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/lab/index.tsx" "app/(tabs)/lab/dialing.tsx"
git commit -m "feat(lab): surface Dialing Coach + repeat/nudge in Lab and Dialing"
```

---

## Task 6: Settings — dialing target-time steppers

**Files:**
- Modify: `app/(modals)/settings.tsx`

- [ ] **Step 1: Add the steppers**

In `app/(modals)/settings.tsx`, in the `DAILY GOALS` area (right after the `Daily cups goal` `<Stepper>`), add a labelled section:

```tsx
        <Text variant="label" style={{ marginTop: t.space.md }}>DIALING</Text>
        <Stepper
          label="Target time (min)"
          unit="s"
          min={10}
          max={(prefs?.dialTimeMaxS ?? 30) - 1}
          step={1}
          value={prefs?.dialTimeMinS ?? 25}
          onChange={(dialTimeMinS) => updatePrefs.mutate({ dialTimeMinS })}
        />
        <Stepper
          label="Target time (max)"
          unit="s"
          min={(prefs?.dialTimeMinS ?? 25) + 1}
          max={120}
          step={1}
          value={prefs?.dialTimeMaxS ?? 30}
          onChange={(dialTimeMaxS) => updatePrefs.mutate({ dialTimeMaxS })}
        />
```

(The dynamic `min`/`max` keep `min < max`; the `Stepper` already clamps to its `min`/`max` bounds.)

- [ ] **Step 2: Run + typecheck**

Run: `npm run typecheck` → no errors.
Run: `npm test` → all green.

- [ ] **Step 3: Commit**

```bash
git add "app/(modals)/settings.tsx"
git commit -m "feat(settings): configurable dialing target-time window"
```

---

## Final verification

- [ ] `npm run typecheck` — clean.
- [ ] `npm test` — all suites green.
- [ ] `npm run test:coverage` — `src/domain/dialing.ts` 100%; `src/domain/` overall still 100%.
- [ ] Manual smoke (optional, `npm run ios`): pick a bean with ≥1 shot → CoachCard shows above Dose; "Repeat last shot" pre-fills; numeric grind shows the nudge chip; Dialing tab shows the headline card; Settings shows the two dialing steppers and editing them changes the advice window.
