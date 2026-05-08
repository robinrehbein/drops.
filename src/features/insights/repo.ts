import { and, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import { endOfWeek, startOfWeek } from 'date-fns';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans, brewSessions } from '@/db/schema';
import * as schema from '@/db/schema';
import { caffeineForShot, type RoastLevel } from '@/domain/caffeine';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type WeeklyRecap = {
  weekStart: Date;
  totalShots: number;
  totalCaffeineMg: number;
  avgRating: number | null;
  bestShot: { beanName: string; rating: number; ratio: number } | null;
  mostUsedBean: { name: string; count: number } | null;
  shotsPerDay: number;
  improvementFromLastWeek: number | null;
};

export type InsightsRepo = {
  weeklyRecap: () => Promise<WeeklyRecap>;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mode<T>(items: T[]): { item: T; count: number } | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  let best: T = items[0]!;
  let bestCount = 0;
  for (const item of items) {
    const c = (counts.get(item) ?? 0) + 1;
    counts.set(item, c);
    if (c > bestCount) {
      bestCount = c;
      best = item;
    }
  }
  return { item: best, count: bestCount };
}

export function makeInsightsRepo(db: Db): InsightsRepo {
  return {
    async weeklyRecap() {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      // This week's completed sessions (filter by endedAt, same as dashboard)
      const thisWeek = await db
        .select()
        .from(brewSessions)
        .where(
          and(
            isNull(brewSessions.deletedAt),
            isNotNull(brewSessions.endedAt),
            gte(brewSessions.endedAt, weekStart),
            lte(brewSessions.endedAt, weekEnd),
          ),
        );

      // Last week for comparison
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekEnd);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

      const lastWeek = await db
        .select()
        .from(brewSessions)
        .where(
          and(
            isNull(brewSessions.deletedAt),
            isNotNull(brewSessions.endedAt),
            gte(brewSessions.endedAt, lastWeekStart),
            lte(brewSessions.endedAt, lastWeekEnd),
          ),
        );

      const totalShots = thisWeek.length;

      // Bean lookup for this week
      const beanIds = Array.from(new Set(thisWeek.map((s) => s.beanId)));
      const beanRows = beanIds.length
        ? await db.select().from(beans).where(inArray(beans.id, beanIds))
        : [];
      const beanById = new Map(beanRows.map((b) => [b.id, b]));

      // Total caffeine
      let totalCaffeineMg = 0;
      for (const s of thisWeek) {
        const roastLevel = beanById.get(s.beanId)?.roastLevel;
        totalCaffeineMg += caffeineForShot(s.doseG, roastLevel as RoastLevel | null | undefined);
      }

      // Average rating
      const ratings = thisWeek.filter((s) => s.rating != null).map((s) => s.rating!);
      const avgRatingVal = avg(ratings);

      // Best shot
      let bestShot: WeeklyRecap['bestShot'] = null;
      if (ratings.length > 0) {
        const best = thisWeek
          .filter((s) => s.rating != null)
          .reduce((a, b) => (a.rating! > b.rating! ? a : b));
        const bestBean = beanById.get(best.beanId);
        bestShot = {
          beanName: bestBean?.name ?? '—',
          rating: best.rating!,
          ratio: best.yieldG && best.doseG ? best.yieldG / best.doseG : 0,
        };
      }

      // Most used bean (mode of beanId)
      const beanIdMode = mode(thisWeek.map((s) => s.beanId));
      let mostUsedBean: WeeklyRecap['mostUsedBean'] = null;
      if (beanIdMode) {
        const b = beanById.get(beanIdMode.item);
        mostUsedBean = { name: b?.name ?? '—', count: beanIdMode.count };
      }

      // Shots per day (this week so far)
      const daysSoFar = Math.max(1, Math.ceil((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)));
      const shotsPerDay = totalShots / daysSoFar;

      // Improvement from last week
      const lastRatings = lastWeek.filter((s) => s.rating != null).map((s) => s.rating!);
      const lastAvgRating = avg(lastRatings);
      let improvementFromLastWeek: number | null = null;
      if (avgRatingVal !== null && lastAvgRating !== null) {
        improvementFromLastWeek = Math.round((avgRatingVal - lastAvgRating) * 10) / 10;
      }

      return {
        weekStart,
        totalShots,
        totalCaffeineMg,
        avgRating: avgRatingVal !== null ? Math.round(avgRatingVal * 10) / 10 : null,
        bestShot,
        mostUsedBean,
        shotsPerDay: Math.round(shotsPerDay * 10) / 10,
        improvementFromLastWeek,
      };
    },
  };
}
