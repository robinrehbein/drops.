import { and, eq, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans, brewSessions, recipes } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import { brewRatio } from '@/domain/ratio';
import { validateRecipe } from '@/domain/validators/recipe';
import type { RecipeRow } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type SaveRecipeArgs = {
  beanId: string;
  sourceSessionId?: string | null;
  doseG?: number | null;
  targetYieldG?: number | null;
  durationTargetS?: number | null;
  grinderLabel?: string | null;
  grindSetting?: string | null;
  waterTempC?: number | null;
  ratioTarget?: number | null;
  notes?: string | null;
};

export type RecipesRepo = {
  getForBean: (beanId: string) => Promise<RecipeRow | null>;
  saveForBean: (args: SaveRecipeArgs) => Promise<RecipeRow>;
  saveFromSession: (sessionId: string, notes?: string) => Promise<RecipeRow>;
  clearForBean: (beanId: string) => Promise<void>;
};

export function makeRecipesRepo(db: Db): RecipesRepo {
  return {
    async getForBean(beanId) {
      const rows = await db
        .select()
        .from(recipes)
        .where(and(eq(recipes.beanId, beanId), isNull(recipes.deletedAt)));
      return rows[0] ?? null;
    },

    async saveForBean(args) {
      const v = validateRecipe({ beanId: args.beanId });
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const existing = await this.getForBean(args.beanId);

      if (existing) {
        const updated: RecipeRow = {
          ...existing,
          sourceSessionId: args.sourceSessionId ?? existing.sourceSessionId,
          doseG: args.doseG !== undefined ? args.doseG : existing.doseG,
          targetYieldG: args.targetYieldG !== undefined ? args.targetYieldG : existing.targetYieldG,
          durationTargetS:
            args.durationTargetS !== undefined ? args.durationTargetS : existing.durationTargetS,
          grinderLabel:
            args.grinderLabel !== undefined ? args.grinderLabel : existing.grinderLabel,
          grindSetting: args.grindSetting !== undefined ? args.grindSetting : existing.grindSetting,
          waterTempC: args.waterTempC !== undefined ? args.waterTempC : existing.waterTempC,
          ratioTarget: args.ratioTarget !== undefined ? args.ratioTarget : existing.ratioTarget,
          notes: args.notes !== undefined ? args.notes : existing.notes,
          savedAt: now,
          updatedAt: now,
        };
        await db.update(recipes).set(updated).where(eq(recipes.id, existing.id));
        await db
          .update(beans)
          .set({ recipeId: existing.id, updatedAt: now })
          .where(eq(beans.id, args.beanId));
        return updated;
      }

      const id = uuid();
      const row: RecipeRow = {
        id,
        beanId: args.beanId,
        sourceSessionId: args.sourceSessionId ?? null,
        doseG: args.doseG ?? null,
        targetYieldG: args.targetYieldG ?? null,
        durationTargetS: args.durationTargetS ?? null,
        grinderLabel: args.grinderLabel ?? null,
        grindSetting: args.grindSetting ?? null,
        waterTempC: args.waterTempC ?? null,
        ratioTarget: args.ratioTarget ?? null,
        notes: args.notes ?? null,
        savedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.insert(recipes).values(row);
      await db
        .update(beans)
        .set({ recipeId: id, updatedAt: now })
        .where(eq(beans.id, args.beanId));
      return row;
    },

    async saveFromSession(sessionId, notes) {
      const sessions = await db
        .select()
        .from(brewSessions)
        .where(and(eq(brewSessions.id, sessionId), isNull(brewSessions.deletedAt)));
      const session = sessions[0];
      if (!session) throw new Error('session not found');

      const ratio =
        session.yieldG != null && session.doseG > 0
          ? brewRatio(session.doseG, session.yieldG)
          : null;

      return this.saveForBean({
        beanId: session.beanId,
        sourceSessionId: sessionId,
        doseG: session.doseG,
        targetYieldG: session.yieldG,
        durationTargetS: session.durationS,
        grinderLabel: session.grinderLabel,
        grindSetting: session.grindSetting,
        waterTempC: session.waterTempC,
        ratioTarget: ratio,
        notes: notes ?? null,
      });
    },

    async clearForBean(beanId) {
      const now = new Date();
      await db
        .update(recipes)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(recipes.beanId, beanId), isNull(recipes.deletedAt)));
      await db
        .update(beans)
        .set({ recipeId: null, updatedAt: now })
        .where(eq(beans.id, beanId));
    },
  };
}
