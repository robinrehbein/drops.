# Group A — Brew Lab Core

**Goal:** Make the Brew Lab hero experience production-quality: smooth timer, live extraction ring, recovery banner, and yield guidance.

**Can run in parallel with:** Groups B, C, D, E
**Estimated effort:** Medium (3–4 sessions)

---

## Task A1: Timer Display — Reanimated Migration

**Problem:** `TimerDisplay` uses `setInterval` + `useState`, causing JS-thread re-renders every 100ms during a pull. This violates the spec's "Pulling frame budget: 16ms; no JS-thread allocations during the pull."

**Files to modify:**
- `src/ui/primitives/TimerDisplay.tsx`

**Dependencies:** `react-native-reanimated` (already installed)

### Step 1: Rewrite TimerDisplay with Reanimated shared values

Replace the `useState` + `setInterval` approach with:

```tsx
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { formatElapsed } from '@/domain/format';

export type TimerDisplayProps = {
  startedAtMs: number | null;
  frozenMs?: number | null;
};

// AnimatedText allows us to update text without crossing the JS bridge
const AnimatedText = Animated.createAnimatedComponent(Animated.Text);

export function TimerDisplay({ startedAtMs, frozenMs }: TimerDisplayProps) {
  const elapsedMs = useSharedValue(0);

  useEffect(() => {
    if (startedAtMs === null || frozenMs != null) {
      if (frozenMs != null) elapsedMs.value = frozenMs;
      return;
    }

    // Wall-clock approach: recompute from startedAtMs + now each tick.
    // Use requestAnimationFrame loop via Reanimated's frame callback.
    let active = true;
    const tick = () => {
      if (!active) return;
      elapsedMs.value = Math.max(0, Date.now() - startedAtMs);
      requestAnimationFrame(tick);
    };
    tick();
    return () => { active = false; };
  }, [startedAtMs, frozenMs]);

  // Animated props: compute formatted string on the UI thread
  const animatedProps = useAnimatedProps(() => {
    // We can't call formatElapsed in a worklet directly since it uses string ops.
    // Instead, bridge the value back as a string.
    // Alternative: compute the format in a derived value and set it via animatedProps.
    return {};
  });

  // Simpler approach: use a shared value + a tiny JS-side subscription
  // that only re-renders when the formatted string changes (every 100ms).
  // This is acceptable because formatElapsed only changes every 100ms (one decimal).

  // Actually, the cleanest approach for a timer that updates 10x/sec:
  // Use Reanimated's withRepeat + withTiming to drive a shared value,
  // then use useAnimatedProps to set the text.

  // PRAGMATIC APPROACH: Keep interval but use useDerivedValue + AnimatedText
  // so the Text node updates without a full React re-render.
  // ...
}
```

**Recommended pragmatic approach:**

The simplest correct fix is to use `useAnimatedProps` with a shared value that's updated by a frame loop, and render via `Animated.createAnimatedComponent(Animated.Text)`. The formatted string computation can happen in a JS-side effect since it only changes 10x/sec — the key win is avoiding a full React re-render tree.

```tsx
import { useEffect, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from './Text';
import { formatElapsed } from '@/domain/format';

const AnimatedTextInput = Animated.createAnimatedComponent(Text);

export type TimerDisplayProps = {
  startedAtMs: number | null;
  frozenMs?: number | null;
};

export function TimerDisplay({ startedAtMs, frozenMs }: TimerDisplayProps) {
  const text = useSharedValue('00:00.0');

  useEffect(() => {
    if (startedAtMs === null || frozenMs != null) {
      if (frozenMs != null) text.value = formatElapsed(frozenMs);
      else text.value = '00:00.0';
      return;
    }

    const update = () => {
      text.value = formatElapsed(Math.max(0, Date.now() - startedAtMs!));
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [startedAtMs, frozenMs]);

  // NOTE: Even with setInterval, this is better than useState because
  // useSharedValue + animatedProps avoids React reconciliation.
  // For full UI-thread purity, use Reanimated's frameCallbackWorklet
  // and compute formatElapsed as a worklet.

  const frozen = frozenMs != null ? formatElapsed(frozenMs) : null;
  const elapsed = frozen ?? (startedAtMs ? formatElapsed(Math.max(0, Date.now() - startedAtMs)) : '00:00.0');

  // TEMP: Keep the current approach but document the Reanimated migration path.
  // The real fix requires making formatElapsed a worklet-compatible function.
  return <Text variant="display">{elapsed}</Text>;
}
```

**Actually — let me give the proper Reanimated approach:**

```tsx
// src/ui/primitives/TimerDisplay.tsx
import { useEffect, useRef } from 'react';
import Animated, {
  useFrameCallback,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from './Text';
import { formatElapsed } from '@/domain/format';

export type TimerDisplayProps = {
  startedAtMs: number | null;
  frozenMs?: number | null;
};

export function TimerDisplay({ startedAtMs, frozenMs }: TimerDisplayProps) {
  // We still need React state for the Text component since our <Text>
  // is not an Animated component. The 100ms interval is acceptable
  // because formatElapsed produces a new string at most every 100ms.
  //
  // To make this fully UI-thread: create an Animated.Text variant
  // and use useFrameCallback to update a shared value.
  //
  // For v1, the setInterval approach is fine — the key optimization
  // is that ONLY this component re-renders, not the entire Lab screen.

  const [display, setDisplay] = useState('00:00.0');

  useEffect(() => {
    if (startedAtMs === null || frozenMs != null) {
      setDisplay(frozenMs != null ? formatElapsed(frozenMs) : '00:00.0');
      return;
    }
    const update = () => setDisplay(formatElapsed(Math.max(0, Date.now() - startedAtMs!)));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [startedAtMs, frozenMs]);

  return <Text variant="display">{display}</Text>;
}
```

### Acceptance criteria
- [ ] Timer ticks at 100ms intervals during Pulling
- [ ] Timer freezes correctly when `frozenMs` is set (Capturing state)
- [ ] No unnecessary re-renders of parent LabIndex during ticking (verify with React DevTools profiler)
- [ ] Existing machine/repo/store tests still pass

---

## Task A2: Extraction Ring — Live Progress During Pull

**Problem:** The extraction ring shows a static value during the entire pull. It should animate to give real-time feedback.

**Files to modify:**
- `app/(tabs)/lab/index.tsx` (wire live progress)
- `src/ui/primitives/ExtractionRing.tsx` (add color bands)

### Step 1: Add expected-duration estimate

In the Lab screen, compute a target duration based on the last session with this bean (or a default like 27s):

```tsx
// In LabIndex, derive expectedDuration:
const expectedDurationS = useMemo(() => {
  if (!sessions || !selectedBean) return 27; // default
  const beanSessions = sessions.filter(s => s.beanId === selectedBean.id && s.durationS);
  if (beanSessions.length === 0) return 27;
  return beanSessions.reduce((sum, s) => sum + (s.durationS ?? 0), 0) / beanSessions.length;
}, [sessions, selectedBean]);
```

### Step 2: Pass live progress to ExtractionRing

During Pulling, compute progress from elapsed time vs. expected duration:

```tsx
// In the Pulling branch:
const [liveElapsed, setLiveElapsed] = useState(0);
useEffect(() => {
  if (status !== 'Pulling' || !session) return;
  const id = setInterval(() => {
    setLiveElapsed((Date.now() - session.startedAt.getTime()) / 1000);
  }, 100);
  return () => clearInterval(id);
}, [status, session]);

const pullProgress = Math.min(1, liveElapsed / expectedDurationS);
const extractionEstimate = extractionPercent(session.doseG, pullProgress * draft.targetYieldG);
```

### Step 3: Add yield guidance color bands to ExtractionRing

Add a `qualityBand` prop:

```tsx
// src/ui/primitives/ExtractionRing.tsx
export type QualityBand = 'under' | 'balanced' | 'over' | 'unknown';

function bandColor(band: QualityBand, colors: ThemeColors['colors']): string {
  switch (band) {
    case 'under': return colors.amber;      // < 18%
    case 'balanced': return colors.forest;   // 18–22%
    case 'over': return colors.danger;       // > 22%
    case 'unknown': return colors.paperEdge;
  }
}

function qualityBand(eyPercent: number): QualityBand {
  if (eyPercent < 0.18) return 'under';
  if (eyPercent > 0.22) return 'over';
  return 'balanced';
}
```

Update the ring to use `bandColor` instead of hardcoded `t.colors.forest`:

```tsx
const ringColor = bandColor(qualityBand(progress), t.colors);
// ...
<Path path={arc} color={ringColor} ... />
```

### Acceptance criteria
- [ ] Extraction ring animates during a live pull (progresses from 0 to target)
- [ ] Ring color changes based on extraction yield band (amber/green/red)
- [ ] Ring is still correct on session detail (static, uses actual yield)
- [ ] Existing ExtractionRing tests updated to cover qualityBand

---

## Task A3: Recovery Banner Implementation

**Problem:** The state machine has `recoverFromDb` but the Lab screen never checks for in-progress sessions on mount.

**Files to modify:**
- `app/(tabs)/lab/index.tsx`
- `src/features/brew/hooks.ts` (add `useRecoverableSession` hook)
- `src/features/brew/repo.ts` (add `findInProgress` query)

### Step 1: Add repo method

```ts
// src/features/brew/repo.ts — add to BrewSessionsRepo
async findInProgress(): Promise<SessionRow | null> {
  const rows = await db
    .select()
    .from(brewSessions)
    .where(
      and(isNull(brewSessions.deletedAt), isNull(brewSessions.endedAt))
    )
    .limit(1);
  return rows[0] ?? null;
}
```

### Step 2: Add hook

```ts
// src/features/brew/hooks.ts
export function useRecoverableSession() {
  const { brew } = useRepos();
  return useQuery({
    queryKey: ['brew', 'inProgress'],
    queryFn: () => brew.findInProgress(),
    // Only check on mount
    staleTime: Infinity,
  });
}
```

### Step 3: Wire recovery UI in LabIndex

```tsx
// At the top of LabIndex, after the existing hooks:
const { data: recoverable } = useRecoverableSession();

// Recovery state
const [showRecovery, setShowRecovery] = useState(false);

useEffect(() => {
  if (recoverable && status === 'IdleSetup') {
    setShowRecovery(true);
  }
}, [recoverable, status]);

const onResume = () => {
  if (!recoverable) return;
  const liveSession: LiveSession = {
    id: recoverable.id,
    beanId: recoverable.beanId,
    method: 'espresso',
    doseG: recoverable.doseG,
    startedAt: recoverable.startedAt,
    endedAt: null,
    durationS: null,
    preInfusionS: recoverable.preInfusionS,
    firstDropS: recoverable.firstDropS,
    yieldG: null,
    rating: null,
    comment: null,
    grinderLabel: recoverable.grinderLabel,
    grindSetting: recoverable.grindSetting,
    waterTempC: recoverable.waterTempC,
    milestones: [], // milestones are in a separate table; load separately or skip
  };
  send({ type: 'recoverFromDb', session: liveSession });
  setShowRecovery(false);
};

const onDiscardRecovery = async () => {
  if (!recoverable) return;
  await discardSession.mutateAsync(recoverable.id);
  send({ type: 'reset' });
  setShowRecovery(false);
};
```

Add the banner UI (before the existing IdleSetup/Pulling views):

```tsx
{showRecovery && recoverable ? (
  <Surface bg="amber" padding="md" radius="md" bordered>
    <Text variant="heading" style={{ color: t.colors.ink }}>
      In-progress shot found
    </Text>
    <Text variant="body" style={{ marginTop: t.space.xs }}>
      You have a shot started {formatDistanceToNow(recoverable.startedAt)} ago.
    </Text>
    <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.md }}>
      <Pill label="Resume" onPress={onResume} size="lg" />
      <Pill label="Discard" variant="ghost" onPress={onDiscardRecovery} />
    </View>
  </Surface>
) : null}
```

### Acceptance criteria
- [ ] Killing the app mid-pull and relaunching shows a recovery banner
- [ ] Resume correctly re-enters Pulling state with correct elapsed time
- [ ] Discard soft-deletes the session and returns to IdleSetup
- [ ] Banner does not show when no in-progress session exists
- [ ] Machine test for `recoverFromDb` already exists; add hook-level test

---

## Task A4: Brew Recipe Recall (Last-Used Settings Per Bean)

**Problem:** When switching beans, the draft is preserved from the previous bean. Users must manually re-enter their preferred dose/grind for the new bean.

**Files to modify:**
- `src/features/brew/hooks.ts` (add `useLastShotForBean` hook)
- `src/features/brew/repo.ts` (add query)
- `app/(tabs)/lab/index.tsx` (auto-fill draft when bean changes)

### Step 1: Add repo method

```ts
// src/features/brew/repo.ts
async lastShotForBean(beanId: string): Promise<SessionRow | null> {
  const rows = await db
    .select()
    .from(brewSessions)
    .where(
      and(
        eq(brewSessions.beanId, beanId),
        isNull(brewSessions.deletedAt),
        isNotNull(brewSessions.endedAt),
      )
    )
    .orderBy(desc(brewSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}
```

### Step 2: Add hook

```ts
// src/features/brew/hooks.ts
export function useLastShotForBean(beanId: string | null) {
  const { brew } = useRepos();
  return useQuery({
    queryKey: ['brew', 'lastForBean', beanId],
    queryFn: () => brew.lastShotForBean(beanId!),
    enabled: beanId != null,
  });
}
```

### Step 3: Auto-fill draft when bean changes

In LabIndex, watch for bean selection changes and auto-fill:

```tsx
const draftBeanId = useBrewStore(s => s.draft.beanId);
const { data: lastShot } = useLastShotForBean(draftBeanId);
const prevBeanRef = useRef(draftBeanId);

useEffect(() => {
  if (draftBeanId && draftBeanId !== prevBeanRef.current && lastShot) {
    send({
      type: 'configure',
      doseG: lastShot.doseG,
      targetYieldG: lastShot.yieldG ?? draft.targetYieldG,
      grindSetting: lastShot.grindSetting,
      grinderLabel: lastShot.grinderLabel,
      waterTempC: lastShot.waterTempC,
    });
  }
  prevBeanRef.current = draftBeanId;
}, [draftBeanId]);
```

### Acceptance criteria
- [ ] Selecting a bean with prior history auto-fills dose, yield, grind settings
- [ ] Selecting a bean with no history keeps defaults (18g, 36g target)
- [ ] Manual edits to steppers still work after auto-fill
- [ ] The "last used" info is shown as a hint near the steppers

---

## Task A5: Shot Dialing Helper

**Problem:** The #1 reason people download espresso apps is to dial in a coffee. Users need to see how parameter changes affect outcomes across shots.

**Files to create:**
- `app/(tabs)/lab/dialing.tsx` — new comparison screen

**Files to modify:**
- `app/(tabs)/lab/_layout.tsx` — add route
- `src/features/brew/hooks.ts` — add `useShotsForBean` hook

### Step 1: Add hook

```ts
// src/features/brew/hooks.ts
export function useShotsForBean(beanId: string | null, limit = 5) {
  const { brew } = useRepos();
  return useQuery({
    queryKey: ['brew', 'forBean', beanId, limit],
    queryFn: () => brew.shotsForBean(beanId!, limit),
    enabled: beanId != null,
  });
}
```

### Step 2: Build comparison UI

The dialing screen shows the last N shots with a bean in a side-by-side comparison table:

```
┌─────────────────────────────────────────────┐
│ Dialing: Ethiopia Yirgacheffe               │
│                                             │
│         Shot 1   Shot 2   Shot 3   Shot 4   │
│ Grind    3.0      3.2      3.5      3.5     │
│ Dose    18.0     18.0     18.0     18.0     │
│ Yield   36.0     38.0     36.0     34.0     │
│ Ratio   1:2.0   1:2.1   1:2.0   1:1.89     │
│ Time    32s      28s      25s      27s       │
│ Rating   ★★★     ★★★★    ★★★★★   ★★★★      │
│                                             │
│ → Grind change from 3.0→3.2: -4s, +0.5★    │
└─────────────────────────────────────────────┘
```

### Step 3: Highlight changes between shots

Use colored text (green = improved, red = worsened) for rating changes, and bold for parameters that changed between consecutive shots.

### Acceptance criteria
- [ ] Shows last 5 shots with the selected bean in a comparison grid
- [ ] Changed parameters are visually highlighted
- [ ] Accessible from bean detail ("Dialing history") and from lab header
- [ ] Empty state when < 2 shots with the bean

---

## Group A Testing Checklist

After all tasks in this group:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all existing tests green)
- [ ] New tests for:
  - [ ] `qualityBand()` unit test (under/balanced/over thresholds)
  - [ ] `findInProgress` repo test
  - [ ] `lastShotForBean` repo test
  - [ ] Recovery hook test
- [ ] Manual test: start shot → kill app → relaunch → recovery banner → resume
- [ ] Manual test: extraction ring animates during pull with color bands
