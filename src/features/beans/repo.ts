import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import { type BeanInput, validateBean } from '@/domain/validators/bean';
import type { BeanRow } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type BeansRepo = {
  addBean: (input: BeanInput) => Promise<BeanRow>;
  listBeans: () => Promise<BeanRow[]>;
  getBean: (id: string) => Promise<BeanRow | null>;
  updateBean: (id: string, patch: Partial<BeanInput>) => Promise<BeanRow>;
  softDeleteBean: (id: string) => Promise<void>;
  restoreBean: (id: string) => Promise<void>;
};

export function makeBeansRepo(db: Db): BeansRepo {
  return {
    async addBean(input) {
      const v = validateBean(input);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const id = uuid();
      const startWeight = v.value.startWeightG ?? null;
      const row: BeanRow = {
        id,
        name: v.value.name,
        roaster: v.value.roaster ?? null,
        origin: v.value.origin ?? null,
        countryCode: v.value.countryCode ?? null,
        process: v.value.process ?? null,
        variety: v.value.variety ?? null,
        roastLevel: v.value.roastLevel ?? null,
        roastedOn: v.value.roastedOn ?? null,
        altitudeMasl: v.value.altitudeMasl ?? null,
        startWeightG: startWeight,
        remainingWeightG: startWeight,
        pricePaidMinor: v.value.pricePaidMinor ?? null,
        pricePaidCurrency: v.value.pricePaidCurrency ?? null,
        flavorTags: v.value.flavorTags ?? null,
        notes: v.value.notes ?? null,
        status: 'active',
        wouldBuyAgain: null,
        finishedAt: null,
        recipeId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.insert(beans).values(row);
      return row;
    },
    async listBeans() {
      return db.select().from(beans).where(isNull(beans.deletedAt)).orderBy(asc(beans.name));
    },
    async getBean(id) {
      const rows = await db
        .select()
        .from(beans)
        .where(and(eq(beans.id, id), isNull(beans.deletedAt)));
      return rows[0] ?? null;
    },
    async updateBean(id, patch) {
      const existing = await this.getBean(id);
      if (!existing) throw new Error('bean not found');
      // Validator treats optionals as `undefined`-only; strip nulls before merging.
      const existingForValidation: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(existing)) {
        if (val !== null) existingForValidation[k] = val;
      }
      const merged = { ...existingForValidation, ...patch };
      const v = validateBean(merged);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      // Normalize patch's `undefined` optional fields to `null` to match BeanRow's
      // nullable columns under exactOptionalPropertyTypes.
      const normalized: Partial<BeanRow> = {};
      for (const [k, val] of Object.entries(patch) as [keyof BeanInput, unknown][]) {
        (normalized as Record<string, unknown>)[k] = val === undefined ? null : val;
      }
      const updated: BeanRow = { ...existing, ...normalized, updatedAt: now };
      await db.update(beans).set(updated).where(eq(beans.id, id));
      return updated;
    },
    async softDeleteBean(id) {
      await db
        .update(beans)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(beans.id, id));
    },
    async restoreBean(id) {
      await db
        .update(beans)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(beans.id, id));
    },
  };
}
