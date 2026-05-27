import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { brewSessions, maintenanceLogs, maintenanceTasks, waterEvents } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import { type CadenceKind, nextDueAt } from '@/domain/maintenance';
import { type MaintenanceTaskInput, validateMaintenanceTask } from '@/domain/validators/maintenance';
import type { MaintenanceLogRow, MaintenanceTaskRow, TaskWithStatus } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type LogTaskArgs = { taskId: string; notes?: string; doneAt?: Date };

export type MaintenanceRepo = {
  addTask: (input: MaintenanceTaskInput) => Promise<MaintenanceTaskRow>;
  listTasksForMachine: (machineId: string) => Promise<MaintenanceTaskRow[]>;
  updateTask: (id: string, patch: Partial<MaintenanceTaskInput>) => Promise<MaintenanceTaskRow>;
  softDeleteTask: (id: string) => Promise<void>;
  logTask: (args: LogTaskArgs) => Promise<MaintenanceLogRow>;
  listLogsForTask: (taskId: string) => Promise<MaintenanceLogRow[]>;
  tasksWithStatus: (machineId: string) => Promise<TaskWithStatus[]>;
  currentShots: () => Promise<number>;
  currentLiters: () => Promise<number>;
};

export function makeMaintenanceRepo(db: Db): MaintenanceRepo {
  return {
    async addTask(input) {
      const v = validateMaintenanceTask(input);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const row: MaintenanceTaskRow = {
        id: uuid(),
        machineId: v.value.machineId,
        kind: v.value.kind,
        label: v.value.label,
        cadenceKind: v.value.cadenceKind,
        cadenceValue: v.value.cadenceValue,
        notes: v.value.notes ?? null,
        active: v.value.active ?? true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.insert(maintenanceTasks).values(row);
      return row;
    },

    async listTasksForMachine(machineId) {
      return db
        .select()
        .from(maintenanceTasks)
        .where(
          and(
            eq(maintenanceTasks.machineId, machineId),
            eq(maintenanceTasks.active, true),
            isNull(maintenanceTasks.deletedAt),
          ),
        )
        .orderBy(asc(maintenanceTasks.label));
    },

    async updateTask(id, patch) {
      const rows = await db
        .select()
        .from(maintenanceTasks)
        .where(and(eq(maintenanceTasks.id, id), isNull(maintenanceTasks.deletedAt)));
      const existing = rows[0];
      if (!existing) throw new Error('task not found');
      const merged = { ...existing, ...patch };
      const v = validateMaintenanceTask(merged);
      if (!v.ok) throw new Error(v.error.map((i) => i.message).join('; '));
      const now = new Date();
      const updated: MaintenanceTaskRow = {
        ...existing,
        kind: v.value.kind,
        label: v.value.label,
        cadenceKind: v.value.cadenceKind,
        cadenceValue: v.value.cadenceValue,
        notes: v.value.notes ?? null,
        active: v.value.active ?? existing.active,
        updatedAt: now,
      };
      await db.update(maintenanceTasks).set(updated).where(eq(maintenanceTasks.id, id));
      return updated;
    },

    async softDeleteTask(id) {
      await db
        .update(maintenanceTasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(maintenanceTasks.id, id));
    },

    async logTask({ taskId, notes, doneAt }) {
      const shots = await this.currentShots();
      const liters = await this.currentLiters();
      const now = doneAt ?? new Date();
      const row: MaintenanceLogRow = {
        id: uuid(),
        taskId,
        doneAt: now,
        shotsAtTime: shots,
        litersAtTime: liters,
        notes: notes ?? null,
        createdAt: new Date(),
        deletedAt: null,
      };
      await db.insert(maintenanceLogs).values(row);
      return row;
    },

    async listLogsForTask(taskId) {
      return db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.taskId, taskId), isNull(maintenanceLogs.deletedAt)))
        .orderBy(desc(maintenanceLogs.doneAt));
    },

    async tasksWithStatus(machineId) {
      const tasks = await this.listTasksForMachine(machineId);
      const shots = await this.currentShots();
      const liters = await this.currentLiters();
      const now = new Date();

      return Promise.all(
        tasks.map(async (task) => {
          const logs = await db
            .select()
            .from(maintenanceLogs)
            .where(and(eq(maintenanceLogs.taskId, task.id), isNull(maintenanceLogs.deletedAt)))
            .orderBy(desc(maintenanceLogs.doneAt))
            .limit(1);
          const last = logs[0] ?? null;
          const due = nextDueAt({
            cadenceKind: task.cadenceKind as CadenceKind,
            cadenceValue: task.cadenceValue,
            lastDoneAt: last?.doneAt ?? null,
            lastDoneShots: last?.shotsAtTime ?? null,
            lastDoneLiters: last?.litersAtTime ?? null,
            currentShots: shots,
            currentLiters: liters,
            now,
          });
          return { ...task, lastDoneAt: last?.doneAt ?? null, nextDue: due };
        }),
      );
    },

    async currentShots() {
      const rows = await db
        .select()
        .from(brewSessions)
        .where(and(isNotNull(brewSessions.endedAt), isNull(brewSessions.deletedAt)));
      return rows.length;
    },

    async currentLiters() {
      const rows = await db
        .select()
        .from(waterEvents)
        .where(
          and(
            isNull(waterEvents.deletedAt),
            sql`${waterEvents.kind} IN ('shot_estimate', 'flush')`,
          ),
        );
      return rows.reduce((sum, r) => sum + (r.volumeMl ?? 0), 0) / 1000;
    },
  };
}
