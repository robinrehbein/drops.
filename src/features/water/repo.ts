import { desc, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { waterEvents } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type WaterEventKind =
  | 'refill'
  | 'filter_change'
  | 'shot_estimate'
  | 'flush'
  | 'manual_adjustment';

export type WaterEventRow = typeof waterEvents.$inferSelect;

export type WaterSummary = {
  lastFilterChangeAt: Date | null;
  lastRefillAt: Date | null;
  consumedSinceFilterMl: number;
  refilledSinceFilterMl: number;
  tankBalanceMl: number;
  eventCountSinceFilter: number;
  recentEvents: WaterEventRow[];
};

export type WaterRepo = {
  addRefill: (volumeMl: number, note?: string) => Promise<void>;
  addFilterChange: (note?: string) => Promise<void>;
  addFlush: (volumeMl: number, note?: string) => Promise<void>;
  addShotEstimate: (sessionId: string, volumeMl: number) => Promise<void>;
  summary: () => Promise<WaterSummary>;
  listRecent: (limit?: number) => Promise<WaterEventRow[]>;
};

const consumptionKinds: WaterEventKind[] = ['shot_estimate', 'flush', 'manual_adjustment'];

export function makeWaterRepo(db: Db): WaterRepo {
  const addEvent = async ({
    kind,
    volumeMl,
    sessionId,
    note,
  }: {
    kind: WaterEventKind;
    volumeMl?: number;
    sessionId?: string | null;
    note?: string | undefined;
  }) => {
    await db.insert(waterEvents).values({
      id: uuid(),
      kind,
      sessionId: sessionId ?? null,
      volumeMl: volumeMl ?? 0,
      note: note ?? null,
      createdAt: new Date(),
      deletedAt: null,
    });
  };

  return {
    addRefill(volumeMl, note) {
      return addEvent({ kind: 'refill', volumeMl: Math.max(0, volumeMl), note });
    },
    addFilterChange(note) {
      return addEvent({ kind: 'filter_change', note });
    },
    addFlush(volumeMl, note) {
      return addEvent({ kind: 'flush', volumeMl: Math.max(0, volumeMl), note });
    },
    addShotEstimate(sessionId, volumeMl) {
      return addEvent({ kind: 'shot_estimate', sessionId, volumeMl: Math.max(0, volumeMl) });
    },
    async listRecent(limit = 8) {
      return db
        .select()
        .from(waterEvents)
        .where(isNull(waterEvents.deletedAt))
        .orderBy(desc(waterEvents.createdAt))
        .limit(limit);
    },
    async summary() {
      const events = await db
        .select()
        .from(waterEvents)
        .where(isNull(waterEvents.deletedAt))
        .orderBy(desc(waterEvents.createdAt));
      const lastFilterIndex = events.findIndex((event) => event.kind === 'filter_change');
      const lastFilterChangeAt = lastFilterIndex >= 0 ? events[lastFilterIndex]!.createdAt : null;
      const lastRefillAt = events.find((event) => event.kind === 'refill')?.createdAt ?? null;
      const eventsSinceFilter = lastFilterIndex >= 0 ? events.slice(0, lastFilterIndex + 1) : events;
      const consumedSinceFilterMl = eventsSinceFilter
        .filter((event) => consumptionKinds.includes(event.kind as WaterEventKind))
        .reduce((total, event) => total + event.volumeMl, 0);
      const refilledSinceFilterMl = eventsSinceFilter
        .filter((event) => event.kind === 'refill')
        .reduce((total, event) => total + event.volumeMl, 0);
      return {
        lastFilterChangeAt,
        lastRefillAt,
        consumedSinceFilterMl,
        refilledSinceFilterMl,
        tankBalanceMl: Math.max(0, refilledSinceFilterMl - consumedSinceFilterMl),
        eventCountSinceFilter: eventsSinceFilter.length,
        recentEvents: events.slice(0, 8),
      };
    },
  };
}
