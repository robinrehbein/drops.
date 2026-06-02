# Explore Redesign — Full-screen Map + Bottom Sheets

**Date:** 2026-06-01
**Status:** Approved (design); pending implementation plan

## Goal

Turn the Explore tab into a map-first experience: the MapLibre map fills the
screen, and search, filters, and the place list live in a draggable bottom
sheet. Tapping a marker (or a list row) opens place details in a second sheet
that rises from the bottom — the standard Apple/Google Maps "place card" flow.

This replaces today's stacked layout (header → List/Map/Nearest toggle → search
→ chips → inline list-or-map) on `ExploreScreen`.

## Decisions (from brainstorming)

- **Layout:** Full-screen map base; search + filters + list all inside a
  pull-up sheet (Apple-Maps style), not pinned over the map.
- **List sheet snap points:** 3 — Peek ~18 %, Mid ~50 % (initial), Full ~90 %.
- **Detail interaction:** Tapping a marker opens a **compact place card**
  (~25 %) that expands to **full detail** (~85 %). Variant "A".
- **List row tap:** opens the **same** detail sheet (consistent with marker
  tap). The old full-screen route is no longer used in the Explore flow.
- **Sheet engine:** `@gorhom/bottom-sheet` v5 (+ `react-native-gesture-handler`).
- **Locate / "Nearest":** a floating round locate button (bottom-right, above
  the sheet) — centers the map on the user and sorts the list by distance.
  Replaces the old "Nearest" chip.
- **Add place:** a small `+` button top-right over the map; opens the existing
  add-place route unchanged.
- The **List/Map/Nearest segmented toggle is removed** (map is always the base).

## Interaction Model

1. Open Explore → map fills screen, list sheet rests at **Mid**. Markers for all
   places matching the current search/filter are shown.
2. Drag the list sheet: Peek (search + chips only) ↔ Mid ↔ Full (list focused,
   search pinned at the sheet's top).
3. Tap a **marker** or a **list row** → detail sheet opens at the compact-card
   snap; the selected marker is enlarged/highlighted and the map animates to
   center on it.
4. Drag the detail sheet up → full detail (mini-map, opening hours, editorial
   note, rating, notes, linked beans).
5. Dismiss the detail sheet (drag down / backdrop) → selection clears, marker
   returns to normal, list sheet returns to Mid.
6. Locate button → request location, center map on user, sort list by distance
   (toggles off to return to name sort).
7. `+` button → existing add-place route.

## Component Architecture

- **`app/_layout.tsx`** — wrap the app in `GestureHandlerRootView` and
  `BottomSheetModalProvider` (required by gorhom). Polyfill import stays first.
- **`ExploreScreen`** — map-first container. Owns state:
  `query`, `statusFilter`, `origin` (locate), `selectedId`. Renders the
  full-screen map, the list sheet, the detail sheet (modal), and the two
  floating buttons (locate, add). Derives the filtered/sorted place set once and
  feeds it to both the map and the list (reusing `filterPlaces`, `sortPlaces`,
  `groupByCity`, `placeStats`, `placeStatus` from `@/domain/places`).
- **`ExploreMap`** — full-screen `BaseMap`. New props: `selectedId` (to
  enlarge/highlight the chosen marker) and camera control to fly to a coordinate
  (selected place or user location). Exposes `onSelect(id)`.
- **`PlaceListSheet`** (new) — gorhom `BottomSheet` with snap points
  `['18%','50%','90%']`, initial index = Mid. Contains the search input, status
  chips, and the city-grouped list (using `BottomSheetScrollView` / FlatList so
  scrolling composes with the sheet gesture). Calls back on row press and on
  search/filter changes.
- **`PlaceDetailSheet`** (new) — gorhom `BottomSheetModal` with snap points
  `['25%','85%']`. Renders a reusable `PlaceDetail` content component extracted
  from today's `PlaceDetailScreen`: an always-visible card header (name,
  kind·city, quick actions: wishlist / visited / open-in-maps) plus the
  scrollable remainder (mini-map, hours, editorial, rating, notes, linked
  beans). Driven by `selectedId`.
- **`PlaceDetail`** (extracted) — the detail body, reused by both the new sheet
  and (optionally) the retained `/explore/[id]` route for deep links.

## Data Flow & State

`usePlaces()` → one `useMemo` pipeline (status filter → text filter → sort) →
the resulting array feeds **both** the map markers and the list rows, so search
and filters affect both simultaneously. `selectedId` is local screen state; the
detail sheet's data comes from `usePlace(selectedId)` (existing hook).
No database or repo changes.

## Native Dependencies & Build

- Add via `expo install`: `@gorhom/bottom-sheet`, `react-native-gesture-handler`
  (gesture-handler is native). Reanimated 4.1.x already present and satisfies
  gorhom's peer requirement.
- Run `npx expo prebuild --clean --platform android` then rebuild
  (`expo run:android`). Use `env -u ANDROID_SDK_ROOT ANDROID_HOME=…` to avoid the
  known mise SDK-path conflict.

## Out of Scope (explicitly not changed)

- Database schema, `places` repo, seeding.
- `AddPlaceScreen` logic (still its own route; map tap-to-set-coords unchanged).
- Daily / Library / Lab / Care tabs.
- The CARTO Positron map style and the safe-area fixes already shipped.
- `/explore/[id]` route file remains for deep links (just not navigated to from
  Explore).

## Open Implementation Detail to Resolve in Planning

- **MapLibre v11 camera control:** confirm the API to animate to a coordinate on
  selection — controlled `Camera` props vs imperative `MapRef`/`Camera` ref
  (`flyTo`/`setCamera`). Pick whichever v11 supports cleanly.

## Testing

- Update `ExploreScreen` tests for the map-first layout: the list now lives in a
  sheet (assert search filters rows, status chip filters, rows are present).
- Add a Jest mock for `@gorhom/bottom-sheet` and `react-native-gesture-handler`
  (render children as plain Views), mirroring the existing maplibre/maps mocks,
  so screen tests mount without native modules.
- Keep the existing `ExploreMap` marker test (testIDs preserved).
- Domain logic tests (`filterPlaces`/`sortPlaces`/`groupByCity`) remain valid.
- Verify live on the emulator: drag snaps, marker tap → card → expand, list row
  tap → same sheet, locate button, add button, status-bar insets on sheets.
