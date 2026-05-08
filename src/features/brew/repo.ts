import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans, brewMilestones, brewSessions, tastingNotes } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import type { MilestoneRow, SessionRow, TastingNoteRow } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type StartArgs = {
  beanId: string;
  doseG: number;
  grinderLabel?: string | null;
  grindSetting?: string | null;
  waterTempC?: number | null;
};

export type EndArgs = { endedAt: Date; yieldG: number; durationS: number; preInfusionS?: number; firstDropS?: number };

export type FinalizeArgs = {
  rating?: number;
  comment?: string;
  mouthfeel?: number;
  acidity?: number;
  sweetness?: number;
  bitterness?: number;
  balance?: number;
  flavorTags?: string[];
  noteComment?: string;
};

export type BrewRepo = {
  startSession: (args: StartArgs) => Promise<SessionRow>;
  addMilestone: (sessionId: string, kind: string, tSeconds: number, label?: string) => Promise<void>;
  listMilestones: (sessionId: string) => Promise<MilestoneRow[]>;
  endSession: (sessionId: string, args: EndArgs) => Promise<void>;
  finalizeWithNotes: (sessionId: string, args: FinalizeArgs) => Promise<void>;
  discardSession: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<SessionRow | null>;
  listSessions: (filter?: { beanId?: string }) => Promise<SessionRow[]>;
  findInProgress: () => Promise<SessionRow | null>;
  shotsForBean: (beanId: string, limit?: number) => Promise<SessionRow[]>;
  lastShotForBean: (beanId: string) => Promise<SessionRow | null>;
  tastingNotesForSession: (sessionId: string) => Promise<TastingNoteRow | null>;
};

export function makeBrewRepo(db: Db): BrewRepo {
  return {
    async startSession(args) {
      const now = new Date();
      const row: SessionRow = {
        id: uuid(),
        beanId: args.beanId,
        method: 'espresso',
        startedAt: now,
        endedAt: null,
        doseG: args.doseG,
        yieldG: null,
        durationS: null,
        preInfusionS: null,
        firstDropS: null,
        grinderLabel: args.grinderLabel ?? null,
        grindSetting: args.grindSetting ?? null,
        waterTempC: args.waterTempC ?? null,
        rating: null,
        comment: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.insert(brewSessions).values(row);
      return row;
    },
    async addMilestone(sessionId, kind, tSeconds, label) {
      await db.insert(brewMilestones).values({
        id: uuid(),
        sessionId,
        kind,
        tSeconds,
        label: label ?? null,
        createdAt: new Date(),
      });
    },
    async listMilestones(sessionId) {
      return db
        .select()
        .from(brewMilestones)
        .where(eq(brewMilestones.sessionId, sessionId))
        .orderBy(asc(brewMilestones.tSeconds));
    },
    async endSession(sessionId, { endedAt, yieldG, durationS, preInfusionS, firstDropS }) {
      await db
        .update(brewSessions)
        .set({
          endedAt,
          yieldG,
          durationS,
          preInfusionS: preInfusionS ?? null,
          firstDropS: firstDropS ?? null,
          updatedAt: new Date(),
        })
        .where(eq(brewSessions.id, sessionId));
    },
    async finalizeWithNotes(sessionId, args) {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('session not found');

      // 1. Insert tasting note (1:1)
      await db.insert(tastingNotes).values({
        id: uuid(),
        sessionId,
        mouthfeel: args.mouthfeel ?? null,
        acidity: args.acidity ?? null,
        sweetness: args.sweetness ?? null,
        bitterness: args.bitterness ?? null,
        balance: args.balance ?? null,
        flavorTags: args.flavorTags ?? null,
        comment: args.noteComment ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Patch rating + comment on the session itself if provided
      await db
        .update(brewSessions)
        .set({ rating: args.rating ?? null, comment: args.comment ?? null, updatedAt: new Date() })
        .where(eq(brewSessions.id, sessionId));

      // 3. Decrement bean weight
      await db
        .update(beans)
        .set({
          remainingWeightG: sql`COALESCE(${beans.remainingWeightG}, ${beans.startWeightG}) - ${session.doseG}`,
          updatedAt: new Date(),
        })
        .where(eq(beans.id, session.beanId));
    },
    async discardSession(sessionId) {
      await db
        .update(brewSessions)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(brewSessions.id, sessionId));
    },
    async getSession(sessionId) {
      const rows = await db
        .select()
        .from(brewSessions)
        .where(and(eq(brewSessions.id, sessionId), isNull(brewSessions.deletedAt)));
      return rows[0] ?? null;
    },
    async listSessions(filter) {
      const conditions = [isNull(brewSessions.deletedAt), isNotNull(brewSessions.endedAt)];
      if (filter?.beanId) conditions.push(eq(brewSessions.beanId, filter.beanId));
      return db
        .select()
        .from(brewSessions)
        .where(and(...conditions))
        .orderBy(desc(brewSessions.startedAt));
    },
    async findInProgress() {
      const rows = await db
        .select()
        .from(brewSessions)
        .where(and(isNull(brewSessions.deletedAt), isNull(brewSessions.endedAt)))
        .orderBy(desc(brewSessions.startedAt))
        .limit(1);
      return rows[0] ?? null;
    },
    async shotsForBean(beanId, limit = 10) {
      return db
        .select()
        .from(brewSessions)
        .where(
          and(
            eq(brewSessions.beanId, beanId),
            isNull(brewSessions.deletedAt),
            isNotNull(brewSessions.endedAt),
          ),
        )
        .orderBy(desc(brewSessions.startedAt))
        .limit(limit);
    },
    async lastShotForBean(beanId) {
      const rows = await db
        .select()
        .from(brewSessions)
        .where(
          and(
            eq(brewSessions.beanId, beanId),
            isNull(brewSessions.deletedAt),
            isNotNull(brewSessions.endedAt),
          ),
        )
        .orderBy(desc(brewSessions.startedAt))
        .limit(1);
      return rows[0] ?? null;
    },
    async tastingNotesForSession(sessionId) {
      const rows = await db
        .select()
        .from(tastingNotes)
        .where(eq(tastingNotes.sessionId, sessionId))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}
