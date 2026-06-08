import { eq, gte } from 'drizzle-orm';
import { Storage } from 'expo-sqlite/kv-store';

import { getDb } from '@/db/client';
import {
  beans,
  brewMilestones,
  brewSessions,
  machines,
  maintenanceLogs,
  maintenanceTasks,
  placeUserData,
  preferences,
  recipes,
  tastingNotes,
  waterEvents,
} from '@/db/schema';
import type { SyncEntitlement } from '@/state/subscription';
import type { SyncPayload, SyncResult } from './types';

const CURSOR_KEY = 'drop_sync_cursor_ms';

function readCursorDate(): Date {
  try {
    const raw = Storage.getItemSync(CURSOR_KEY);
    if (raw) return new Date(Number(raw));
  } catch {
    // ignore
  }
  return new Date(0);
}

function writeCursorMs(ms: number): void {
  try {
    Storage.setItemSync(CURSOR_KEY, String(ms));
  } catch {
    // ignore
  }
}

/**
 * Collect all local rows that changed since `cursor`.
 * Tables with only `createdAt` (milestones, logs, waterEvents) are treated as
 * append-only, so we use `createdAt` as the change signal.
 */
async function collectLocalChanges(cursor: Date): Promise<Omit<SyncPayload, 'deviceId' | 'cursorMs'>> {
  const db = getDb();

  const [
    changedBeans,
    changedSessions,
    changedMilestones,
    changedNotes,
    changedRecipes,
    changedMachines,
    changedTasks,
    changedLogs,
    changedWater,
    changedPlaceUserData,
    prefs,
  ] = await Promise.all([
    db.select().from(beans).where(gte(beans.updatedAt, cursor)),
    db.select().from(brewSessions).where(gte(brewSessions.updatedAt, cursor)),
    db.select().from(brewMilestones).where(gte(brewMilestones.createdAt, cursor)),
    db.select().from(tastingNotes).where(gte(tastingNotes.updatedAt, cursor)),
    db.select().from(recipes).where(gte(recipes.updatedAt, cursor)),
    db.select().from(machines).where(gte(machines.updatedAt, cursor)),
    db.select().from(maintenanceTasks).where(gte(maintenanceTasks.updatedAt, cursor)),
    db.select().from(maintenanceLogs).where(gte(maintenanceLogs.createdAt, cursor)),
    db.select().from(waterEvents).where(gte(waterEvents.createdAt, cursor)),
    db.select().from(placeUserData).where(gte(placeUserData.updatedAt, cursor)),
    db.select().from(preferences).limit(1),
  ]);

  return {
    beans: changedBeans,
    brewSessions: changedSessions,
    brewMilestones: changedMilestones,
    tastingNotes: changedNotes,
    recipes: changedRecipes,
    machines: changedMachines,
    maintenanceTasks: changedTasks,
    maintenanceLogs: changedLogs,
    waterEvents: changedWater,
    placeUserData: changedPlaceUserData,
    preferences: prefs[0] ?? null,
  };
}

/**
 * Apply rows received from the server.
 *
 * Conflict policy: the server has already run last-write-wins on `updatedAt`,
 * so we trust the incoming data and apply all rows. We do a SELECT first to
 * skip rows where the local copy is already identical or newer.
 */
async function applyRemoteChanges(changes: SyncResult['changes']): Promise<void> {
  const db = getDb();

  /**
   * Generic select-then-upsert for tables with id + updatedAt.
   * Uses eq(table.idCol, id) for exact match — never gte.
   */
  async function upsertWithTimestamp(
    table: any,
    rows: unknown[],
  ): Promise<void> {
    for (const rawRow of rows as { id: string; updatedAt?: Date | null }[]) {
      try {
        const [local] = await (db.select() as any)
          .from(table)
          .where(eq(table.id, rawRow.id))
          .limit(1);
        if (!local) {
          await (db.insert(table) as any).values(rawRow);
        } else if (
          !local.updatedAt ||
          (rawRow.updatedAt && rawRow.updatedAt > local.updatedAt)
        ) {
          const { id: _id, ...fields } = rawRow as any;
          await (db.update(table) as any)
            .set(fields)
            .where(eq(table.id, rawRow.id));
        }
      } catch {
        // Skip FK violations (e.g. session before its bean is applied).
      }
    }
  }

  /** Append-only insert — ignore if row already exists. */
  async function appendOnly(table: any, rows: unknown[]): Promise<void> {
    for (const rawRow of rows) {
      try {
        await (db.insert(table) as any).values(rawRow);
      } catch {
        // already exists — ignore
      }
    }
  }

  // Apply beans first — sessions and recipes have FK references to them.
  await upsertWithTimestamp(beans, changes.beans);
  await upsertWithTimestamp(brewSessions, changes.brewSessions);
  await appendOnly(brewMilestones, changes.brewMilestones);
  await upsertWithTimestamp(tastingNotes, changes.tastingNotes);
  await upsertWithTimestamp(recipes, changes.recipes);
  await upsertWithTimestamp(machines, changes.machines);
  await upsertWithTimestamp(maintenanceTasks, changes.maintenanceTasks);
  await appendOnly(maintenanceLogs, changes.maintenanceLogs);
  await appendOnly(waterEvents, changes.waterEvents);
  await upsertWithTimestamp(placeUserData, changes.placeUserData);
}

/**
 * Run a full sync cycle:
 * 1. Collect local changes since the stored cursor.
 * 2. POST them to the Coolify-hosted sync server.
 * 3. Apply the server's response (remote changes) to the local DB.
 * 4. Advance the cursor.
 *
 * Throws on network or server errors.
 */
export async function performSync(entitlement: SyncEntitlement): Promise<void> {
  const cursor = readCursorDate();
  const localChanges = await collectLocalChanges(cursor);

  const payload: SyncPayload = {
    deviceId: entitlement.deviceId,
    cursorMs: cursor.getTime(),
    ...localChanges,
  };

  const res = await fetch(`${entitlement.serverUrl}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${entitlement.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`Sync server error ${res.status}: ${text}`);
  }

  const result = (await res.json()) as SyncResult;
  await applyRemoteChanges(result.changes);
  writeCursorMs(result.serverCursorMs);
}

/** Fetch connected devices from the server. */
export async function fetchConnectedDevices(
  entitlement: SyncEntitlement,
): Promise<import('./types').ConnectedDevice[]> {
  const res = await fetch(`${entitlement.serverUrl}/api/sync/devices`, {
    headers: { Authorization: `Bearer ${entitlement.token}` },
  });
  if (!res.ok) throw new Error(`Devices fetch failed: ${res.status}`);
  const data = (await res.json()) as { devices: import('./types').ConnectedDevice[] };
  return data.devices;
}

/** Read the locally stored cursor as a Date (null when never synced). */
export function getLastSyncDate(): Date | null {
  try {
    const raw = Storage.getItemSync(CURSOR_KEY);
    if (raw && raw !== '0') return new Date(Number(raw));
  } catch {
    // ignore
  }
  return null;
}
