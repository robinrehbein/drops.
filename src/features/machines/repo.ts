import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { machines } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import { type MachineInput, validateMachine } from '@/domain/validators/machine';
import type { MachineRow } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type MachinesRepo = {
  addMachine: (input: MachineInput) => Promise<MachineRow>;
  listMachines: () => Promise<MachineRow[]>;
  getMachine: (id: string) => Promise<MachineRow | null>;
  updateMachine: (id: string, patch: Partial<MachineInput>) => Promise<MachineRow>;
  softDeleteMachine: (id: string) => Promise<void>;
  setPrimary: (id: string) => Promise<void>;
  getPrimary: () => Promise<MachineRow | null>;
};

export function makeMachinesRepo(db: Db): MachinesRepo {
  return {
    async addMachine(input) {
      const v = validateMachine(input);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const existingLive = await this.listMachines();
      const shouldBePrimary = v.value.isPrimary === true || existingLive.length === 0;

      if (shouldBePrimary) {
        await db.update(machines).set({ isPrimary: false }).where(isNull(machines.deletedAt));
      }

      const id = uuid();
      const row: MachineRow = {
        id,
        name: v.value.name,
        kind: v.value.kind,
        model: v.value.model ?? null,
        vendor: v.value.vendor ?? null,
        acquiredOn: v.value.acquiredOn ?? null,
        notes: v.value.notes ?? null,
        isPrimary: shouldBePrimary,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.insert(machines).values(row);
      return row;
    },

    async listMachines() {
      return db
        .select()
        .from(machines)
        .where(isNull(machines.deletedAt))
        .orderBy(asc(machines.name));
    },

    async getMachine(id) {
      const rows = await db
        .select()
        .from(machines)
        .where(and(eq(machines.id, id), isNull(machines.deletedAt)));
      return rows[0] ?? null;
    },

    async updateMachine(id, patch) {
      const existing = await this.getMachine(id);
      if (!existing) throw new Error('machine not found');
      // Strip nulls from existing row before merging; validator expects undefined for optionals.
      const existingForValidation: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(existing)) {
        if (val !== null) existingForValidation[k] = val;
      }
      const merged = { ...existingForValidation, ...patch };
      const v = validateMachine(merged);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const updated: MachineRow = {
        ...existing,
        name: v.value.name,
        kind: v.value.kind,
        model: v.value.model ?? null,
        vendor: v.value.vendor ?? null,
        acquiredOn: v.value.acquiredOn ?? null,
        notes: v.value.notes ?? null,
        isPrimary: existing.isPrimary,
        updatedAt: now,
      };
      await db.update(machines).set(updated).where(eq(machines.id, id));
      return updated;
    },

    async softDeleteMachine(id) {
      await db
        .update(machines)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(machines.id, id));
    },

    async setPrimary(id) {
      await db.update(machines).set({ isPrimary: false }).where(isNull(machines.deletedAt));
      await db.update(machines).set({ isPrimary: true, updatedAt: new Date() }).where(eq(machines.id, id));
    },

    async getPrimary() {
      const rows = await db
        .select()
        .from(machines)
        .where(and(isNull(machines.deletedAt), eq(machines.isPrimary, true)));
      return rows[0] ?? null;
    },
  };
}
