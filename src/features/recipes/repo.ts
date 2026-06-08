import { and, desc, eq, isNull } from 'drizzle-orm';
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
  name?: string | null;
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
  /** The bean's default recipe (beans.recipeId), falling back to its newest. */
  getForBean: (beanId: string) => Promise<RecipeRow | null>;
  /** All live recipes for a bean, newest first. */
  listForBean: (beanId: string) => Promise<RecipeRow[]>;
  getRecipe: (id: string) => Promise<RecipeRow | null>;
  /** Insert a new recipe; becomes the bean's default if it had none. */
  create: (args: SaveRecipeArgs) => Promise<RecipeRow>;
  /** Insert a new recipe copied from a finished session. */
  createFromSession: (
    sessionId: string,
    opts?: { name?: string | null; notes?: string | null },
  ) => Promise<RecipeRow>;
  updateRecipe: (id: string, patch: Partial<SaveRecipeArgs>) => Promise<RecipeRow>;
  setDefault: (beanId: string, recipeId: string) => Promise<void>;
  /** Soft-delete one recipe; re-points the bean default if it was the default. */
  deleteRecipe: (id: string) => Promise<void>;
};

export function makeRecipesRepo(db: Db): RecipesRepo {
  return {
    async listForBean(beanId) {
      return db
        .select()
        .from(recipes)
        .where(and(eq(recipes.beanId, beanId), isNull(recipes.deletedAt)))
        .orderBy(desc(recipes.savedAt));
    },

    async getRecipe(id) {
      const rows = await db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, id), isNull(recipes.deletedAt)));
      return rows[0] ?? null;
    },

    async getForBean(beanId) {
      const beanRows = await db.select().from(beans).where(eq(beans.id, beanId));
      const defaultId = beanRows[0]?.recipeId ?? null;
      if (defaultId) {
        const preferred = await this.getRecipe(defaultId);
        if (preferred) return preferred;
      }
      // No (live) default → fall back to the newest recipe.
      const all = await this.listForBean(beanId);
      return all[0] ?? null;
    },

    async create(args) {
      const v = validateRecipe(args);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const id = uuid();
      const row: RecipeRow = {
        id,
        beanId: args.beanId,
        name: args.name ?? null,
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
      // First recipe for the bean becomes its default.
      const beanRows = await db.select().from(beans).where(eq(beans.id, args.beanId));
      if (!beanRows[0]?.recipeId) {
        await db
          .update(beans)
          .set({ recipeId: id, updatedAt: now })
          .where(eq(beans.id, args.beanId));
      }
      return row;
    },

    async createFromSession(sessionId, opts) {
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

      return this.create({
        beanId: session.beanId,
        name: opts?.name ?? null,
        sourceSessionId: sessionId,
        doseG: session.doseG,
        targetYieldG: session.yieldG,
        durationTargetS: session.durationS,
        grinderLabel: session.grinderLabel,
        grindSetting: session.grindSetting,
        waterTempC: session.waterTempC,
        ratioTarget: ratio,
        notes: opts?.notes ?? null,
      });
    },

    async updateRecipe(id, patch) {
      const existing = await this.getRecipe(id);
      if (!existing) throw new Error('recipe not found');
      const now = new Date();
      const updated: RecipeRow = {
        ...existing,
        name: patch.name !== undefined ? patch.name : existing.name,
        doseG: patch.doseG !== undefined ? patch.doseG : existing.doseG,
        targetYieldG: patch.targetYieldG !== undefined ? patch.targetYieldG : existing.targetYieldG,
        durationTargetS:
          patch.durationTargetS !== undefined ? patch.durationTargetS : existing.durationTargetS,
        grinderLabel: patch.grinderLabel !== undefined ? patch.grinderLabel : existing.grinderLabel,
        grindSetting: patch.grindSetting !== undefined ? patch.grindSetting : existing.grindSetting,
        waterTempC: patch.waterTempC !== undefined ? patch.waterTempC : existing.waterTempC,
        ratioTarget: patch.ratioTarget !== undefined ? patch.ratioTarget : existing.ratioTarget,
        notes: patch.notes !== undefined ? patch.notes : existing.notes,
        updatedAt: now,
      };
      await db.update(recipes).set(updated).where(eq(recipes.id, id));
      return updated;
    },

    async setDefault(beanId, recipeId) {
      await db
        .update(beans)
        .set({ recipeId, updatedAt: new Date() })
        .where(eq(beans.id, beanId));
    },

    async deleteRecipe(id) {
      const existing = await this.getRecipe(id);
      if (!existing) return;
      const now = new Date();
      await db
        .update(recipes)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(recipes.id, id));

      // If this was the bean's default, re-point to the newest survivor (or null).
      const beanRows = await db.select().from(beans).where(eq(beans.id, existing.beanId));
      if (beanRows[0]?.recipeId === id) {
        const survivors = await this.listForBean(existing.beanId);
        await db
          .update(beans)
          .set({ recipeId: survivors[0]?.id ?? null, updatedAt: now })
          .where(eq(beans.id, existing.beanId));
      }
    },
  };
}
