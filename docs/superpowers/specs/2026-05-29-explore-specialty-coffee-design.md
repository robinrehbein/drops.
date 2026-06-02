# Explore — Specialty Coffee Finder — Design Spec

**Status:** Approved (brainstorming complete, awaiting implementation plan)
**Date:** 2026-05-29
**Owner:** Robin Rehbein

---

## 1. Overview

Explore is a new fifth pillar for Drop: a way to **discover specialty coffee places** — espresso-bar ("Siebträger") focused cafés and roasters with genuinely good coffee and nice ambiance — across cities, and to keep a **personal layer** on top of them: a wishlist of places to visit, a "visited" passport with dates, personal ratings and notes, and a link back to the beans you bought there.

It is inspired by *European Coffee Trip* (a curated specialty-café directory) for its **feature shape only**. The **data** comes from a source Drop can ship legally: **OpenStreetMap** (factual data — names, addresses, coordinates, opening hours; licensed under **ODbL**, attribution "© OpenStreetMap contributors"), cross-referenced against public editorial guides to flag the genuinely-specialty spots. Drop never scrapes or bundles a commercial competitor's curated database.

### Vision in one sentence

> Explore is the dog-eared city map tucked in the back of the notebook — the places worth a detour, the ones you've been, and where this bag of beans actually came from.

### How it fits the product

Drop tracks *your* brewing (Daily, Library, Lab, Care). Explore is the one pillar that looks **outward** — at places out in the world — while staying **local-first**: the directory is a bundled, read-only seed; everything personal lives in SQLite and never leaves the device.

### Locked decisions

| Decision | Choice |
|---|---|
| Placement | New **5th tab "Explore"** (map-pin icon) |
| Data source | **Curated seed (OSM + editorial cross-reference) + user-added places** |
| Seed license | OpenStreetMap, **ODbL** — attribution required in-app |
| Map | **Real in-app map** via `react-native-maps` (requires dev build; Android needs Google Maps API key) |
| Personal features | Wishlist · Visited + date · Rating & notes · Link bean to source place |
| Local-first | Seed bundled read-only; all user data in SQLite, no backend |

---

## 2. Data model (migration 0004)

### `places` — unified display object for every café (seed *and* user-added)

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | generated via `domain/ids.ts` |
| `source` | `'seed' \| 'user'` | provenance |
| `externalId` | text? | `osmId` for seed rows — the **upsert key** |
| `name` | text NOT NULL | |
| `kind` | `'roaster' \| 'coffee_shop' \| 'cafe'` | |
| `city` | text | |
| `country` | text | default `'DE'` |
| `address` | text? | from OSM `addr:*` |
| `lat` | real? | |
| `lng` | real? | |
| `website` | text? | |
| `openingHours` | text? | raw OSM `opening_hours` string (displayed verbatim in v1) |
| `tags` | text? | JSON array, e.g. `["specialty","filter","roastery"]` |
| `curated` | integer (bool) | editorially confirmed specialty |
| `editorialNote` | text? | short summary of which guide(s) named it |
| `createdAt` / `updatedAt` | integer | epoch ms |

### `place_user_data` — personal overlay (kept separate so re-seeding is loss-free)

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `placeId` | text FK → `places.id` | `UNIQUE` (one overlay row per place) |
| `wishlisted` | integer (bool) | default 0 |
| `visitedAt` | integer? | epoch ms; null = not visited |
| `rating` | integer? | 1–5 |
| `notes` | text? | |
| `createdAt` / `updatedAt` | integer | |

### `beans.sourcePlaceId` — new nullable column, FK → `places.id`

Links a bean in the Library to the café/roaster it was bought from ("Bezugsquelle").

### Seed import semantics

`seedPlaces()` runs once on first launch (guarded by a row-count check on seed rows). It **upserts by `externalId`**: inserts new seed rows, updates factual columns (address, hours, coords, curated, editorialNote) on existing ones, and **never touches `place_user_data`**. User-added places (`source='user'`, `externalId` null) are inert to seeding.

---

## 3. Domain layer (`src/domain/places.ts` + `validators/place.ts`)

Pure, dependency-free, target **100% coverage** (matches existing `src/domain/` discipline).

- `distanceKm(a: {lat,lng}, b: {lat,lng}): number` — Haversine, for "nearest" sorting.
- `placeStatus(userData?): 'wishlist' | 'visited' | 'none'` — visited wins over wishlist.
- `groupByCity(places): { city: string; places: Place[] }[]` — sorted, stable.
- `filterPlaces(places, { query?, kind?, city?, status?, curatedOnly? }): Place[]` — case/umlaut-insensitive name match.
- `sortPlaces(places, by: 'name' | 'distance', origin?): Place[]`.
- `placeStats(overlay[]): { visited: number; wishlist: number }` — for the passport header.

Validators (zod, mirroring `validators/bean.ts`):
- `parsePlaceInput` — for user-added cafés (name required, kind enum, optional coords/address/tags).
- `parseUserDataInput` — rating 1–5, notes length bound, etc.

---

## 4. Feature layer (`src/features/places/{repo,hooks,types}.ts`)

Follows the existing beans/recipes pattern exactly.

**`repo.ts`** (Drizzle): `listPlaces`, `getPlace(id)`, `listCities`, `searchPlaces`, `listByCity`, `listWishlist`, `listVisited`, `upsertSeed(rows)`, `addPlace(input)`, `setUserData(placeId, patch)`, `linkBean(beanId, placeId)`.

**`hooks.ts`** (TanStack Query): `usePlaces`, `usePlace(id)`, `useCities`, `useWishlist`, `useVisited`, `usePlaceStats`, and mutations `useTogglePlaceWishlist`, `useSetVisited`, `useRatePlace`, `useUpdateNotes`, `useAddPlace`, `useLinkBeanSource`. Mutations invalidate the relevant query keys.

**`types.ts`**: `Place`, `PlaceUserData`, `PlaceWithUserData`, `PlaceInput`.

---

## 5. Seed pipeline

1. A research step (already running as a background agent) produces `/tmp/germany-specialty-coffee.json`:
   `{ attribution, generatedFor, cityCount, total, curatedCount, places: [...] }`.
2. `scripts/build-places-seed.ts` validates that JSON against the `Place` shape and writes the bundled fixture `src/features/places/seed/places.seed.json` (re-runnable to refresh the seed).
3. On first launch, app bootstrap calls `seedPlaces()` → `repo.upsertSeed()`.
4. Attribution string ("© OpenStreetMap contributors, ODbL") is rendered in the Explore footer / an "About data" row.

The Stuttgart curated set already produced (`/tmp/stuttgart-curated.json`) is the canonical sanity sample for tests.

---

## 6. Screens (`app/(tabs)/explore/` stack)

- **Explore index** — segmented **List ⇄ Map** toggle; passport mini-stat header ("12 visited · 5 wishlist").
  - *List:* search bar + filter chips (kind, "curated only", status) + sections grouped by city.
  - *Map:* `react-native-maps` with pins color-coded by status (curated / visited / wishlist / plain), clustering, tap → preview callout → detail.
- **Place detail** — name, kind, curated badge, address, opening hours (raw), website link, "Open in maps app" (deep link via lat/lng), mini-map; personal actions: wishlist toggle, mark-visited + date picker, star rating, notes field; list of linked beans.
- **Add place (modal)** — form: name, kind, city, address, location (map tap or "use current location" via `expo-location`), tags → saves `source:'user'`.
- **Bean detail / Library** — a "Source / Bezugsquelle" picker that sets `beans.sourcePlaceId` (searchable places list).

### UI primitives (`src/ui/primitives`, "Earthy Forest" theme)

`PlaceCard`, `CityHeader`, `RatingStars`, `StatusBadge`, map callout card — reusing the established `RecipeCard` / `MachineCard` visual language. Every screen earns real illustrative content per the product's design philosophy (no flat placeholders).

---

## 7. Map — native dependency

- Add `react-native-maps` + `expo-dev-client` (Expo Go no longer sufficient).
- iOS: Apple Maps (no API key). Android: Google Maps API key configured in `app.json` plugin block.
- `expo-location` for "use current location" / nearest sorting (permission-gated, optional — degrades gracefully when denied).
- **Test isolation:** mock `react-native-maps` and `expo-location` in `__mocks__/` (mirrors the existing Skia mock) so Jest stays green without native modules.

---

## 8. i18n & testing

- New `explore` i18n namespace, `de` + `en`.
- **Tests:**
  - Domain 100% — distance, filter, sort, status, stats, validators.
  - Repo — in-memory SQLite (existing pattern), incl. upsert-by-externalId preserving overlay.
  - Hooks — RNTL.
  - Screen smoke tests with mocked map + location.
  - (Optional) Maestro E2E: open Explore → search → add to wishlist → mark visited.

### Execution gates (from prior Drop drift)

`jest@^29` (not 30) · `.npmrc legacy-peer-deps=true` · `npm run typecheck` as a gate, not just tests · keep `src/domain/**` at 100% after any domain change · native map/location modules mocked under `__mocks__/` and wired via the jest preset (mind `setupFiles` vs `setupFilesAfterEnv`).

---

## 9. Out of scope (YAGNI for v1)

- `opening_hours` parsing/“open now” logic (OSM format is gnarly — show raw + "open in maps").
- Multi-visit history (single `visitedAt` is enough).
- Photo upload, cloud sync, social/sharing.
- Live API search (Google/Foursquare) — seed + user-added covers v1.
- Worldwide coverage — seed is Germany-first; schema already carries `country` for later.

---

## 10. Legal / data provenance

- Factual fields (name, address, coords, hours) originate from **OpenStreetMap** under **ODbL** — in-app attribution is mandatory and included.
- `editorialNote` values are **short summaries** of publicly available coffee guides used only to *flag* likely-specialty spots — not verbatim reproductions.
- Drop does **not** extract, scrape, or bundle European Coffee Trip's (or any single commercial provider's) curated database — that selection is protected as an EU sui-generis database right.
