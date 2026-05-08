# Brewlog — v1 Design Spec

**Status:** Approved (brainstorming complete, awaiting implementation plan)
**Date:** 2026-05-08
**Owner:** Robin Rehbein

---

## 1. Overview

Brewlog is a high-fidelity coffee tracking and brewing companion for specialty coffee enthusiasts. It treats brewing as a daily ritual: a tactile, sensory practice supported by precise data. The v1 launch focuses on two of four conceptual pillars; the remaining two ship in subsequent versions.

### Conceptual pillars (full vision)

1. **Daily Brew** — the morning-ritual command center: caffeine balance, water-filter health, quick-start triggers.
2. **Bean Library** — a curated archive of roasts: origin, roast level, flavor profiles.
3. **Brew Lab** — a precision extraction interface: timer, parameters, tasting notes.
4. **Holistic Maintenance** — equipment health: cleaning cycles, filter replacement, component-specific care.

### Design philosophy

**Tactile Organicism** — soft geometry, earthy palette, high information density with calm clarity. The interface evokes a barista's notebook more than a clinical dashboard.

### Locked decisions

| Decision | Choice |
|---|---|
| Product name | **Brewlog** |
| Target | Real product — App Store and Play Store |
| Stack | Expo + React Native + TypeScript |
| v1 scope | **Brew Lab + Bean Library** with a thin Daily Brew summary; Maintenance ships in v1.1 |
| v1 brew methods | **Espresso only** |
| Brew Lab input | Manual + timer + milestones (Bluetooth scales deferred to v1.2) |
| Data | Local-first; optional cloud sync added in v1.4 |
| Monetization | Free in v1; pricing decided after launch |
| Visual direction | Earthy Forest — cream paper, deep forest green, serif headers |

---

## 2. Architecture and code layout

### Layered architecture

Dependencies flow downward only. `domain/` is pure and imports nothing app-specific; UI never reaches into `db/` directly.

```
UI (screens, components)
        │
features (use-cases: beans, brew, dashboard)
        │
domain (pure logic: extraction math, ratios, validators)        ─── state (Zustand for ephemeral UI)
        │
db (Drizzle schema + queries)
        │
expo-sqlite (storage primitive)
```

### Code layout

```
/app                                # Expo Router (file-based routes)
  _layout.tsx                       # Tab navigator + theme provider
  (tabs)/
    _layout.tsx                     # Three tabs
    index.tsx                       # ☕ Daily Brew (thin dashboard)
    library/
      _layout.tsx                   # Stack
      index.tsx                     # Bean list
      new.tsx                       # Add bean
      [id].tsx                      # Bean detail / edit toggle
    lab/
      _layout.tsx                   # Stack with segmented header (Brew | History)
      index.tsx                     # "Now" — start/run a shot
      history.tsx                   # Session list (filter by bean)
      session/[id].tsx              # Session detail
  (modals)/
    _layout.tsx                     # stack-presentation: 'modal'
    pick-bean.tsx                   # Bean picker (used when starting a shot)
    tasting-note.tsx                # Sensory sheet after Stop Pull
    settings.tsx                    # Units, theme, about
/src
  domain/                           # Pure: extraction math, ratio calc, zod validators
  db/                               # Drizzle schema, migrations, client
  features/
    beans/                          # Hooks + types: useBean, useBeans, addBean…
    brew/                           # Session state machine + hooks
    dashboard/                      # Read models for Daily Brew tab
  ui/                               # Bespoke theme + primitives
  state/                            # Zustand stores (timer running, current draft)
  lib/                              # Formatters, ids, time utils
/tests                              # Mirror /src structure
```

### Key libraries (locked)

- **Expo SDK** + **Expo Router** (file-based navigation)
- **TypeScript** (strict)
- **Drizzle ORM** + **expo-sqlite**
- **Zustand** (ephemeral UI state)
- **TanStack Query** (cache + invalidation over local DB reads)
- **react-native-reanimated** (timer, gestures, transitions)
- **@shopify/react-native-skia** (extraction ring, future flow curves)
- **zod** (input validation)
- **date-fns** (date math)
- **expo-keep-awake** (screen-on during a pull)

### Boundaries and module discipline

- Each `features/<x>` module exposes typed hooks + types; storage details do not leak.
- Switching from SQLite to a different store later only touches `db/`.
- Files stay small. Screens compose features and UI primitives; no 500-line screen files.
- Bespoke components, no UI library — the Earthy Forest aesthetic warrants direct control of every primitive.

---

## 3. Data model

Four tables for v1, on `expo-sqlite` via Drizzle ORM. All mutable rows include `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete) so v1.4 cloud sync can replicate without schema changes.

### Tables

```ts
beans                     // The library — what you've bought / tasted
─ id, name, roaster, origin, country_code, process,
  variety, roast_level (1–5), roasted_on, altitude_masl,
  start_weight_g, remaining_weight_g,
  price_paid_minor, price_paid_currency,
  flavor_tags (json string[]),  notes,
  created_at, updated_at, deleted_at

brew_sessions             // One espresso shot (the v1 method)
─ id, bean_id (FK → beans), method ('espresso' for v1),
  started_at, ended_at,
  dose_g, yield_g, duration_s,
  pre_infusion_s, first_drop_s,
  grinder_label, grind_setting, water_temp_c,
  rating (1–5), comment,
  created_at, updated_at, deleted_at

brew_milestones           // Timer events captured during a pull
─ id, session_id (FK → brew_sessions, ON DELETE CASCADE),
  kind ('pre_infusion_end' | 'first_drop' | 'stop' | 'note_marker'),
  t_seconds, label, created_at

tasting_notes             // Post-extraction sensory log (1:1 with session)
─ id, session_id (FK, UNIQUE),
  mouthfeel, acidity, sweetness, bitterness, balance (each 1–5),
  flavor_tags (json string[]), comment,
  created_at, updated_at
```

A separate one-row **`preferences`** table holds user units (g vs oz), default ratio, and theme. No `user_id` columns in v1; they will be added (nullable, defaulting to a single local user) when sync ships in v1.4.

### Indexes

- `beans (deleted_at, name)` — list reads
- `brew_sessions (bean_id, started_at DESC)` — bean detail "history with this bean"
- `brew_sessions (deleted_at, started_at DESC)` — history list
- `brew_milestones (session_id, t_seconds)` — session detail render
- `tasting_notes (session_id)` — unique already enforces this

### Design decisions

| Decision | Rationale |
|---|---|
| **UUIDs everywhere** | Sync-safe. Two devices can create rows offline without ID collisions in v1.4. |
| **`flavor_tags` as JSON column** | v1 needs no tag analytics. If later required, add an FTS5 virtual table or migrate. |
| **`remaining_weight_g` denormalized**, decremented per shot | Fast list reads. Single update site: the brew-session-saved hook. |
| **Money in minor units + currency** | Standard correct-money pattern; no floats. |
| **Soft delete (`deleted_at`)** | Preserves history for trends; supports race-free sync deletes. List queries always filter `deleted_at IS NULL`. |
| **No `machine` / `maintenance` tables yet** | v1.1. `grinder_label` is free text now; in v1.1 it becomes optional FK to `machines`. Additive migration. |
| **`method` as string** despite v1 espresso-only | Adding V60 in v1.3 needs no new column. |
| **Drizzle migrations**, versioned and committed | Applied on app launch; failures route to schema-mismatch recovery (§7). |

### Pure domain logic (`src/domain/`)

Pure functions tested with vanilla Jest, never touching SQLite:

- `brewRatio(dose, yield) → number` and formatter `1:1.58`
- `extractionPercent(dose, yield, tdsAssumed)` — stand-in until refractometer support (v1.6)
- `validateBean(input) → Result<Bean, Issue[]>` (zod)
- `validateSession(input) → Result<Session, Issue[]>` (zod)
- `caffeineForShot(doseG, beanRoastLevel) → mg` — rough estimator for the dashboard

---

## 4. Screen map and navigation

Three bottom tabs in v1. Maintenance is the eventual fourth (v1.1).

```
Tab bar
├── ☕ Daily          → /(tabs)/index
├── 📚 Library        → /(tabs)/library
└── ⚗️ Lab            → /(tabs)/lab
```

### Tab 1 — Daily Brew (thin)

A single scrollable column with three blocks:

1. **Today, at a glance** — count of shots logged today, estimated caffeine (mg), last brew rating with bean name.
2. **Quick Start** — one prominent "Start an Espresso Shot" button → opens Lab with last-used bean pre-selected.
3. **Recent shots** — last three sessions as mini-cards (rating, ratio, bean, time-ago).

No charts, streaks, or goals in v1. Filter health and caffeine balance arrive with Maintenance (v1.1) and dashboard expansion (v2).

### Tab 2 — Library

- **List** — scrollable grid of bean cards (image placeholder, name, roaster, days-since-roast badge, remaining-weight bar).
- **Empty state** — friendly "Add your first bean" with a tactile illustration.
- **Add / Edit** — full screen, not a modal. The bean form is data-rich and earns the real estate. Required: `name`. All other fields optional. Inline zod validation.
- **Detail** — full bean card plus "history with this bean" (count of shots, average rating, last brewed). Edit pencil toggles into edit mode. Delete is a soft delete with an undo snackbar.

### Tab 3 — Lab (the v1 hero)

A segmented control in the header switches between **Brew** and **History**.

- **Brew (idle)** — target dose / target yield steppers, last-used grinder setting carried forward, big "Start Shot" button. A small chip at top: "Brewing with: [Ethiopia · Yirgacheffe ▾]" — tap to swap via the bean-picker modal.
- **Brew (running)** — timer + extraction ring. Two action affordances during the pull: a **milestone pill** (pre-infusion end, first drop) and a single **Stop Pull** button.
- **Brew (post-stop)** — tasting-note sheet slides up. Rating (1–5), sensory sliders, free-text comment, optional flavor-tag chips. **Save** returns to history; **Save & log another** returns to Brew (idle).
- **History** — list grouped by day, filterable by bean. Tap → session detail with milestones rendered on a static timeline.

### Modals

- **Pick Bean** — searchable list (FTS via plain `LIKE` for v1). Empty-state CTA: "Add a new bean →" routes to the same form as Library/new.
- **Tasting Note** — described above; sheet presentation.
- **Settings** — units, theme reservation (single theme in v1), about, "Send Diagnostic Report."

### First-launch UX

No wizard, no auth wall. App opens to Daily Brew with empty states across all three tabs. Library's empty state has the most prominent CTA — you can't brew before you have a bean.

### Header and tab bar styling

- **Header** — serif title in `forest` accent, no shadow, large back tap target on left, settings gear on Daily.
- **Tab bar** — `paper` background, `forest` active label with thin underline, line icons (no filled glyphs).

---

## 5. Brew Lab state machine

The behaviorally complex part of v1. Five UX states with the DB writes that fire on each transition. Designed for kill-9 recoverability.

```
┌─────────────┐ tap Start  ┌─────────┐ tap Stop  ┌────────────┐ Save  ┌──────────────┐
│  IdleSetup  │ ─────────▶ │ Pulling │ ────────▶ │ Capturing  │ ────▶ │ IdleSetup    │
│             │            │         │           │ (note      │       │ (returned)   │
│ pick bean,  │            │ live    │           │  sheet)    │       │              │
│ targets     │            │ timer + │           │            │       │              │
│             │            │ ring    │           │            │       │              │
└─────────────┘            └────┬────┘           └─────┬──────┘       └──────────────┘
                                │ tap Milestone        │ Discard
                                │ (self-loop;          │ (soft-delete session)
                                │  inserts row)        ▼
                                │                ┌─────────────┐
                                │                │ IdleSetup   │
                                │                └─────────────┘
                                │ app killed mid-pull
                                ▼
                          ┌──────────────┐
                          │ Recovering   │ ── Resume → Pulling (recompute elapsed)
                          │              │ ── Discard → IdleSetup (soft-delete)
                          └──────────────┘
```

### State details

| State | DB on entry | Allowed actions | Screen |
|---|---|---|---|
| **IdleSetup** | — | Pick bean · adjust dose/yield · adjust grind · tap Start | Lab home — three steppers, bean chip, Start Shot button |
| **Pulling** | `INSERT brew_sessions` with `started_at = now`, dose, bean, method, grind | Tap milestone · tap Stop · navigate elsewhere (timer keeps running) | Live timer (wall-clock-driven), extraction ring, milestone pill, Stop Pull button |
| **Capturing** | `UPDATE brew_sessions SET ended_at, duration_s` | Enter yield · 1–5 rating · sensory sliders · flavor tags · comment · **Save** · **Save & log another** · **Discard** | Modal sheet over Lab. Sheet is non-dismissable; only the three explicit actions exit the state. |
| **Saved (via Save) → Lab History** | `INSERT tasting_notes` (if filled) · `UPDATE beans.remaining_weight_g -= dose_g` | — | Lands on Lab → History segment with the new session at the top; brief snackbar: "Shot logged · 1:1.58 · 27.4s · 4★" |
| **Saved (via Save & log another) → IdleSetup** | Same DB writes as above | — | Returns to Lab IdleSetup, same bean and grind preserved; snackbar identical |
| **Discarded (via Discard) → IdleSetup** | `UPDATE brew_sessions SET deleted_at = now`. Bean weight is **not** decremented. | — | Confirm dialog ("Discard this shot?") then return to IdleSetup |
| **Recovering** | — (session row already in DB from prior **Pulling**) | Resume → Pulling, recompute elapsed · Discard → soft-delete | Banner on Lab open: "You have an in-progress shot from 47s ago." |

### Key shape decisions

- **Insert the session row at *tap Start*, not at Save.** A live pull deserves a real DB row; milestones write directly; app death loses nothing.
- **Timer is wall-clock**, not interval. `elapsed = now − started_at`. Locking the phone, navigating to Library, or recovering from a kill all "just work."
- **List queries filter `ended_at IS NOT NULL`** so an in-progress shot does not appear in History.
- **Discard is soft-delete**, not `DELETE`. Cascade rules stay simple; sync stays race-safe.
- **`expo-keep-awake` is engaged on Pulling entry**, released on exit. Otherwise the screen dims mid-pour.
- **No pause state.** Espresso pulls aren't pausable; if needed in v1.3 (pour-over) we'll add it then.

---

## 6. Visual system

### Color tokens (semantic)

| Group | Token | Hex | Use |
|---|---|---|---|
| Surfaces | `paper` | `#f1ece0` | App background — "cream paper" |
| | `paperDeep` | `#e6dfcc` | Tiles, raised surfaces |
| | `paperEdge` | `#d9d2c0` | Hairlines, borders |
| Text | `ink` | `#2a3a30` | Primary text |
| | `inkSoft` | `#5a6a60` | Secondary text |
| | `inkFaint` | `#8a9088` | Captions, hint text |
| Accent | `forest` | `#3a5a3e` | CTAs, active state, charts |
| | `forestDeep` | `#2a3a2e` | Pressed / hover |
| | `forestPale` | `#a8c0a8` | Subtle backgrounds, badges |
| Semantic | `amber` | `#a36a3a` | Recovery banner, soft-delete confirms |
| | `danger` | `#9a3a2e` | Stop Pull, destructive (rare) |

### Typography

- **Fraunces** — variable serif, free Google Font. Headers, timer numerals.
- **Inter** — sans, free Google Font. UI body, labels, numerals.
- **System** fallbacks if fonts fail to load: Georgia (serif), system-ui (sans).

| Token | Family | Size | Weight | Notes |
|---|---|---|---|---|
| `display` | serif | 56 | 300 | Timer |
| `title` | serif | 24 | 500 | Screen titles |
| `heading` | serif | 18 | 600 | Section headings |
| `body` | sans | 15 | 400 | Default body |
| `bodyStrong` | sans | 15 | 600 | Emphasis |
| `caption` | sans | 13 | 400 | |
| `label` | sans | 11 | 600 | uppercase, letter-spacing 1.4 — tile labels |
| `numeral` | sans | 16 | 600 | Tabular numerals |

### Spacing (4-pt grid)

`xs: 4 · sm: 8 · md: 12 · lg: 16 · xl: 24 · 2xl: 32 · 3xl: 48`

### Radii

`sm: 8 · md: 14 · lg: 22 · pill: 999`

Soft geometry favors larger radii. Defaults: tile = `md`, sheet = `lg`, button = `pill`.

### Elevation

Hairline borders preferred over shadows. **One** elevation token (`elev1`) for the tasting-note sheet:

```
shadow-color: rgba(45,74,58,.15); shadow-offset: 0,2; shadow-radius: 12;
shadow-opacity: 1; elevation: 4 (Android)
```

### Primitives (in `src/ui/`)

`Surface` · `Pill` · `MetricTile` · `Stepper` · `TimerDisplay` · `ExtractionRing` · `Stat` · `BeanCard` · `EmptyState` · `Snackbar` · `Sheet` · `Header` · `TabBar`.

### Token discipline (enforced)

- Screen code never references raw hex — only `theme.colors.forest`.
- Spacing never uses arbitrary numbers — only `theme.space.lg`.
- Typography never sets font-family inline — `<Text variant="title">`.
- Single `elev1` shadow token; everything else uses hairline borders.
- **No dark mode in v1** (deliberate cut). Tokens are semantic (`paper` not `cream`) so v1.x can ship dark as a swap, not a refactor.

---

## 7. Error handling

**Principle:** no silent failures. Every error has a defined surface and a UX consequence.

| Error class | Surface | User experience |
|---|---|---|
| **Input validation** (zod) | Inline field caption | Red caption under field; submit disabled until clean. Never modal. |
| **DB write fails during a brew** (`INSERT brew_sessions` on tap Start) | Stays in `IdleSetup`; blocking dialog | "Couldn't start the shot — your data is safe but storage isn't responding. Try again?" |
| **DB write fails outside a brew** (saving a bean) | Toast + retry | Optimistic write rolled back; user retries. |
| **Schema mismatch on launch** (corrupted DB, downgrade) | Recovery screen, not crash | "Brewlog needs to rebuild its data. [Restore from device backup] or [Start fresh]." |
| **OS lifecycle interruption** | Handled by state machine | Wall-clock timer + persisted session row + Recovering banner on relaunch. |
| **Unhandled JS error** | Error boundary at `_layout.tsx` | Friendly fallback with "Reload Brewlog"; Sentry receives the stack. |

### Codebase rules

- `try/catch` blocks must re-throw, log to Sentry, or surface to the user. **Never** `catch { }` or `catch { return null }` to swallow.
- Mutations route through TanStack Query so `onError` always fires; no orphan promise rejections.
- Domain validators return `Result<T, Issue[]>`, never throw.
- DB queries that can return zero rows return `T | null`, never throw "not found."

---

## 8. Testing strategy

| Layer | Tool | Scope | Cadence |
|---|---|---|---|
| **Unit** | Jest | `src/domain/`: ratios, extraction %, validators, formatters, caffeine estimator. **100% coverage of `domain/`.** | Per-commit (lint-staged) + per-PR |
| **DB** | Jest + Drizzle's `better-sqlite3` driver | Migrations, CRUD, soft-delete, cascade, denormalized counters | Per-PR |
| **State machine** | Jest | Every Brew Lab transition; recovery math; edge cases (Stop while not Pulling = noop). **Highest-risk surface; exhaustive.** | Per-PR |
| **Component** | React Native Testing Library | Empty / loading / error / data states for each screen. Key interactions wired up. | Per-PR |
| **End-to-end** | Maestro | Three smoke flows: (1) first-launch → add bean → start shot → save with notes; (2) kill mid-pull → relaunch → resume; (3) edit + soft-delete a bean with undo. | Nightly + on `main` merge |

Maestro chosen over Detox: an order of magnitude less code, first-try Expo compatibility, no device farm.

**Coverage targets:** 100% of `src/domain/`. Elsewhere, cover the meaningful flows; do not chase percentages.

---

## 9. Observability and performance

### Observability

- **Sentry** from day one (free tier sufficient for v1). Crash and JS error reporting.
- **No analytics SDKs in v1.** Privacy-respecting, simpler App Store review, no GDPR/CCPA banner. Add opt-in PostHog later if product analytics become useful.
- **Local debug log ring buffer** — last 200 events kept in memory and persisted, exportable from Settings → "Send Diagnostic Report."

### Performance budget

- **Cold start to interactive < 1.5 s** on iPhone 13.
- **Brew Lab Pulling frame budget: 16 ms.** No JS-thread allocations during the pull. Skia ring + Reanimated timer run on the UI thread; the screen does not re-render each tick.
- **DB list queries indexed** (see §3). A 1000-bean library scrolls at 60 fps.

---

## 10. Accessibility

- Every interactive element has `accessibilityLabel`; steppers announce both name and value.
- Dynamic Type respected up to 200%.
- Color contrast: `ink` on `paper` meets WCAG AAA. `forest` on `paper` meets AA-large; verified per release.
- VoiceOver and TalkBack walkthroughs on Brew Lab + Library before each release.
- Reduced motion: timer ring transitions to a discrete tick rather than spinning.

---

## 11. v1.x roadmap (deferred from v1)

| Version | Theme |
|---|---|
| **v1.1** | **Maintenance pillar** — `machines` table, cleaning schedules, filter replacement based on water processed, gasket and burr cleaning. Adds the fourth tab. |
| **v1.2** | **Bluetooth scales** — Acaia / Felicita / Timemore. Real flow curves; live extraction visualization. |
| **v1.3** | **V60 / pour-over** — multi-stage timer (bloom → pulses → drawdown), pour scheduler. |
| **v1.4** | **Cloud sync + Pro tier** — Supabase + Sign in with Apple/Google. RevenueCat for IAP; sync becomes a Pro hook. |
| **v1.5** | French Press, AeroPress, Moka Pot. |
| **v1.6** | Refractometer integration (TDS log) → real extraction yield %. |
| **v2** | Daily Brew dashboard expansion: caffeine graphs, streaks, weekly insights, taste evolution. |

This sequence is non-binding but shaped v1 data choices: `method` as string (v1.3+), `flavor_tags` as JSON (analytics deferred to v2), `grinder_label` as free text (becomes FK in v1.1).

---

## 12. Assumptions and known gaps

- **No refractometer support in v1.** Extraction-percent ring uses a simple yield-vs-dose model with a configurable factor. This is approximate; real EY% arrives in v1.6.
- **Single-user / single-device assumption in v1.** No `user_id` columns yet; introduced (nullable) in v1.4.
- **Caffeine estimator is rough** — derived from dose × roast-level coefficient. Documented as approximate in the UI.
- **No exports / imports** in v1. Diagnostic report is a debug aid, not a data export. CSV/JSON export ships post-launch (informally tracked, no fixed version).
- **English only in v1.** i18n scaffolding (`react-i18next` with a single `en.json`) is in place from day one; additional locales added when meaningful.

---

## 13. Definition of done for v1

- All three tabs ship with empty / loading / error / data states.
- Bean Library: add, edit, soft-delete with undo, list with search.
- Brew Lab: full state machine including Recovery; tasting note sheet; History tab.
- Daily Brew: today summary, Quick Start, recent shots.
- Settings: units, "Send Diagnostic Report," about.
- Sentry wired; error boundary in place.
- 100% unit coverage of `src/domain/`; state-machine tests exhaustive; three Maestro E2E flows green.
- App Store and Play Store listings drafted; screenshots captured.
- Accessibility walkthroughs (VoiceOver + TalkBack) signed off.
- Cold start < 1.5 s on iPhone 13; Pulling frame budget ≤ 16 ms verified.
