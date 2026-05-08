# Brewlog — v1 Design Spec

**Status:** Approved (brainstorming complete, awaiting implementation plan)
**Date:** 2026-05-08
**Owner:** Robin Rehbein

---

## 1. Overview

Brewlog is the digital version of a serious home barista's paper notebook — a lifetime archive of every bean ever tasted, with the dialed-in recipe locked in beside it, and the daily reality of the machine that brews them all. It treats brewing as a daily ritual: a tactile, sensory practice supported by precise data. v1 covers all four conceptual pillars in service of the paper-notebook test (*if it's not on the page in front of a barista dialing in a shot, it doesn't belong in v1*).

### Conceptual pillars (all in v1)

1. **Daily Brew** — the morning-ritual glance: machine readiness (water filter, cleaning), today's shots, and a "match daily cups" visual. Caffeine total is a fun-fact secondary.
2. **Bean Library** — a *lifetime* archive of every coffee ever tasted, with optional inventory tracking (weight + price for fun facts), per-bean status (active / finished / would-buy-again), and the locked-in canonical recipe.
3. **Brew Lab** — the active brewing workflow: state-machine-driven timer, milestones, sensory capture. If the selected bean has a saved recipe, IdleSetup pre-fills from it.
4. **Maintenance** — equipment health: water filter freshness, cleaning schedule (group-head backflushing, gasket, burr), machine + grinder + filter inventory.

### Vision in one sentence

> Brewlog is the leather notebook by the espresso machine — the place where you remember the great shots, dial in the new beans, and never let the filter go stale.

### Audience

Specialty coffee enthusiasts running real machines + grinders. v1 targets the **builder** first (used daily by the developer) and a **small specialty-coffee community** thereafter (handful of friends + r/espresso-style enthusiasts who find it). Not a marketplace, not a leaderboard, not a Reddit. Sharing a recipe with a friend matters; public feeds don't.

### Design philosophy

**Tactile Organicism** — soft geometry, earthy palette, high information density with calm clarity. The interface evokes a barista's notebook more than a clinical dashboard. Every screen earns at least one piece of real illustrative content (hand-drawn coffee bag art, branch-and-cherry watermarks, line-art flavor glyphs). No flat placeholder blocks, no emoji-as-content.

### Locked decisions

| Decision | Choice |
|---|---|
| Product name | **Brewlog** |
| Target | Real product — App Store and Play Store, after personal use validates v1 |
| Stack | Expo + React Native + TypeScript |
| v1 scope | **All four pillars** — Brew Lab + Bean Library (lifetime archive + recipes) + Daily Brew + Maintenance |
| v1 brew methods | **Espresso only** |
| Brew Lab input | Manual + timer + milestones (Bluetooth scales deferred to v1.2) |
| Data | Local-first; optional cloud sync added in v1.4 |
| Monetization | Free in v1; pricing decided after launch |
| Visual direction | Earthy Forest — cream paper, deep forest green, Fraunces serif + Inter sans, hand-drawn illustrations |

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

Seven tables for v1, on `expo-sqlite` via Drizzle ORM. All mutable rows include `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete) so v1.4 cloud sync can replicate without schema changes.

### Tables

```ts
beans                     // Lifetime archive — every bean ever tasted
─ id, name (required), roaster, origin, country_code, process,
  variety, roast_level (1–5), roasted_on, altitude_masl,
  start_weight_g, remaining_weight_g,           -- optional inventory
  price_paid_minor, price_paid_currency,        -- optional cost tracking
  flavor_tags (json string[]),  notes,
  status ('active' | 'finished' | 'archived'),  -- default 'active'
  would_buy_again (boolean, nullable),          -- null = not yet decided
  finished_at (timestamp, nullable),            -- set when status flips to 'finished'
  recipe_id (FK → recipes, nullable),           -- the canonical "winning" recipe
  created_at, updated_at, deleted_at

recipes                   // Locked-in canonical recipe per bean (1:1 typically)
─ id, bean_id (FK → beans, UNIQUE in v1),
  source_session_id (FK → brew_sessions),       -- the shot this recipe was distilled from
  dose_g, target_yield_g, duration_target_s,
  grinder_label, grind_setting, water_temp_c, ratio_target,
  notes,                                        -- e.g. "purge 4 turns coarser, then back"
  saved_at,
  created_at, updated_at, deleted_at

brew_sessions             // One espresso shot (the v1 method)
─ id, bean_id (FK → beans), method ('espresso' for v1),
  started_at, ended_at,
  dose_g, yield_g, duration_s,
  pre_infusion_s, first_drop_s,
  grinder_label, grind_setting, water_temp_c,
  rating (1–5), comment,
  machine_id (FK → machines, nullable),         -- which machine pulled it
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

machines                  // Espresso machines, grinders, kettles, etc.
─ id, name (required, e.g. "Lelit Bianca V3"),
  kind ('espresso_machine' | 'grinder' | 'kettle' | 'other'),
  model, vendor,
  acquired_on, notes,
  is_primary (boolean),                         -- default machine for new shots
  created_at, updated_at, deleted_at

maintenance_tasks         // Definition of a recurring care task
─ id, machine_id (FK → machines),
  kind ('backflush' | 'gasket_replace' | 'burr_clean' | 'filter_replace'
        | 'descale' | 'group_screen_clean' | 'custom'),
  label,                                        -- human-readable, e.g. "Backflush group head"
  cadence_kind ('every_n_days' | 'every_n_shots' | 'every_n_liters'),
  cadence_value,                                -- e.g. 7 (days), 200 (shots), 60 (liters)
  notes,
  active (boolean, default true),
  created_at, updated_at, deleted_at

maintenance_logs          // Each completion of a maintenance task
─ id, task_id (FK → maintenance_tasks),
  done_at,
  shots_at_time (snapshot of total shot count when logged, nullable),
  liters_at_time (nullable, for filter tasks),
  notes,
  created_at, deleted_at
```

A separate one-row **`preferences`** table holds user units (g vs oz), default ratio, theme, **daily-cups goal** (default 4, used by the Daily "match daily cups" widget), and **caffeine-target-mg** (optional, default null = caffeine displayed as fact, not tracked toward a goal). No `user_id` columns in v1; they will be added (nullable, defaulting to a single local user) when sync ships in v1.4.

### Indexes

- `beans (deleted_at, status, name)` — Library tab live list (filter by status)
- `beans (deleted_at, would_buy_again)` — "would buy again" filter
- `recipes (bean_id)` — UNIQUE; one canonical recipe per bean in v1
- `brew_sessions (bean_id, started_at DESC)` — bean detail "history with this bean"
- `brew_sessions (deleted_at, started_at DESC)` — history list
- `brew_milestones (session_id, t_seconds)` — session detail render
- `tasting_notes (session_id)` — unique already enforces this
- `machines (deleted_at, is_primary)` — find primary machine for a new shot
- `maintenance_tasks (machine_id, active)` — list per-machine tasks
- `maintenance_logs (task_id, done_at DESC)` — most recent completion (drives "next due" computation)

### Design decisions

| Decision | Rationale |
|---|---|
| **UUIDs everywhere** | Sync-safe. Two devices can create rows offline without ID collisions in v1.4. |
| **All bean fields except `name` are optional** | "I just had a great coffee" should never get blocked by a required-fields wall. Inventory + price are explicitly opt-in for fun-fact tracking. |
| **`status` enum** + auto-managed flips | `active` by default. Auto-flips to `finished` when `remaining_weight_g` hits 0 (if tracked); manual flip available from bean detail. `archived` is a hide-from-library state for cleanup. |
| **`would_buy_again` is nullable** | `null` = not yet decided. `true` / `false` are conscious choices the user makes (usually after a bean is finished). |
| **Recipe is 1:1 with bean in v1** | Defer "morning shot vs weekend lungo" multi-recipe to v1.x. Most beans get one recipe, period. The unique constraint enforces this; if multi-recipe arrives, drop the constraint and add a `name` column. |
| **`recipe_id` denormalized on bean** | Single read on bean detail. Update when recipe is saved/changed. |
| **`flavor_tags` as JSON column** | v1 needs no tag analytics. If later required, add an FTS5 virtual table or migrate. |
| **`remaining_weight_g` denormalized**, decremented per shot when `start_weight_g` is set | Fast list reads. Single update site: the brew-session-saved hook. |
| **Money in minor units + currency** | Standard correct-money pattern; no floats. |
| **Soft delete (`deleted_at`)** | Preserves history for trends; supports race-free sync deletes. List queries always filter `deleted_at IS NULL`. |
| **Maintenance is task + log, not a single denormalized state** | Tasks define the cadence; logs record completions. "Next due" is computed (last log + cadence). Adding a new task type is a single insert; the cadence engine doesn't care. |
| **`maintenance_tasks.cadence_kind` covers three rhythms** | Time (descaling every 60 days), shots (group screen every 200 shots), liters (filter every 60 L). Cleaning rhythm depends on usage, not just the calendar. |
| **`machine_id` on `brew_sessions` is nullable** | Existing v1.0 sessions migrate forward without backfilling. New shots default to `is_primary` machine, if any. |
| **`method` as string** despite v1 espresso-only | Adding V60 in v1.3 needs no new column. |
| **Drizzle migrations**, versioned and committed | Applied on app launch; failures route to schema-mismatch recovery (§7). |

### Pure domain logic (`src/domain/`)

Pure functions tested with vanilla Jest, never touching SQLite:

- `brewRatio(dose, yield) → number` and formatter `1:1.58`
- `extractionPercent(dose, yield, tdsAssumed)` — stand-in until refractometer support (v1.6)
- `validateBean(input) → Result<Bean, Issue[]>` (zod)
- `validateSession(input) → Result<Session, Issue[]>` (zod)
- `validateRecipe(input) → Result<Recipe, Issue[]>` (zod)
- `validateMachine(input) → Result<Machine, Issue[]>` (zod)
- `validateMaintenanceTask(input)` (zod)
- `caffeineForShot(doseG, beanRoastLevel) → mg` — rough estimator
- `nextDueAt(task, lastLog, currentShots, currentLiters) → { dueAt, daysOrShotsRemaining }` — computes when a task is next due (handles all three cadence kinds)
- `tastingRadar(sessions) → { mouthfeel, acidity, sweetness, bitterness, balance }` — averages per-shot tasting notes for a bean (used on bean detail radar chart)
- `cupsTowardGoal(shotsToday, goal) → { filled, total, overshoot }` — drives the Daily "match daily cups" widget
- `costPerShot(bean) → minorUnits | null` — `(price_paid_minor ÷ (start_weight_g ÷ avg_dose_g))` if both are tracked; null otherwise

---

## 4. Screen map and navigation

Four bottom tabs in v1.

```
Tab bar
├── ☕ Daily          → /(tabs)/index
├── 📚 Library        → /(tabs)/library
├── ⚗️ Lab            → /(tabs)/lab
└── 🔧 Care           → /(tabs)/care        (Maintenance)
```

### Tab 1 — Daily Brew

A single scrollable column. Machine readiness comes first; cups come second; recent comes third. Caffeine is a fact, not a goal.

1. **Match daily cups** — a row of espresso-cup illustrations (line-art, single colour). The user's daily-cups goal (default 4, configurable in Settings) defines how many cups are drawn. As shots are pulled today, cups fill in with crema-brown. Past the goal, additional cups appear in `amber`. Caption below: "*N* of *M* · est. *X* mg" (caffeine quietly attached as fact). When *N* = *M* exactly, a tiny "✓ daily cups" tick appears in `forest`.
2. **Machine readiness** — a 1-line status per active maintenance task on the primary machine. Layout: small uppercase label ("Filter", "Backflush"), value ("18 days", "Due in 2 days", or "Overdue 3 days" in `amber`/`danger`). Tap-through goes to the Care tab. If no machine is configured, this section shows a small CTA: "Add a machine in Care to track readiness."
3. **Quick Start** — one prominent "Start an Espresso Shot" button → opens Lab with the last-used bean pre-selected. If that bean has a saved recipe, IdleSetup pre-fills from it.
4. **Recent shots** — last three sessions as mini-cards (rating, ratio, bean, time-ago).

No streaks, no analytics charts on v1. Tasting-evolution charts arrive in v2.

### Tab 2 — Library

The lifetime archive. Default filter is "active" (currently brewing); a segmented control in the header switches between **Active** / **Finished** / **Would buy again** / **All**.

- **List** — scrollable bean cards.
  - Active beans: name (Fraunces heading), subtitle (origin · process · roast), days-since-roast badge, remaining-weight bar (only if `start_weight_g` is set).
  - Finished beans (Finished filter): name, subtitle, "finished *N* days ago", and a tiny `would_buy_again` thumb (forest = yes, paperFaint = no, omitted if null).
- **Empty state** — friendly "Add your first bean" CTA with hand-drawn empty mason jar illustration.
- **Add / Edit** — full screen, not a modal. **Required: `name` only**. Everything else (roaster, origin, weight, price, roast level, etc.) is optional and explicitly labelled "optional" in the form. Inline zod validation.
- **Bean detail** — the deepest screen in the app. Sections, top to bottom:
  1. **Hero** — bean name in serif title; subtitle with origin/process/roast; days-since-roast badge; remaining-weight bar (if tracked); a "would buy again" toggle (thumb-up / thumb-down / not-decided).
  2. **Recipe** — if a canonical recipe is locked in, show the values on a `paperDeep` card: "Dose 18.0 g · Yield 36.0 g · 27.0 s · Grind 3.2 · 93 °C". Caption: "saved from shot on Oct 3, 4★". Edit / clear actions. If no recipe is locked, show a dashed-border tile: "No recipe yet. Pull a great shot, then mark it as the recipe from its session detail."
  3. **Sensory radar** — five-axis radar chart (mouthfeel / acidity / sweetness / bitterness / balance) with values averaged across all this bean's shots. Drawn in `forest`/`forestPale`. Below: a wrap of the most-frequent flavor-tag chips for this bean.
  4. **History** — count of shots + average rating. List of every shot with this bean (most recent first), tap to session detail.
  5. **Fun facts** (only if `start_weight_g` and `price_paid_minor` are tracked) — cost-per-shot, total spent, days-to-empty estimate.
  6. **Lifecycle** — status (Active / Finished / Archived) with manual override; if status is `finished`, show "finished on *date*". Below: soft-delete with undo snackbar.

### Tab 3 — Lab (the v1 hero)

A segmented control in the header switches between **Brew** and **History**.

- **Brew (idle)** — bean chip at top ("Brewing with: [bean ▾]"). If selected bean has a saved recipe, two big steppers (Dose, Target yield) and the grinder/temp values pre-fill from it; a small `forest` "Recipe locked" indicator sits under the chip. If no recipe, defaults to 18 → 36 g, 27 s. Big "Start Shot" button.
- **Brew (running)** — timer + extraction ring. Milestone pill (pre-infusion end, first drop) + Stop Pull. Subtle inner radial gradient inside the ring suggests crema forming.
- **Brew (post-stop)** — tasting-note sheet slides up. Yield, rating, sensory sliders, flavor-tag chips with line-art glyphs (citrus slice next to "citrus", flower next to "jasmine", etc.), free-text notes. Save / Save & log another / Discard.
- **History** — list grouped by day, filterable by bean. Tap → session detail.
- **Session detail** — adds a "Save as the recipe for *bean*" affordance. Tapping it inserts a `recipes` row from this session's values and updates the bean's `recipe_id`. If the bean already has a recipe, the action becomes "Replace recipe" and shows a confirm.

### Tab 4 — Care (Maintenance)

The replacement for the paper notebook's machine-care pages.

- **Home** — a list of active machines (cards on `paperDeep`). Each machine card shows:
  - Machine name + kind (Lelit Bianca · espresso machine)
  - Up to 3 most-imminent tasks with status: "Filter — 18 days left", "Backflush — due in 2 days", "Burr clean — overdue 3 days" (overdue in `danger`)
  - "+ Add machine" tile at the bottom of the list.
- **Machine detail** — drilling into a machine shows:
  - Header with machine name + kind + "Edit"
  - Full task list, each row: label, cadence, last done, next due, "Mark done now" pill button. When tapped, inserts a `maintenance_logs` row stamped with current time + shot count + liter estimate (if applicable). Optional notes prompt before logging.
  - "+ Add task" tile.
- **Add machine** — name (required), kind (espresso machine / grinder / kettle / other), model, vendor, acquired date, `is_primary` toggle, notes.
- **Add task** — pick task kind from a curated list (backflush, gasket replace, burr clean, filter replace, descale, group screen clean, custom), label, cadence (every N days / shots / liters), notes.

### Modals

- **Pick Bean** — searchable list with status filter chips. Empty-state CTA: "Add a new bean →".
- **Tasting Note** — sheet, described above.
- **Settings** — units (g / oz), default ratio, **daily-cups goal**, optional caffeine target, theme (single in v1), about, "Send Diagnostic Report."
- **Recipe save confirm** — when saving from a shot, shows the values about to be locked in plus a free-text "notes" field (e.g. "purge 4 turns coarser, then back").

### First-launch UX

No wizard, no auth wall. App opens to Daily Brew with empty states across all four tabs. Library's empty state has the most prominent CTA — you can't brew before you have a bean. Care's empty state suggests "Add your espresso machine to start tracking maintenance" but is non-blocking; the rest of the app works without a configured machine.

### Header and tab bar styling

- **Header** — serif title in `forest` accent, no shadow, large back tap target on left, settings gear on Daily.
- **Tab bar** — `paper` background, `forest` active label with thin underline, line icons (no filled glyphs). Four tabs require slightly tighter labels at common screen widths; truncate to "Care" rather than "Maintenance".

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
| **Unit** | Jest | `src/domain/`: ratios, extraction %, validators, formatters, caffeine estimator, `nextDueAt`, `tastingRadar`, `cupsTowardGoal`, `costPerShot`. **100% coverage of `domain/`.** | Per-commit (lint-staged) + per-PR |
| **DB** | Jest + Drizzle's `better-sqlite3` driver | Migrations, CRUD across all 7 tables, soft-delete, cascade, denormalized counters, recipe insert + bean.recipe_id update, maintenance log → next-due recompute | Per-PR |
| **State machine** | Jest | Every Brew Lab transition; recovery math; edge cases (Stop while not Pulling = noop). Recipe-pre-fill behaviour from saved bean recipe. **Highest-risk surface; exhaustive.** | Per-PR |
| **Component** | React Native Testing Library | Empty / loading / error / data states for each screen. Key interactions wired up. New surfaces: bean detail recipe section, sensory radar, daily cups widget, machine readiness rows, maintenance log button. | Per-PR |
| **End-to-end** | Maestro | Five smoke flows: (1) first-launch → add bean → start shot → save with notes; (2) kill mid-pull → relaunch → resume; (3) edit + soft-delete a bean with undo; (4) save a shot as the recipe → start a new shot with that bean → assert recipe pre-filled; (5) add a machine + filter task → mark task done → assert "Filter — N days left" appears on Daily. | Nightly + on `main` merge |

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

Maintenance has been promoted into v1; cup-goal visualisation has been promoted into v1; per-bean sensory radar has been promoted into v1.

| Version | Theme |
|---|---|
| **v1.1** | **Multi-recipe per bean** — drop the `recipes` UNIQUE constraint, add `name` + `is_default` to recipes (e.g. "morning shot" vs "weekend lungo"). |
| **v1.2** | **Bluetooth scales** — Acaia / Felicita / Timemore. Real flow curves; live extraction visualization. |
| **v1.3** | **V60 / pour-over** — multi-stage timer (bloom → pulses → drawdown), pour scheduler. |
| **v1.4** | **Cloud sync + small-community sharing** — Supabase + Sign in with Apple/Google. Share a single recipe with a friend via deep link / QR code. Optional Pro tier (RevenueCat) for sync; community sharing is free. |
| **v1.5** | French Press, AeroPress, Moka Pot. |
| **v1.6** | Refractometer integration (TDS log) → real extraction yield %. |
| **v2** | Daily Brew dashboard expansion: caffeine graphs, streaks, weekly insights, taste evolution. |

This sequence is non-binding but shaped v1 data choices: `method` as string (v1.3+), `flavor_tags` as JSON (analytics deferred to v2), `recipes` UNIQUE on `bean_id` (multi-recipe deferred to v1.1).

---

## 12. Assumptions and known gaps

- **No refractometer support in v1.** Extraction-percent ring uses a simple yield-vs-dose model with a configurable factor. This is approximate; real EY% arrives in v1.6.
- **Single-user / single-device assumption in v1.** No `user_id` columns yet; introduced (nullable) in v1.4.
- **Caffeine estimator is rough** — derived from dose × roast-level coefficient. Documented as approximate in the UI.
- **No exports / imports** in v1. Diagnostic report is a debug aid, not a data export. CSV/JSON export ships post-launch (informally tracked, no fixed version).
- **English only in v1.** i18n scaffolding (`react-i18next` with a single `en.json`) is in place from day one; additional locales added when meaningful.

---

## 13. Definition of done for v1

- All four tabs ship with empty / loading / error / data states.
- **Bean Library**: add (name-only path), edit, soft-delete with undo, status filter (Active / Finished / Would buy again / All), would-buy-again toggle, finished-on date.
- **Bean detail**: hero, recipe section (locked / dashed-empty), sensory radar, history list, optional cost-per-shot fun facts, lifecycle controls.
- **Recipes**: save-as-recipe action from session detail; replace-recipe confirm; bean detail surface and Brew Lab pre-fill.
- **Brew Lab**: full state machine including Recovery; tasting note sheet; History tab; recipe pre-fill in IdleSetup when bean has a saved recipe.
- **Daily Brew**: match-daily-cups widget, machine readiness rows (or empty-CTA), Quick Start, recent shots.
- **Care (Maintenance)**: machine list, add machine, machine detail with task list, add task, mark task done. Computed "next due" status (days / shots / liters) drives the row colour (`forest` ok / `amber` due-soon / `danger` overdue).
- **Settings**: units, default ratio, daily-cups goal, optional caffeine target, "Send Diagnostic Report," about.
- Sentry wired; error boundary in place.
- 100% unit coverage of `src/domain/` including new functions (`nextDueAt`, `tastingRadar`, `cupsTowardGoal`, `costPerShot`); state-machine tests exhaustive; **five** Maestro E2E flows green (added: recipe pre-fill, machine readiness).
- App Store and Play Store listings drafted; screenshots captured for all four tabs.
- Accessibility walkthroughs (VoiceOver + TalkBack) signed off.
- Cold start < 1.5 s on iPhone 13; Pulling frame budget ≤ 16 ms verified.
