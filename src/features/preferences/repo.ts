import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { preferences } from '@/db/schema';
import * as schema from '@/db/schema';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type PreferencesRow = typeof preferences.$inferSelect;

export type PreferencesUpdate = {
  weightUnit?: 'g' | 'oz';
  defaultRatio?: number;
  themeId?: string;
  tdsAssumed?: number;
  waterTankCapacityMl?: number;
  filterChangeThresholdMl?: number;
  puckAbsorptionMlPerDoseG?: number;
  shotFlushMl?: number;
  dailyCupsGoal?: number;
  caffeineTargetMg?: number | null;
};

export type PreferencesRepo = {
  get: () => Promise<PreferencesRow>;
  update: (patch: PreferencesUpdate) => Promise<PreferencesRow>;
};

export function makePreferencesRepo(db: Db): PreferencesRepo {
  return {
    async get() {
      let rows = await db.select().from(preferences).where(eq(preferences.id, 1)).limit(1);
      if (rows.length === 0) {
        const now = new Date();
        await db.insert(preferences).values({
          id: 1,
          weightUnit: 'g',
          defaultRatio: 2,
          themeId: 'earthy-forest',
          tdsAssumed: 0.09,
          waterTankCapacityMl: 1800,
          filterChangeThresholdMl: 50000,
          puckAbsorptionMlPerDoseG: 2,
          shotFlushMl: 20,
          dailyCupsGoal: 4,
          caffeineTargetMg: null,
          updatedAt: now,
        });
        rows = await db.select().from(preferences).where(eq(preferences.id, 1)).limit(1);
      }
      return rows[0]!;
    },

    async update(patch: PreferencesUpdate) {
      await db
        .update(preferences)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(preferences.id, 1));
      return this.get();
    },
  };
}
