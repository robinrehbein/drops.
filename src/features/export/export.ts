import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db/client';
import { beans, brewMilestones, brewSessions, preferences, tastingNotes, waterEvents } from '@/db/schema';
import { isNull } from 'drizzle-orm';

export async function exportAllData(): Promise<void> {
  const db = getDb();

  const allBeans = await db.select().from(beans).where(isNull(beans.deletedAt));
  const allSessions = await db.select().from(brewSessions).where(isNull(brewSessions.deletedAt));
  const allMilestones = await db.select().from(brewMilestones);
  const allTastingNotes = await db.select().from(tastingNotes);
  const allWaterEvents = await db.select().from(waterEvents).where(isNull(waterEvents.deletedAt));
  const prefs = await db.select().from(preferences).limit(1);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    beans: allBeans,
    sessions: allSessions,
    milestones: allMilestones,
    tastingNotes: allTastingNotes,
    waterEvents: allWaterEvents,
    preferences: prefs[0] ?? null,
  };

  const json = JSON.stringify(payload, null, 2);
  const path = `${FileSystem.cacheDirectory}brewlog-export-${Date.now()}.json`;

  await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export Brewlog Data',
    });
  }
}
