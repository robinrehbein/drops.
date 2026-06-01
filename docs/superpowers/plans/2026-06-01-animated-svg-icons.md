# Animated SVG Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every emoji/glyph that renders as a UI element with a Lucide SVG icon, animating icons on press and on meaningful state changes.

**Architecture:** A single Lucide-backed `Icon` component maps a stable `IconName` union to `lucide-react-native` SVG components. A `usePressAnimation` hook and `AnimatedIcon` wrapper (built on `react-native-reanimated`, already installed) provide transform/opacity springs triggered on press and on state change. Consuming components swap string glyphs for `<Icon />`. Plain-text outputs (the shared export `.txt`, prose, comments) keep their glyphs because an SVG cannot live in a string.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, `lucide-react-native`, `react-native-svg`, `react-native-reanimated`, Jest + `@testing-library/react-native`.

**Source spec:** `docs/superpowers/specs/2026-06-01-animated-svg-icons-design.md`

**Project gotchas (from prior execution — apply to every task):**
- Run `npm run typecheck` AND full `npm test` (never `--passWithNoTests`) as gates.
- `legacy-peer-deps=true` is set in `.npmrc`; keep using it for installs.
- `jest@^29` is pinned (incompatible with jest 30). Do not bump.
- `transformIgnorePatterns` user array REPLACES the preset — edit the existing array in `jest.config.js`, don't add a second key.
- No `src/domain/**` files change in this plan, so the 100% domain coverage gate is unaffected.

---

## File Structure

**Created:**
- `src/ui/icons/animations.ts` — Reanimated animation presets (`pop`, `pulse`, `spin`, `nudge`) as pure config + a `usePressAnimation` hook returning animated style + press handlers.
- `src/ui/icons/AnimatedIcon.tsx` — wraps `Icon` in an `Animated.View`; animates on a `trigger` prop change (state-change animation).
- `__mocks__/react-native-svg.js` — View-based stub that forwards props (so `lucide-react-native` icons render with their `testID` in Jest).
- `tests/ui/icons/Icon.test.tsx`, `tests/ui/icons/AnimatedIcon.test.tsx`, `tests/ui/icons/usePressAnimation.test.tsx`.

**Modified:**
- `src/ui/icons/line.tsx` — emoji map → Lucide map; expanded `IconName`; optional `fill`.
- `jest.config.js` — add `react-native-svg` + `lucide-react-native` to `transformIgnorePatterns`.
- `jest.setup.ts` — Reanimated jest setup.
- `src/ui/primitives/RatingStars.tsx`, `src/ui/primitives/EmptyState.tsx`, `src/ui/primitives/Header.tsx`, `src/ui/primitives/WeeklyRecapCard.tsx`.
- `src/ui/screens/PlaceDetail.tsx`, `src/ui/screens/PlaceDetailSheet.tsx`, `src/ui/screens/OnboardingScreen.tsx`, `src/ui/screens/AddPlaceScreen.tsx`.

**Untouched (text-only carve-outs):** `src/features/export/shot-card.ts`, `src/domain/dialing.ts`, `src/domain/ratio.ts`, `src/db/schema.ts`, `src/ui/primitives/CoachCard.tsx`.

---

## Task 1: Install dependencies and wire up the test environment

**Files:**
- Modify: `jest.config.js`
- Modify: `jest.setup.ts`
- Create: `__mocks__/react-native-svg.js`

- [ ] **Step 1: Install the icon + SVG packages**

```bash
npx expo install react-native-svg
npm i lucide-react-native
```

Expected: both resolve and install (`.npmrc` already has `legacy-peer-deps=true`). `react-native-svg` is pinned by Expo to the SDK-54 version.

- [ ] **Step 2: Create the react-native-svg Jest mock**

`jest-expo` does not mock `react-native-svg`, and its native parts can't render in Node. This stub renders Views and forwards every prop (so `testID`/`accessibilityLabel` from Lucide icons reach the tree), matching the existing `__mocks__/@shopify` Skia pattern.

Create `__mocks__/react-native-svg.js`:

```js
// Jest mock for react-native-svg — native rendering is unavailable in Node.
// Every export is a View that forwards props so Lucide icons keep their
// testID / accessibilityLabel in the rendered tree.
const React = require('react');
const { View } = require('react-native');

const Stub = (name) => {
  const C = ({ children, ...props }) => React.createElement(View, props, children);
  C.displayName = name;
  return C;
};

const Svg = Stub('Svg');

module.exports = new Proxy(
  {
    __esModule: true,
    default: Svg,
    Svg,
    Path: Stub('Path'),
    Circle: Stub('Circle'),
    Rect: Stub('Rect'),
    Line: Stub('Line'),
    Polyline: Stub('Polyline'),
    Polygon: Stub('Polygon'),
    G: Stub('G'),
    Defs: Stub('Defs'),
    LinearGradient: Stub('LinearGradient'),
    Stop: Stub('Stop'),
  },
  {
    // Any other named SVG primitive Lucide imports resolves to a forwarding stub.
    get: (target, prop) =>
      prop in target ? target[prop] : (target[prop] = Stub(String(prop))),
  },
);
```

- [ ] **Step 3: Add Reanimated test setup to jest.setup.ts**

Add this line near the top of `jest.setup.ts` (after the `console.error` spy). Reanimated ships a Jest implementation that runs worklets on the JS thread, so `useSharedValue` / `useAnimatedStyle` / `withSpring` work in tests.

```ts
// Reanimated's Jest implementation runs animation worklets on the JS thread.
require('react-native-reanimated').setUpTests();
```

- [ ] **Step 4: Add the new packages to transformIgnorePatterns**

In `jest.config.js`, edit the FIRST entry of the existing `transformIgnorePatterns` array (do not add a second array). Add `react-native-svg` and `lucide-react-native` to the alternation:

```js
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|@shopify/react-native-skia|react-native-svg|lucide-react-native|drizzle-orm|uuid))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
```

- [ ] **Step 5: Verify the existing suite still passes**

Run: `npm test`
Expected: PASS — same green suite as before (no behavior changed yet). If Reanimated's `setUpTests` errors as "not a function", replace the line with `import 'react-native-reanimated';` and re-run.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js jest.setup.ts __mocks__/react-native-svg.js
git commit -m "chore(icons): add lucide-react-native + react-native-svg and test wiring"
```

---

## Task 2: Lucide-backed Icon component

**Files:**
- Modify: `src/ui/icons/line.tsx`
- Test: `tests/ui/icons/Icon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/icons/Icon.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { Icon } from '@/ui/icons/line';

describe('Icon', () => {
  it('renders a Lucide icon for each known name with a stable testID', () => {
    const { getByTestId } = render(<Icon name="cup" />);
    expect(getByTestId('icon-cup')).toBeTruthy();
  });

  it('forwards color and size', () => {
    const { getByTestId } = render(<Icon name="pin" color="#123456" size={32} />);
    const node = getByTestId('icon-pin');
    expect(node.props.color).toBe('#123456');
    expect(node.props.size).toBe(32);
  });

  it('defaults fill to none and accepts a fill override', () => {
    const { getByTestId } = render(<Icon name="star" fill="#abc" />);
    expect(getByTestId('icon-star').props.fill).toBe('#abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/icons/Icon.test.tsx`
Expected: FAIL — current `Icon` renders emoji text, has no `testID`, and `name="cup"` is the only overlap (others are not in the union yet).

- [ ] **Step 3: Rewrite the Icon component**

Replace the entire contents of `src/ui/icons/line.tsx`:

```tsx
import type { ComponentType } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bean,
  BookOpen,
  Check,
  Coffee,
  FlaskConical,
  type LucideProps,
  MapPin,
  Star,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react-native';

export type IconName =
  | 'cup'
  | 'book'
  | 'flask'
  | 'wrench'
  | 'pin'
  | 'bean'
  | 'star'
  | 'check'
  | 'close'
  | 'arrowLeft'
  | 'arrowRight'
  | 'trendUp'
  | 'trendDown';

const MAP: Record<IconName, ComponentType<LucideProps>> = {
  cup: Coffee,
  book: BookOpen,
  flask: FlaskConical,
  wrench: Wrench,
  pin: MapPin,
  bean: Bean,
  star: Star,
  check: Check,
  close: X,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
};

export function Icon({
  name,
  color,
  size = 18,
  fill = 'none',
  strokeWidth = 2,
}: {
  name: IconName;
  color?: string;
  size?: number;
  fill?: string;
  strokeWidth?: number;
}) {
  const Glyph = MAP[name];
  return (
    <Glyph
      color={color}
      size={size}
      fill={fill}
      strokeWidth={strokeWidth}
      testID={`icon-${name}`}
      accessibilityLabel={name}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/icons/Icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons/line.tsx tests/ui/icons/Icon.test.tsx
git commit -m "feat(icons): Lucide-backed Icon component with expanded IconName"
```

---

## Task 3: Animation presets and usePressAnimation hook

**Files:**
- Create: `src/ui/icons/animations.ts`
- Test: `tests/ui/icons/usePressAnimation.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/icons/usePressAnimation.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { usePressAnimation } from '@/ui/icons/animations';

function Probe({ onPress }: { onPress: () => void }) {
  const { style, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={style}>
      <Pressable
        testID="probe"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    </Animated.View>
  );
}

describe('usePressAnimation', () => {
  it('returns an animated style and press handlers', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Probe onPress={onPress} />);
    const node = getByTestId('probe');
    fireEvent(node, 'pressIn');
    fireEvent(node, 'pressOut');
    fireEvent.press(node);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/icons/usePressAnimation.test.tsx`
Expected: FAIL — `usePressAnimation` is not exported from `@/ui/icons/animations` (module does not exist).

- [ ] **Step 3: Create the animations module**

Create `src/ui/icons/animations.ts`:

```ts
import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SPRING = { damping: 12, stiffness: 220 } as const;

/**
 * Press feedback for any Pressable: scale down on press-in, spring back on
 * release. Spread the returned handlers onto the Pressable and the returned
 * style onto a wrapping Animated.View.
 */
export function usePressAnimation(pressedScale = 0.88) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(pressedScale, { duration: 80 });
  }, [pressedScale, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return { style, onPressIn, onPressOut };
}

export type IconAnimation = 'pop' | 'pulse' | 'spin' | 'nudge';

/**
 * One-shot, transform/opacity-only animations fired on a state change.
 * Returns the worklet body to assign to a shared value.
 */
export const ICON_ANIMATIONS: Record<
  IconAnimation,
  { kind: 'scale' | 'rotate' | 'translateX' }
> = {
  pop: { kind: 'scale' },
  pulse: { kind: 'scale' },
  spin: { kind: 'rotate' },
  nudge: { kind: 'translateX' },
};

/** withSequence builders kept here so AnimatedIcon and tests share one source. */
export const buildPop = () =>
  withSequence(withSpring(1.35, { damping: 6, stiffness: 260 }), withSpring(1, SPRING));
export const buildPulse = () =>
  withSequence(withTiming(1.15, { duration: 120 }), withTiming(1, { duration: 120 }));
export const buildSpin = () => withTiming(360, { duration: 400 });
export const buildNudge = () =>
  withSequence(withTiming(4, { duration: 80 }), withSpring(0, SPRING));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/icons/usePressAnimation.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons/animations.ts tests/ui/icons/usePressAnimation.test.tsx
git commit -m "feat(icons): press animation hook and icon animation builders"
```

---

## Task 4: AnimatedIcon component (state-change animation)

**Files:**
- Create: `src/ui/icons/AnimatedIcon.tsx`
- Test: `tests/ui/icons/AnimatedIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/icons/AnimatedIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';

describe('AnimatedIcon', () => {
  it('renders the underlying icon by name', () => {
    const { getByTestId } = render(<AnimatedIcon name="star" animation="pop" trigger={0} />);
    expect(getByTestId('icon-star')).toBeTruthy();
  });

  it('re-renders without crashing when its trigger changes', () => {
    const { rerender, getByTestId } = render(
      <AnimatedIcon name="check" animation="pop" trigger={0} />,
    );
    rerender(<AnimatedIcon name="check" animation="pop" trigger={1} />);
    expect(getByTestId('icon-check')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/icons/AnimatedIcon.test.tsx`
Expected: FAIL — module `@/ui/icons/AnimatedIcon` does not exist.

- [ ] **Step 3: Create AnimatedIcon**

Create `src/ui/icons/AnimatedIcon.tsx`:

```tsx
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Icon, type IconName } from './line';
import {
  type IconAnimation,
  buildNudge,
  buildPop,
  buildPulse,
  buildSpin,
} from './animations';

type Props = {
  name: IconName;
  animation: IconAnimation;
  /** Change this value to fire the animation once (e.g. a boolean cast to number). */
  trigger: number | boolean;
  color?: string;
  size?: number;
  fill?: string;
};

/**
 * Plays a one-shot transform animation whenever `trigger` changes. Use for
 * state-change feedback (a star filling, a check appearing, a trend flipping).
 */
export function AnimatedIcon({ name, animation, trigger, color, size, fill }: Props) {
  const value = useSharedValue(animation === 'spin' || animation === 'nudge' ? 0 : 1);
  const isFirst = useSharedValue(true);

  useEffect(() => {
    if (isFirst.value) {
      isFirst.value = false;
      return;
    }
    if (animation === 'pop') value.value = buildPop();
    else if (animation === 'pulse') value.value = buildPulse();
    else if (animation === 'spin') value.value = buildSpin();
    else value.value = buildNudge();
  }, [trigger, animation, value, isFirst]);

  const style = useAnimatedStyle(() => {
    if (animation === 'spin') return { transform: [{ rotate: `${value.value}deg` }] };
    if (animation === 'nudge') return { transform: [{ translateX: value.value }] };
    return { transform: [{ scale: value.value }] };
  });

  return (
    <Animated.View style={style}>
      <Icon name={name} color={color} size={size} fill={fill} />
    </Animated.View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/icons/AnimatedIcon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons/AnimatedIcon.tsx tests/ui/icons/AnimatedIcon.test.tsx
git commit -m "feat(icons): AnimatedIcon plays a one-shot animation on trigger change"
```

---

## Task 5: RatingStars — Star icon with pop on selection

**Files:**
- Modify: `src/ui/primitives/RatingStars.tsx`
- Test: `tests/ui/primitives/RatingStars.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Create `tests/ui/primitives/RatingStars.test.tsx` (if it already exists, add these cases):

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { RatingStars } from '@/ui/primitives/RatingStars';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('RatingStars', () => {
  it('renders five star icons and no ★/☆ glyphs', () => {
    const { getAllByTestId, queryByText } = wrap(<RatingStars value={3} />);
    expect(getAllByTestId('icon-star')).toHaveLength(5);
    expect(queryByText('★')).toBeNull();
    expect(queryByText('☆')).toBeNull();
  });

  it('calls onChange with the tapped star value', () => {
    const onChange = jest.fn();
    const { getByTestId } = wrap(<RatingStars value={null} onChange={onChange} />);
    fireEvent.press(getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
```

Note: confirm the ThemeProvider import path matches the project (`@/ui/theme/ThemeProvider`); if the project's test helper wraps theme differently, follow the existing pattern in `tests/ui/primitives/`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/primitives/RatingStars.test.tsx`
Expected: FAIL — component still renders `★`/`☆` text, no `icon-star` testID.

- [ ] **Step 3: Update RatingStars**

Replace the contents of `src/ui/primitives/RatingStars.tsx`:

```tsx
import { Pressable, View } from 'react-native';

import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';
import { useTheme } from '@/ui/theme/useTheme';

export function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (next: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.xs }} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = (value ?? 0) >= n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            disabled={!onChange}
            testID={`star-${n}`}
          >
            <AnimatedIcon
              name="star"
              animation="pop"
              trigger={selected}
              size={28}
              color={selected ? t.colors.forest : t.colors.inkFaint}
              fill={selected ? t.colors.forest : 'none'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/primitives/RatingStars.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives/RatingStars.tsx tests/ui/primitives/RatingStars.test.tsx
git commit -m "feat(icons): RatingStars uses Star icon with pop on select"
```

---

## Task 6: PlaceDetail — wishlist/visited icons with pop on toggle

**Files:**
- Modify: `src/ui/screens/PlaceDetail.tsx:46-90`

- [ ] **Step 1: Update the `action` helper to accept an optional leading icon**

In `src/ui/screens/PlaceDetail.tsx`, add the import at the top (with the other `@/ui` imports):

```tsx
import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';
import type { IconName } from '@/ui/icons/line';
```

Replace the `action` helper (lines 46-63) so it can render an icon beside the label and animate the icon when its `iconTrigger` changes:

```tsx
  const action = (
    testID: string,
    label: string,
    onPress: () => void,
    icon?: { name: IconName; active: boolean },
  ) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        gap: theme.space.xs,
        borderWidth: 1,
        borderColor: theme.colors.paperEdge,
        borderRadius: theme.radii.sm,
        paddingVertical: theme.space.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? (
        <AnimatedIcon
          name={icon.name}
          animation="pop"
          trigger={icon.active}
          size={16}
          color={theme.colors.forest}
          fill={icon.active ? theme.colors.forest : 'none'}
        />
      ) : null}
      <Text variant="caption" color={theme.colors.forest}>
        {label}
      </Text>
    </Pressable>
  );
```

- [ ] **Step 2: Update the action call sites to pass icons and drop the glyphs**

Replace the wishlist and visited `action(...)` calls (lines ~79-88):

```tsx
        {action(
          'toggle-wishlist',
          onWishlist ? t('explore.wishlistOn') : t('explore.wishlistAdd'),
          () => toggle.mutate(id),
          { name: 'star', active: onWishlist },
        )}
        {action(
          'toggle-visited',
          visited ? t('explore.visited') : t('explore.markVisited'),
          () => setUserData.mutate({ id, patch: { visitedAt: visited ? null : new Date() } }),
          { name: 'check', active: visited },
        )}
```

Leave the `open-maps` action unchanged (no glyph, no icon).

- [ ] **Step 3: Verify typecheck and the existing PlaceDetail/Explore tests pass**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test -- tests/ui/screens/ExploreScreen.test.tsx`
Expected: PASS (the `toggle-wishlist` / `toggle-visited` testIDs are unchanged; only the inner glyph changed). If a test asserted on the `★`/`☆`/`✓` text specifically, update that assertion to query the `toggle-wishlist`/`toggle-visited` testID instead.

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/PlaceDetail.tsx tests/ui/screens/ExploreScreen.test.tsx
git commit -m "feat(icons): PlaceDetail wishlist/visited use animated icons"
```

---

## Task 7: PlaceDetailSheet close button and Header back arrow

**Files:**
- Modify: `src/ui/screens/PlaceDetailSheet.tsx:66`
- Modify: `src/ui/primitives/Header.tsx:30-38`

- [ ] **Step 1: Replace the ✕ close glyph with an animated X icon**

In `src/ui/screens/PlaceDetailSheet.tsx`, add the import:

```tsx
import { Icon } from '@/ui/icons/line';
import { usePressAnimation } from '@/ui/icons/animations';
import Animated from 'react-native-reanimated';
```

The close button is a `Pressable` (around lines 50-67). Wrap its content with the press animation. Replace the `Text`-with-`✕` (line 66) and add the hook near the top of the component body. Concretely, in the component function add:

```tsx
  const closeAnim = usePressAnimation();
```

and change the close `Pressable` to spread the handlers and render the icon:

```tsx
      <Pressable
        onPress={onClose}
        onPressIn={closeAnim.onPressIn}
        onPressOut={closeAnim.onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{
          position: 'absolute',
          top: theme.space.sm,
          right: theme.space.md,
          zIndex: 1,
          width: 28,
          height: 28,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.paperEdge,
        }}
      >
        <Animated.View style={closeAnim.style}>
          <Icon name="close" size={16} color={theme.colors.inkSoft} />
        </Animated.View>
      </Pressable>
```

Note: keep the existing `onPress` handler name used in the file (it may be `onClose` or an inline arrow — preserve whatever is already there; only the children + press handlers change).

- [ ] **Step 2: Replace the ← Back glyph with an animated ArrowLeft icon**

In `src/ui/primitives/Header.tsx`, add imports:

```tsx
import Animated from 'react-native-reanimated';

import { Icon } from '@/ui/icons/line';
import { usePressAnimation } from '@/ui/icons/animations';
```

Add the hook in the component body (after `const insets = useSafeAreaInsets();`):

```tsx
  const backAnim = usePressAnimation();
```

Replace the back `Pressable` (lines 31-37) so it animates and renders an icon + label:

```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            onPressIn={backAnim.onPressIn}
            onPressOut={backAnim.onPressOut}
          >
            <Animated.View
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
                backAnim.style,
              ]}
            >
              <Icon name="arrowLeft" size={18} color={t.colors.forest} />
              <Text variant="bodyStrong" color={t.colors.forest}>Back</Text>
            </Animated.View>
          </Pressable>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS (Header keeps `accessibilityLabel="Back"`; any test querying "Back" by accessibility still matches. If a test queried the literal text `← Back`, change it to query `Back` or the Back accessibility label.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/PlaceDetailSheet.tsx src/ui/primitives/Header.tsx
git commit -m "feat(icons): animated close (X) and back (ArrowLeft) icons"
```

---

## Task 8: OnboardingScreen emojis + CTA arrow, AddPlaceScreen pin

**Files:**
- Modify: `src/ui/screens/OnboardingScreen.tsx`
- Modify: `src/ui/screens/AddPlaceScreen.tsx:129-133`

- [ ] **Step 1: Replace onboarding step emojis with IconName and CTA arrows**

In `src/ui/screens/OnboardingScreen.tsx`, add imports:

```tsx
import { Icon, type IconName } from '@/ui/icons/line';
```

Change the `STEPS` array so each step carries an `icon: IconName` instead of `emoji`, and drop the ` →` suffix from each `cta` (the arrow becomes an icon on the button):

```tsx
const STEPS = [
  {
    icon: 'cup' as IconName,
    title: 'Welcome to Drop',
    body: 'Your private espresso journal.\nNo accounts. No cloud. Just coffee.',
    cta: 'Get started',
  },
  {
    icon: 'bean' as IconName,
    title: 'Start your library',
    body: 'Add a bag of beans to start logging your espresso shots.',
    cta: 'Add a bean',
    route: '/library/new' as const,
    skip: true,
  },
  {
    icon: 'flask' as IconName,
    title: 'Ready to brew?',
    body: 'Head to the Lab to pull your first espresso shot.',
    cta: 'Open Brew Lab',
    route: '/lab' as const,
    skip: true,
  },
] as const;
```

Replace the large emoji `Text` (line 60) with an `Icon` sized to match:

```tsx
      <Icon name={current.icon} size={64} color={t.colors.forest} />
```

- [ ] **Step 2: Add a trailing arrow icon to the CTA Pill**

The `Pill` renders a text label. To keep the arrow as an SVG, check whether `Pill` accepts a trailing-icon/children slot. Read `src/ui/primitives/Pill.tsx`. If `Pill` supports a `rightIcon?: IconName` (or children), pass `rightIcon="arrowRight"`. If `Pill` only accepts a `label` string, add an optional `rightIcon?: IconName` prop to `Pill`:

In `src/ui/primitives/Pill.tsx`, add to the props type `rightIcon?: IconName;`, import `Icon`/`IconName`, and render it after the label inside the existing content row:

```tsx
      {rightIcon ? <Icon name={rightIcon} size={16} color={/* same color as the label */} /> : null}
```

Then in OnboardingScreen pass it on the main CTA:

```tsx
        <Pill
          label={current.cta}
          rightIcon="arrowRight"
          size="lg"
          onPress={() => {
            if (step === 0) setStep(1);
            else if (step === STEPS.length - 1) complete();
            else setStep(step + 1);
          }}
          style={{ minWidth: 200 }}
        />
```

Match the icon color to whatever color `Pill` uses for its label text (read the Pill styles to use the correct theme token).

- [ ] **Step 3: Replace the 📍 in AddPlaceScreen**

In `src/ui/screens/AddPlaceScreen.tsx`, add `import { Icon } from '@/ui/icons/line';`. Replace the coords `Text` (lines 129-133) to render an inline pin icon followed by the coordinates, dropping the `📍 ` prefix:

```tsx
        {coords ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            <Icon name="pin" size={14} color={theme.colors.ink} />
            <Text variant="caption">
              {`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
            </Text>
          </View>
        ) : (
          <Text variant="caption">{t('explore.useCurrentLocation')}</Text>
        )}
```

Ensure `View` is imported from `react-native` in this file (it is already used elsewhere in the screen — confirm).

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS. If an onboarding test asserts on the emoji or the `Get started →` literal, update it to assert on the title text or the CTA label without the arrow.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/OnboardingScreen.tsx src/ui/screens/AddPlaceScreen.tsx src/ui/primitives/Pill.tsx
git commit -m "feat(icons): onboarding + add-place use SVG icons and arrow CTA"
```

---

## Task 9: EmptyState icon prop and WeeklyRecapCard star/trend icons

**Files:**
- Modify: `src/ui/primitives/EmptyState.tsx`
- Modify: `src/ui/primitives/WeeklyRecapCard.tsx`
- Find + update all `EmptyState` call sites.

- [ ] **Step 1: Change EmptyState's icon prop from emoji string to IconName**

In `src/ui/primitives/EmptyState.tsx`, import the icon and change the prop type/default:

```tsx
import { Icon, type IconName } from '@/ui/icons/line';
```

```tsx
export type EmptyStateProps = ViewProps & {
  icon?: IconName;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = 'cup', title, body, cta, style, ...rest }: EmptyStateProps) {
```

Replace the icon `Text` (line 32):

```tsx
      <View style={{ marginBottom: t.space.md }}>
        <Icon name={icon} size={32} color={t.colors.inkSoft} />
      </View>
```

- [ ] **Step 2: Find and fix every EmptyState call site**

Run: `rg -n "EmptyState" src app --type tsx -l`
For each usage that passes `icon="<emoji>"`, replace the emoji with the matching `IconName` (e.g. `icon="☕"` → `icon="cup"`, `icon="📚"` → `icon="book"`, `icon="⚗️"` → `icon="flask"`, `icon="🔧"` → `icon="wrench"`, `icon="📍"` → `icon="pin"`, `icon="🫘"` → `icon="bean"`). Usages that pass no `icon` keep the default.

- [ ] **Step 3: Replace WeeklyRecapCard star and trend glyphs**

In `src/ui/primitives/WeeklyRecapCard.tsx`, add:

```tsx
import { Icon } from '@/ui/icons/line';
```

The `avg rating` Stat currently embeds `★` in its value string (line 21). `Stat` takes a string `value`, so render the rating as a number and place a small star icon in the label, OR — simpler and keeps the carve-out rule (no glyph in a value string) — change the Stat to show the number and append a star icon. Replace line 21:

```tsx
        <Stat value={recap.avgRating ? String(recap.avgRating) : '—'} label="avg rating" />
```

Replace the improvement line (lines 30-40) to use a trend icon instead of `↑`/`↓` and drop the trailing `★`:

```tsx
      {recap.improvementFromLastWeek !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginTop: t.space.xs }}>
          <Icon
            name={recap.improvementFromLastWeek >= 0 ? 'trendUp' : 'trendDown'}
            size={14}
            color={recap.improvementFromLastWeek >= 0 ? t.colors.forest : t.colors.amber}
          />
          <Text
            variant="caption"
            style={{ color: recap.improvementFromLastWeek >= 0 ? t.colors.forest : t.colors.amber }}
          >
            {Math.abs(recap.improvementFromLastWeek).toFixed(1)} vs last week
          </Text>
        </View>
      ) : null}
```

Add `View` to the `react-native` import in this file (it is already imported — confirm).

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: PASS — every `EmptyState` call site now passes a valid `IconName` (string emojis would fail the type).

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives/EmptyState.tsx src/ui/primitives/WeeklyRecapCard.tsx
git add -A  # picks up updated EmptyState call sites
git commit -m "feat(icons): EmptyState IconName prop and WeeklyRecapCard trend/star icons"
```

---

## Task 10: Final sweep and full verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm no UI glyphs remain outside the text-only carve-outs**

Run:
```bash
rg -n "[★☆✓✕←→↑↓]|☕|📚|⚗️|🔧|📍|🫘" src --glob '*.tsx'
```
Expected: NO matches in `.tsx` files. Any remaining matches must be in the carve-out `.ts` files only:
- `src/features/export/shot-card.ts` (export `.txt` — `☕`, `★`)
- `src/domain/dialing.ts`, `src/domain/ratio.ts`, `src/db/schema.ts` (prose/comments — `→`, `—`)
- `src/ui/primitives/CoachCard.tsx` (the `→` is inside the `EMPTY_TIP` prose sentence — leave it).

If a `.tsx` match remains that is genuinely UI, swap it for the matching `<Icon />`; if it is prose inside a sentence, leave it and note it.

- [ ] **Step 2: Full type + test gate**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS (full suite, no `--passWithNoTests`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (no unused imports left from removed `Text` glyphs).

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore(icons): final emoji→SVG sweep and verification"
```

---

## Self-Review notes

- **Spec coverage:** Icon system (Task 2), animation layer press + state-change (Tasks 3–4), all eight consuming sites (Tasks 5–9), text-only carve-outs explicitly preserved (Task 10 sweep), testing/jest gotchas (Task 1). All spec sections map to a task.
- **Type consistency:** `IconName` defined once in Task 2 and reused by `AnimatedIcon` (Task 4), `EmptyState`, `Pill`, and screens. `usePressAnimation` returns `{ style, onPressIn, onPressOut }` and is consumed with exactly those names. `AnimatedIcon` prop set (`name`, `animation`, `trigger`, `color`, `size`, `fill`) is used consistently in Tasks 5–6.
- **Carve-outs:** export `.txt` and prose/comment glyphs are intentionally untouched, consistent with the approved spec and verified in Task 10.
