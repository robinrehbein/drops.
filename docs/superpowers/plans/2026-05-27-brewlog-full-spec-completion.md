# Brewlog Full-Spec Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between the shipped Brewlog code and the approved v1 spec (`docs/superpowers/specs/2026-05-08-brewlog-design.md`) — add per-bean **recipes**, the **Care/Maintenance** pillar (machines + tasks + logs + Care tab), **bean lifecycle** (status / would-buy-again / finished), the **sensory radar**, and the **daily-cups** widget.

**Architecture:** Existing layered Expo + RN + TS app. Pure `src/domain/` (validators + math, 100% covered) → `src/db/` (Drizzle + expo-sqlite, migration-bundle pattern) → `src/features/<x>/repo.ts` factory + `hooks.ts` (TanStack Query) → `app/` Expo Router screens + `src/ui/` bespoke primitives. New work follows these exact patterns — no new libraries.

**Tech Stack:** Drizzle ORM + expo-sqlite · zod (validators return `Result<T, Issue[]>`, never throw) · TanStack Query · Zustand · @shopify/react-native-skia (radar) · date-fns · Jest + better-sqlite3 harness + RNTL.

---

## VERIFICATION GATES (run after EVERY task — from project memory `brewlog-execution-gotchas`)

1. `npm run typecheck` — must pass (catches zod-4 `PropertyKey[]` symbol bleed; `exactOptionalPropertyTypes` null/undefined drift).
2. `npm test` — FULL suite, never `--passWithNoTests`.
3. If any `src/domain/**` file changed: `npm run test:coverage` and confirm `src/domain/` stays at **100%**.
4. Schema changed → regenerate migration + bundle (Task 1 procedure) before running DB tests; the better-sqlite3 harness reads `bundle.json`.

Each task ends with all three (or four) gates green before the next task. Commit after each task.

---

## File Structure

**New domain files** (`src/domain/`, pure, TDD):
- `validators/recipe.ts` — `validateRecipe`, `RecipeInput`, `RecipeIssue`
- `validators/machine.ts` — `validateMachine`, `MachineInput`, `MachineIssue`
- `validators/maintenance.ts` — `validateMaintenanceTask`, `MaintenanceTaskInput`, `MaintenanceTaskIssue`
- `maintenance.ts` — `nextDueAt(...)`
- `tasting.ts` — `tastingRadar(...)`
- `cups.ts` — `cupsTowardGoal(...)`
- `cost.ts` — `costPerShot(...)`

**New feature modules** (`src/features/`):
- `recipes/{repo,hooks,types}.ts`
- `machines/{repo,hooks,types}.ts`
- `maintenance/{repo,hooks,types}.ts`

**Modified features:** `beans/{repo,hooks,types}.ts` · `brew/repo.ts` · `preferences/{repo,hooks}.ts` · `_provider/repos.ts`

**New UI primitives** (`src/ui/primitives/`): `SensoryRadar.tsx` · `CupsRow.tsx` · `RecipeCard.tsx` · `MachineCard.tsx` · `ReadinessRow.tsx`

**New screens** (`app/`): `(tabs)/care/{_layout,index,[id],new,add-task}.tsx` · `(modals)/recipe-save.tsx`
**Modified screens:** `(tabs)/_layout.tsx` · `(tabs)/index.tsx` · `(tabs)/library/{index,[id]}.tsx` · `(tabs)/lab/{index,session/[id]}.tsx` · `(modals)/settings.tsx`

---

# PHASE A — Schema + migration foundation

Everything downstream depends on these columns/tables. Do this phase strictly sequentially.

### Task 1: Extend `src/db/schema.ts` — recipes, machines, maintenance, bean lifecycle, prefs

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add new columns to `beans` table** (inside the existing `beans` column object, before `createdAt`):

```ts
    status: text('status').notNull().default('active'), // 'active' | 'finished' | 'archived'
    wouldBuyAgain: integer('would_buy_again', { mode: 'boolean' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    recipeId: text('recipe_id'), // FK → recipes.id, set when a canonical recipe is locked in
```

Add to the `beans` index builder:
```ts
    byStatusLive: index('beans_status_live').on(t.deletedAt, t.status, t.name),
```

- [ ] **Step 2: Add `machineId` to `brewSessions`** (after `comment`):

```ts
    machineId: text('machine_id'),
```

- [ ] **Step 3: Append new tables** at the end of the file:

```ts
/* Canonical locked-in recipe per bean (1:1 in v1) */
export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    beanId: text('bean_id')
      .notNull()
      .references(() => beans.id, { onDelete: 'cascade' }),
    sourceSessionId: text('source_session_id').references(() => brewSessions.id, {
      onDelete: 'set null',
    }),
    doseG: real('dose_g'),
    targetYieldG: real('target_yield_g'),
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
  },
  (t) => ({
    byBean: uniqueIndex('recipes_bean_unique').on(t.beanId),
  }),
);

/* Machines, grinders, kettles */
export const machines = sqliteTable(
  'machines',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    kind: text('kind').notNull(), // 'espresso_machine' | 'grinder' | 'kettle' | 'other'
    model: text('model'),
    vendor: text('vendor'),
    acquiredOn: integer('acquired_on', { mode: 'timestamp' }),
    notes: text('notes'),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byPrimaryLive: index('machines_primary_live').on(t.deletedAt, t.isPrimary),
  }),
);

/* Recurring maintenance task definitions */
export const maintenanceTasks = sqliteTable(
  'maintenance_tasks',
  {
    id: text('id').primaryKey(),
    machineId: text('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'backflush'|'gasket_replace'|'burr_clean'|'filter_replace'|'descale'|'group_screen_clean'|'custom'
    label: text('label').notNull(),
    cadenceKind: text('cadence_kind').notNull(), // 'every_n_days'|'every_n_shots'|'every_n_liters'
    cadenceValue: real('cadence_value').notNull(),
    notes: text('notes'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byMachineActive: index('maintenance_tasks_machine_active').on(t.machineId, t.active),
  }),
);

/* Completion log per maintenance task */
export const maintenanceLogs = sqliteTable(
  'maintenance_logs',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => maintenanceTasks.id, { onDelete: 'cascade' }),
    doneAt: integer('done_at', { mode: 'timestamp' }).notNull(),
    shotsAtTime: integer('shots_at_time'),
    litersAtTime: real('liters_at_time'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byTaskDone: index('maintenance_logs_task_done').on(t.taskId, t.doneAt),
  }),
);
```

- [ ] **Step 4: Add preferences columns** (inside `preferences` object before `updatedAt`):

```ts
  dailyCupsGoal: integer('daily_cups_goal').notNull().default(4),
  caffeineTargetMg: integer('caffeine_target_mg'),
```

- [ ] **Step 5: typecheck** — `npm run typecheck` → PASS.

### Task 2: Generate migration + bundle, verify harness boots

**Files:**
- Create: `src/db/migrations/0003_*.sql` + `meta/0003_snapshot.json` (drizzle-kit output)
- Modify: `src/db/migrations/bundle.json`, `meta/_journal.json` (generated)

- [ ] **Step 1: Generate** — `npm run db:prepare` (runs `drizzle-kit generate` then `node scripts/build-migrations-bundle.js`). Expected: new `0003_*` files, "Wrote 4 migrations to bundle.json".
- [ ] **Step 2: Inspect** the generated `0003_*.sql` — confirm it `CREATE TABLE recipes/machines/maintenance_tasks/maintenance_logs` and `ALTER TABLE beans ADD COLUMN status ...` etc. SQLite ALTER with `NOT NULL DEFAULT 'active'` is valid; verify no `ADD COLUMN ... NOT NULL` without default (would fail on existing rows).
- [ ] **Step 3: Run DB tests** — `npm test -- tests/db` → harness builds all tables from bundle, PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(schema): recipes, machines, maintenance, bean lifecycle, prefs columns"`.

### Task 3: Schema integration tests for the new tables

**Files:**
- Modify: `tests/db/schema.test.ts`

- [ ] **Step 1: Add tests** covering: insert recipe + read back; `recipes_bean_unique` rejects a 2nd recipe for same bean; deleting a bean cascades its recipe; insert machine with `isPrimary` boolean round-trips as `true/false`; maintenance_task → log cascade on task delete; `wouldBuyAgain` nullable boolean round-trips (`null`, `true`, `false`); `beans.status` defaults to `'active'`. Follow existing assertions style in the file.
- [ ] **Step 2:** `npm test -- tests/db/schema.test.ts` → PASS. Then full `npm test` + `npm run typecheck`. Commit.

---

# PHASE B — Pure domain layer (TDD, 100% coverage)

Each task: write failing test → run (FAIL) → implement → run (PASS) → add export to `src/domain/index.ts` → `npm run test:coverage` (domain 100%) → commit.

### Task 4: `validateRecipe` (zod)

**Files:** Create `src/domain/validators/recipe.ts`, `tests/domain/validators/recipe.test.ts`; Modify `src/domain/index.ts`.

- [ ] **Step 1 — failing test** (`tests/domain/validators/recipe.test.ts`):

```ts
import { validateRecipe } from '@/domain/validators/recipe';

describe('validateRecipe', () => {
  it('accepts a recipe with only beanId', () => {
    const r = validateRecipe({ beanId: 'b1' });
    expect(r.ok).toBe(true);
  });
  it('rejects missing beanId', () => {
    const r = validateRecipe({ doseG: 18 });
    expect(r.ok).toBe(false);
  });
  it('rejects negative dose', () => {
    const r = validateRecipe({ beanId: 'b1', doseG: -1 });
    expect(r.ok).toBe(false);
  });
  it('rejects waterTempC above 100', () => {
    expect(validateRecipe({ beanId: 'b1', waterTempC: 130 }).ok).toBe(false);
  });
});
```

- [ ] **Step 2 — implement** (`src/domain/validators/recipe.ts`) — mirror `bean.ts` exactly (zod object, `Result`, symbol-filtered path):

```ts
import { z } from 'zod';
import { type Result, err, ok } from '@/domain/result';

export const recipeInputSchema = z.object({
  beanId: z.string().trim().min(1, 'beanId is required'),
  sourceSessionId: z.string().trim().min(1).optional(),
  doseG: z.number().positive().max(100).optional(),
  targetYieldG: z.number().positive().max(500).optional(),
  durationTargetS: z.number().positive().max(600).optional(),
  grinderLabel: z.string().trim().max(120).optional(),
  grindSetting: z.string().trim().max(60).optional(),
  waterTempC: z.number().min(1).max(100).optional(),
  ratioTarget: z.number().positive().max(20).optional(),
  notes: z.string().max(2000).optional(),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type RecipeIssue = { path: (string | number)[]; message: string };

export function validateRecipe(input: unknown): Result<RecipeInput, RecipeIssue[]> {
  const parsed = recipeInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}
```

Add `export * from './validators/recipe';` to `src/domain/index.ts`.
- [ ] **Step 3:** test PASS, `npm run test:coverage` domain 100%, commit.

### Task 5: `validateMachine` (zod)

**Files:** Create `src/domain/validators/machine.ts`, `tests/domain/validators/machine.test.ts`; Modify `src/domain/index.ts`.

- [ ] Tests: accepts `{ name, kind:'espresso_machine' }`; rejects empty name; rejects unknown kind; accepts optional model/vendor/acquiredOn(date)/notes/isPrimary(boolean).
- [ ] Implement mirroring `bean.ts`:

```ts
export const machineInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  kind: z.enum(['espresso_machine', 'grinder', 'kettle', 'other']),
  model: z.string().trim().max(120).optional(),
  vendor: z.string().trim().max(120).optional(),
  acquiredOn: z.date().optional(),
  notes: z.string().max(2000).optional(),
  isPrimary: z.boolean().optional(),
});
export type MachineInput = z.infer<typeof machineInputSchema>;
export type MachineIssue = { path: (string | number)[]; message: string };
// validateMachine: identical Result/err/ok shape as validateRecipe
```

Export from index. Test PASS, coverage 100%, commit.

### Task 6: `validateMaintenanceTask` (zod)

**Files:** Create `src/domain/validators/maintenance.ts`, `tests/domain/validators/maintenance.test.ts`; Modify `src/domain/index.ts`.

- [ ] Tests: accepts `{ machineId, kind:'backflush', label:'Backflush', cadenceKind:'every_n_days', cadenceValue:7 }`; rejects missing machineId/label; rejects unknown kind/cadenceKind; rejects `cadenceValue <= 0`.
- [ ] Implement:

```ts
export const maintenanceTaskInputSchema = z.object({
  machineId: z.string().trim().min(1, 'machineId is required'),
  kind: z.enum([
    'backflush', 'gasket_replace', 'burr_clean', 'filter_replace',
    'descale', 'group_screen_clean', 'custom',
  ]),
  label: z.string().trim().min(1, 'label is required').max(120),
  cadenceKind: z.enum(['every_n_days', 'every_n_shots', 'every_n_liters']),
  cadenceValue: z.number().positive(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});
export type MaintenanceTaskInput = z.infer<typeof maintenanceTaskInputSchema>;
export type MaintenanceTaskIssue = { path: (string | number)[]; message: string };
// validateMaintenanceTask: identical Result shape
```

Export, test PASS, coverage 100%, commit.

### Task 7: `nextDueAt` (maintenance cadence engine)

**Files:** Create `src/domain/maintenance.ts`, `tests/domain/maintenance.test.ts`; Modify `src/domain/index.ts`.

- [ ] **Signature & types:**

```ts
export type CadenceKind = 'every_n_days' | 'every_n_shots' | 'every_n_liters';
export type DueStatus = 'ok' | 'due_soon' | 'overdue';

export type NextDueInput = {
  cadenceKind: CadenceKind;
  cadenceValue: number;
  lastDoneAt: Date | null;       // null = never done
  lastDoneShots: number | null;  // shot count snapshot at last completion
  lastDoneLiters: number | null; // liters snapshot at last completion
  currentShots: number;
  currentLiters: number;
  now: Date;
};

export type NextDue = {
  unit: 'days' | 'shots' | 'liters';
  remaining: number;             // can be negative when overdue
  dueAt: Date | null;            // only for every_n_days; null otherwise
  status: DueStatus;
};
```

- [ ] **Behavior (tests assert all):**
  - `every_n_days`: `elapsedDays = floor((now - (lastDoneAt ?? now)) / 1 day)`; `remaining = cadenceValue - elapsedDays`; `dueAt = (lastDoneAt ?? now) + cadenceValue days`. Never done → treat `lastDoneAt = now` so `remaining = cadenceValue`, status `ok`.
  - `every_n_shots`: base = `lastDoneShots ?? currentShots`; `used = currentShots - base`; `remaining = cadenceValue - used`; `dueAt = null`.
  - `every_n_liters`: base = `lastDoneLiters ?? currentLiters`; analogous; `dueAt = null`.
  - **status:** `remaining < 0` → `overdue`; `remaining <= ceil(cadenceValue * 0.15)` (and `>= 0`) → `due_soon`; else `ok`.
- [ ] Test cases: never-done returns ok with remaining=cadence; exactly due (remaining 0) → due_soon; overdue negative → overdue; due_soon threshold boundary; each cadence kind. Implement, export, coverage 100%, commit.

### Task 8: `tastingRadar` (per-bean sensory averages)

**Files:** Create `src/domain/tasting.ts`, `tests/domain/tasting.test.ts`; Modify `src/domain/index.ts`.

- [ ] **Signature:**

```ts
export type TastingAxes = { mouthfeel: number; acidity: number; sweetness: number; bitterness: number; balance: number };
export type TastingNoteLike = Partial<TastingAxes>;

// Averages each axis across notes that have that axis set (1–5). Returns null if no notes
// contribute any axis. Each axis independently averages only its non-null values; an axis
// with zero values is 0. Rounds to 1 decimal.
export function tastingRadar(notes: TastingNoteLike[]): TastingAxes | null;
```

- [ ] Tests: empty array → null; single full note → same values; two notes average per axis; notes with some null axes average only present values; rounding to 1 decimal. Implement, export, coverage 100%, commit.

### Task 9: `cupsTowardGoal` + `costPerShot`

**Files:** Create `src/domain/cups.ts`, `src/domain/cost.ts`, `tests/domain/cups.test.ts`, `tests/domain/cost.test.ts`; Modify `src/domain/index.ts`.

- [ ] **cups.ts:**

```ts
export type CupsProgress = { filled: number; total: number; overshoot: number };
// filled = min(shotsToday, goal); total = goal; overshoot = max(0, shotsToday - goal).
// goal coerced to min 1. shotsToday coerced to min 0.
export function cupsTowardGoal(shotsToday: number, goal: number): CupsProgress;
```
Tests: 0/4 → {0,4,0}; 2/4 → {2,4,0}; 4/4 → {4,4,0}; 6/4 → {4,4,2}; goal 0 coerced to 1.

- [ ] **cost.ts:**

```ts
// Cost per shot in minor currency units, or null if inputs missing/invalid.
// shots = startWeightG / avgDoseG; costPerShot = pricePaidMinor / shots (rounded).
export function costPerShot(args: {
  pricePaidMinor: number | null;
  startWeightG: number | null;
  avgDoseG: number | null;
}): number | null;
```
Tests: full inputs (e.g. 1500 minor, 250 g, 18 g → round(1500/(250/18))=108); any null → null; avgDoseG 0 → null; startWeightG 0 → null.

- [ ] Export both, coverage 100%, commit.

---

# PHASE C — Features (repos + hooks)

Repos follow `makeXRepo(db: Db)` factory returning a typed object; types via `typeof table.$inferSelect`. Tests use `makeTestDb()` from `tests/helpers/test-db.ts` and the repo directly (see `tests/features/beans/repo.test.ts`). Hooks mirror `src/features/beans/hooks.ts` (TanStack Query wrappers over `getRepos()`).

### Task 10: Recipes repo + types + hooks

**Files:** Create `src/features/recipes/{types,repo,hooks}.ts`, `tests/features/recipes/repo.test.ts`; Modify `src/features/_provider/repos.ts`, `src/features/beans/repo.ts`.

- [ ] **types.ts:** `export type RecipeRow = typeof recipes.$inferSelect;`
- [ ] **repo.ts** — `makeRecipesRepo(db): RecipesRepo`:

```ts
export type SaveRecipeArgs = { beanId: string; sourceSessionId?: string;
  doseG?: number | null; targetYieldG?: number | null; durationTargetS?: number | null;
  grinderLabel?: string | null; grindSetting?: string | null; waterTempC?: number | null;
  ratioTarget?: number | null; notes?: string | null };
export type RecipesRepo = {
  getForBean: (beanId: string) => Promise<RecipeRow | null>;
  saveForBean: (args: SaveRecipeArgs) => Promise<RecipeRow>; // upsert: replaces existing (unique beanId), bumps beans.recipeId
  saveFromSession: (sessionId: string, notes?: string) => Promise<RecipeRow>; // reads session, distills values, calls saveForBean
  clearForBean: (beanId: string) => Promise<void>; // soft-delete recipe + null beans.recipeId
};
```
  - `saveForBean`: validate via `validateRecipe`; if a live recipe exists for beanId, UPDATE it (keep id), else INSERT new with `uuid()`. Set `beans.recipeId = recipe.id`, bump `beans.updatedAt`. `savedAt = now`.
  - `saveFromSession`: load session (`brewSessions`), derive `doseG=dose_g, targetYieldG=yield_g, durationTargetS=duration_s, grinderLabel, grindSetting, waterTempC, ratioTarget = yield_g/dose_g`. Throw if session not found.
  - `clearForBean`: set recipe `deletedAt`, null `beans.recipeId`.
- [ ] **Tests:** save then getForBean returns it; second saveForBean replaces (still one live recipe, same id); saveFromSession copies session values + computes ratio; beans.recipeId set after save and nulled after clear; getForBean null when none.
- [ ] **hooks.ts:** `useRecipeForBean(beanId)`, `useSaveRecipeFromSession()`, `useSaveRecipeForBean()`, `useClearRecipe()` — mutations invalidate `['recipe', beanId]`, `['bean', beanId]`, `['beans']`.
- [ ] Register in `repos.ts` (`recipes: makeRecipesRepo(db)` + `RecipesRepo` in `Repos`). typecheck + full test, commit.

### Task 11: Machines repo + types + hooks

**Files:** Create `src/features/machines/{types,repo,hooks}.ts`, `tests/features/machines/repo.test.ts`; Modify `_provider/repos.ts`.

- [ ] **repo.ts** — `makeMachinesRepo(db)`:

```ts
export type MachinesRepo = {
  addMachine: (input: MachineInput) => Promise<MachineRow>;   // if isPrimary or first machine → becomes primary (unset others)
  listMachines: () => Promise<MachineRow[]>;                  // live, ordered name
  getMachine: (id: string) => Promise<MachineRow | null>;
  updateMachine: (id: string, patch: Partial<MachineInput>) => Promise<MachineRow>;
  softDeleteMachine: (id: string) => Promise<void>;
  setPrimary: (id: string) => Promise<void>;                 // unset others, set this
  getPrimary: () => Promise<MachineRow | null>;
};
```
  - `addMachine`: validate; first live machine OR `isPrimary===true` → set primary (clear `isPrimary` on all others in a txn-ish sequence).
  - `setPrimary`: `UPDATE machines SET isPrimary=false WHERE deletedAt IS NULL`; then set the one.
- [ ] **Tests:** first machine auto-primary; second non-primary stays non-primary; setPrimary moves the flag exclusively; getPrimary returns the flagged one; softDelete hides from list; update changes name.
- [ ] **hooks.ts:** `useMachines()`, `useMachine(id)`, `usePrimaryMachine()`, `useAddMachine()`, `useUpdateMachine()`, `useSetPrimaryMachine()`, `useDeleteMachine()`.
- [ ] Register, typecheck, full test, commit.

### Task 12: Maintenance repo + types + hooks (uses `nextDueAt`)

**Files:** Create `src/features/maintenance/{types,repo,hooks}.ts`, `tests/features/maintenance/repo.test.ts`; Modify `_provider/repos.ts`.

- [ ] **repo.ts** — `makeMaintenanceRepo(db)`:

```ts
export type TaskWithStatus = MaintenanceTaskRow & {
  lastDoneAt: Date | null;
  nextDue: import('@/domain/maintenance').NextDue;
};
export type LogTaskArgs = { taskId: string; notes?: string; doneAt?: Date };
export type MaintenanceRepo = {
  addTask: (input: MaintenanceTaskInput) => Promise<MaintenanceTaskRow>;
  listTasksForMachine: (machineId: string) => Promise<MaintenanceTaskRow[]>; // live + active
  updateTask: (id: string, patch: Partial<MaintenanceTaskInput>) => Promise<MaintenanceTaskRow>;
  softDeleteTask: (id: string) => Promise<void>;
  logTask: (args: LogTaskArgs) => Promise<MaintenanceLogRow>; // snapshots currentShots + currentLiters
  listLogsForTask: (taskId: string) => Promise<MaintenanceLogRow[]>;
  tasksWithStatus: (machineId: string) => Promise<TaskWithStatus[]>; // computes nextDueAt per task
  // helpers used for snapshots and status:
  currentShots: () => Promise<number>;   // count brew_sessions where ended_at NOT NULL AND deleted_at NULL
  currentLiters: () => Promise<number>;  // sum water_events.volumeMl/1000 for kind in ('shot_estimate','flush') since... total consumed
};
```
  - `currentShots`: `SELECT count(*) FROM brew_sessions WHERE ended_at IS NOT NULL AND deleted_at IS NULL`.
  - `currentLiters`: `SELECT coalesce(sum(volume_ml),0)/1000 FROM water_events WHERE deleted_at IS NULL AND kind IN ('shot_estimate','flush')`.
  - `logTask`: insert log with `shotsAtTime = await currentShots()`, `litersAtTime = await currentLiters()`, `doneAt = args.doneAt ?? now`.
  - `tasksWithStatus`: for each active task, find most-recent log (max doneAt), call `nextDueAt({cadenceKind, cadenceValue, lastDoneAt, lastDoneShots, lastDoneLiters, currentShots, currentLiters, now})`.
- [ ] **Tests:** addTask + listTasksForMachine; logTask snapshots shots/liters (seed sessions + water events); tasksWithStatus never-done → status ok remaining=cadence; after logging then advancing shots beyond cadence → overdue; deleting machine cascades tasks+logs (DB-level, but assert listTasksForMachine empty); inactive task excluded from list.
- [ ] **hooks.ts:** `useTasksWithStatus(machineId)`, `useMachineTasks(machineId)`, `useAddTask()`, `useLogTask()`, `useUpdateTask()`, `useDeleteTask()`.
- [ ] Register, typecheck, full test, commit.

### Task 13: Beans repo — lifecycle (status filter, would-buy, finished auto-flip)

**Files:** Modify `src/features/beans/repo.ts`, `src/features/beans/hooks.ts`, `tests/features/beans/repo.test.ts`.

- [ ] **Extend `BeansRepo`:**

```ts
export type BeanFilter = 'active' | 'finished' | 'archived' | 'would_buy' | 'all';
// listBeans(filter?: BeanFilter)  — default 'active'
//   active   → status='active' AND deletedAt NULL
//   finished → status='finished'
//   archived → status='archived'
//   would_buy→ wouldBuyAgain=true
//   all      → deletedAt NULL (any status)
setStatus: (id: string, status: 'active' | 'finished' | 'archived') => Promise<BeanRow>;
//   when status→'finished' set finishedAt=now; when leaving 'finished' clear finishedAt.
setWouldBuyAgain: (id: string, value: boolean | null) => Promise<BeanRow>;
```
  - `addBean`: set `status:'active'`, `wouldBuyAgain:null`, `finishedAt:null`, `recipeId:null` in the inserted row (BeanRow now has these columns).
- [ ] **`updateBean` null-normalization:** the existing loop normalizes undefined→null. Ensure new non-null-defaulted columns (`status`) are never set to null by a patch. Keep `status`, `recipeId`, `finishedAt`, `wouldBuyAgain` out of `BeanInput` (they're managed by `setStatus`/`setWouldBuyAgain`/recipes repo, not the bean form) so `validateBean`/`updateBean` ignore them.
- [ ] **Brew repo finish auto-flip:** in `src/features/brew/repo.ts` where `remainingWeightG` is decremented on save, after decrement: if `remainingWeightG <= 0` and `startWeightG != null`, set `beans.status='finished'`, `finishedAt=now`. (Locate the existing decrement site; add the flip there.)
- [ ] **Tests:** addBean defaults status active; listBeans('active') excludes finished; setStatus('finished') sets finishedAt; setStatus back to 'active' clears finishedAt; setWouldBuyAgain true/false/null; listBeans('would_buy') filters; brew save that zeroes remaining flips bean to finished.
- [ ] **hooks.ts:** `useBeans(filter)` passes filter to query key `['beans', filter]`; add `useSetBeanStatus()`, `useSetWouldBuyAgain()`.
- [ ] typecheck, full test, commit.

### Task 14: Brew repo — machineId on start; Preferences — cups goal + caffeine target

**Files:** Modify `src/features/brew/repo.ts`, `src/features/preferences/repo.ts`, `src/features/preferences/hooks.ts`, `tests/features/brew/repo.test.ts`, `tests/features/preferences/repo.test.ts`.

- [ ] **Brew:** on `startSession`, set `machineId` = primary machine id if one exists (query `machines` where `isPrimary AND deletedAt NULL`), else null. Add test: with a primary machine, new session has its `machineId`; without, null.
- [ ] **Preferences:** the `preferences` row now has `dailyCupsGoal` (default 4) + `caffeineTargetMg` (nullable). Extend `get()` return + `update(patch)` to accept `dailyCupsGoal`, `caffeineTargetMg`. Test: default get returns `dailyCupsGoal:4, caffeineTargetMg:null`; update persists both; `caffeineTargetMg:null` clears it.
- [ ] typecheck, full test, commit.

---

# PHASE D — UI primitives (component tests via RNTL)

Follow `src/ui/primitives/MetricTile.tsx` + its test for the pattern. All use `useTheme()` tokens; no raw hex/spacing.

### Task 15: `SensoryRadar` (Skia five-axis chart)

**Files:** Create `src/ui/primitives/SensoryRadar.tsx`, `tests/ui/primitives/SensoryRadar.test.tsx`.

- [ ] Props: `{ axes: { mouthfeel; acidity; sweetness; bitterness; balance } }` (values 1–5). Renders a Skia pentagon polygon scaled per axis in `forest`/`forestPale`, axis labels via `<Text variant="label">`. Guard: if all zero, render nothing visible but component still mounts.
- [ ] Test (RNTL): renders without crashing given sample axes; renders the five axis labels. (Skia paths aren't asserted pixel-wise; assert labels + no throw.) Mock `@shopify/react-native-skia` only if the existing `ExtractionRing.test` does — match its approach.
- [ ] typecheck, full test, commit.

### Task 16: `CupsRow`, `RecipeCard`, `MachineCard`, `ReadinessRow`

**Files:** Create each in `src/ui/primitives/`, plus a test per component in `tests/ui/primitives/`.

- [ ] **CupsRow** — props `{ progress: CupsProgress }`; renders `total` cup glyphs (line `Icon name="cup"`), first `filled` in `forest`, overshoot cups in `amber`. Caption `"N of M"`. Test: renders M icons; filled count reflected via testID/accessibilityState.
- [ ] **RecipeCard** — props `{ recipe: RecipeRow | null; savedFromCaption?: string; onEdit?; onClear? }`. If recipe: `paperDeep` card "Dose 18.0 g · Yield 36.0 g · 27.0 s · Grind 3.2 · 93 °C" (omit missing fields), caption, Edit/Clear. If null: dashed-border tile "No recipe yet…". Test: both states render expected copy.
- [ ] **MachineCard** — props `{ machine: MachineRow; tasks: TaskWithStatus[]; onPress }`. Name + kind; up to 3 most-imminent tasks as "Label — N days/shots/liters left" (overdue → `danger`, due_soon → `amber`). Test: renders name + a task status line.
- [ ] **ReadinessRow** — props `{ label: string; status: NextDue }`. Uppercase label + value ("18 days", "Due soon", "Overdue 3 days") colored by status. Used on Daily. Test: overdue renders danger-colored value.
- [ ] typecheck, full test, commit (may split into 2 commits).

---

# PHASE E — Screens

Screens compose hooks + primitives. Each screen task: build screen, add a component test for empty + data states (mirror `tests/ui/primitives` setup with a QueryClient + RepoProvider stub — check how existing screen-level tests wire providers; if none exist, test the screen's pure subcomponents instead and rely on Maestro for the wired flow). typecheck + full test, commit per task.

### Task 17: Care tab — layout, machine list, add machine

**Files:** Create `app/(tabs)/care/_layout.tsx`, `app/(tabs)/care/index.tsx`, `app/(tabs)/care/new.tsx`; Modify `app/(tabs)/_layout.tsx`.

- [ ] Add 4th tab to `(tabs)/_layout.tsx`: `<Tabs.Screen name="care" options={{ title: 'Care', tabBarIcon: tabIcon('wrench') }} />`. If `'wrench'` icon missing in `src/ui/icons/line`, add a simple line glyph (check `IconName` union; add one following the existing icon pattern).
- [ ] `care/_layout.tsx`: Stack (mirror `lab/_layout.tsx`).
- [ ] `care/index.tsx`: `useMachines()` → list of `MachineCard` (tap → `/care/[id]`). Empty state: "Add your espresso machine to start tracking maintenance" + CTA to `/care/new`. "+ Add machine" tile.
- [ ] `care/new.tsx`: form (name required, kind picker, model, vendor, acquiredOn, isPrimary toggle, notes) → `useAddMachine()` → back. Inline zod errors from `validateMachine`.
- [ ] typecheck, full test, commit.

### Task 18: Care — machine detail + task list + add task + mark done

**Files:** Create `app/(tabs)/care/[id].tsx`, `app/(tabs)/care/add-task.tsx`.

- [ ] `[id].tsx`: header (machine name/kind/Edit), `useTasksWithStatus(machineId)` → each row: label, cadence text, last done, `ReadinessRow`-style next-due, "Mark done now" pill → `useLogTask()` (optional notes prompt). "+ Add task" → `/care/add-task?machineId=`.
- [ ] `add-task.tsx`: kind picker (curated list), label, cadence kind + value steppers, notes → `useAddTask()`.
- [ ] typecheck, full test, commit.

### Task 19: Library — status filter + bean detail (recipe, radar, fun facts, lifecycle)

**Files:** Modify `app/(tabs)/library/index.tsx`, `app/(tabs)/library/[id].tsx`.

- [ ] **index.tsx:** segmented control (Active / Finished / Would buy again / All) driving `useBeans(filter)`. Finished cards show "finished N days ago" + would-buy thumb.
- [ ] **[id].tsx** sections (top→bottom): Hero (+ would-buy toggle via `useSetWouldBuyAgain`); **Recipe** (`useRecipeForBean` → `RecipeCard` with Edit→`/recipe-save?beanId=` & Clear→`useClearRecipe`); **Sensory radar** (`tastingRadar` over this bean's tasting notes → `SensoryRadar` + frequent flavor-tag chips); **History** (existing shots list); **Fun facts** (`costPerShot` using avg dose from this bean's sessions, only if `startWeightG`+`pricePaidMinor` set); **Lifecycle** (status control via `useSetBeanStatus`, finished-on date, soft-delete with undo).
- [ ] Need avg dose: compute from `useShotsForBean` (mean of `doseG`). typecheck, full test, commit.

### Task 20: Lab — recipe pre-fill + save-as-recipe

**Files:** Modify `app/(tabs)/lab/index.tsx`, `app/(tabs)/lab/session/[id].tsx`; Create `app/(modals)/recipe-save.tsx`; Modify `app/(modals)/_layout.tsx` (register modal).

- [ ] **lab/index.tsx IdleSetup pre-fill:** when bean selected, prefer `useRecipeForBean(beanId)` for dose/yield/grind/temp; fall back to existing "last shot recall" only if no recipe. Show small `forest` "Recipe locked" indicator under the bean chip when a recipe exists.
- [ ] **session/[id].tsx:** add "Save as the recipe for {bean}" affordance → opens `/recipe-save?beanId=&sessionId=`. If bean already has a recipe, label "Replace recipe" + confirm.
- [ ] **recipe-save.tsx modal:** shows values about to lock in + free-text notes → `useSaveRecipeFromSession(sessionId, notes)` → toast "Recipe saved". Register in `(modals)/_layout.tsx`.
- [ ] typecheck, full test, commit.

### Task 21: Daily — cups widget + machine readiness rows

**Files:** Modify `app/(tabs)/index.tsx`, `app/(modals)/settings.tsx`.

- [ ] **Daily index.tsx:** add at top a **Match daily cups** section: `cupsTowardGoal(todayShots, prefs.dailyCupsGoal)` → `CupsRow`; caption "N of M · est. X mg" (caffeine from existing dashboard). Add **Machine readiness**: `usePrimaryMachine()` + `useTasksWithStatus(primary.id)` → top rows as `ReadinessRow` (tap → Care). If no machine: small CTA "Add a machine in Care to track readiness." Keep existing water summary + weekly recap + recent shots below.
- [ ] **settings.tsx:** add **daily-cups goal** stepper (1–12) + optional **caffeine target** input → `usePreferences().update`. (Caffeine target stored; display-only use in v1.)
- [ ] typecheck, full test, commit.

---

# PHASE F — Integration verification + spec coverage

### Task 22: Full verification sweep

- [ ] `npm run typecheck` PASS.
- [ ] `npm test` — FULL suite PASS (no regressions; new repo/domain/component tests green).
- [ ] `npm run test:coverage` — `src/domain/` at **100%**.
- [ ] `npm run lint` — clean (fix any new violations).
- [ ] Manual spec-DoD checklist pass against spec §13: recipes (save/replace/clear/prefill ✓), Care (machine list/add/detail/task/log/next-due ✓), bean lifecycle (status filter/would-buy/finished ✓), sensory radar ✓, daily cups ✓. List any unmet item and open a follow-up task.
- [ ] Final commit.

### Task 23: Update project memory + plan checkboxes

- [ ] Tick all completed checkboxes in this plan.
- [ ] Note in `brewlog-project.md` memory that full-spec pillars (recipes, Care, lifecycle, radar, cups) are now implemented.

---

## Self-Review notes (author)

- **Spec coverage:** recipes (§3 recipes table, §4 bean-detail recipe + Lab pre-fill, §5 save-as-recipe) → Tasks 1,4,10,19,20. Care/maintenance (§3 machines/maintenance_tasks/logs, §4 Tab 4) → Tasks 1,5,6,7,11,12,17,18. Bean lifecycle (§3 status/would_buy_again/finished_at) → Tasks 1,13,19. Sensory radar (§3 tastingRadar, §4 bean detail) → Tasks 8,15,19. Daily cups (§3 cupsTowardGoal, §4 Tab 1) → Tasks 9,16,21. costPerShot (§3) → Tasks 9,19. machine_id on sessions (§3) → Tasks 1,14.
- **Deliberately out of scope (already satisfied differently / not in user's stated vision push):** the spec's full Maestro E2E re-run (device-bound; author flows only if time), dark mode (explicitly cut), refractometer. Existing water_events ledger is kept; maintenance `filter_replace` task complements it (liters cadence reads water consumed).
- **Type consistency:** `NextDue`/`NextDueInput` (Task 7) consumed verbatim in Task 12 `TaskWithStatus`. `CupsProgress` (Task 9) consumed in Task 16. `BeanFilter` (Task 13) consumed in Task 19. `SaveRecipeArgs`/`RecipesRepo` (Task 10) consumed in Tasks 19/20.
- **Boolean columns** use Drizzle `{ mode: 'boolean' }`; harness round-trip asserted in Task 3.
