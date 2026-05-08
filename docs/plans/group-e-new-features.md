# Group E — New High-Impact Features

**Goal:** Add features that drive retention and organic growth: onboarding, share cards, and a weekly recap. These are entirely new files with no overlap with Groups A–D.

**Can run in parallel with:** Groups A, B, C, D (but benefits from A–D being merged first for best UX)
**Estimated effort:** Medium–Large (3–4 sessions)

---

## Task E1: First-Launch Onboarding Flow

**Problem:** First launch drops users into an empty dashboard with no guidance. The spec says *"No wizard, no auth wall"* — but contextual guidance is different from a blocking wizard. A lightweight onboarding that teaches the core loop (add bean → pull shot → review) dramatically improves activation.

**Files to create:**
- `src/state/onboarding.ts` (Zustand store, persisted)
- `src/ui/screens/OnboardingScreen.tsx`

**Files to modify:**
- `app/_layout.tsx` (gate on onboarding completion)

### Step 1: Onboarding state

```ts
// src/state/onboarding.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AsyncStorage } from 'react-native';

type OnboardingState = {
  completed: boolean;
  step: number; // 0-based: 0 = welcome, 1 = add bean, 2 = pull shot, 3 = done
  complete: () => void;
  setStep: (step: number) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      step: 0,
      complete: () => set({ completed: true, step: 3 }),
      setStep: (step) => set({ step }),
      reset: () => set({ completed: false, step: 0 }),
    }),
    {
      name: 'brewlog-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

### Step 2: Onboarding screens (3 steps)

```
Step 0: Welcome
┌─────────────────────────────────────────┐
│                                         │
│           ☕ (illustration)              │
│                                         │
│        Welcome to Brewlog               │
│                                         │
│   Your private espresso journal.        │
│   No accounts. No cloud. Just coffee.   │
│                                         │
│        [ Get started → ]                │
│                                         │
└─────────────────────────────────────────┘

Step 1: Add your first bean
┌─────────────────────────────────────────┐
│                                         │
│           🫘 (illustration)              │
│                                         │
│        Start your library               │
│                                         │
│   Add a bag of beans to start           │
│   logging your espresso shots.          │
│                                         │
│      [ Add a bean → ]                   │
│           Skip                          │
│                                         │
└─────────────────────────────────────────┘
→ Tapping "Add a bean" navigates to /library/new
→ On bean saved, auto-advance to step 2

Step 2: Pull your first shot
┌─────────────────────────────────────────┐
│                                         │
│           ⚗️ (illustration)              │
│                                         │
│        Ready to brew?                   │
│                                         │
│   Head to the Lab to pull your          │
│   first espresso shot.                  │
│                                         │
│      [ Open Brew Lab → ]                │
│           Skip                          │
│                                         │
└─────────────────────────────────────────┘
→ Tapping "Open Brew Lab" navigates to /lab
→ On first shot saved, auto-complete onboarding
```

### Step 3: Gate in root layout

```tsx
// app/_layout.tsx
import { useOnboardingStore } from '@/state/onboarding';

export default function RootLayout() {
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  // ...existing init...

  if (!onboardingCompleted) {
    return <OnboardingScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### Step 4: Auto-advance triggers

Watch for the first bean added and first shot saved:

```tsx
// In OnboardingScreen, subscribe to data:
const { data: beans } = useBeans();
const { data: sessions } = useSessions();

useEffect(() => {
  if (step === 1 && beans && beans.length > 0) {
    setStep(2);
  }
}, [beans, step]);

useEffect(() => {
  if (step === 2 && sessions && sessions.length > 0) {
    complete();
  }
}, [sessions, step]);
```

### Acceptance criteria
- [ ] First launch shows welcome screen (not empty dashboard)
- [ ] Step 1 "Add a bean" navigates to the real bean form
- [ ] On bean saved, automatically advances to step 2
- [ ] Step 2 "Pull a shot" navigates to Brew Lab
- [ ] On first shot saved, onboarding completes and shows main app
- [ ] "Skip" on any step completes onboarding immediately
- [ ] Onboarding state persisted — doesn't show again after completion
- [ ] Reset available in Settings for testing

---

## Task E2: Share Shot Card

**Problem:** Users love sharing their espresso shots on social media. A styled "shot card" image that can be exported and shared drives organic growth.

**Files to create:**
- `src/ui/primitives/ShotCard.tsx` (Skia-rendered card)
- `src/features/export/shot-card.ts` (render to image + share)

### Step 1: Design the shot card

The card should be a ~400×500px image with the Earthy Forest aesthetic:

```
┌─────────────────────────────────────────┐
│                                         │
│  BREWLOG                    ⚗️          │
│  ─────────────────────────────          │
│                                         │
│  Ethiopia Yirgacheffe                   │
│  Onyx Coffee Lab                        │
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ 18g  │  │ 36g  │  │1:2.00│          │
│  │ DOSE │  │YIELD │  │RATIO │          │
│  └──────┘  └──────┘  └──────┘          │
│                                         │
│  ┌──────────────┐                       │
│  │    27.4s     │   ★★★★☆              │
│  │  DURATION    │                       │
│  └──────────────┘                       │
│                                         │
│  bergamot · jasmine · stone fruit       │
│                                         │
│  ─────────────────────────────          │
│  May 8, 2026 · 9:47 AM                  │
└─────────────────────────────────────────┘
```

### Step 2: Render with Skia

```tsx
// src/ui/primitives/ShotCard.tsx
import { Canvas, Group, Rect, Text as SkiaText, useFont } from '@shopify/react-native-skia';

export type ShotCardData = {
  beanName: string;
  roaster: string | null;
  doseG: number;
  yieldG: number;
  ratio: string;       // pre-formatted "1:2.00"
  durationS: number;
  rating: number | null;
  flavorTags: string[];
  date: string;        // pre-formatted
};

type Props = {
  data: ShotCardData;
  width?: number;
  height?: number;
};

export function ShotCard({ data, width = 400, height = 500 }: Props) {
  // Use the Earthy Forest palette directly (not theme hooks, since this
  // may render off-screen for image export)
  const PAPER = '#f1ece0';
  const INK = '#2a3a30';
  const FOREST = '#3a5a3e';
  const PAPER_EDGE = '#d9d2c0';

  const titleFont = useFont(require('@assets/fonts/Fraunces.ttf'), 24);
  const bodyFont = useFont(require('@assets/fonts/Inter.ttf'), 15);
  const labelFont = useFont(require('@assets/fonts/Inter.ttf'), 11);

  // ... render the card with Skia primitives ...
  // This component can be used both on-screen (preview) and off-screen (export)
}
```

### Step 3: Export to image

```ts
// src/features/export/shot-card.ts
import * as Sharing from 'expo-sharing';
import { useReactNativeSkiaRenderer } from '@shopify/react-native-skia';
import { ShotCard, type ShotCardData } from '@/ui/primitives/ShotCard';

export async function shareShotCard(data: ShotCardData): Promise<void> {
  // Use Skia's offscreen rendering to create a PNG:
  // 1. Render ShotCard to an offscreen Skia surface
  // 2. Encode as PNG
  // 3. Save to cache
  // 4. Share via expo-sharing

  // Note: exact API depends on Skia version.
  // @shopify/react-native-skia 2.x supports:
  // import { Skia } from '@shopify/react-native-skia';
  // const surface = Skia.Surface.MakeOffscreen(width, height);
  // ... draw to surface ...
  // const image = surface.makeImageSnapshot();
  // const data = image.encodeToBase64();
}
```

### Step 4: Wire to session detail

Add a share button in session detail:

```tsx
// In session/[id].tsx, add to header or as a floating action:
<Pill
  label="Share shot"
  variant="ghost"
  onPress={async () => {
    await shareShotCard({
      beanName: bean?.name ?? '—',
      roaster: bean?.roaster ?? null,
      doseG: session.doseG,
      yieldG: session.yieldG ?? 0,
      ratio: formatRatio(brewRatio(session.doseG, session.yieldG ?? 0)),
      durationS: session.durationS ?? 0,
      rating: session.rating,
      flavorTags: [], // load from tasting notes
      date: format(session.startedAt, 'MMM d, yyyy · h:mm a'),
    });
  }}
/>
```

### Acceptance criteria
- [ ] Session detail has a "Share shot" button
- [ ] Tapping it generates a styled shot card image
- [ ] System share sheet opens (Instagram, Messages, etc.)
- [ ] Card uses the Earthy Forest visual identity
- [ ] Works on both iOS and Android

---

## Task E3: Weekly Recap / Insights Card

**Problem:** After the initial excitement wears off, users need a reason to return. A weekly summary of their brewing activity provides that hook.

**Files to create:**
- `src/features/insights/repo.ts`
- `src/features/insights/hooks.ts`
- `src/ui/primitives/WeeklyRecapCard.tsx`

**Files to modify:**
- `app/(tabs)/index.tsx` (show recap card on Daily Brew)

### Step 1: Insights repo

```ts
// src/features/insights/repo.ts
import { and, desc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';
import { startOfWeek, endOfWeek } from 'date-fns';

import { beans, brewSessions } from '@/db/schema';
import * as schema from '@/db/schema';
import { caffeineForShot, type RoastLevel } from '@/domain/caffeine';
import { brewRatio } from '@/domain/ratio';

export type WeeklyRecap = {
  weekStart: Date;
  totalShots: number;
  totalCaffeineMg: number;
  avgRating: number | null;
  bestShot: { beanName: string; rating: number; ratio: number } | null;
  mostUsedBean: { name: string; count: number } | null;
  shotsPerDay: number;
  improvementFromLastWeek: number | null; // rating delta, e.g. +0.3
};

export type InsightsRepo = {
  weeklyRecap: () => Promise<WeeklyRecap>;
};

export function makeInsightsRepo(db: any): InsightsRepo {
  return {
    async weeklyRecap() {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // This week's sessions
      const thisWeek = await db
        .select()
        .from(brewSessions)
        .where(and(
          isNull(brewSessions.deletedAt),
          isNotNull(brewSessions.endedAt),
          gte(brewSessions.startedAt, weekStart),
          lte(brewSessions.startedAt, weekEnd),
        ));

      // Last week for comparison
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekEnd);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

      const lastWeek = await db
        .select()
        .from(brewSessions)
        .where(and(
          isNull(brewSessions.deletedAt),
          isNotNull(brewSessions.endedAt),
          gte(brewSessions.startedAt, lastWeekStart),
          lte(brewSessions.startedAt, lastWeekEnd),
        ));

      // Compute aggregates...
      const totalShots = thisWeek.length;
      // ... (caffeine, avg rating, best shot, most used bean, shots/day)

      // Improvement from last week
      const thisAvgRating = /* average of thisWeek ratings */;
      const lastAvgRating = /* average of lastWeek ratings */;
      const improvement = (thisAvgRating !== null && lastAvgRating !== null)
        ? thisAvgRating - lastAvgRating
        : null;

      return { /* ... WeeklyRecap ... */ };
    },
  };
}
```

### Step 2: Hook

```ts
// src/features/insights/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { useRepos } from '@/features/_provider/RepoProvider';

export function useWeeklyRecap() {
  const { insights } = useRepos();
  return useQuery({
    queryKey: ['insights', 'weekly'],
    queryFn: () => insights.weeklyRecap(),
    staleTime: 1000 * 60 * 60, // 1 hour — doesn't change frequently
  });
}
```

### Step 3: Recap card UI

```tsx
// src/ui/primitives/WeeklyRecapCard.tsx
import { View } from 'react-native';
import { Surface } from './Surface';
import { Text } from './Text';
import { useTheme } from '@/ui/theme/useTheme';
import type { WeeklyRecap } from '@/features/insights/repo';

type Props = { recap: WeeklyRecap };

export function WeeklyRecapCard({ recap }: Props) {
  const t = useTheme();

  return (
    <Surface bg="paperDeep" padding="md" radius="md" bordered>
      <Text variant="heading">This week</Text>

      <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
        <Stat value={String(recap.totalShots)} label="shots" />
        <Stat value={`${recap.totalCaffeineMg} mg`} label="caffeine" />
        <Stat value={recap.avgRating ? `${recap.avgRating.toFixed(1)}★` : '—'} label="avg rating" />
      </View>

      {recap.mostUsedBean ? (
        <Text variant="body" style={{ marginTop: t.space.sm }}>
          Most brewed: {recap.mostUsedBean.name} ({recap.mostUsedBean.count}×)
        </Text>
      ) : null}

      {recap.improvementFromLastWeek !== null ? (
        <Text
          variant="caption"
          style={{
            marginTop: t.space.xs,
            color: recap.improvementFromLastWeek >= 0 ? t.colors.forest : t.colors.amber,
          }}
        >
          {recap.improvementFromLastWeek >= 0 ? '↑' : '↓'} {Math.abs(recap.improvementFromLastWeek).toFixed(1)}★ vs last week
        </Text>
      ) : null}
    </Surface>
  );
}
```

### Step 4: Show on Daily Brew

```tsx
// In app/(tabs)/index.tsx, add after the "Today, at a glance" section:
import { useWeeklyRecap } from '@/features/insights/hooks';
import { WeeklyRecapCard } from '@/ui/primitives/WeeklyRecapCard';

const { data: recap } = useWeeklyRecap();

// In the render, between "Today" and "Recent shots":
{recap && recap.totalShots > 0 ? (
  <WeeklyRecapCard recap={recap} />
) : null}
```

### Acceptance criteria
- [ ] Daily Brew shows a "This week" recap card when ≥ 1 shot this week
- [ ] Shows total shots, caffeine, and average rating
- [ ] Shows most-brewed bean
- [ ] Shows week-over-week rating improvement (↑ or ↓)
- [ ] Hidden when no shots this week
- [ ] Data is cached for 1 hour (doesn't re-query on every screen visit)

---

## Task E4: Bean "Days Since Roast" — Detail Screen Enrichment

**Problem:** The freshness badge (Task B4) shows on cards, but the bean detail screen doesn't give freshness context or storage advice.

**Files to modify:**
- `app/(tabs)/library/[id].tsx`

### Step 1: Add freshness section to bean detail

```tsx
{bean.roastedOn ? (
  <Surface bg="paperDeep" padding="md" radius="md" bordered>
    <Text variant="heading">Freshness</Text>
    <View style={{ marginTop: t.space.sm }}>
      <Text variant="body">
        Roasted {differenceInDays(new Date(), bean.roastedOn)} days ago
        ({format(bean.roastedOn, 'MMM d, yyyy')})
      </Text>
      {(() => {
        const days = differenceInDays(new Date(), bean.roastedOn);
        if (days < 5) return <Text variant="caption" color={t.colors.amber}>Still resting — wait a few more days</Text>;
        if (days <= 14) return <Text variant="caption" color={t.colors.forest}>Peak flavor window</Text>;
        if (days <= 30) return <Text variant="caption" color={t.colors.inkSoft}>Past peak — still enjoyable</Text>;
        return <Text variant="caption" color={t.colors.inkFaint}>Consider using soon</Text>;
      })()}
    </View>
  </Surface>
) : null}
```

### Acceptance criteria
- [ ] Bean detail shows a "Freshness" section with days since roast
- [ ] Contextual advice (resting / peak / past peak)
- [ ] Section hidden when roastedOn is not set

---

## Group E Testing Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] New tests for:
  - [ ] Onboarding store (complete, reset, step transitions)
  - [ ] Insights repo (weekly recap aggregation, edge cases: no sessions, 1 session)
  - [ ] Shot card data formatting
- [ ] Manual test: fresh install → onboarding appears → add bean → auto-advance → pull shot → complete
- [ ] Manual test: share shot card → image appears in share sheet
- [ ] Manual test: weekly recap shows correct data after multiple sessions
- [ ] Manual test: bean detail freshness advice matches days since roast
