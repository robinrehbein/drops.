# Daily "Coffee to try" card — design

**Date:** 2026-06-01
**Status:** approved

## Goal

Enhance the Daily page with a card that suggests a nearby specialty coffee
spot the user hasn't visited yet, with a short editorial blurb. It's a daily
discovery prompt: stable for the whole day, rotates the next day, biased toward
places near the user's current location.

## Scope

- **Recommends a place to visit** (café / roaster / coffee shop) from the
  existing curated Places seed — not a bean to buy.
- **Display-only** card. No tap-to-detail, wishlist, or refresh action in this
  iteration. (Tap-to-detail is a cheap follow-up if desired later.)
- First real wiring of device GPS in the app, with a graceful no-permission
  fallback.

## Components

Each unit is small, single-purpose, and independently testable.

### 1. `pickDailyPlace()` — pure domain function

Location: `src/domain/daily-place.ts`

```
pickDailyPlace(places, { origin, date, max? }) -> { place, distanceKm } | null
```

- **Eligible** = `curated === true`, has a non-empty `editorialNote`, and is
  **not visited** (`userData.visitedAt` is null/absent). Wishlisted places stay
  eligible — wishlist means "want to try", which fits.
- If `origin` is provided: sort eligible by `distanceKm(origin, place)`
  (places missing lat/lng sink to the end), take the nearest `max` (default 8)
  as the candidate pool.
- If `origin` is null: candidate pool = all eligible (name-sorted for stable
  order).
- Pick **one** deterministically from `date`: hash the `YYYY-MM-DD` string to an
  index into the pool. Same place all day; different tomorrow.
- Returns the chosen place plus its `distanceKm` (only when both `origin` and
  the place's `lat/lng` exist; otherwise `null`).
- Returns `null` when the pool is empty.
- No `Math.random` / `Date.now` inside — `date` is an argument, so the function
  is fully deterministic and unit-testable.

### 2. `formatDistance(km)` — pure helper

Location: `src/domain/places.ts` (alongside `distanceKm`).

- `< 1 km` → `"850 m"` (rounded to tens of metres), `>= 1 km` → `"2.3 km"`
  (one decimal). Non-finite/negative → `"—"`.

### 3. `useDeviceLocation()` — location hook

Location: `src/features/location/hooks.ts`

- Wraps `expo-location`: `requestForegroundPermissionsAsync()` then
  `getCurrentPositionAsync()`.
- Returns `{ origin: LatLng | null }`. Returns `null` on denied permission or
  any error — never throws, never nags.
- Backed by react-query with a long `staleTime` so it resolves once per session
  and is cheap to read from the card. `retry: false`.

### 4. `useDailyPlace()` — composing hook

Location: `src/features/places/hooks.ts` (extends existing file)

- Composes `usePlaces()` + `useDeviceLocation()`, computes `today` as a
  `YYYY-MM-DD` string, and returns `pickDailyPlace(places, { origin, date })`.

### 5. `DailyPlaceCard` — UI primitive

Location: `src/ui/primitives/DailyPlaceCard.tsx`

- Styled like `CoachCard`: `Surface bg="paperDeep" padding="md" radius="md"
  bordered`.
- Label `TRY SOMETHING NEW`; heading = place name; caption = `Roaster · 2.3 km`
  (kind label, distance appended only when known); body = `editorialNote`.
- Renders `null` when there is no eligible pick (no empty box).
- Plain English strings, matching the Daily page (which does not use i18n).

### 6. Wire into Daily

Location: `app/(tabs)/index.tsx`

- Render `<DailyPlaceCard />` after the machine-readiness card, before the
  "Today, at a glance" heading.

## Data flow

Daily mounts → `useDailyPlace` → `usePlaces` (already seeded/cached) +
`useDeviceLocation` (permission/GPS, cached) → `pickDailyPlace(date)` → card.

## Error handling / edge cases

- Permission denied or GPS failure → `origin = null` → curated rotation,
  distance hidden. Silent and graceful.
- No eligible curated places → card renders nothing.
- Distance shown only when both origin and the place's `lat/lng` exist.

## Testing

- `pickDailyPlace`: stable within a day; changes across days; excludes visited;
  nearest-first pool with `origin`; null-origin fallback; empty list → null;
  distance returned only when coords + origin present.
- `formatDistance`: metre/km thresholds and the non-finite guard.
- `DailyPlaceCard`: renders a pick; renders nothing when pick is null.
- `useDeviceLocation`: uses the existing `__mocks__/expo-location.js` (denied →
  null origin).

## Verification gates

- `npm run typecheck`
- `npm test` (full suite)
- `src/domain/**` stays at 100% coverage.
