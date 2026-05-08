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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => ({
    byNameLive: index('beans_live_name').on(t.deletedAt, t.name),
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

/* Single-row preferences */
export const preferences = sqliteTable('preferences', {
  id: integer('id').primaryKey(), // always 1
  weightUnit: text('weight_unit').notNull().default('g'), // 'g' | 'oz'
  defaultRatio: real('default_ratio').notNull().default(2),
  themeId: text('theme_id').notNull().default('earthy-forest'),
  tdsAssumed: real('tds_assumed').notNull().default(0.09),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
