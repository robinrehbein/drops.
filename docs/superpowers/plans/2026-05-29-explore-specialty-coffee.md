# Explore — Specialty Coffee Finder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th "Explore" tab to Brewlog for discovering specialty coffee places (curated OSM seed + user-added), with a personal layer (wishlist / visited / rating / notes) and a link from beans to their source place, including a real in-app map.

**Architecture:** Two new tables — `places` (seed + user rows, unified) and `place_user_data` (personal overlay, separate so re-seeding is loss-free) — plus a `beans.source_place_id` column. Pure domain functions (`src/domain/places.ts`) drive filtering/sorting/grouping/stats; a feature repo+hooks layer (`src/features/places/`) mirrors the existing beans pattern; a bundled JSON seed is upserted once on first launch by `external_id`. Screens live under `app/(tabs)/explore/` using `react-native-maps`.

**Tech Stack:** Expo SDK 54 · Expo Router · TypeScript strict · Drizzle ORM + expo-sqlite · TanStack Query · zod · date-fns · react-native-maps · expo-location · jest@^29 + jest-expo + RNTL.

**Global gates (run after every task that touches the relevant area):**
- `npm test` — full suite, never `--passWithNoTests`.
- `npm run typecheck` — catches zod path/exactOptionalPropertyTypes drift.
- `src/domain/**` must stay at **100%** coverage (`npm run test:coverage`) after any domain change.
- `.npmrc` keeps `legacy-peer-deps=true`; `jest@^29` (not 30).

**Note on seed data:** A background research agent is producing `/tmp/germany-specialty-coffee.json`. Until it lands, use the already-produced `/tmp/stuttgart-curated.json` (rename its entries to the seed shape — see Task 14) as the initial fixture so the pipeline is testable. Swapping in the Germany file is a one-line copy later.

---

## Phase 0 — Dependencies & native config

### Task 1: Install map + location deps and dev client

**Files:**
- Modify: `package.json` (via installer)
- Modify: `app.json`

- [ ] **Step 1: Install packages**

Run:
```bash
npx expo install react-native-maps expo-location expo-dev-client
```
Expected: packages added to `package.json` `dependencies`; no peer-dep error (`.npmrc legacy-peer-deps=true` already set).

- [ ] **Step 2: Configure app.json plugins + Android Maps key placeholder**

In `app.json`, inside the `expo` object add (merge with existing keys; do not remove anything):
```json
"ios": { "supportsTablet": true },
"android": {
  "config": {
    "googleMaps": { "apiKey": "REPLACE_WITH_ANDROID_MAPS_API_KEY" }
  }
},
"plugins": [
  "expo-router",
  [
    "expo-location",
    { "locationWhenInUsePermission": "Brewlog uses your location to find specialty coffee near you." }
  ]
]
```
(If `plugins`/`ios`/`android` already exist, merge entries rather than overwrite. Keep `expo-router` if it was already present.)

- [ ] **Step 3: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore(explore): add react-native-maps, expo-location, dev-client + app.json config"
```

### Task 2: Jest mocks for native map + location

**Files:**
- Create: `__mocks__/react-native-maps.js`
- Create: `__mocks__/expo-location.js`

- [ ] **Step 1: Write the react-native-maps mock** (mirrors existing `__mocks__/@shopify/react-native-skia.js`)

`__mocks__/react-native-maps.js`:
```js
// Jest mock for react-native-maps — native map view unavailable in Node.
const React = require('react');
const { View } = require('react-native');

const MapView = ({ children, style, testID }) =>
  React.createElement(View, { style, testID: testID || 'map-view' }, children);
const Marker = ({ children, testID }) =>
  React.createElement(View, { testID: testID || 'map-marker' }, children);
const Callout = ({ children }) => React.createElement(View, null, children);

module.exports = { __esModule: true, default: MapView, Marker, Callout, PROVIDER_GOOGLE: 'google' };
```

- [ ] **Step 2: Write the expo-location mock**

`__mocks__/expo-location.js`:
```js
// Jest mock for expo-location — no native geolocation in Node.
module.exports = {
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 0, longitude: 0 } })),
};
```

- [ ] **Step 3: Verify mocks load** — add a throwaway check

Run: `npx jest --listTests >/dev/null && node -e "require('./__mocks__/react-native-maps.js'); require('./__mocks__/expo-location.js'); console.log('mocks ok')"`
Expected: prints `mocks ok`.

- [ ] **Step 4: Commit**

```bash
git add __mocks__/react-native-maps.js __mocks__/expo-location.js
git commit -m "test(explore): mock react-native-maps and expo-location for jest"
```

---

## Phase 1 — Schema & migration

### Task 3: Add `places`, `place_user_data` tables and `beans.source_place_id`

**Files:**
- Modify: `src/db/schema.ts`
- Generate: `src/db/migrations/0004_*.sql` + `meta/0004_snapshot.json` + `meta/_journal.json`
- Regenerate: `src/db/migrations/bundle.json`

- [ ] **Step 1: Add `source_place_id` to the `beans` table**

In `src/db/schema.ts`, inside the `beans` column object, after `recipeId: text('recipe_id'), ...` add:
```ts
    sourcePlaceId: text('source_place_id'), // FK → places.id; null = no source recorded
```

- [ ] **Step 2: Append the two new tables at the end of `src/db/schema.ts`**

```ts
/* Places — specialty coffee directory (seed + user-added) */
export const places = sqliteTable(
  'places',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull().default('seed'), // 'seed' | 'user'
    externalId: text('external_id'), // osmId for seed rows; upsert key
    name: text('name').notNull(),
    kind: text('kind').notNull().default('cafe'), // 'roaster' | 'coffee_shop' | 'cafe'
    city: text('city'),
    country: text('country').notNull().default('DE'),
    address: text('address'),
    lat: real('lat'),
    lng: real('lng'),
    website: text('website'),
    openingHours: text('opening_hours'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    curated: integer('curated', { mode: 'boolean' }).notNull().default(false),
    editorialNote: text('editorial_note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    byCity: index('places_city_name').on(t.city, t.name),
    byExternal: uniqueIndex('places_external_id').on(t.externalId),
    byCurated: index('places_curated').on(t.curated, t.city),
  }),
);

/* Per-place personal overlay — kept separate so re-seeding never clobbers user data */
export const placeUserData = sqliteTable(
  'place_user_data',
  {
    id: text('id').primaryKey(),
    placeId: text('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'cascade' }),
    wishlisted: integer('wishlisted', { mode: 'boolean' }).notNull().default(false),
    visitedAt: integer('visited_at', { mode: 'timestamp' }),
    rating: integer('rating'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    byPlace: uniqueIndex('place_user_data_place').on(t.placeId),
  }),
);
```
(`index` and `uniqueIndex` are already imported at the top of the file.)

- [ ] **Step 3: Generate the migration and rebundle**

Run: `npm run db:prepare`
Expected: creates `src/db/migrations/0004_*.sql`, updates `meta/`, and prints `Wrote 5 migrations to bundle.json`.

- [ ] **Step 4: Verify the generated SQL contains the new tables/column**

Run: `grep -l "place_user_data" src/db/migrations/0004_*.sql && grep "source_place_id" src/db/migrations/0004_*.sql`
Expected: the 0004 file path prints and the `source_place_id` line is found.

- [ ] **Step 5: Verify schema test + harness still pass**

Run: `npx jest tests/db -v`
Expected: PASS (the in-memory harness applies bundle.json including 0004).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "feat(schema): places + place_user_data tables, beans.source_place_id (migration 0004)"
```

---

## Phase 2 — Domain (pure, 100% coverage)

### Task 4: `distanceKm` + `placeStatus`

**Files:**
- Create: `src/domain/places.ts`
- Test: `tests/domain/places.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/domain/places.test.ts`:
```ts
import { distanceKm, placeStatus } from '@/domain/places';

describe('distanceKm', () => {
  it('is zero for identical points', () => {
    expect(distanceKm({ lat: 48.77, lng: 9.18 }, { lat: 48.77, lng: 9.18 })).toBeCloseTo(0, 5);
  });
  it('matches a known distance (Stuttgart → Munich ≈ 190 km)', () => {
    const d = distanceKm({ lat: 48.7758, lng: 9.1829 }, { lat: 48.1372, lng: 11.5756 });
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(205);
  });
});

describe('placeStatus', () => {
  it('none for missing overlay', () => {
    expect(placeStatus(null)).toBe('none');
    expect(placeStatus(undefined)).toBe('none');
  });
  it('visited wins over wishlist', () => {
    expect(placeStatus({ wishlisted: true, visitedAt: new Date() })).toBe('visited');
  });
  it('wishlist when wishlisted and not visited', () => {
    expect(placeStatus({ wishlisted: true, visitedAt: null })).toBe('wishlist');
  });
  it('none when neither', () => {
    expect(placeStatus({ wishlisted: false, visitedAt: null })).toBe('none');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/domain/places.test.ts -v`
Expected: FAIL — cannot find module `@/domain/places`.

- [ ] **Step 3: Implement**

`src/domain/places.ts`:
```ts
export type LatLng = { lat: number; lng: number };
export type PlaceStatus = 'wishlist' | 'visited' | 'none';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function placeStatus(
  u?: { wishlisted?: boolean | null; visitedAt?: unknown } | null,
): PlaceStatus {
  if (!u) return 'none';
  if (u.visitedAt) return 'visited';
  if (u.wishlisted) return 'wishlist';
  return 'none';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/domain/places.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/places.ts tests/domain/places.test.ts
git commit -m "feat(domain): distanceKm + placeStatus"
```

### Task 5: `filterPlaces`, `groupByCity`, `sortPlaces`, `placeStats`

**Files:**
- Modify: `src/domain/places.ts`
- Modify: `tests/domain/places.test.ts`

- [ ] **Step 1: Add failing tests** (append to `tests/domain/places.test.ts`)

```ts
import { filterPlaces, groupByCity, sortPlaces, placeStats } from '@/domain/places';

const P = (over: Partial<Parameters<typeof filterPlaces>[0][number]> = {}) => ({
  name: 'Café', city: 'Stuttgart', kind: 'cafe', curated: false, lat: null, lng: null, ...over,
});

describe('filterPlaces', () => {
  const list = [
    P({ name: 'Mókuska', curated: true }),
    P({ name: 'Harrys', kind: 'roaster', curated: true }),
    P({ name: 'Starbucks', city: 'Berlin' }),
  ];
  it('matches name case/diacritic-insensitively', () => {
    expect(filterPlaces(list, { query: 'mokuska' }).map((p) => p.name)).toEqual(['Mókuska']);
  });
  it('filters by kind', () => {
    expect(filterPlaces(list, { kind: 'roaster' }).map((p) => p.name)).toEqual(['Harrys']);
  });
  it('filters by city', () => {
    expect(filterPlaces(list, { city: 'Berlin' }).map((p) => p.name)).toEqual(['Starbucks']);
  });
  it('curatedOnly drops non-curated', () => {
    expect(filterPlaces(list, { curatedOnly: true }).map((p) => p.name)).toEqual(['Mókuska', 'Harrys']);
  });
  it('no filter returns all', () => {
    expect(filterPlaces(list, {})).toHaveLength(3);
    expect(filterPlaces(list)).toHaveLength(3);
  });
});

describe('groupByCity', () => {
  it('groups, sorts cities and places, defaults null city to Unknown', () => {
    const res = groupByCity([P({ name: 'B', city: 'Wien' }), P({ name: 'A', city: 'Wien' }), P({ name: 'C', city: null })]);
    expect(res.map((g) => g.city)).toEqual(['Unknown', 'Wien']);
    expect(res[1].places.map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('sortPlaces', () => {
  it('by name', () => {
    expect(sortPlaces([P({ name: 'B' }), P({ name: 'A' })], 'name').map((p) => p.name)).toEqual(['A', 'B']);
  });
  it('by distance, missing coords sink to the end', () => {
    const near = P({ name: 'near', lat: 48.78, lng: 9.18 });
    const far = P({ name: 'far', lat: 52.52, lng: 13.4 });
    const noCoord = P({ name: 'noCoord' });
    const res = sortPlaces([far, noCoord, near], 'distance', { lat: 48.78, lng: 9.18 });
    expect(res.map((p) => p.name)).toEqual(['near', 'far', 'noCoord']);
  });
  it('by distance without origin falls back to name', () => {
    expect(sortPlaces([P({ name: 'B' }), P({ name: 'A' })], 'distance').map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('placeStats', () => {
  it('counts visited and wishlist (visited not double-counted)', () => {
    expect(placeStats([
      { wishlisted: true, visitedAt: null },
      { wishlisted: true, visitedAt: new Date() },
      { wishlisted: false, visitedAt: null },
    ])).toEqual({ visited: 1, wishlist: 1 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/domain/places.test.ts -v`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement** (append to `src/domain/places.ts`)

```ts
export type PlaceLike = {
  name: string;
  city: string | null;
  kind: string;
  curated: boolean;
  lat: number | null;
  lng: number | null;
};

const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function filterPlaces<T extends PlaceLike>(
  places: T[],
  f: { query?: string; kind?: string; city?: string; curatedOnly?: boolean } = {},
): T[] {
  const q = f.query ? norm(f.query) : '';
  return places.filter((p) => {
    if (q && !norm(p.name).includes(q)) return false;
    if (f.kind && p.kind !== f.kind) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.curatedOnly && !p.curated) return false;
    return true;
  });
}

export function groupByCity<T extends PlaceLike>(places: T[]): { city: string; places: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of places) {
    const city = p.city ?? 'Unknown';
    const arr = map.get(city) ?? [];
    arr.push(p);
    map.set(city, arr);
  }
  return [...map.entries()]
    .map(([city, ps]) => ({ city, places: [...ps].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

function distOrInf(p: PlaceLike, origin: LatLng): number {
  if (p.lat == null || p.lng == null) return Number.POSITIVE_INFINITY;
  return distanceKm(origin, { lat: p.lat, lng: p.lng });
}

export function sortPlaces<T extends PlaceLike>(
  places: T[],
  by: 'name' | 'distance',
  origin?: LatLng,
): T[] {
  const copy = [...places];
  if (by === 'distance' && origin) {
    return copy.sort((a, b) => distOrInf(a, origin) - distOrInf(b, origin));
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function placeStats(
  overlay: { wishlisted?: boolean | null; visitedAt?: unknown }[],
): { visited: number; wishlist: number } {
  let visited = 0;
  let wishlist = 0;
  for (const u of overlay) {
    if (u.visitedAt) visited++;
    else if (u.wishlisted) wishlist++;
  }
  return { visited, wishlist };
}
```

- [ ] **Step 4: Run to verify it passes + coverage gate**

Run: `npx jest tests/domain/places.test.ts -v && npm run test:coverage -- --collectCoverageFrom='src/domain/places.ts'`
Expected: PASS; `src/domain/places.ts` at 100% lines/branches/functions.

- [ ] **Step 5: Commit**

```bash
git add src/domain/places.ts tests/domain/places.test.ts
git commit -m "feat(domain): filterPlaces, groupByCity, sortPlaces, placeStats"
```

### Task 6: Validators (`validatePlace`, `validateUserData`)

**Files:**
- Create: `src/domain/validators/place.ts`
- Test: `tests/domain/validators/place.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/domain/validators/place.test.ts`:
```ts
import { validatePlace, validateUserData, placeKindSchema } from '@/domain/validators/place';

describe('validatePlace', () => {
  it('accepts a minimal user place', () => {
    const r = validatePlace({ name: 'Misch Misch', kind: 'cafe' });
    expect(r.ok).toBe(true);
  });
  it('rejects empty name', () => {
    const r = validatePlace({ name: '   ', kind: 'cafe' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0].message).toMatch(/name is required/);
  });
  it('rejects bad kind', () => {
    expect(validatePlace({ name: 'X', kind: 'bar' }).ok).toBe(false);
  });
  it('rejects out-of-range coords', () => {
    expect(validatePlace({ name: 'X', kind: 'cafe', lat: 200, lng: 0 }).ok).toBe(false);
  });
  it('exposes the kind enum', () => {
    expect(placeKindSchema.options).toEqual(['roaster', 'coffee_shop', 'cafe']);
  });
});

describe('validateUserData', () => {
  it('accepts a rating in range', () => {
    expect(validateUserData({ rating: 4, notes: 'great flat white' }).ok).toBe(true);
  });
  it('rejects rating out of range', () => {
    expect(validateUserData({ rating: 9 }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/domain/validators/place.test.ts -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/domain/validators/place.ts`:
```ts
import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const placeKindSchema = z.enum(['roaster', 'coffee_shop', 'cafe']);

export const placeInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(160),
  kind: placeKindSchema,
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).optional(),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  website: z.string().trim().url().max(300).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
});
export type PlaceInput = z.infer<typeof placeInputSchema>;

export const userDataInputSchema = z.object({
  wishlisted: z.boolean().optional(),
  visitedAt: z.date().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});
export type UserDataInput = z.infer<typeof userDataInputSchema>;

export type PlaceIssue = { path: (string | number)[]; message: string };

function toResult<T>(parsed: z.SafeParseReturnType<unknown, T>): Result<T, PlaceIssue[]> {
  if (parsed.success) return ok(parsed.data);
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}

export function validatePlace(input: unknown): Result<PlaceInput, PlaceIssue[]> {
  return toResult(placeInputSchema.safeParse(input));
}

export function validateUserData(input: unknown): Result<UserDataInput, PlaceIssue[]> {
  return toResult(userDataInputSchema.safeParse(input));
}
```

- [ ] **Step 4: Run to verify it passes + coverage**

Run: `npx jest tests/domain/validators/place.test.ts -v && npm run test:coverage`
Expected: PASS; domain coverage stays 100%.

- [ ] **Step 5: Commit**

```bash
git add src/domain/validators/place.ts tests/domain/validators/place.test.ts
git commit -m "feat(domain): place + user-data validators"
```

---

## Phase 3 — Feature layer (repo + hooks)

### Task 7: Place types + repo skeleton (add/get/list/cities)

**Files:**
- Create: `src/features/places/types.ts`
- Create: `src/features/places/repo.ts`
- Test: `tests/features/places/repo.test.ts`

- [ ] **Step 1: Write types**

`src/features/places/types.ts`:
```ts
import type { places, placeUserData } from '@/db/schema';

export type PlaceRow = typeof places.$inferSelect;
export type PlaceInsert = typeof places.$inferInsert;
export type PlaceUserDataRow = typeof placeUserData.$inferSelect;
export type PlaceWithUserData = PlaceRow & { userData: PlaceUserDataRow | null };

/** One entry of the bundled seed JSON (see scripts/build-places-seed.js). */
export type SeedPlace = {
  osmId: string;
  name: string;
  kind: 'roaster' | 'coffee_shop' | 'cafe';
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  openingHours?: string;
  tags?: string[];
  curated?: boolean;
  editorialNote?: string;
};
```

- [ ] **Step 2: Write the failing repo test**

`tests/features/places/repo.test.ts`:
```ts
import { makePlacesRepo } from '@/features/places/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('places repo — basics', () => {
  it('adds a user place and reads it back', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'Misch Misch', kind: 'cafe', city: 'Stuttgart' });
    expect(p.source).toBe('user');
    expect(p.id).toBeTruthy();
    const got = await repo.getPlace(p.id);
    expect(got?.name).toBe('Misch Misch');
    expect(got?.userData).toBeNull();
  });

  it('lists places sorted by name and lists distinct cities', async () => {
    const repo = makePlacesRepo(makeTestDb());
    await repo.addPlace({ name: 'Zebra', kind: 'cafe', city: 'Berlin' });
    await repo.addPlace({ name: 'Alpha', kind: 'cafe', city: 'Stuttgart' });
    const list = await repo.listPlaces();
    expect(list.map((p) => p.name)).toEqual(['Alpha', 'Zebra']);
    expect(await repo.listCities()).toEqual(['Berlin', 'Stuttgart']);
  });

  it('rejects an invalid place', async () => {
    const repo = makePlacesRepo(makeTestDb());
    await expect(repo.addPlace({ name: '', kind: 'cafe' })).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx jest tests/features/places/repo.test.ts -v`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the repo skeleton**

`src/features/places/repo.ts`:
```ts
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { placeUserData, places } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import { type PlaceInput, type UserDataInput, validatePlace, validateUserData } from '@/domain/validators/place';
import type { PlaceRow, PlaceUserDataRow, PlaceWithUserData, SeedPlace } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type PlacesRepo = {
  addPlace: (input: PlaceInput) => Promise<PlaceRow>;
  getPlace: (id: string) => Promise<PlaceWithUserData | null>;
  listPlaces: () => Promise<PlaceWithUserData[]>;
  listCities: () => Promise<string[]>;
  listWishlist: () => Promise<PlaceWithUserData[]>;
  listVisited: () => Promise<PlaceWithUserData[]>;
  setUserData: (placeId: string, patch: UserDataInput) => Promise<PlaceUserDataRow>;
  toggleWishlist: (placeId: string) => Promise<PlaceUserDataRow>;
  upsertSeed: (seed: SeedPlace[]) => Promise<number>;
};

function withUserData(row: { places: PlaceRow; place_user_data: PlaceUserDataRow | null }): PlaceWithUserData {
  return { ...row.places, userData: row.place_user_data };
}

export function makePlacesRepo(db: Db): PlacesRepo {
  async function rowsWithUserData(where?: ReturnType<typeof and>): Promise<PlaceWithUserData[]> {
    const q = db
      .select()
      .from(places)
      .leftJoin(placeUserData, eq(placeUserData.placeId, places.id))
      .orderBy(asc(places.name));
    const rows = where ? await q.where(where) : await q;
    return rows.map(withUserData);
  }

  return {
    async addPlace(input) {
      const v = validatePlace(input);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const row: PlaceRow = {
        id: uuid(),
        source: 'user',
        externalId: null,
        name: v.value.name,
        kind: v.value.kind,
        city: v.value.city ?? null,
        country: v.value.country ?? 'DE',
        address: v.value.address ?? null,
        lat: v.value.lat ?? null,
        lng: v.value.lng ?? null,
        website: v.value.website ?? null,
        openingHours: null,
        tags: v.value.tags ?? null,
        curated: false,
        editorialNote: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(places).values(row);
      return row;
    },

    async getPlace(id) {
      const rows = await rowsWithUserData(and(eq(places.id, id)));
      return rows[0] ?? null;
    },

    async listPlaces() {
      return rowsWithUserData();
    },

    async listCities() {
      const rows = await db
        .selectDistinct({ city: places.city })
        .from(places)
        .where(isNotNull(places.city))
        .orderBy(asc(places.city));
      return rows.map((r) => r.city).filter((c): c is string => !!c);
    },

    async listWishlist() {
      return rowsWithUserData(and(eq(placeUserData.wishlisted, true), isNull(placeUserData.visitedAt)));
    },

    async listVisited() {
      return rowsWithUserData(isNotNull(placeUserData.visitedAt));
    },

    async setUserData(placeId, patch) {
      const v = validateUserData(patch);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const existing = await db.select().from(placeUserData).where(eq(placeUserData.placeId, placeId));
      if (existing[0]) {
        const updated: PlaceUserDataRow = {
          ...existing[0],
          ...normalizeUserPatch(v.value),
          updatedAt: now,
        };
        await db.update(placeUserData).set(updated).where(eq(placeUserData.placeId, placeId));
        return updated;
      }
      const row: PlaceUserDataRow = {
        id: uuid(),
        placeId,
        wishlisted: v.value.wishlisted ?? false,
        visitedAt: v.value.visitedAt ?? null,
        rating: v.value.rating ?? null,
        notes: v.value.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(placeUserData).values(row);
      return row;
    },

    async toggleWishlist(placeId) {
      const existing = await db.select().from(placeUserData).where(eq(placeUserData.placeId, placeId));
      const next = !(existing[0]?.wishlisted ?? false);
      return this.setUserData(placeId, { wishlisted: next });
    },

    async upsertSeed(seed) {
      const now = new Date();
      let count = 0;
      for (const s of seed) {
        const existing = await db.select().from(places).where(eq(places.externalId, s.osmId));
        const facts = {
          name: s.name,
          kind: s.kind,
          city: s.city ?? null,
          country: s.country ?? 'DE',
          address: s.address ?? null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          website: s.website ?? null,
          openingHours: s.openingHours ?? null,
          tags: s.tags ?? null,
          curated: s.curated ?? false,
          editorialNote: s.editorialNote ?? null,
          updatedAt: now,
        };
        if (existing[0]) {
          await db.update(places).set(facts).where(eq(places.id, existing[0].id));
        } else {
          await db.insert(places).values({ id: uuid(), source: 'seed', externalId: s.osmId, createdAt: now, ...facts });
        }
        count++;
      }
      return count;
    },
  };
}

function normalizeUserPatch(patch: UserDataInput): Partial<PlaceUserDataRow> {
  const out: Partial<PlaceUserDataRow> = {};
  if (patch.wishlisted !== undefined) out.wishlisted = patch.wishlisted;
  if (patch.visitedAt !== undefined) out.visitedAt = patch.visitedAt;
  if (patch.rating !== undefined) out.rating = patch.rating;
  if (patch.notes !== undefined) out.notes = patch.notes;
  return out;
}
```
(`sql` import is unused for now but harmless; remove it if `npm run lint` complains — prefer removing to satisfy eslint.)

- [ ] **Step 5: Run to verify it passes**

Run: `npx jest tests/features/places/repo.test.ts -v`
Expected: PASS. If lint flags the unused `sql`/`isNull` import, delete the unused name and re-run.

- [ ] **Step 6: Commit**

```bash
git add src/features/places/types.ts src/features/places/repo.ts tests/features/places/repo.test.ts
git commit -m "feat(places): repo (add/get/list/cities/user-data) + types"
```

### Task 8: Repo — overlay, seed upsert, bean link tests

**Files:**
- Modify: `src/features/places/repo.ts` (add `linkBean`)
- Modify: `tests/features/places/repo.test.ts`

- [ ] **Step 1: Add failing tests** (append)

```ts
import { beans } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('places repo — overlay & seed', () => {
  it('setUserData upserts then updates the same row', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    await repo.setUserData(p.id, { wishlisted: true });
    await repo.setUserData(p.id, { rating: 5, notes: 'top' });
    const got = await repo.getPlace(p.id);
    expect(got?.userData?.wishlisted).toBe(true);
    expect(got?.userData?.rating).toBe(5);
    expect(await repo.listWishlist()).toHaveLength(1);
  });

  it('toggleWishlist flips state', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    expect((await repo.toggleWishlist(p.id)).wishlisted).toBe(true);
    expect((await repo.toggleWishlist(p.id)).wishlisted).toBe(false);
  });

  it('visited shows in listVisited and not in listWishlist', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    await repo.setUserData(p.id, { wishlisted: true, visitedAt: new Date() });
    expect(await repo.listVisited()).toHaveLength(1);
    expect(await repo.listWishlist()).toHaveLength(0);
  });

  it('upsertSeed inserts new, updates facts, preserves user overlay', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    await repo.upsertSeed([{ osmId: 'n1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', curated: true }]);
    const list1 = await repo.listPlaces();
    expect(list1).toHaveLength(1);
    await repo.setUserData(list1[0].id, { wishlisted: true });
    // Re-seed with updated address — must not wipe wishlist
    await repo.upsertSeed([{ osmId: 'n1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', address: 'Johannesstr. 34', curated: true }]);
    const list2 = await repo.listPlaces();
    expect(list2).toHaveLength(1);
    expect(list2[0].address).toBe('Johannesstr. 34');
    expect(list2[0].userData?.wishlisted).toBe(true);
  });

  it('linkBean sets beans.source_place_id', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    const p = await repo.addPlace({ name: 'Roaster', kind: 'roaster' });
    const now = new Date();
    await db.insert(beans).values({ id: 'b1', name: 'Bean', status: 'active', createdAt: now, updatedAt: now } as never);
    await repo.linkBean('b1', p.id);
    const rows = await db.select().from(beans).where(eq(beans.id, 'b1'));
    expect(rows[0].sourcePlaceId).toBe(p.id);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/features/places/repo.test.ts -v`
Expected: FAIL — `linkBean` not a function.

- [ ] **Step 3: Implement `linkBean`** — add to the `PlacesRepo` type and the returned object in `src/features/places/repo.ts`

Add to the type:
```ts
  linkBean: (beanId: string, placeId: string | null) => Promise<void>;
```
Add the import at the top: `import { beans } from '@/db/schema';` (extend the existing `@/db/schema` import line to include `beans`).
Add the method (before `upsertSeed`):
```ts
    async linkBean(beanId, placeId) {
      await db.update(beans).set({ sourcePlaceId: placeId, updatedAt: new Date() }).where(eq(beans.id, beanId));
    },
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/features/places/repo.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/places/repo.ts tests/features/places/repo.test.ts
git commit -m "feat(places): seed upsert preserves overlay; linkBean; overlay queries"
```

### Task 9: Register repo in the provider

**Files:**
- Modify: `src/features/_provider/repos.ts`

- [ ] **Step 1: Wire it in**

In `src/features/_provider/repos.ts`:
- Add import: `import { makePlacesRepo, type PlacesRepo } from '@/features/places/repo';`
- Add to `Repos` type: `places: PlacesRepo;`
- Add to the `getRepos()` object: `places: makePlacesRepo(db),`

- [ ] **Step 2: Verify typecheck + full suite**

Run: `npm run typecheck && npm test`
Expected: no type errors; all suites pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/_provider/repos.ts
git commit -m "feat(places): register places repo in provider"
```

### Task 10: Hooks

**Files:**
- Create: `src/features/places/hooks.ts`
- Test: `tests/features/places/hooks.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/features/places/hooks.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { usePlaces, useAddPlace, useToggleWishlist } from '@/features/places/hooks';
import { makeTestDb } from '@tests/helpers/test-db';

function wrapper(repos: { places: ReturnType<typeof makePlacesRepo> }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={repos as never}>{children}</RepoProvider>
    </QueryClientProvider>
  );
}

it('usePlaces reflects an added place and wishlist toggle', async () => {
  const repos = { places: makePlacesRepo(makeTestDb()) };
  const w = wrapper(repos);
  const add = renderHook(() => useAddPlace(), { wrapper: w });
  await act(async () => { await add.result.current.mutateAsync({ name: 'Misch', kind: 'cafe', city: 'Stuttgart' }); });

  const list = renderHook(() => usePlaces(), { wrapper: w });
  await waitFor(() => expect(list.result.current.data?.length).toBe(1));

  const id = list.result.current.data![0].id;
  const toggle = renderHook(() => useToggleWishlist(), { wrapper: w });
  await act(async () => { await toggle.result.current.mutateAsync(id); });
  await waitFor(() => expect(list.result.current.data![0].userData?.wishlisted).toBe(true));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/features/places/hooks.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/places/hooks.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { PlaceInput, UserDataInput } from '@/domain/validators/place';

const KEYS = {
  all: ['places'] as const,
  one: (id: string) => ['place', id] as const,
  cities: ['places', 'cities'] as const,
  wishlist: ['places', 'wishlist'] as const,
  visited: ['places', 'visited'] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: KEYS.all });
  void qc.invalidateQueries({ queryKey: KEYS.wishlist });
  void qc.invalidateQueries({ queryKey: KEYS.visited });
  if (id) void qc.invalidateQueries({ queryKey: KEYS.one(id) });
}

export function usePlaces() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.all, queryFn: () => places.listPlaces() });
}
export function usePlace(id: string) {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => places.getPlace(id), enabled: !!id });
}
export function useCities() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.cities, queryFn: () => places.listCities() });
}
export function useWishlist() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.wishlist, queryFn: () => places.listWishlist() });
}
export function useVisited() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.visited, queryFn: () => places.listVisited() });
}
export function useAddPlace() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: PlaceInput) => places.addPlace(input), onSuccess: () => invalidateAll(qc) });
}
export function useToggleWishlist() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => places.toggleWishlist(id), onSuccess: (_, id) => invalidateAll(qc, id) });
}
export function useSetUserData() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserDataInput }) => places.setUserData(id, patch),
    onSuccess: (_, { id }) => invalidateAll(qc, id),
  });
}
export function useLinkBeanSource() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ beanId, placeId }: { beanId: string; placeId: string | null }) => places.linkBean(beanId, placeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['beans'] });
    },
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/features/places/hooks.test.tsx -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/places/hooks.ts tests/features/places/hooks.test.tsx
git commit -m "feat(places): TanStack Query hooks"
```

---

## Phase 4 — Seed pipeline

### Task 11: Seed build script + checked-in seed JSON

**Files:**
- Create: `scripts/build-places-seed.js`
- Create: `src/features/places/seed/places.seed.json`
- Modify: `package.json` (script entry)

- [ ] **Step 1: Write the build script**

`scripts/build-places-seed.js`:
```js
/* Validates a raw research export and writes the bundled seed JSON.
   Usage: node scripts/build-places-seed.js <input.json>
   Input may be either { places: [...] } or a bare array. */
const fs = require('fs');
const path = require('path');

const inputArg = process.argv[2] || '/tmp/germany-specialty-coffee.json';
const raw = JSON.parse(fs.readFileSync(inputArg, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.places || [];

const KINDS = new Set(['roaster', 'coffee_shop', 'cafe']);
const seed = [];
for (const p of list) {
  const osmId = p.osmId || p.externalId;
  if (!osmId || !p.name) continue;
  const kind = KINDS.has(p.kind) ? p.kind : 'cafe';
  const lat = typeof p.lat === 'number' ? p.lat : undefined; // OSM exports use `lat`
  const lng = typeof p.lng === 'number' ? p.lng : typeof p.lon === 'number' ? p.lon : undefined; // `lng` or OSM `lon`
  seed.push({
    osmId: String(osmId),
    name: p.name,
    kind,
    ...(p.city ? { city: p.city } : {}),
    ...(p.country ? { country: p.country } : {}),
    ...(p.address ? { address: p.address } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(p.website ? { website: p.website } : {}),
    ...(p.openingHours ? { openingHours: p.openingHours } : {}),
    ...(Array.isArray(p.tags) ? { tags: p.tags } : {}),
    ...(p.curated ? { curated: true } : {}),
    ...(p.editorialNote ? { editorialNote: p.editorialNote } : {}),
  });
}

const out = {
  attribution: '© OpenStreetMap contributors (ODbL)',
  generatedFor: 'brewlog Explore seed',
  total: seed.length,
  curatedCount: seed.filter((s) => s.curated).length,
  places: seed,
};
const dest = path.join(__dirname, '..', 'src', 'features', 'places', 'seed', 'places.seed.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`Wrote ${seed.length} places (${out.curatedCount} curated) → ${dest}`);
```

- [ ] **Step 2: Build the seed from the Stuttgart sample (until Germany file lands)**

Run: `node scripts/build-places-seed.js /tmp/stuttgart-curated.json`
Expected: prints `Wrote N places (8 curated) → .../places.seed.json` and the file exists.

> If `/tmp/stuttgart-curated.json` is gone, create a 2-entry fallback by writing `src/features/places/seed/places.seed.json` directly:
> ```json
> { "attribution": "© OpenStreetMap contributors (ODbL)", "generatedFor": "brewlog Explore seed", "total": 2, "curatedCount": 2,
>   "places": [
>     { "osmId": "n1", "name": "Mókuska Kaffeerösterei", "kind": "cafe", "city": "Stuttgart", "address": "Johannesstr. 34", "lat": 48.769, "lng": 9.165, "curated": true, "editorialNote": "Specialty pioneer" },
>     { "osmId": "n2", "name": "Kaffeerakete", "kind": "coffee_shop", "city": "Stuttgart", "lat": 48.772, "lng": 9.16, "curated": true, "editorialNote": "Filter + espresso" }
>   ] }
> ```

- [ ] **Step 3: Add npm script**

In `package.json` `scripts`, add: `"places:seed": "node scripts/build-places-seed.js"`.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-places-seed.js src/features/places/seed/places.seed.json package.json
git commit -m "feat(places): seed build script + initial bundled seed (OSM/ODbL)"
```

### Task 12: `seedPlacesIfNeeded` + bootstrap wiring

**Files:**
- Create: `src/features/places/seed.ts`
- Test: `tests/features/places/seed.test.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Write the failing test**

`tests/features/places/seed.test.ts`:
```ts
import { makePlacesRepo } from '@/features/places/repo';
import { seedPlacesIfNeeded } from '@/features/places/seed';
import { makeTestDb } from '@tests/helpers/test-db';

it('seeds once and is idempotent', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const n1 = await seedPlacesIfNeeded(repo);
  expect(n1).toBeGreaterThan(0);
  const n2 = await seedPlacesIfNeeded(repo);
  expect(n2).toBe(0); // already seeded → no-op
  expect((await repo.listPlaces()).length).toBe(n1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/features/places/seed.test.ts -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/features/places/seed.ts`:
```ts
import type { PlacesRepo } from './repo';
import seedData from './seed/places.seed.json';
import type { SeedPlace } from './types';

/** Imports the bundled seed once. Returns number of rows seeded (0 if already present). */
export async function seedPlacesIfNeeded(repo: PlacesRepo): Promise<number> {
  const existing = await repo.listPlaces();
  if (existing.some((p) => p.source === 'seed')) return 0;
  const places = (seedData as { places: SeedPlace[] }).places;
  return repo.upsertSeed(places);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/features/places/seed.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Wire into bootstrap** — in `app/_layout.tsx`, change the migration effect to seed afterwards:

Replace:
```ts
    runMigrations()
      .then(() => setMigrated(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
```
with:
```ts
    runMigrations()
      .then(async () => {
        const { getRepos } = await import('@/features/_provider/repos');
        const { seedPlacesIfNeeded } = await import('@/features/places/seed');
        await seedPlacesIfNeeded(getRepos().places);
      })
      .then(() => setMigrated(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
```

- [ ] **Step 6: Verify full suite + typecheck**

Run: `npm run typecheck && npm test`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/features/places/seed.ts tests/features/places/seed.test.ts app/_layout.tsx
git commit -m "feat(places): seed-on-first-launch + idempotent guard"
```

### Task 13: tsconfig — allow JSON import (only if typecheck failed in Task 12)

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1:** If `npm run typecheck` complained about importing `places.seed.json`, ensure `"resolveJsonModule": true` is in `tsconfig.json` `compilerOptions` (jest-expo/expo base usually enables it). Add it if missing.
- [ ] **Step 2:** Run `npm run typecheck` → expected: no errors.
- [ ] **Step 3:** Commit if changed:
```bash
git add tsconfig.json && git commit -m "chore: enable resolveJsonModule for seed import"
```

---

## Phase 5 — UI primitives

> Match the "Earthy Forest" theme. Read `src/ui/primitives/Text.tsx` and `src/ui/theme/useTheme.ts` first to mirror the `Text` variants and `useTheme()` shape. Use existing primitives (`Text`, theme colors `t.colors.forest|paper|paperEdge|ink|inkFaint`).

### Task 14: `StatusBadge` + `RatingStars`

**Files:**
- Create: `src/ui/primitives/StatusBadge.tsx`
- Create: `src/ui/primitives/RatingStars.tsx`
- Test: `tests/ui/primitives/StatusBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/ui/primitives/StatusBadge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

it('renders the curated label', () => {
  render(<ThemeProvider><StatusBadge variant="curated" /></ThemeProvider>);
  expect(screen.getByText(/curated/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/primitives/StatusBadge.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/ui/primitives/StatusBadge.tsx`:
```tsx
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export type BadgeVariant = 'curated' | 'visited' | 'wishlist';

const LABEL: Record<BadgeVariant, string> = {
  curated: 'Curated',
  visited: 'Visited',
  wishlist: 'Wishlist',
};

export function StatusBadge({ variant }: { variant: BadgeVariant }) {
  const t = useTheme();
  const bg =
    variant === 'curated' ? t.colors.forest : variant === 'visited' ? t.colors.ink : t.colors.paperEdge;
  const fg = variant === 'wishlist' ? t.colors.ink : t.colors.paper;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text variant="caption" style={{ color: fg }}>{LABEL[variant]}</Text>
    </View>
  );
}
```

`src/ui/primitives/RatingStars.tsx`:
```tsx
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
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
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} testID={`star-${n}`}>
          <Text variant="title" style={{ color: (value ?? 0) >= n ? t.colors.forest : t.colors.inkFaint }}>
            {(value ?? 0) >= n ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```
(If `useTheme()` exposes different color keys than `forest|ink|inkFaint|paper|paperEdge`, adjust to the real keys — read `src/ui/theme/useTheme.ts`.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/ui/primitives/StatusBadge.test.tsx -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives/StatusBadge.tsx src/ui/primitives/RatingStars.tsx tests/ui/primitives/StatusBadge.test.tsx
git commit -m "feat(ui): StatusBadge + RatingStars primitives"
```

### Task 15: `PlaceCard`

**Files:**
- Create: `src/ui/primitives/PlaceCard.tsx`
- Test: `tests/ui/primitives/PlaceCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/ui/primitives/PlaceCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { PlaceCard } from '@/ui/primitives/PlaceCard';

const place = { id: 'p1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', curated: true, address: 'Johannesstr. 34', userData: null };

it('shows name and fires onPress', () => {
  const onPress = jest.fn();
  render(<ThemeProvider><PlaceCard place={place as never} onPress={onPress} /></ThemeProvider>);
  expect(screen.getByText('Mókuska')).toBeTruthy();
  fireEvent.press(screen.getByText('Mókuska'));
  expect(onPress).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/primitives/PlaceCard.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/ui/primitives/PlaceCard.tsx`:
```tsx
import { Pressable, View } from 'react-native';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { StatusBadge } from '@/ui/primitives/StatusBadge';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KIND_LABEL: Record<string, string> = { roaster: 'Roaster', coffee_shop: 'Coffee shop', cafe: 'Café' };

export function PlaceCard({ place, onPress }: { place: PlaceWithUserData; onPress: () => void }) {
  const t = useTheme();
  const status = placeStatus(place.userData);
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: t.colors.paper, borderColor: t.colors.paperEdge, borderWidth: 1, borderRadius: 14, padding: 14, marginVertical: 6 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title">{place.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {place.curated ? <StatusBadge variant="curated" /> : null}
          {status !== 'none' ? <StatusBadge variant={status} /> : null}
        </View>
      </View>
      <Text variant="caption" style={{ color: t.colors.inkFaint, marginTop: 4 }}>
        {KIND_LABEL[place.kind] ?? place.kind}{place.address ? ` · ${place.address}` : ''}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest tests/ui/primitives/PlaceCard.test.tsx -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives/PlaceCard.tsx tests/ui/primitives/PlaceCard.test.tsx
git commit -m "feat(ui): PlaceCard primitive"
```

---

## Phase 6 — Screens & navigation

### Task 16: Add the Explore tab + stack

**Files:**
- Create: `app/(tabs)/explore/_layout.tsx`
- Create: `app/(tabs)/explore/index.tsx` (placeholder, fleshed out in Task 17)
- Modify: `app/(tabs)/_layout.tsx`
- Check: `src/ui/icons/line.tsx` for a map/pin icon name

- [ ] **Step 1: Confirm an icon exists**

Run: `grep -oE "'[a-z]+'" src/ui/icons/line.tsx | sort -u | head -40`
Expected: a list of `IconName`s. Pick a pin/map-like one (e.g. `'pin'`, `'map'`, `'compass'`). If none fits, add one following the existing icon pattern in that file (its own micro-step) — reuse an existing glyph name otherwise.

- [ ] **Step 2: Create the stack layout** (mirrors `app/(tabs)/care/_layout.tsx`)

`app/(tabs)/explore/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create a temporary index**

`app/(tabs)/explore/index.tsx`:
```tsx
import { View } from 'react-native';
import { Text } from '@/ui/primitives/Text';

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="title">Explore</Text>
    </View>
  );
}
```

- [ ] **Step 4: Register the tab** — in `app/(tabs)/_layout.tsx`, after the `care` `<Tabs.Screen>` add:
```tsx
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: tabIcon('pin') }} />
```
(Use the icon name confirmed in Step 1.)

- [ ] **Step 5: Verify it renders in tests/typecheck**

Run: `npm run typecheck && npx jest tests/smoke.test.ts -v`
Expected: no type errors; smoke test passes (or is unaffected).

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/explore" "app/(tabs)/_layout.tsx"
git commit -m "feat(explore): 5th tab + stack scaffold"
```

### Task 17: Explore index — list mode (search, filter chips, city sections, passport stat)

**Files:**
- Modify: `app/(tabs)/explore/index.tsx`
- Create: `src/ui/screens/ExploreScreen.tsx`
- Test: `tests/ui/screens/ExploreScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/ui/screens/ExploreScreen.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { ExploreScreen } from '@/ui/screens/ExploreScreen';
import { makeTestDb } from '@tests/helpers/test-db';

async function setup() {
  const repo = makePlacesRepo(makeTestDb());
  await repo.upsertSeed([
    { osmId: 'n1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', curated: true },
    { osmId: 'n2', name: 'Starbucks', kind: 'cafe', city: 'Stuttgart', curated: false },
  ]);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}>
        <ThemeProvider>{children}</ThemeProvider>
      </RepoProvider>
    </QueryClientProvider>
  );
  return { wrap };
}

it('lists seeded places and filters by search', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  expect(screen.getByText('Starbucks')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'mok');
  await waitFor(() => expect(screen.queryByText('Starbucks')).toBeNull());
  expect(screen.getByText('Mókuska')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/screens/ExploreScreen.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the screen**

`src/ui/screens/ExploreScreen.tsx`:
```tsx
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { filterPlaces, groupByCity, placeStats } from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export function ExploreScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data: places = [] } = usePlaces();
  const [query, setQuery] = useState('');
  const [curatedOnly, setCuratedOnly] = useState(false);

  const stats = useMemo(() => placeStats(places.map((p) => p.userData ?? {})), [places]);
  const groups = useMemo(
    () => groupByCity(filterPlaces(places, { query, curatedOnly })),
    [places, query, curatedOnly],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.paper }} contentContainerStyle={{ padding: 16 }}>
      <Text variant="title">Explore</Text>
      <Text variant="caption" style={{ color: t.colors.inkFaint, marginBottom: 12 }}>
        {stats.visited} visited · {stats.wishlist} wishlist
      </Text>

      <TextInput
        placeholder="Search cafés…"
        value={query}
        onChangeText={setQuery}
        style={{ borderWidth: 1, borderColor: t.colors.paperEdge, borderRadius: 10, padding: 10, marginBottom: 10 }}
      />

      <Pressable
        onPress={() => setCuratedOnly((v) => !v)}
        style={{
          alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12,
          backgroundColor: curatedOnly ? t.colors.forest : t.colors.paperEdge,
        }}
      >
        <Text variant="caption" style={{ color: curatedOnly ? t.colors.paper : t.colors.ink }}>Curated only</Text>
      </Pressable>

      {groups.map((g) => (
        <View key={g.city} style={{ marginBottom: 16 }}>
          <Text variant="caption" style={{ color: t.colors.inkFaint, marginBottom: 4 }}>{g.city}</Text>
          {g.places.map((p) => (
            <PlaceCard key={p.id} place={p} onPress={() => router.push(`/explore/${p.id}`)} />
          ))}
        </View>
      ))}

      <Text variant="caption" style={{ color: t.colors.inkFaint, marginTop: 12 }}>
        © OpenStreetMap contributors (ODbL)
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Point the route at the screen** — replace `app/(tabs)/explore/index.tsx` contents:
```tsx
export { ExploreScreen as default } from '@/ui/screens/ExploreScreen';
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx jest tests/ui/screens/ExploreScreen.test.tsx -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/ExploreScreen.tsx "app/(tabs)/explore/index.tsx" tests/ui/screens/ExploreScreen.test.tsx
git commit -m "feat(explore): list mode — search, curated filter, city sections, passport stat"
```

### Task 18: Explore index — map mode toggle

**Files:**
- Modify: `src/ui/screens/ExploreScreen.tsx`
- Create: `src/ui/screens/ExploreMap.tsx`
- Test: `tests/ui/screens/ExploreMap.test.tsx`

- [ ] **Step 1: Write the failing test** (map is mocked → renders markers as Views)

`tests/ui/screens/ExploreMap.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { ExploreMap } from '@/ui/screens/ExploreMap';

const places = [
  { id: 'p1', name: 'A', lat: 48.77, lng: 9.18, curated: true, userData: null },
  { id: 'p2', name: 'B', lat: null, lng: null, curated: false, userData: null },
];

it('renders a marker per place with coordinates', () => {
  render(<ThemeProvider><ExploreMap places={places as never} onSelect={() => {}} /></ThemeProvider>);
  expect(screen.getByTestId('map-view')).toBeTruthy();
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1); // p2 has no coords
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/screens/ExploreMap.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the map component**

`src/ui/screens/ExploreMap.tsx`:
```tsx
import MapView, { Marker } from 'react-native-maps';

import type { PlaceWithUserData } from '@/features/places/types';

export function ExploreMap({
  places,
  onSelect,
}: {
  places: PlaceWithUserData[];
  onSelect: (id: string) => void;
}) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const first = withCoords[0];
  return (
    <MapView
      style={{ flex: 1 }}
      testID="map-view"
      initialRegion={
        first
          ? { latitude: first.lat!, longitude: first.lng!, latitudeDelta: 0.2, longitudeDelta: 0.2 }
          : { latitude: 51.16, longitude: 10.45, latitudeDelta: 6, longitudeDelta: 6 }
      }
    >
      {withCoords.map((p) => (
        <Marker
          key={p.id}
          testID="map-marker"
          coordinate={{ latitude: p.lat!, longitude: p.lng! }}
          title={p.name}
          pinColor={p.curated ? 'green' : 'red'}
          onPress={() => onSelect(p.id)}
        />
      ))}
    </MapView>
  );
}
```

- [ ] **Step 4: Add the List/Map toggle to `ExploreScreen`** — add a `mode` state and render `ExploreMap` when active. In `src/ui/screens/ExploreScreen.tsx`:
  - import: `import { ExploreMap } from '@/ui/screens/ExploreMap';`
  - add: `const [mode, setMode] = useState<'list' | 'map'>('list');`
  - directly under the passport caption, add a toggle:
```tsx
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['list', 'map'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} testID={`mode-${m}`}
            style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: mode === m ? t.colors.forest : t.colors.paperEdge }}>
            <Text variant="caption" style={{ color: mode === m ? t.colors.paper : t.colors.ink }}>{m === 'list' ? 'List' : 'Map'}</Text>
          </Pressable>
        ))}
      </View>
```
  - When `mode === 'map'`, render `<View style={{ height: 420 }}><ExploreMap places={filterPlaces(places, { query, curatedOnly })} onSelect={(id) => router.push(\`/explore/${id}\`)} /></View>` instead of the city groups. (Keep search/filters above it.)

- [ ] **Step 5: Run to verify both screen tests pass**

Run: `npx jest tests/ui/screens/ExploreMap.test.tsx tests/ui/screens/ExploreScreen.test.tsx -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/ExploreMap.tsx src/ui/screens/ExploreScreen.tsx tests/ui/screens/ExploreMap.test.tsx
git commit -m "feat(explore): in-app map mode with status-colored markers"
```

### Task 19: Place detail screen

**Files:**
- Create: `app/(tabs)/explore/[id].tsx`
- Create: `src/ui/screens/PlaceDetailScreen.tsx`
- Test: `tests/ui/screens/PlaceDetailScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/ui/screens/PlaceDetailScreen.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { PlaceDetailScreen } from '@/ui/screens/PlaceDetailScreen';
import { makeTestDb } from '@tests/helpers/test-db';

it('shows a place and toggles wishlist', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const p = await repo.addPlace({ name: 'Mókuska', kind: 'cafe', city: 'Stuttgart' });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}><ThemeProvider>{children}</ThemeProvider></RepoProvider>
    </QueryClientProvider>
  );
  render(<PlaceDetailScreen id={p.id} />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  fireEvent.press(screen.getByTestId('toggle-wishlist'));
  await waitFor(() => expect(screen.getByText(/on wishlist/i)).toBeTruthy());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/screens/PlaceDetailScreen.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/ui/screens/PlaceDetailScreen.tsx`:
```tsx
import { Linking, Pressable, ScrollView, TextInput, View } from 'react-native';

import { usePlace, useSetUserData, useToggleWishlist } from '@/features/places/hooks';
import { RatingStars } from '@/ui/primitives/RatingStars';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export function PlaceDetailScreen({ id }: { id: string }) {
  const t = useTheme();
  const { data: place } = usePlace(id);
  const toggle = useToggleWishlist();
  const setUserData = useSetUserData();
  if (!place) return <View style={{ flex: 1 }} />;

  const onWishlist = !!place.userData?.wishlisted;
  const visited = !!place.userData?.visitedAt;
  const mapsUrl =
    place.lat != null && place.lng != null
      ? `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`
      : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.paper }} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text variant="title">{place.name}</Text>
      {place.address ? <Text variant="caption" style={{ color: t.colors.inkFaint }}>{place.address}</Text> : null}
      {place.openingHours ? <Text variant="caption">{place.openingHours}</Text> : null}
      {place.editorialNote ? <Text variant="body">{place.editorialNote}</Text> : null}

      {place.website ? (
        <Pressable onPress={() => Linking.openURL(place.website!)}><Text variant="body" style={{ color: t.colors.forest }}>Website</Text></Pressable>
      ) : null}
      {mapsUrl ? (
        <Pressable onPress={() => Linking.openURL(mapsUrl)}><Text variant="body" style={{ color: t.colors.forest }}>Open in maps</Text></Pressable>
      ) : null}

      <Pressable testID="toggle-wishlist" onPress={() => toggle.mutate(id)}>
        <Text variant="body">{onWishlist ? '★ On wishlist' : '☆ Add to wishlist'}</Text>
      </Pressable>

      <Pressable testID="toggle-visited" onPress={() => setUserData.mutate({ id, patch: { visitedAt: visited ? undefined : new Date() } })}>
        <Text variant="body">{visited ? '✓ Visited' : 'Mark visited'}</Text>
      </Pressable>

      <Text variant="caption" style={{ color: t.colors.inkFaint }}>Your rating</Text>
      <RatingStars value={place.userData?.rating ?? null} onChange={(n) => setUserData.mutate({ id, patch: { rating: n } })} />

      <TextInput
        placeholder="Notes…"
        defaultValue={place.userData?.notes ?? ''}
        onEndEditing={(e) => setUserData.mutate({ id, patch: { notes: e.nativeEvent.text } })}
        multiline
        style={{ borderWidth: 1, borderColor: t.colors.paperEdge, borderRadius: 10, padding: 10, minHeight: 80 }}
      />
    </ScrollView>
  );
}
```
> Note for the test: the test asserts `/on wishlist/i` — the wishlist button text contains "On wishlist" once toggled. Keep that substring.

- [ ] **Step 4: Wire the route**

`app/(tabs)/explore/[id].tsx`:
```tsx
import { useLocalSearchParams } from 'expo-router';

import { PlaceDetailScreen } from '@/ui/screens/PlaceDetailScreen';

export default function PlaceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaceDetailScreen id={id} />;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx jest tests/ui/screens/PlaceDetailScreen.test.tsx -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/explore/[id].tsx" src/ui/screens/PlaceDetailScreen.tsx tests/ui/screens/PlaceDetailScreen.test.tsx
git commit -m "feat(explore): place detail — wishlist/visited/rating/notes + map deep link"
```

### Task 20: Add-place screen

**Files:**
- Create: `app/(tabs)/explore/new.tsx`
- Create: `src/ui/screens/AddPlaceScreen.tsx`
- Test: `tests/ui/screens/AddPlaceScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/ui/screens/AddPlaceScreen.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { AddPlaceScreen } from '@/ui/screens/AddPlaceScreen';
import { makeTestDb } from '@tests/helpers/test-db';

it('adds a place', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const onDone = jest.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}><ThemeProvider>{children}</ThemeProvider></RepoProvider>
    </QueryClientProvider>
  );
  render(<AddPlaceScreen onDone={onDone} />, { wrapper: wrap });
  fireEvent.changeText(screen.getByPlaceholderText(/name/i), 'My Café');
  fireEvent.press(screen.getByText(/save/i));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect((await repo.listPlaces()).map((p) => p.name)).toContain('My Café');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/ui/screens/AddPlaceScreen.test.tsx -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/ui/screens/AddPlaceScreen.tsx`:
```tsx
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { PlaceInput } from '@/domain/validators/place';
import { useAddPlace } from '@/features/places/hooks';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KINDS: PlaceInput['kind'][] = ['cafe', 'coffee_shop', 'roaster'];

export function AddPlaceScreen({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  const add = useAddPlace();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [kind, setKind] = useState<PlaceInput['kind']>('cafe');

  const input = (placeholder: string, value: string, set: (s: string) => void) => (
    <TextInput placeholder={placeholder} value={value} onChangeText={set}
      style={{ borderWidth: 1, borderColor: t.colors.paperEdge, borderRadius: 10, padding: 10, marginBottom: 10 }} />
  );

  async function save() {
    if (!name.trim()) return;
    await add.mutateAsync({ name: name.trim(), kind, ...(city.trim() ? { city: city.trim() } : {}) });
    onDone();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.paper }} contentContainerStyle={{ padding: 16 }}>
      <Text variant="title" style={{ marginBottom: 12 }}>Add a place</Text>
      {input('Name', name, setName)}
      {input('City', city, setCity)}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {KINDS.map((k) => (
          <Pressable key={k} onPress={() => setKind(k)}
            style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: kind === k ? t.colors.forest : t.colors.paperEdge }}>
            <Text variant="caption" style={{ color: kind === k ? t.colors.paper : t.colors.ink }}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={save} style={{ backgroundColor: t.colors.forest, borderRadius: 12, padding: 14, alignItems: 'center' }}>
        <Text variant="body" style={{ color: t.colors.paper }}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Wire the route**

`app/(tabs)/explore/new.tsx`:
```tsx
import { useRouter } from 'expo-router';

import { AddPlaceScreen } from '@/ui/screens/AddPlaceScreen';

export default function NewPlaceRoute() {
  const router = useRouter();
  return <AddPlaceScreen onDone={() => router.back()} />;
}
```

- [ ] **Step 5: Add an entry point** — in `src/ui/screens/ExploreScreen.tsx`, add a "+ Add place" pressable near the top that calls `router.push('/explore/new')`.

- [ ] **Step 6: Run to verify it passes**

Run: `npx jest tests/ui/screens/AddPlaceScreen.test.tsx -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/explore/new.tsx" src/ui/screens/AddPlaceScreen.tsx src/ui/screens/ExploreScreen.tsx tests/ui/screens/AddPlaceScreen.test.tsx
git commit -m "feat(explore): add-place form"
```

---

## Phase 7 — Bean source link

### Task 21: Link a bean to its source place

**Files:**
- Modify: the bean detail screen (find it: `grep -rl "useBean(" app src/ui`)
- Test: extend that screen's existing test or add `tests/ui/screens/BeanSource.test.tsx`

- [ ] **Step 1: Locate the bean detail screen**

Run: `grep -rln "useBean(" app src/ui`
Expected: the bean detail screen path (e.g. `src/ui/screens/BeanDetailScreen.tsx`). Read it to match its layout/section style.

- [ ] **Step 2: Write a failing test** for source linking

`tests/ui/screens/BeanSource.test.tsx`:
```tsx
import { makePlacesRepo } from '@/features/places/repo';
import { makeBeansRepo } from '@/features/beans/repo';
import { makeTestDb } from '@tests/helpers/test-db';

it('links a bean to a place via the repo', async () => {
  const db = makeTestDb();
  const beans = makeBeansRepo(db);
  const places = makePlacesRepo(db);
  const bean = await beans.addBean({ name: 'Ethiopia' });
  const place = await places.addPlace({ name: 'Mókuska', kind: 'roaster' });
  await places.linkBean(bean.id, place.id);
  const got = await beans.getBean(bean.id);
  expect(got?.sourcePlaceId).toBe(place.id);
});
```

- [ ] **Step 3: Run to verify it passes** (repo-level already implemented in Task 8 — this guards the contract)

Run: `npx jest tests/ui/screens/BeanSource.test.tsx -v`
Expected: PASS. (If `BeanRow` type doesn't yet include `sourcePlaceId`, regenerate types are automatic from schema — confirm `npm run typecheck`.)

- [ ] **Step 4: Add the UI** — in the bean detail screen, add a "Source / Bezugsquelle" section: a button that opens a place picker (reuse `usePlaces()` + a simple modal list of `PlaceCard`s) and calls `useLinkBeanSource().mutate({ beanId, placeId })`. Show the linked place name when set (look it up from `usePlaces()` by `bean.sourcePlaceId`). Keep it minimal and matching the screen's existing section pattern.

- [ ] **Step 5: Verify typecheck + suite**

Run: `npm run typecheck && npm test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(beans): link bean to source place (Explore)"
```

---

## Phase 8 — i18n & final verification

### Task 22: i18n strings

**Files:**
- Modify: `src/i18n/en.json`
- Modify: the Explore screens to read from `useTranslation()` where they currently hardcode English

- [ ] **Step 1: Add an `explore` block to `src/i18n/en.json`**

```json
"explore": {
  "title": "Explore",
  "searchPlaceholder": "Search cafés…",
  "curatedOnly": "Curated only",
  "list": "List",
  "map": "Map",
  "addPlace": "Add place",
  "wishlistAdd": "Add to wishlist",
  "wishlistOn": "On wishlist",
  "markVisited": "Mark visited",
  "visited": "Visited",
  "yourRating": "Your rating",
  "notes": "Notes…",
  "website": "Website",
  "openInMaps": "Open in maps",
  "source": "Source",
  "attribution": "© OpenStreetMap contributors (ODbL)",
  "statLine": "{{visited}} visited · {{wishlist}} wishlist"
}
```

- [ ] **Step 2: Swap hardcoded strings** in `ExploreScreen`, `PlaceDetailScreen`, `AddPlaceScreen` for `const { t } = useTranslation();` + `t('explore.xxx')`. Keep `testID`s and the substrings the tests assert (e.g. the wishlist text still contains "On wishlist" / "wishlist"). Where a test matches `/on wishlist/i`, ensure `wishlistOn` keeps that text.

- [ ] **Step 3: Verify all screen tests still pass**

Run: `npx jest tests/ui/screens -v`
Expected: PASS. Adjust any test matcher that broke due to wording, or adjust the i18n value to keep the asserted substring.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/ui/screens
git commit -m "feat(explore): i18n strings"
```

### Task 23: Full verification + lint

- [ ] **Step 1: Run everything**

Run: `npm run lint && npm run typecheck && npm test`
Expected: lint clean, no type errors, all suites pass.

- [ ] **Step 2: Confirm domain coverage**

Run: `npm run test:coverage`
Expected: `src/domain/**` at 100% (incl. `places.ts`, `validators/place.ts`).

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(explore): lint + final verification" || echo "nothing to commit"
```

### Task 24 (optional): Maestro E2E smoke

**Files:**
- Create: `.maestro/flows/explore.yaml`

- [ ] **Step 1: Write the flow**

`.maestro/flows/explore.yaml`:
```yaml
appId: <your.app.id>   # copy from app.json -> expo.android.package / ios.bundleIdentifier
---
- launchApp
- tapOn: "Explore"
- assertVisible: "Explore"
- tapOn:
    id: "mode-map"
- tapOn:
    id: "mode-list"
- inputText: "Mók"
```

- [ ] **Step 2: Run on a simulator (manual, requires dev build)**

Run: `npm run e2e:ios`
Expected: flow passes (or document why it needs the dev client). This task is optional and may be deferred until the dev build exists.

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/explore.yaml
git commit -m "test(e2e): explore smoke flow"
```

---

## Self-review notes (already applied)

- **Spec coverage:** §2 schema → Task 3; §3 domain → Tasks 4–6; §4 feature layer → Tasks 7–10; §5 seed → Tasks 11–13; §6 screens → Tasks 16–20; §7 map deps/config → Tasks 1–2,18; §8 i18n/tests → Tasks 22–24; §10 attribution → Tasks 11,17,22. Bean link (§1, §6) → Task 21.
- **i18n deviation from spec:** codebase ships `en.json` only (no `de.json`); plan adds `explore` keys to `en.json` and leaves `de` for a later locale pass.
- **Type consistency:** `PlaceWithUserData` (repo/types) carries `userData`; `placeStatus` accepts `{ wishlisted, visitedAt }`; hooks invalidate `['places' | 'place' | …]` keys consistently; `linkBean(beanId, placeId|null)` signature matches hook + test.
- **Seed shape:** `SeedPlace` (types.ts) ⇄ build script output ⇄ `upsertSeed` input all use `osmId` as the external key.
