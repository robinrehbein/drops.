# Drop v1 Expansion Plan — recipes, machines, cups, radar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between the v1 we shipped and the v1 the spec now describes (sweet-spot recipes per bean, machine maintenance, lifetime bean archive, "match daily cups" widget, sensory radar). Path B from the alignment conversation: get the full vision into v1 *before* tagging a release.

**Architecture:** Additive on top of the existing v1 codebase. New tables: `recipes`, `machines`, `maintenance_tasks`, `maintenance_logs`. New columns on `beans`: `status`, `would_buy_again`, `finished_at`, `recipe_id`. New domain functions: `nextDueAt`, `tastingRadar`, `cupsTowardGoal`, `costPerShot`. New tab: **Care** (Maintenance). New surfaces on bean detail: recipe section, radar chart, fun-fact stats.

**Tech Stack:** Same as v1 (Expo + React Native + TypeScript, Drizzle ORM + expo-sqlite, Zustand, TanStack Query, Skia, Maestro). No new dependencies expected.

**Spec:** [`docs/superpowers/specs/2026-05-08-drop-design.md`](../specs/2026-05-08-drop-design.md)

**Original v1 plan:** [`docs/superpowers/plans/2026-05-08-drop-v1.md`](2026-05-08-drop-v1.md) — referenced for patterns; this expansion follows the same conventions (TDD on `domain/`, repo+hooks+screen layering, explicit `git add`, Co-Authored-By trailer).

---

## Phase outline

| Phase | Tasks | Outcome |
|---|---|---|
| E0 — Schema | 1–4 | New tables + bean columns + bumped migration. Test harness updated. |
| E1 — Domain | 5–8 | `nextDueAt`, `tastingRadar`, `cupsTowardGoal`, `costPerShot` (TDD, 100% coverage maintained). |
| E2 — Recipes feature | 9–12 | `recipes` repo + hooks + bean detail integration + Brew Lab pre-fill. |
| E3 — Machines & maintenance | 13–18 | Repos, hooks, Care tab + sub-screens. |
| E4 — Bean lifecycle | 19–21 | Status filter on Library, would-buy-again toggle, finished-on flow. |
| E5 — Daily reframe | 22–24 | Match-daily-cups widget, machine readiness rows, caffeine demoted. |
| E6 — Bean detail | 25–27 | Recipe section, sensory radar, fun-fact stats. |
| E7 — Polish & E2E | 28–31 | New Maestro flows, accessibility re-pass, Visual review against Stitch. |

Each phase ends with `npm run typecheck && npm test` clean before moving on.

---

## Phase E0 — Schema additions

### Task 1: Extend Drizzle schema with new tables and columns

**Files:**
- Modify: `src/db/schema.ts`

**Adds:**

```ts
// Beans gain lifetime-archive fields
export const beans = sqliteTable('beans', {
  // ... existing columns ...
  status: text('status', { enum: ['active', 'finished', 'archived'] }).notNull().default('active'),
  wouldBuyAgain: integer('would_buy_again', { mode: 'boolean' }), // null = undecided
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  recipeId: text('recipe_id'),
  // ... + same indexes already there ...
}, (t) => ({
  byStatusName: index('beans_status_name').on(t.deletedAt, t.status, t.name),
  byWouldBuyAgain: index('beans_wba').on(t.deletedAt, t.wouldBuyAgain),
}));

// New: recipes — 1:1 with bean in v1
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  beanId: text('bean_id').notNull().references(() => beans.id, { onDelete: 'cascade' }),
  sourceSessionId: text('source_session_id').references(() => brewSessions.id, { onDelete: 'set null' }),
  doseG: real('dose_g').notNull(),
  targetYieldG: real('target_yield_g').notNull(),
  durationTargetS: real('duration_target_s'),
  grinderLabel: text('grinder_label'),
  grindSetting: text('grind_setting'),
  waterTempC: real('water_temp_c'),
  ratioTarget: real('ratio_target'),
  notes: text('notes'),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (t) => ({
  byBean: uniqueIndex('recipes_bean_unique').on(t.beanId), // 1:1 enforcement; relaxed in v1.1
}));

// New: machines
export const machines = sqliteTable('machines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['espresso_machine', 'grinder', 'kettle', 'other'] }).notNull(),
  model: text('model'),
  vendor: text('vendor'),
  acquiredOn: integer('acquired_on', { mode: 'timestamp' }),
  notes: text('notes'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (t) => ({
  byPrimary: index('machines_primary').on(t.deletedAt, t.isPrimary),
}));

// New: maintenance_tasks
export const maintenanceTasks = sqliteTable('maintenance_tasks', {
  id: text('id').primaryKey(),
  machineId: text('machine_id').notNull().references(() => machines.id, { onDelete: 'cascade' }),
  kind: text('kind', {
    enum: ['backflush', 'gasket_replace', 'burr_clean', 'filter_replace', 'descale', 'group_screen_clean', 'custom'],
  }).notNull(),
  label: text('label').notNull(),
  cadenceKind: text('cadence_kind', { enum: ['every_n_days', 'every_n_shots', 'every_n_liters'] }).notNull(),
  cadenceValue: integer('cadence_value').notNull(),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (t) => ({
  byMachine: index('mt_machine_active').on(t.machineId, t.active),
}));

// New: maintenance_logs
export const maintenanceLogs = sqliteTable('maintenance_logs', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => maintenanceTasks.id, { onDelete: 'cascade' }),
  doneAt: integer('done_at', { mode: 'timestamp' }).notNull(),
  shotsAtTime: integer('shots_at_time'),
  litersAtTime: real('liters_at_time'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (t) => ({
  byTaskDone: index('ml_task_done').on(t.taskId, t.doneAt),
}));

// brewSessions gains nullable machine_id
export const brewSessions = sqliteTable('brew_sessions', {
  // ... existing columns ...
  machineId: text('machine_id').references(() => machines.id, { onDelete: 'set null' }),
});

// preferences gains daily_cups_goal + caffeine_target_mg
export const preferences = sqliteTable('preferences', {
  // ... existing columns ...
  dailyCupsGoal: integer('daily_cups_goal').notNull().default(4),
  caffeineTargetMg: integer('caffeine_target_mg'), // null = no goal
});
```

- [ ] **Step 1**: Apply the schema edits. Keep existing columns/indexes intact.
- [ ] **Step 2**: `npm run typecheck` — passes.
- [ ] **Step 3**: Generate the new migration: `npm run db:generate` — produces `src/db/migrations/0001_*.sql`.
- [ ] **Step 4**: Bundle: `npm run db:bundle`.
- [ ] **Step 5**: Verify `_journal.json` now lists 2 entries.
- [ ] **Step 6**: Commit explicit (schema + generated migration files + bundle.json + drizzle meta).

### Task 2: Update test harness to seed all 7 tables cleanly

**Files:**
- Modify: `tests/helpers/test-db.ts` (no body changes needed — existing harness applies all migrations from bundle, so v0001 is picked up automatically; just verify)
- Create: `tests/db/expansion-schema.test.ts`

**Tests to add** (verify the schema additions work):

- [ ] `recipes` row with FK to a bean inserts cleanly; UNIQUE(beanId) violation throws on second insert.
- [ ] `recipes` row deletes cascade-delete its child rows on bean deletion.
- [ ] `machines` insert + `is_primary` toggle behaviour (only one primary at a time is enforced in repo logic, not DB; assert the schema accepts multiple `is_primary=true` for now and we'll enforce in repo).
- [ ] `maintenance_tasks` cascade-delete when machine deleted.
- [ ] `maintenance_logs` cascade-delete when task deleted.
- [ ] `brew_sessions.machine_id` accepts NULL (existing rows back-compat).
- [ ] `preferences.daily_cups_goal` defaults to 4.

- [ ] **Step 1**: Write the failing tests.
- [ ] **Step 2**: Run, confirm pass (no implementation needed — schema does the heavy lift).
- [ ] **Step 3**: Commit.

### Task 3: Backfill primary machine on existing brew_sessions (data migration step)

For users upgrading from v1.0, existing sessions have no `machine_id`. That's fine (nullable). New shots default to the primary machine when one exists. No backfill needed; tests pass with NULL.

- [ ] **Step 1**: Verify existing `tests/features/brew/repo.test.ts` still passes (sessions with `machine_id: null` work).
- [ ] **Step 2**: No commit if tests pass; otherwise patch the repo to default `machine_id` correctly.

### Task 4: Update existing schema integration test

- [ ] **Step 1**: Modify `tests/db/schema.test.ts` — confirm the existing cascade/restrict/unique tests still pass with the new schema (no behaviour change for the existing 4 tables).
- [ ] **Step 2**: Commit if any adjustments were needed.

---

## Phase E1 — New domain functions (TDD)

### Task 5: `nextDueAt` — maintenance cadence engine

**Files:**
- Create: `src/domain/maintenance.ts`, `tests/domain/maintenance.test.ts`

```ts
export type Cadence =
  | { kind: 'every_n_days'; value: number }
  | { kind: 'every_n_shots'; value: number }
  | { kind: 'every_n_liters'; value: number };

export type DueState = {
  dueAt: Date | null;        // for time-based cadences
  remainingShots: number | null;
  remainingLiters: number | null;
  isOverdue: boolean;
  isDueSoon: boolean;        // within 20% of cadence
  status: 'ok' | 'due_soon' | 'overdue';
};

export function nextDueAt(args: {
  cadence: Cadence;
  lastDoneAt: Date | null;
  currentShots: number;
  currentLiters: number;
  now?: Date;
}): DueState;
```

Behaviour:
- If `lastDoneAt` is null → `status = 'overdue'` immediately (task has never been done).
- For `every_n_days`: `dueAt = lastDoneAt + N days`. `isDueSoon` if within 20%.
- For `every_n_shots` and `every_n_liters`: `lastDoneAt`'s shots/liters snapshot is the baseline; subtract.
- Tests cover each cadence, the just-completed case, the overdue case, the due-soon case.

- [ ] **Step 1**: Write failing tests (≥10 cases).
- [ ] **Step 2**: Run, confirm fail.
- [ ] **Step 3**: Implement; cover all branches.
- [ ] **Step 4**: 100% coverage on `maintenance.ts`.
- [ ] **Step 5**: Commit.

### Task 6: `tastingRadar` — per-bean sensory averages

**Files:**
- Create: `src/domain/tasting.ts`, `tests/domain/tasting.test.ts`

```ts
export type RadarFingerprint = {
  mouthfeel: number;        // 0..5, NaN if no data
  acidity: number;
  sweetness: number;
  bitterness: number;
  balance: number;
  shotCount: number;
};

export function tastingRadar(notes: TastingNoteRow[]): RadarFingerprint;
```

- Average each axis across all notes that have a value (treat null as missing, not 0).
- `shotCount` reflects how many notes contributed.
- If no notes, returns all zeros + `shotCount: 0`.

- [ ] TDD cycle. 100% coverage. Commit.

### Task 7: `cupsTowardGoal` — Daily cups widget driver

**Files:**
- Create: `src/domain/cups.ts`, `tests/domain/cups.test.ts`

```ts
export type CupsState = {
  filled: number;       // shots pulled today
  goal: number;
  overshoot: number;    // shots above goal (0 if at or below)
  hitExact: boolean;    // filled === goal
};

export function cupsTowardGoal(shotsToday: number, goal: number): CupsState;
```

- Pure function. Covers `goal=0` (degenerate), `filled > goal` (overshoot), `filled === goal` (hitExact), negative inputs (clamp to 0).

- [ ] TDD cycle. 100% coverage. Commit.

### Task 8: `costPerShot` — bean fun-facts

**Files:**
- Create: `src/domain/fun-facts.ts`, `tests/domain/fun-facts.test.ts`

```ts
export function costPerShot(args: {
  pricePaidMinor: number | null;
  startWeightG: number | null;
  avgDoseG: number;
}): number | null;       // null if any required input is missing
```

- Returns `(pricePaidMinor / (startWeightG / avgDoseG))` rounded to nearest minor unit (cent).
- Returns `null` if any input is null or zero.
- Tests cover both "all inputs present" and "missing input → null".

- [ ] TDD cycle. 100% coverage. Commit.

---

## Phase E2 — Recipes feature

### Task 9: Recipes repo + types

**Files:**
- Create: `src/features/recipes/types.ts`, `src/features/recipes/repo.ts`
- Test: `tests/features/recipes/repo.test.ts`

API:

```ts
export type RecipesRepo = {
  getRecipeForBean: (beanId: string) => Promise<RecipeRow | null>;
  saveRecipeFromSession: (
    beanId: string,
    sessionId: string,
    overrides?: Partial<RecipeInsert>,
  ) => Promise<RecipeRow>;        // upsert: replace if one exists
  clearRecipeForBean: (beanId: string) => Promise<void>;
};
```

Behaviour:
- `saveRecipeFromSession` reads the session, distills its values (dose, yield, durationS, grinderLabel, grindSetting, waterTempC), and either inserts a new `recipes` row or soft-deletes the existing one and inserts a fresh one. **Always updates `beans.recipe_id` to the new recipe's id.**
- `clearRecipeForBean` soft-deletes the recipe and sets `beans.recipe_id = null`.

- [ ] TDD cycle. 7+ tests covering: save fresh, replace existing, clear, FK cascade on bean delete. Commit.

### Task 10: Recipes hooks (TanStack Query)

**Files:**
- Create: `src/features/recipes/hooks.ts`

Hooks:
- `useRecipeForBean(beanId)`
- `useSaveRecipeFromSession()` — mutation, invalidates `['recipes', beanId]` and `['beans', beanId]`
- `useClearRecipe()` — mutation, same invalidations

- [ ] Implement. Typecheck. Commit.

### Task 11: Brew Lab IdleSetup recipe pre-fill

**Files:**
- Modify: `app/(tabs)/lab/index.tsx`, `src/features/brew/store.ts` (or wherever the IdleSetup defaults live)

**Behaviour change:**
- When user picks a bean (or app boots with a previously selected bean), check `useRecipeForBean(beanId)`.
- If a recipe exists, set the brew store's draft to recipe values (dose, yield, grindSetting, waterTempC).
- Show a small `forest`-coloured "Recipe locked" indicator under the bean chip with a tap-to-clear action that confirms before clearing.
- If no recipe, fall back to last-used or 18→36 g default.

- [ ] Implement. Add a test in `tests/features/brew/store.test.ts` for the configure-from-recipe path. Commit.

### Task 12: "Save as recipe" affordance on session detail

**Files:**
- Modify: `app/(tabs)/lab/session/[id].tsx`

Add at the bottom of the session detail screen:
- If the session's bean has no recipe → primary pill "Save as recipe for this bean"
- If the session's bean already has a recipe → ghost pill "Replace bean's recipe with this shot"

Both trigger a confirm sheet showing the values to be saved + an optional `notes` field. On confirm, calls `useSaveRecipeFromSession` and shows a snackbar "Recipe saved · Yirgacheffe Konga".

- [ ] Implement. Commit.

---

## Phase E3 — Machines & maintenance

### Task 13: Machines repo + types + hooks

**Files:**
- Create: `src/features/machines/types.ts`, `src/features/machines/repo.ts`, `src/features/machines/hooks.ts`
- Test: `tests/features/machines/repo.test.ts`

API:
- `listMachines()` — live, ordered by `is_primary DESC, name ASC`
- `getMachine(id)`
- `addMachine(input)` — sets `is_primary=true` if no other primary exists
- `updateMachine(id, patch)`
- `setPrimary(id)` — clears `is_primary` on all others, sets on this one
- `softDeleteMachine(id)` — also soft-deletes child tasks via cascade-equivalent logic in repo (not via DB cascade since soft-delete doesn't trigger ON DELETE CASCADE)

- [ ] TDD. ~8 tests. Commit.

### Task 14: Maintenance tasks repo + hooks

**Files:**
- Create: `src/features/maintenance/types.ts`, `src/features/maintenance/tasks-repo.ts`, `src/features/maintenance/hooks.ts`
- Test: `tests/features/maintenance/tasks-repo.test.ts`

API:
- `listTasks(machineId)`
- `addTask(input)`
- `updateTask(id, patch)`
- `deactivateTask(id)` — sets `active=false` instead of soft-delete
- `getTaskWithLastLog(id) → { task, lastLog: MaintenanceLogRow | null }`

- [ ] TDD. Commit.

### Task 15: Maintenance logs repo + hooks

**Files:**
- Create: `src/features/maintenance/logs-repo.ts`
- Test: `tests/features/maintenance/logs-repo.test.ts`

API:
- `logCompletion(taskId, args: { doneAt?, notes?, shotsAtTime?, litersAtTime? })` — defaults `doneAt = now`, snapshots current shots count from `brew_sessions` if relevant
- `lastLogFor(taskId)`
- `logsFor(taskId)`

- [ ] TDD. Commit.

### Task 16: Care tab home screen

**Files:**
- Create: `app/(tabs)/care/_layout.tsx`, `app/(tabs)/care/index.tsx`
- Modify: `app/(tabs)/_layout.tsx` (add the 4th tab)

Implements the Care tab home: machine list cards. Each card shows the machine's 3 most-imminent tasks with computed "next due" labels (using `nextDueAt`). Empty state: "Add your espresso machine" CTA.

Tab bar now has 4 tabs: Daily / Library / Lab / Care. Use a wrench line-icon for Care.

- [ ] Implement. Commit.

### Task 17: Machine detail screen + add machine + add task

**Files:**
- Create: `app/(tabs)/care/[id].tsx`, `app/(tabs)/care/new-machine.tsx`, `app/(tabs)/care/[id]/new-task.tsx`

Per the spec:
- Machine detail: header with name + kind, "Edit" link, full task list with "Mark done" pill on each row, "+ Add task" tile.
- Add machine form: name (req), kind, model, vendor, acquired date, is_primary toggle, notes.
- Add task form: kind (curated picker), label, cadence picker (kind + value), notes.

- [ ] Implement. Commit.

### Task 18: "Mark done" sheet for a task

**Files:**
- Create: `app/(modals)/log-task.tsx`

Modal sheet with: optional notes field, current snapshot values (shots, liters if applicable), confirm pill. Calls `useLogCompletion`.

- [ ] Implement. Commit.

---

## Phase E4 — Bean lifecycle (Library updates)

### Task 19: Add `beans` repo methods for status + would-buy-again

**Files:**
- Modify: `src/features/beans/repo.ts`, `tests/features/beans/repo.test.ts`

Adds:
- `setStatus(id, status: 'active' | 'finished' | 'archived')` — also stamps `finished_at` when status flips to `finished`
- `setWouldBuyAgain(id, value: boolean | null)`
- `listBeans({ status?: 'active' | 'finished' | 'archived' | 'all', wouldBuyAgain?: boolean })`

Auto-flip rule: when a session's `finalizeWithNotes` decrements `remaining_weight_g` to <= 0 and `start_weight_g` was tracked, auto-flip status to `finished` and stamp `finished_at`.

- [ ] TDD additions. Update existing repo tests to filter by status. Commit.

### Task 20: Library list status filter chips

**Files:**
- Modify: `app/(tabs)/library/index.tsx`

Add a segmented-control / chip row above the list: **Active** (default) / **Finished** / **Would buy again** / **All**. Filter `useBeans` accordingly. Cards adapt:
- Active: existing layout
- Finished: subtitle becomes "finished N days ago"; show would-buy-again thumb instead of remaining-weight bar
- Would-buy-again: same as Finished but only those marked `true`
- All: shows everything in `created_at DESC` order

- [ ] Implement. Commit.

### Task 21: Bean detail lifecycle controls

**Files:**
- Modify: `app/(tabs)/library/[id].tsx`

Add at the bottom (above Delete):
- Status segmented control (Active / Finished / Archived) with manual override
- Would-buy-again toggle (👍 / 👎 / "not yet decided")
- "Finished on *date*" line if status is `finished`

- [ ] Implement. Commit.

---

## Phase E5 — Daily reframe

### Task 22: Daily cups widget primitive

**Files:**
- Create: `src/ui/primitives/CupsRow.tsx`
- Test: `tests/ui/primitives/CupsRow.test.tsx`

Renders a row of espresso-cup line-art glyphs. Accepts `filled`, `goal`, `overshoot` (from `cupsTowardGoal`). Filled cups have crema-brown fill; empty cups are outlined. Past-goal cups appear in `amber`. Caption below: "*N* of *M*" plus optional caffeine "· est. X mg".

- [ ] Snapshot/render test. Commit.

### Task 23: Machine readiness rows on Daily

**Files:**
- Create: `src/features/dashboard/readiness.ts`, `tests/features/dashboard/readiness.test.ts`

Pure-ish reader that computes the "readiness" rows for the primary machine:
- Reads primary machine + all its active tasks
- For each task, computes `nextDueAt`
- Returns the 3 most-imminent (sorted by overdue first, then days/shots remaining ASC)
- Returns `null` if no primary machine

- [ ] TDD. Commit.

### Task 24: Daily Brew screen reframe

**Files:**
- Modify: `app/(tabs)/index.tsx`

New layout per the spec:
1. Match-daily-cups widget (primary)
2. Machine readiness rows (or empty CTA)
3. Quick Start
4. Recent shots

Caffeine total moves from a primary stat to a fun fact attached to the cups caption.

- [ ] Implement. Commit.

---

## Phase E6 — Bean detail enrichment

### Task 25: Recipe section on bean detail

**Files:**
- Modify: `app/(tabs)/library/[id].tsx`
- Possibly create: `src/ui/primitives/RecipeCard.tsx`

If `useRecipeForBean(beanId).data` is non-null, render a RecipeCard showing dose, yield, duration, grind, temp, source-session reference + saved-at, edit/clear buttons. Else render a dashed-border tile with "No recipe yet. Pull a great shot, then mark it as the recipe from its session detail."

- [ ] Implement. Commit.

### Task 26: Sensory radar primitive (Skia)

**Files:**
- Create: `src/ui/primitives/SensoryRadar.tsx`
- Test: `tests/ui/primitives/SensoryRadar.test.tsx`

Skia-rendered five-axis radar chart. Accepts `RadarFingerprint`. Five spokes labelled "mouthfeel / acidity / sweetness / bitterness / balance". Background pentagon in `paperEdge`; fingerprint polygon filled `forestPale` with `forest` border. Labels in `label` style (`inkSoft`).

- [ ] Render test (asserts presence of label text). Commit.

### Task 27: Wire radar + fun-facts into bean detail

**Files:**
- Modify: `app/(tabs)/library/[id].tsx`

Add SensoryRadar (driven by `useSessionsForBean(beanId)` + `tastingRadar`). Below it, if `start_weight_g` and `price_paid_minor` are tracked: show "FUN FACTS" section with cost-per-shot + total-spent + days-to-empty estimate.

- [ ] Implement. Commit.

---

## Phase E7 — Polish & E2E

### Task 28: Maestro flow — recipe pre-fill

**Files:**
- Create: `.maestro/flows/04-recipe-prefill.yaml`

Flow: add bean → pull a shot at non-default values → save as recipe → start a new shot with the same bean → assert dose/yield steppers show recipe values.

- [ ] Write + commit.

### Task 29: Maestro flow — machine readiness

**Files:**
- Create: `.maestro/flows/05-machine-readiness.yaml`

Flow: open Care → add a machine → add a "Backflush" task with `every_n_days: 7` → mark done → go to Daily → assert "Backflush — 7 days left" appears.

- [ ] Write + commit.

### Task 30: Accessibility audit on the new surfaces

**Files:**
- Various (Care screens, recipe section, cups widget, radar)

Verify:
- All Pressables have `accessibilityRole="button"` + `accessibilityLabel`.
- Radar chart has an `accessibilityLabel` summarising the fingerprint ("Mouthfeel 4, acidity 3.2, ...").
- Cups widget has `accessibilityLabel="3 of 4 espresso shots today"`.
- Status filter chips on Library are radio-group accessible.

- [ ] Pass + commit any fixes.

### Task 31: Visual reconciliation against Stitch

**Files:**
- (none necessarily; may inform tweaks)

Side-by-side review of the 4 generated Stitch screens (Daily, Library, Lab Pulling, Tasting Note, Bean detail with recipe, Care home) vs. the actual app on device. List concrete deltas; pick 2–3 highest-impact ones to implement.

Common likely outcomes:
- Spacing rhythm is too tight on Daily — add more whitespace between widgets
- Bean card thumbnail needs real illustrative art (per the brief's visual storytelling section)
- Radar chart weight + colour vs. the Stitch version
- Pill button proportion vs. label width

- [ ] Document deltas in `docs/superpowers/notes/2026-05-08-stitch-reconciliation.md`. Apply the high-impact ones. Commit.

---

## Self-review

After implementing the plan, this expansion should:

- ✅ All four pillars covered in v1 (Daily / Library / Lab / Care).
- ✅ Bean Library is a lifetime archive (status, would_buy_again, finished_at).
- ✅ Sweet-spot recipe per bean — saved from session, pre-filled into Brew Lab.
- ✅ Machine maintenance with three cadence kinds (days / shots / liters).
- ✅ Match-daily-cups widget with goal from preferences.
- ✅ Sensory radar per bean.
- ✅ Optional cost-per-shot fun facts when inventory + price are tracked.
- ✅ 100% domain coverage maintained (4 new pure functions added).
- ✅ Maestro flows: 5 total (3 original + 2 new).
- ✅ Accessibility audit passes on new surfaces.

---

## Execution handoff

Plan complete and saved. Two execution options:

**1. Subagent-driven (recommended)** — same approach as the original v1 plan: dispatch a fresh subagent per task, review between tasks, parallel batches where files don't overlap. Estimate ~6–10 hours of agent dispatching + your review.

**2. Inline execution** — work through tasks in this session using `executing-plans`. Slower wall-clock, more direct control.

Which approach?
