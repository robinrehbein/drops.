import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

/* Beans — the library */
export const beans = sqliteTable(
  'beans',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    roaster: text('roaster'),
    origin: text('origin'),
    countryCode: text('country_code'),
    process: text('process'),
    variety: text('variety'),
    roastLevel: integer('roast_level'),
    roastedOn: integer('roasted_on', { mode: 'timestamp' }),
    altitudeMasl: integer('altitude_masl'),
    startWeightG: real('start_weight_g'),
    remainingWeightG: real('remaining_weight_g'),
    pricePaidMinor: integer('price_paid_minor'),
    pricePaidCurrency: text('price_paid_currency'),
    flavorTags: text('flavor_tags', { mode: 'json' }).$type<string[]>(),
    notes: text('notes'),
    status: text('status').notNull().default('active'), // 'active' | 'finished' | 'archived'
    wouldBuyAgain: integer('would_buy_again', { mode: 'boolean' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    recipeId: text('recipe_id'), // FK → recipes.id, set when a canonical recipe is locked in
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byNameLive: index('beans_live_name').on(t.deletedAt, t.name),
    byStatusLive: index('beans_status_live').on(t.deletedAt, t.status, t.name),
  }),
);

/* Brew sessions */
export const brewSessions = sqliteTable(
  'brew_sessions',
  {
    id: text('id').primaryKey(),
    beanId: text('bean_id')
      .notNull()
      .references(() => beans.id, { onDelete: 'restrict' }),
    method: text('method').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    doseG: real('dose_g').notNull(),
    yieldG: real('yield_g'),
    durationS: real('duration_s'),
    preInfusionS: real('pre_infusion_s'),
    firstDropS: real('first_drop_s'),
    grinderLabel: text('grinder_label'),
    grindSetting: text('grind_setting'),
    waterTempC: real('water_temp_c'),
    rating: integer('rating'),
    comment: text('comment'),
    machineId: text('machine_id'), // FK → machines.id; null = no machine recorded
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byBean: index('brew_sessions_bean_started').on(t.beanId, t.startedAt),
    byLive: index('brew_sessions_live_started').on(t.deletedAt, t.startedAt),
  }),
);

/* Brew milestones */
export const brewMilestones = sqliteTable(
  'brew_milestones',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => brewSessions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    tSeconds: real('t_seconds').notNull(),
    label: text('label'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    bySession: index('brew_milestones_session_t').on(t.sessionId, t.tSeconds),
  }),
);

/* Tasting notes (1:1 with session) */
export const tastingNotes = sqliteTable(
  'tasting_notes',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => brewSessions.id, { onDelete: 'cascade' }),
    mouthfeel: integer('mouthfeel'),
    acidity: integer('acidity'),
    sweetness: integer('sweetness'),
    bitterness: integer('bitterness'),
    balance: integer('balance'),
    flavorTags: text('flavor_tags', { mode: 'json' }).$type<string[]>(),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    bySession: uniqueIndex('tasting_notes_session_unique').on(t.sessionId),
  }),
);

/* Water and machine maintenance ledger */
export const waterEvents = sqliteTable(
  'water_events',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // 'refill' | 'filter_change' | 'shot_estimate' | 'flush' | 'manual_adjustment'
    sessionId: text('session_id').references(() => brewSessions.id, { onDelete: 'set null' }),
    volumeMl: real('volume_ml').notNull().default(0),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byCreated: index('water_events_created').on(t.deletedAt, t.createdAt),
    bySession: index('water_events_session').on(t.sessionId),
  }),
);

/* Single-row preferences */
export const preferences = sqliteTable('preferences', {
  id: integer('id').primaryKey(), // always 1
  weightUnit: text('weight_unit').notNull().default('g'), // 'g' | 'oz'
  defaultRatio: real('default_ratio').notNull().default(2),
  themeId: text('theme_id').notNull().default('earthy-forest'),
  tdsAssumed: real('tds_assumed').notNull().default(0.09),
  waterTankCapacityMl: real('water_tank_capacity_ml').notNull().default(1800),
  filterChangeThresholdMl: real('filter_change_threshold_ml').notNull().default(50000),
  puckAbsorptionMlPerDoseG: real('puck_absorption_ml_per_dose_g').notNull().default(2),
  shotFlushMl: real('shot_flush_ml').notNull().default(20),
  dailyCupsGoal: integer('daily_cups_goal').notNull().default(4),
  caffeineTargetMg: integer('caffeine_target_mg'),
  dialTimeMinS: integer('dial_time_min_s').notNull().default(25),
  dialTimeMaxS: integer('dial_time_max_s').notNull().default(30),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
    kind: text('kind').notNull(), // backflush|gasket_replace|burr_clean|filter_replace|descale|group_screen_clean|custom
    label: text('label').notNull(),
    cadenceKind: text('cadence_kind').notNull(), // every_n_days|every_n_shots|every_n_liters
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
