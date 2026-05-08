import { and, desc, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans, brewSessions } from '@/db/schema';
import * as schema from '@/db/schema';
import { caffeineForShot, type RoastLevel } from '@/domain/caffeine';
import type { SessionRow } from '@/features/brew/types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type TodaySummary = {
  shotsToday: number;
  estimatedCaffeineMg: number;
  lastBrew: { rating: number | null; beanName: string; ratio: number | null } | null;
  bestShot: { beanName: string; rating: number; ratio: number; durationS: number } | null;
};

export type DashboardRepo = {
  todaySummary: () => Promise<TodaySummary>;
  recentShots: (n: number) => Promise<SessionRow[]>;
};

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function endOfToday(): Date {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
}

export function makeDashboardRepo(db: Db): DashboardRepo {
  return {
    async todaySummary() {
      const todayStart = startOfToday();
      const todayEnd = endOfToday();

      const todaysSessions = await db
        .select()
        .from(brewSessions)
        .where(
          and(
            isNull(brewSessions.deletedAt),
            isNotNull(brewSessions.endedAt),
            gte(brewSessions.endedAt, todayStart),
            lte(brewSessions.endedAt, todayEnd),
          ),
        );

      // Per-bean roast-level lookup for caffeine
      const beanIds = Array.from(new Set(todaysSessions.map((s) => s.beanId)));
      const beanRows = beanIds.length ? await db.select().from(beans).where(inArray(beans.id, beanIds)) : [];
      const roastByBean = new Map(beanRows.map((b) => [b.id, b.roastLevel]));

      let totalCaffeine = 0;
      for (const s of todaysSessions) {
        totalCaffeine += caffeineForShot(s.doseG, (roastByBean.get(s.beanId) ?? null) as RoastLevel | null);
      }

      // Last completed brew
      const last = await db
        .select()
        .from(brewSessions)
        .where(and(isNull(brewSessions.deletedAt), isNotNull(brewSessions.endedAt)))
        .orderBy(desc(brewSessions.startedAt))
        .limit(1);

      let lastBrew: TodaySummary['lastBrew'] = null;
      if (last[0]) {
        const beanRow = (await db.select().from(beans).where(eq(beans.id, last[0].beanId)))[0];
        lastBrew = {
          rating: last[0].rating,
          beanName: beanRow?.name ?? '—',
          ratio: last[0].yieldG && last[0].doseG ? last[0].yieldG / last[0].doseG : null,
        };
      }

      let bestShot: TodaySummary['bestShot'] = null;
      const rated = todaysSessions.filter((s) => s.rating != null);
      if (rated.length > 0) {
        const best = rated.reduce((a, b) => (a.rating ?? 0) > (b.rating ?? 0) ? a : b);
        const bestBean = beanRows.find((b) => b.id === best.beanId);
        bestShot = {
          beanName: bestBean?.name ?? '—',
          rating: best.rating!,
          ratio: best.yieldG && best.doseG ? best.yieldG / best.doseG : 0,
          durationS: best.durationS ?? 0,
        };
      }

      return {
        shotsToday: todaysSessions.length,
        estimatedCaffeineMg: totalCaffeine,
        lastBrew,
        bestShot,
      };
    },
    async recentShots(n) {
      return db
        .select()
        .from(brewSessions)
        .where(and(isNull(brewSessions.deletedAt), isNotNull(brewSessions.endedAt)))
        .orderBy(desc(brewSessions.startedAt))
        .limit(n);
    },
  };
}
