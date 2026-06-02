# Explore Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Explore tab into a map-first experience — a full-screen MapLibre map with a draggable bottom sheet for search/filters/list, and a second bottom sheet that rises with place details when a marker or list row is tapped.

**Architecture:** `ExploreScreen` owns the screen state (`query`, `statusFilter`, `origin`, `selectedId`) and composes a full-screen `ExploreMap` with two `@gorhom/bottom-sheet` sheets — a persistent list `BottomSheet` (snaps 18/50/90 %, start Mid) and an on-demand detail `BottomSheetModal` (snaps 25/85 %). Detail content is extracted into a reusable `PlaceDetail` component so both the sheet and the legacy `/explore/[id]` route share it. The MapLibre `Camera` is driven imperatively via `CameraRef.flyTo` on selection/locate.

**Tech Stack:** Expo SDK 54, React Native 0.81 (New Arch), `@maplibre/maplibre-react-native` v11, `@gorhom/bottom-sheet` v5, `react-native-gesture-handler`, `react-native-reanimated` 4, TanStack Query, react-i18next. App name: **Drop** (`de.birneklub.drop`, scheme `drop`).

---

## File Structure

- **Create** `__mocks__/@gorhom/bottom-sheet.js` — Jest mock: render sheet components as Views.
- **Create** `__mocks__/react-native-gesture-handler.js` — Jest mock: `GestureHandlerRootView` → View, gesture stubs.
- **Modify** `app/_layout.tsx` — wrap app in `GestureHandlerRootView` + `BottomSheetModalProvider`.
- **Modify** `src/ui/maps/BaseMap.tsx` — accept optional `cameraRef` and `trackUserLocation`, forward to `<Camera>`.
- **Modify** `src/ui/screens/ExploreMap.tsx` — accept `cameraRef` + `selectedId` (enlarge selected marker), stays `flex:1` full-screen.
- **Create** `src/ui/screens/PlaceDetail.tsx` — detail body WITHOUT its own scroll container (header zone with quick actions first, then map/rating/notes/beans).
- **Modify** `src/ui/screens/PlaceDetailScreen.tsx` — thin wrapper: `ScrollView` (with insets) around `PlaceDetail`, for the legacy route.
- **Create** `src/ui/screens/PlaceDetailSheet.tsx` — `BottomSheetModal` (snaps 25/85 %) rendering `PlaceDetail` inside `BottomSheetScrollView`.
- **Create** `src/ui/screens/PlaceListSheet.tsx` — `BottomSheet` (snaps 18/50/90 %, index 1) with search input, status chips, city-grouped list via `BottomSheetScrollView`.
- **Modify** `src/ui/screens/ExploreScreen.tsx` — map-first container, state, locate + add floating buttons, wires both sheets.
- **Modify** `src/i18n/en.json` — add `explore.nearMe` (a11y label for locate button).
- **Modify** `tests/ui/screens/ExploreScreen.test.tsx` — adapt to sheet-based layout.
- **Keep** `app/(tabs)/explore/[id].tsx` (deep links), `AddPlaceScreen`, DB/repo, other tabs.

---

## Task 1: Install native deps

**Files:** `package.json` (via `expo install`)

- [ ] **Step 1: Install gorhom + gesture-handler**

Run:
```bash
cd /Users/robin.rehbein/Code/brewlog
env -u ANDROID_SDK_ROOT ANDROID_HOME=$HOME/Library/Android/sdk npx expo install @gorhom/bottom-sheet react-native-gesture-handler
```
Expected: both added; gesture-handler resolves to the SDK-54-compatible version; reanimated 4.1.x already present satisfies gorhom's peer.

- [ ] **Step 2: Verify versions**

Run: `node -e "const p=require('./package.json').dependencies; console.log(p['@gorhom/bottom-sheet'], p['react-native-gesture-handler'])"`
Expected: gorhom `^5.x`, gesture-handler present.

- [ ] **Step 3: Commit**
```bash
git add package.json bun.lock* package-lock.json 2>/dev/null; git commit -m "chore: add @gorhom/bottom-sheet + react-native-gesture-handler"
```

---

## Task 2: Jest mocks for gorhom + gesture-handler

So screen tests mount without native modules (mirrors `__mocks__/@maplibre/maplibre-react-native.js`).

**Files:**
- Create: `__mocks__/@gorhom/bottom-sheet.js`
- Create: `__mocks__/react-native-gesture-handler.js`

- [ ] **Step 1: Write the gorhom mock**

`__mocks__/@gorhom/bottom-sheet.js`:
```js
// Jest mock for @gorhom/bottom-sheet — native sheet unavailable in Node.
// Sheets and their scroll/view containers render children inline as Views so
// content stays queryable. The modal renders children (open or not) so detail
// content is testable once mounted.
const React = require('react');
const { View, ScrollView } = require('react-native');

const Passthrough = ({ children, testID }) =>
  React.createElement(View, { testID }, children);
const Scroll = ({ children, testID }) =>
  React.createElement(ScrollView, { testID }, children);

const BottomSheet = Passthrough;
const BottomSheetModal = Passthrough;
const BottomSheetModalProvider = ({ children }) => React.createElement(View, null, children);
const BottomSheetView = Passthrough;
const BottomSheetScrollView = Scroll;

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheet,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetScrollView,
};
```

- [ ] **Step 2: Write the gesture-handler mock**

`__mocks__/react-native-gesture-handler.js`:
```js
// Jest mock for react-native-gesture-handler — native gestures unavailable in
// Node. GestureHandlerRootView passes through; the rest are inert stubs.
const React = require('react');
const { View } = require('react-native');

const GestureHandlerRootView = ({ children, style, testID }) =>
  React.createElement(View, { style, testID }, children);

module.exports = {
  __esModule: true,
  GestureHandlerRootView,
  gestureHandlerRootHOC: (c) => c,
  Gesture: { Pan: () => ({}), Tap: () => ({}) },
  GestureDetector: ({ children }) => children,
};
```

- [ ] **Step 3: Run existing tests to confirm mocks don't break collection**

Run: `npx jest tests/ui/screens/ExploreScreen.test.tsx 2>&1 | tail -5`
Expected: still passes (mocks unused yet, but resolvable).

- [ ] **Step 4: Commit**
```bash
git add __mocks__/@gorhom __mocks__/react-native-gesture-handler.js
git commit -m "test: mock @gorhom/bottom-sheet + gesture-handler for jest"
```

---

## Task 3: Root providers (GestureHandlerRootView + BottomSheetModalProvider)

**Files:** Modify `app/_layout.tsx`

- [ ] **Step 1: Add imports** (after the polyfill import, before/with other imports)
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
```

- [ ] **Step 2: Wrap the returned tree.** The current `return (<ErrorBoundary><ThemeProvider><QueryProvider><RepoProvider>…)`. Wrap the outermost with `GestureHandlerRootView` (flex:1) and put `BottomSheetModalProvider` inside `RepoProvider` (so sheets can use repo/query):
```tsx
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryProvider>
            <RepoProvider>
              <BottomSheetModalProvider>
                <StatusBar style="dark" />
                {onboardingCompleted ? (
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
                  </Stack>
                ) : (
                  <OnboardingScreen />
                )}
                <Snackbar />
              </BottomSheetModalProvider>
            </RepoProvider>
          </QueryProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 4: Run full test suite** (root layout isn't unit-tested, but confirm nothing regressed)

Run: `npx jest 2>&1 | tail -5` → Expected: all pass.

- [ ] **Step 5: Commit**
```bash
git add app/_layout.tsx
git commit -m "feat: add GestureHandlerRootView + BottomSheetModalProvider at root"
```

---

## Task 4: BaseMap camera + location support

**Files:** Modify `src/ui/maps/BaseMap.tsx`

- [ ] **Step 1: Update imports & props**
```tsx
import { Camera, type CameraRef, Map, type MapProps } from '@maplibre/maplibre-react-native';
import type { ReactNode, Ref } from 'react';
```
Add to `BaseMapProps`:
```tsx
  /** Imperative camera handle for flyTo/easeTo from the parent. */
  cameraRef?: Ref<CameraRef>;
  /** Show + track the user's location dot. */
  trackUserLocation?: boolean;
```

- [ ] **Step 2: Forward to `<Camera>`** — replace the `<Camera initialViewState=… />` line:
```tsx
      <Camera
        ref={cameraRef}
        initialViewState={{ center: [center.lng, center.lat], zoom }}
        {...(trackUserLocation ? { trackUserLocation: 'normal' } : {})}
      />
```
(Destructure `cameraRef` and `trackUserLocation` in the component signature.)

- [ ] **Step 3: Typecheck** → `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Run map test** → `npx jest tests/ui/screens/ExploreMap.test.tsx` → PASS (mock ignores new props).

- [ ] **Step 5: Commit**
```bash
git add src/ui/maps/BaseMap.tsx
git commit -m "feat(map): BaseMap forwards cameraRef + trackUserLocation"
```

---

## Task 5: ExploreMap — full-screen, selected-marker highlight, camera ref

**Files:** Modify `src/ui/screens/ExploreMap.tsx`, Test `tests/ui/screens/ExploreMap.test.tsx`

- [ ] **Step 1: Update component** to accept `cameraRef` + `selectedId` and enlarge the selected pin:
```tsx
import { Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import type { Ref } from 'react';
import { View } from 'react-native';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { BaseMap } from '@/ui/maps/BaseMap';

const GERMANY = { lat: 51.16, lng: 10.45 };

function pinColor(p: PlaceWithUserData): string {
  const status = placeStatus(p.userData);
  if (status === 'visited') return '#2f6db1';
  if (status === 'wishlist') return '#e08a2f';
  return p.curated ? '#2e7d4f' : '#c0392b';
}

export function ExploreMap({
  places,
  onSelect,
  selectedId,
  cameraRef,
}: {
  places: PlaceWithUserData[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  cameraRef?: Ref<CameraRef>;
}) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const first = withCoords[0];
  return (
    <BaseMap
      testID="map-view"
      center={first ? { lat: first.lat!, lng: first.lng! } : GERMANY}
      zoom={first ? 11 : 5}
      cameraRef={cameraRef}
      trackUserLocation
    >
      {withCoords.map((p) => {
        const selected = p.id === selectedId;
        const size = selected ? 22 : 16;
        return (
          <Marker
            key={p.id}
            testID="map-marker"
            lngLat={[p.lng!, p.lat!]}
            anchor="bottom"
            onPress={() => onSelect(p.id)}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: pinColor(p),
                borderWidth: selected ? 3 : 2,
                borderColor: '#fff',
              }}
            />
          </Marker>
        );
      })}
    </BaseMap>
  );
}
```

- [ ] **Step 2: Run map test** → `npx jest tests/ui/screens/ExploreMap.test.tsx` → PASS (still one `map-marker`, `map-view` present).

- [ ] **Step 3: Typecheck** → no errors.

- [ ] **Step 4: Commit**
```bash
git add src/ui/screens/ExploreMap.tsx
git commit -m "feat(map): ExploreMap supports selected highlight + camera ref"
```

---

## Task 6: Extract PlaceDetail content component

Pull the body out of `PlaceDetailScreen` so it can render inside a sheet's scroll view. Reorder so the **peek** (top ~25 %) shows name, kind·city, address, and the quick-action row.

**Files:** Create `src/ui/screens/PlaceDetail.tsx`, Modify `src/ui/screens/PlaceDetailScreen.tsx`

- [ ] **Step 1: Create `src/ui/screens/PlaceDetail.tsx`** — content only, no scroll container:
```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { Marker } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, TextInput, View } from 'react-native';

import { useBeansBySourcePlace } from '@/features/beans/hooks';
import { usePlace, useSetUserData, useToggleWishlist } from '@/features/places/hooks';
import { BaseMap } from '@/ui/maps/BaseMap';
import { RatingStars } from '@/ui/primitives/RatingStars';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KIND_LABEL: Record<string, string> = {
  roaster: 'Roaster',
  coffee_shop: 'Coffee shop',
  cafe: 'Café',
};

/** Detail body for a place. Renders content only (no scroll container) so it can
 *  live inside either a ScrollView (route) or a BottomSheetScrollView (sheet). */
export function PlaceDetail({ id }: { id: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: place } = usePlace(id);
  const toggle = useToggleWishlist();
  const setUserData = useSetUserData();
  const { data: linkedBeans = [] } = useBeansBySourcePlace(id);
  const [showPicker, setShowPicker] = useState(false);
  if (!place) return null;

  const onWishlist = !!place.userData?.wishlisted;
  const visited = !!place.userData?.visitedAt;
  const mapsUrl =
    place.lat != null && place.lng != null
      ? Platform.select({
          android: `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`,
          default: `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`,
        })
      : null;

  const action = (testID: string, label: string, onPress: () => void) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.paperEdge,
        borderRadius: theme.radii.sm,
        paddingVertical: theme.space.sm,
        alignItems: 'center',
      }}
    >
      <Text variant="caption" color={theme.colors.forest}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: theme.space.sm }}>
      {/* Peek zone: identity + quick actions */}
      <Text variant="title">{place.name}</Text>
      <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
        {KIND_LABEL[place.kind] ?? place.kind}
        {place.city ? ` · ${place.city}` : ''}
      </Text>
      {place.address ? (
        <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
          {place.address}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.xs }}>
        {action(
          'toggle-wishlist',
          onWishlist ? `★ ${t('explore.wishlistOn')}` : `☆ ${t('explore.wishlistAdd')}`,
          () => toggle.mutate(id),
        )}
        {action('toggle-visited', visited ? `✓ ${t('explore.visited')}` : t('explore.markVisited'), () =>
          setUserData.mutate({ id, patch: { visitedAt: visited ? null : new Date() } }),
        )}
        {mapsUrl ? action('open-maps', t('explore.openInMaps'), () => Linking.openURL(mapsUrl)) : null}
      </View>

      {/* Expanded zone */}
      {place.openingHours ? <Text variant="caption">{place.openingHours}</Text> : null}
      {place.editorialNote ? <Text variant="body">{place.editorialNote}</Text> : null}

      {place.lat != null && place.lng != null ? (
        <View
          pointerEvents="none"
          style={{ height: 160, borderRadius: theme.radii.sm, overflow: 'hidden' }}
        >
          <BaseMap testID="detail-map" center={{ lat: place.lat, lng: place.lng }} zoom={13} interactive={false}>
            <Marker lngLat={[place.lng, place.lat]} anchor="bottom">
              <View
                style={{
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: '#c0392b', borderWidth: 2, borderColor: '#fff',
                }}
              />
            </Marker>
          </BaseMap>
        </View>
      ) : null}

      {place.website ? (
        <Pressable onPress={() => Linking.openURL(place.website!)}>
          <Text variant="bodyStrong" color={theme.colors.forest}>{t('explore.website')}</Text>
        </Pressable>
      ) : null}

      {visited ? (
        <Pressable testID="edit-visit-date" onPress={() => setShowPicker(true)}>
          <Text variant="caption" color={theme.colors.forest}>
            {t('explore.editDate')} ({place.userData!.visitedAt!.toLocaleDateString()})
          </Text>
        </Pressable>
      ) : null}
      {showPicker ? (
        <DateTimePicker
          testID="date-picker"
          value={place.userData?.visitedAt ?? new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShowPicker(false);
            if (date) setUserData.mutate({ id, patch: { visitedAt: date } });
          }}
        />
      ) : null}

      <Text variant="caption" style={{ color: theme.colors.inkFaint }}>{t('explore.yourRating')}</Text>
      <RatingStars
        value={place.userData?.rating ?? null}
        onChange={(n) => setUserData.mutate({ id, patch: { rating: n } })}
      />

      <TextInput
        placeholder={t('explore.notes')}
        defaultValue={place.userData?.notes ?? ''}
        onEndEditing={(e) => setUserData.mutate({ id, patch: { notes: e.nativeEvent.text } })}
        multiline
        style={{
          borderWidth: 1, borderColor: theme.colors.paperEdge, borderRadius: theme.radii.sm,
          padding: theme.space.md, minHeight: 80, color: theme.colors.ink, fontFamily: theme.fonts.sans,
        }}
      />

      <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.sm }}>
        {t('explore.linkedBeans')}
      </Text>
      {linkedBeans.length > 0 ? (
        linkedBeans.map((b) => (
          <Text key={b.id} variant="body">• {b.name}</Text>
        ))
      ) : (
        <Text variant="caption" style={{ color: theme.colors.inkFaint }}>{t('explore.noLinkedBeans')}</Text>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Replace `PlaceDetailScreen.tsx`** with a thin wrapper for the legacy route:
```tsx
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlace } from '@/features/places/hooks';
import { PlaceDetail } from '@/ui/screens/PlaceDetail';
import { useTheme } from '@/ui/theme/useTheme';

export function PlaceDetailScreen({ id }: { id: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: place } = usePlace(id);
  if (!place) return <View style={{ flex: 1, backgroundColor: theme.colors.paper }} />;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
      contentContainerStyle={{ padding: theme.space.lg, paddingTop: insets.top + theme.space.lg }}
    >
      <PlaceDetail id={id} />
    </ScrollView>
  );
}
```

- [ ] **Step 3: Typecheck** → no errors.

- [ ] **Step 4: Run place detail tests** → `npx jest tests/ui/screens 2>&1 | tail -8`.
Expected: existing detail tests pass; if a test queried text that moved (e.g. asserted address before actions), update the assertion to match the new order. Fix any selector that broke due to reordering.

- [ ] **Step 5: Commit**
```bash
git add src/ui/screens/PlaceDetail.tsx src/ui/screens/PlaceDetailScreen.tsx
git commit -m "refactor(explore): extract reusable PlaceDetail content"
```

---

## Task 7: PlaceDetailSheet (BottomSheetModal)

**Files:** Create `src/ui/screens/PlaceDetailSheet.tsx`

- [ ] **Step 1: Create the sheet**
```tsx
import BottomSheetModalDefault, {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceDetail } from '@/ui/screens/PlaceDetail';
import { useTheme } from '@/ui/theme/useTheme';

void BottomSheetModalDefault; // default import kept for mock/runtime interop

/** Detail sheet that rises from the bottom. Opens (present) whenever `placeId`
 *  is set, dismisses when cleared. Snaps: compact card (25%) → full (85%). */
export function PlaceDetailSheet({
  placeId,
  onClose,
}: {
  placeId: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%', '85%'], []);

  useEffect(() => {
    if (placeId) ref.current?.present();
    else ref.current?.dismiss();
  }, [placeId]);

  const handleDismiss = useCallback(() => onClose(), [onClose]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          padding: theme.space.lg,
          paddingBottom: insets.bottom + theme.space.xl,
        }}
      >
        {placeId ? <PlaceDetail id={placeId} /> : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
```

> NOTE: `useCallback` is imported from `react` (not a custom hook). Correct the import to `import { useCallback, useEffect, useMemo, useRef } from 'react';` — there is no `useCallback`-default; this is a single named import line. (The line above shows `useCallback` capitalized by mistake; use lowercase `useCallback`.)

- [ ] **Step 2: Fix the React import line** to exactly:
```tsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
```
and remove the stray `BottomSheetModalDefault` default import if the named `BottomSheetModal` resolves at runtime (it does in v5). Final import block:
```tsx
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceDetail } from '@/ui/screens/PlaceDetail';
import { useTheme } from '@/ui/theme/useTheme';
```
(delete the `void BottomSheetModalDefault;` line.)

- [ ] **Step 3: Typecheck** → no errors.

- [ ] **Step 4: Commit**
```bash
git add src/ui/screens/PlaceDetailSheet.tsx
git commit -m "feat(explore): add PlaceDetailSheet bottom-sheet modal"
```

---

## Task 8: PlaceListSheet (BottomSheet)

**Files:** Create `src/ui/screens/PlaceListSheet.tsx`

- [ ] **Step 1: Create the sheet** (search + status chips + grouped list):
```tsx
import { BottomSheetScrollView, default as BottomSheet } from '@gorhom/bottom-sheet';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { groupByCity } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export type StatusFilter = 'all' | 'curated' | 'wishlist' | 'visited';
const STATUS: StatusFilter[] = ['all', 'curated', 'wishlist', 'visited'];

export function PlaceListSheet({
  places,
  query,
  onQuery,
  statusFilter,
  onStatusFilter,
  onSelect,
  nearest,
}: {
  places: PlaceWithUserData[];
  query: string;
  onQuery: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (s: StatusFilter) => void;
  onSelect: (id: string) => void;
  nearest: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['18%', '50%', '90%'], []);
  const groups = useMemo(() => groupByCity(places), [places]);

  const chip = (active: boolean) => ({
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: active ? theme.colors.forest : theme.colors.paperEdge,
  });
  const chipText = (active: boolean) => ({ color: active ? theme.colors.paper : theme.colors.ink });

  return (
    <BottomSheet
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl }}
      >
        <TextInput
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          onChangeText={onQuery}
          style={{
            borderWidth: 1, borderColor: theme.colors.paperEdge, borderRadius: theme.radii.sm,
            padding: theme.space.md, marginBottom: theme.space.sm, color: theme.colors.ink,
            fontFamily: theme.fonts.sans,
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, marginBottom: theme.space.md }}>
          {STATUS.map((s) => (
            <Pressable key={s} testID={`status-${s}`} onPress={() => onStatusFilter(s)} style={chip(statusFilter === s)}>
              <Text variant="caption" style={chipText(statusFilter === s)}>{t(`explore.filter_${s}`)}</Text>
            </Pressable>
          ))}
        </View>

        {nearest
          ? places.map((p) => (
              <PlaceCard key={p.id} place={p} onPress={() => onSelect(p.id)} />
            ))
          : groups.map((g) => (
              <View key={g.city} style={{ marginBottom: theme.space.lg }}>
                <Text variant="caption" style={{ color: theme.colors.inkFaint, marginBottom: theme.space.xs }}>
                  {g.city}
                </Text>
                {g.places.map((p) => (
                  <PlaceCard key={p.id} place={p} onPress={() => onSelect(p.id)} />
                ))}
              </View>
            ))}

        <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.md }}>
          {t('explore.attribution')}
        </Text>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Typecheck** → no errors.

- [ ] **Step 3: Commit**
```bash
git add src/ui/screens/PlaceListSheet.tsx
git commit -m "feat(explore): add PlaceListSheet bottom sheet"
```

---

## Task 9: ExploreScreen rewrite (map-first)

**Files:** Modify `src/ui/screens/ExploreScreen.tsx`

- [ ] **Step 1: Replace the file**
```tsx
import { type CameraRef } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { filterPlaces, placeStatus, sortPlaces, type LatLng } from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import { ExploreMap } from '@/ui/screens/ExploreMap';
import { PlaceDetailSheet } from '@/ui/screens/PlaceDetailSheet';
import { PlaceListSheet, type StatusFilter } from '@/ui/screens/PlaceListSheet';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: places = [] } = usePlaces();
  const cameraRef = useRef<CameraRef>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nearest = origin !== null;

  const byStatus = useMemo(
    () =>
      places.filter((p) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'curated') return p.curated;
        return placeStatus(p.userData) === statusFilter;
      }),
    [places, statusFilter],
  );
  const filtered = useMemo(() => filterPlaces(byStatus, { query }), [byStatus, query]);
  const sorted = useMemo(
    () => sortPlaces(filtered, nearest ? 'distance' : 'name', origin ?? undefined),
    [filtered, nearest, origin],
  );

  function selectPlace(id: string) {
    setSelectedId(id);
    const p = places.find((x) => x.id === id);
    if (p?.lat != null && p?.lng != null) {
      cameraRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 600 });
    }
  }

  async function toggleNearest() {
    if (nearest) {
      setOrigin(null);
      return;
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setOrigin(o);
    cameraRef.current?.flyTo({ center: [o.lng, o.lat], zoom: 12, duration: 600 });
  }

  const fab = {
    position: 'absolute' as const,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.paper,
    borderWidth: 1,
    borderColor: theme.colors.paperEdge,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.paper }}>
      <ExploreMap
        places={sorted}
        onSelect={selectPlace}
        selectedId={selectedId}
        cameraRef={cameraRef}
      />

      {/* Add place (top-right) */}
      <Pressable
        testID="add-place"
        accessibilitylabel={t('explore.addPlace')}
        onPress={() => router.push('/explore/new' as never)}
        style={[fab, { top: insets.top + theme.space.md, right: theme.space.lg }]}
      >
        <Text variant="title" color={theme.colors.forest}>＋</Text>
      </Pressable>

      {/* Locate / nearest (bottom-right, above the sheet's mid snap) */}
      <Pressable
        testID="sort-nearest"
        accessibilitylabel={t('explore.nearMe')}
        onPress={toggleNearest}
        style={[
          fab,
          {
            bottom: '52%',
            right: theme.space.lg,
            backgroundColor: nearest ? theme.colors.forest : theme.colors.paper,
          },
        ]}
      >
        <Text variant="title" color={nearest ? theme.colors.paper : theme.colors.forest}>◎</Text>
      </Pressable>

      <PlaceListSheet
        places={sorted}
        query={query}
        onQuery={setQuery}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onSelect={selectPlace}
        nearest={nearest}
      />

      <PlaceDetailSheet placeId={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}
```

- [ ] **Step 2: Add i18n key.** In `src/i18n/en.json` under `"explore"`, add:
```json
    "nearMe": "Near me",
```
(after `"nearest"`).

- [ ] **Step 3: Typecheck** → `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit**
```bash
git add src/ui/screens/ExploreScreen.tsx src/i18n/en.json
git commit -m "feat(explore): map-first screen with list + detail sheets"
```

---

## Task 10: Update ExploreScreen tests

**Files:** Modify `tests/ui/screens/ExploreScreen.test.tsx`

- [ ] **Step 1: Adapt the tests.** The list now lives inside the (mocked) sheet, which renders children inline, so text queries still work. Tapping a row opens the detail sheet (mocked modal renders children once `selectedId` is set). Replace the file body's two tests with:
```tsx
it('lists seeded places and filters by search', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  expect(screen.getByText('Starbucks')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'mok');
  await waitFor(() => expect(screen.queryByText('Starbucks')).toBeNull());
  expect(screen.getByText('Mókuska')).toBeTruthy();
});

it('filters to curated via the status chip', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Starbucks')).toBeTruthy());
  fireEvent.press(screen.getByTestId('status-curated'));
  await waitFor(() => expect(screen.queryByText('Starbucks')).toBeNull());
  expect(screen.getByText('Mókuska')).toBeTruthy();
});

it('opens the detail sheet when a place is tapped', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  fireEvent.press(screen.getByText('Mókuska'));
  // detail sheet mounts PlaceDetail → wishlist action becomes available
  await waitFor(() => expect(screen.getByTestId('toggle-wishlist')).toBeTruthy());
});
```

- [ ] **Step 2: Run the suite** → `npx jest 2>&1 | tail -8` → all pass. If the curated test is flaky because two cards share a name, assert on a unique seeded name instead.

- [ ] **Step 3: Lint** → `npm run lint 2>&1 | grep -E "[0-9]+ problems"` → 0 errors.

- [ ] **Step 4: Commit**
```bash
git add tests/ui/screens/ExploreScreen.test.tsx
git commit -m "test(explore): cover map-first sheet layout + detail open"
```

---

## Task 11: Prebuild, rebuild, verify on emulator

**Files:** none (native build)

- [ ] **Step 1: Regenerate native project** (gesture-handler is native):
```bash
cd /Users/robin.rehbein/Code/brewlog
env -u ANDROID_SDK_ROOT ANDROID_HOME=$HOME/Library/Android/sdk CI=1 npx expo prebuild --clean --platform android
```
Expected: `Finished prebuild`, package `de.birneklub.drop`.

- [ ] **Step 2: Confirm autolinking** picks up the new module:
```bash
env -u ANDROID_SDK_ROOT ANDROID_HOME=$HOME/Library/Android/sdk npx expo run:android
```
Wait for `BUILD SUCCESSFUL` + install + JS bundle.

- [ ] **Step 3: Manual verification on emulator** (capture screenshots):
  - Explore opens map-first, list sheet at Mid; drag to Peek and Full.
  - Search filters both list + markers; status chips filter.
  - Tap a marker → detail card peeks; drag up → full detail; selected pin enlarged; map flew to it.
  - Tap a list row → same detail sheet.
  - Drag detail down → closes, selection cleared.
  - `＋` opens add-place; `◎` requests location, recenters, sorts by nearest.
  - Status bar not overlapped on any sheet.

- [ ] **Step 4: Final gates** → `npx tsc --noEmit && npx jest 2>&1 | tail -5 && npm run lint 2>&1 | grep problems` → clean.

- [ ] **Step 5: Commit any fixups discovered during verification.**

---

## Self-Review Notes

- **Spec coverage:** layout B (full-screen map + sheet) → Tasks 8–9; 3 snaps start Mid → Task 8; detail card→full → Task 7; marker & row tap open same sheet → Task 9 (`selectPlace`); gorhom + gesture-handler → Tasks 1,3; locate replaces Nearest → Task 9 `◎`; add `+` → Task 9; camera flyTo → Tasks 4,9; mocks/tests → Tasks 2,10; not changing DB/AddPlace/other tabs → respected.
- **MapLibre camera (open detail in spec):** resolved — `CameraRef.flyTo({center,zoom,duration})`, `trackUserLocation` on `<Camera>`.
- **Type consistency:** `StatusFilter` defined in `PlaceListSheet`, imported by `ExploreScreen`; `CameraRef` from maplibre used by BaseMap/ExploreMap/ExploreScreen; `PlaceDetail` signature `{ id }` used by sheet + route.
- **Naming caution from Task 7:** ensure the final React import is `import { useCallback, useEffect, useMemo, useRef } from 'react';` and there is no leftover default-import of `BottomSheetModal`.
