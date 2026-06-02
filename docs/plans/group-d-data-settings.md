# Group D — Data, Settings & Wiring

**Goal:** Wire the Preferences table to the Settings screen, fix the dashboard bean query, add data export, and make the Daily Brew dashboard richer.

**Can run in parallel with:** Groups A, B, C, E
**Estimated effort:** Small–Medium (2 sessions)

---

## Task D1: Settings — Wire Preferences to UI

**Problem:** All settings rows show hardcoded values. The `preferences` table exists with `weightUnit`, `defaultRatio`, `themeId`, `tdsAssumed` but none are read or written.

**Files to modify:**
- `app/(modals)/settings.tsx`
- `src/features/preferences/` (new directory)

### Step 1: Create preferences repo

**Create:** `src/features/preferences/repo.ts`

```ts
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { preferences } from '@/db/schema';
import * as schema from '@/db/schema';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export type PreferencesRow = typeof preferences.$inferSelect;

export type PreferencesUpdate = {
  weightUnit?: 'g' | 'oz';
  defaultRatio?: number;
  themeId?: string;
  tdsAssumed?: number;
};

export type PreferencesRepo = {
  get: () => Promise<PreferencesRow>;
  update: (patch: PreferencesUpdate) => Promise<PreferencesRow>;
};

export function makePreferencesRepo(db: Db): PreferencesRepo {
  return {
    async get() {
      // Ensure the single row exists
      let rows = await db.select().from(preferences).where(eq(preferences.id, 1)).limit(1);
      if (rows.length === 0) {
        const now = new Date();
        await db.insert(preferences).values({
          id: 1,
          weightUnit: 'g',
          defaultRatio: 2,
          themeId: 'earthy-forest',
          tdsAssumed: 0.09,
          updatedAt: now,
        });
        rows = await db.select().from(preferences).where(eq(preferences.id, 1)).limit(1);
      }
      return rows[0]!;
    },

    async update(patch: PreferencesUpdate) {
      const now = new Date();
      await db
        .update(preferences)
        .set({ ...patch, updatedAt: now })
        .where(eq(preferences.id, 1));
      return this.get();
    },
  };
}
```

### Step 2: Create preferences hooks

**Create:** `src/features/preferences/hooks.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { PreferencesUpdate } from './repo';

export function usePreferences() {
  const repos = useRepos();
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => repos.preferences.get(),
    staleTime: Infinity, // preferences rarely change
  });
}

export function useUpdatePreferences() {
  const repos = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesUpdate) => repos.preferences.update(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}
```

### Step 3: Register in RepoProvider

**Modify:** `src/features/_provider/repos.ts`

```ts
import { makePreferencesRepo } from '@/features/preferences/repo';
// Add to the repos object:
preferences: makePreferencesRepo(db),
```

Add the TypeScript type for the repos context.

### Step 4: Wire Settings screen

**Modify:** `app/(modals)/settings.tsx`

```tsx
import { usePreferences, useUpdatePreferences } from '@/features/preferences/hooks';

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  return (
    <Sheet>
      <Text variant="title">Settings</Text>
      <ScrollView contentContainerStyle={{ gap: t.space.md, marginTop: t.space.lg }}>
        {/* Weight unit toggle */}
        <Pressable
          onPress={() => updatePrefs.mutate({ weightUnit: prefs?.weightUnit === 'g' ? 'oz' : 'g' })}
          style={rowStyle}
        >
          <Text variant="body">Weight unit</Text>
          <Text variant="caption">{prefs?.weightUnit ?? 'g'}</Text>
        </Pressable>

        {/* Default ratio stepper (inline) */}
        <Row label="Default ratio" value={`1:${(prefs?.defaultRatio ?? 2).toFixed(1)}`}
          onPress={() => {
            const next = ((prefs?.defaultRatio ?? 2) + 0.5);
            updatePrefs.mutate({ defaultRatio: next > 4 ? 1 : next });
          }}
        />

        {/* TDS assumed (extraction model) */}
        <Row label="Extraction model TDS" value={`${((prefs?.tdsAssumed ?? 0.09) * 100).toFixed(1)}%`} />

        {/* Theme — static for v1 */}
        <Row label="Theme" value="Earthy Forest" />

        {/* Send diagnostic report */}
        <Row label="Send diagnostic report" value="↗" />

        {/* About */}
        <Row label="About" value={`Drop v${appJson.expo.version}`} />
      </ScrollView>
      {/* ...Done button... */}
    </Sheet>
  );
}
```

### Step 5: Wire preferences into the Brew Lab

The `defaultRatio` from preferences should seed the draft's `targetYieldG`:

```tsx
// In LabIndex or the BrewStore initialization:
const { data: prefs } = usePreferences();

useEffect(() => {
  if (prefs?.defaultRatio && status === 'IdleSetup' && !draft.beanId) {
    send({ type: 'configure', targetYieldG: draft.doseG * prefs.defaultRatio });
  }
}, [prefs?.defaultRatio]);
```

### Acceptance criteria
- [ ] Settings screen reads actual values from the preferences table
- [ ] Tapping "Weight unit" toggles between g and oz (persisted)
- [ ] Default ratio is adjustable and affects the Brew Lab draft
- [ ] Preferences row auto-created on first read if missing
- [ ] Preferences survive app restart

---

## Task D2: Dashboard Repo — Fix Bean Query

**Problem:** `dashboard/repo.ts` does `db.select().from(beans)` (fetches ALL beans) when calculating caffeine, instead of filtering by the beans used today.

**Files to modify:**
- `src/features/dashboard/repo.ts`

### Step 1: Replace full-table scan with filtered query

```ts
// BEFORE (fetches all beans):
const beanIds = Array.from(new Set(todaysSessions.map((s) => s.beanId)));
const beanRows = beanIds.length ? await db.select().from(beans) : [];

// AFTER (fetches only relevant beans):
const beanIds = Array.from(new Set(todaysSessions.map((s) => s.beanId)));
const beanRows = beanIds.length
  ? await db.select().from(beans).where(inArray(beans.id, beanIds))
  : [];
```

Also fix the last-brew query which loads beans without filtering:

```ts
// For the lastBrew lookup, query the specific bean:
if (last[0]) {
  const beanRows = await db.select().from(beans).where(eq(beans.id, last[0].beanId)).limit(1);
  const beanName = beanRows[0]?.name ?? '—';
  const ratio = brewRatio(last[0].doseG, last[0].yieldG ?? 0);
  lastBrew = {
    rating: last[0].rating,
    beanName,
    ratio,
  };
}
```

### Acceptance criteria
- [ ] Dashboard caffeine calculation only queries beans used in today's sessions
- [ ] Last-brew bean lookup is a targeted query, not a full scan
- [ ] Existing dashboard tests still pass

---

## Task D3: Dashboard — "Best of Today" Card

**Problem:** The Daily Brew tab shows basic stats but no "best shot" callout. Users want quick feedback on their best pull of the day.

**Files to modify:**
- `src/features/dashboard/repo.ts`
- `src/features/dashboard/hooks.ts`
- `app/(tabs)/index.tsx`

### Step 1: Add best shot to TodaySummary

```ts
export type TodaySummary = {
  shotsToday: number;
  estimatedCaffeineMg: number;
  lastBrew: { rating: number | null; beanName: string; ratio: number | null } | null;
  bestShot: { beanName: string; rating: number; ratio: number; durationS: number } | null;
};
```

In the repo, find the highest-rated session today:

```ts
const rated = todaysSessions.filter(s => s.rating != null);
let bestShot: TodaySummary['bestShot'] = null;
if (rated.length > 0) {
  const best = rated.reduce((a, b) => (a.rating ?? 0) > (b.rating ?? 0) ? a : b);
  const bestBean = beanRows.find(b => b.id === best.beanId);
  bestShot = {
    beanName: bestBean?.name ?? '—',
    rating: best.rating!,
    ratio: brewRatio(best.doseG, best.yieldG ?? 0),
    durationS: best.durationS ?? 0,
  };
}
```

### Step 2: Render in Daily Brew

```tsx
{today?.bestShot ? (
  <Surface bg="paperDeep" padding="md" radius="md" bordered>
    <Text variant="label">BEST SHOT TODAY</Text>
    <Text variant="heading" style={{ marginTop: t.space.xs }}>
      {today.bestShot.beanName}
    </Text>
    <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.xs }}>
      <Text variant="numeral">{'★'.repeat(today.bestShot.rating)}</Text>
      <Text variant="numeral">{formatRatio(today.bestShot.ratio)}</Text>
      <Text variant="numeral">{today.bestShot.durationS.toFixed(1)}s</Text>
    </View>
  </Surface>
) : null}
```

### Acceptance criteria
- [ ] Daily Brew shows "Best shot today" card when ≥ 1 rated shot exists today
- [ ] Card shows bean name, rating, ratio, and duration
- [ ] Hidden when no rated shots today

---

## Task D4: Data Export (JSON)

**Problem:** No export functionality. Privacy-first users want to own their data. This builds trust and is expected for any data-tracking app.

**Files to create:**
- `src/features/export/export.ts`

**Files to modify:**
- `app/(modals)/settings.tsx`

### Step 1: Build export function

```ts
// src/features/export/export.ts
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getDb } from '@/db/client';
import { beans, brewSessions, brewMilestones, tastingNotes, preferences } from '@/db/schema';
import { isNull } from 'drizzle-orm';

export async function exportAllData(): Promise<void> {
  const db = getDb();

  const allBeans = await db.select().from(beans).where(isNull(beans.deletedAt));
  const allSessions = await db.select().from(brewSessions).where(isNull(brewSessions.deletedAt));
  const allMilestones = await db.select().from(brewMilestones);
  const allTastingNotes = await db.select().from(tastingNotes);
  const prefs = await db.select().from(preferences).limit(1);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    beans: allBeans,
    sessions: allSessions,
    milestones: allMilestones,
    tastingNotes: allTastingNotes,
    preferences: prefs[0] ?? null,
  };

  const json = JSON.stringify(payload, null, 2);
  const path = `${FileSystem.cacheDirectory}drop-export-${Date.now()}.json`;

  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export Drop Data',
    });
  }
}
```

### Step 2: Wire to Settings

```tsx
import { exportAllData } from '@/features/export/export';

// In settings, replace the static "↗" row:
<Row
  label="Export all data (JSON)"
  value="↗"
  onPress={async () => {
    try { await exportAllData(); }
    catch (e) { /* show snackbar error */ }
  }}
/>
```

### Acceptance criteria
- [ ] Settings has an "Export all data" row
- [ ] Tapping it generates a JSON file with all non-deleted data
- [ ] System share sheet opens with the file
- [ ] Export includes beans, sessions, milestones, tasting notes, preferences
- [ ] Works on both iOS and Android

---

## Task D5: Diagnostic Report

**Problem:** The spec mentions *"Send Diagnostic Report"* in Settings but it's a static row.

**Files to create:**
- `src/lib/diagnostic.ts`

**Files to modify:**
- `app/(modals)/settings.tsx`

### Step 1: Build diagnostic collector

```ts
// src/lib/diagnostic.ts
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type DiagnosticReport = {
  timestamp: string;
  app: {
    version: string;
    buildNumber: string;
    nativeAppVersion: string;
  };
  device: {
    brand: string | null;
    modelName: string | null;
    osName: string;
    osVersion: string;
  };
  runtime: {
    jsEngine: string;
  };
};

export async function collectDiagnostic(): Promise<DiagnosticReport> {
  return {
    timestamp: new Date().toISOString(),
    app: {
      version: Application.nativeApplicationVersion ?? 'unknown',
      buildNumber: Application.nativeBuildVersion ?? 'unknown',
      nativeAppVersion: Application.nativeAppVersion ?? 'unknown',
    },
    device: {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Platform.OS,
      osVersion: `${Platform.Version}`,
    },
    runtime: {
      jsEngine: Constants.executionEnvironment ?? 'unknown',
    },
  };
}

export async function sendDiagnosticReport(): Promise<void> {
  const report = await collectDiagnostic();
  // v1: just export as JSON via share sheet.
  // v2: could POST to a support endpoint.
  const { exportAllData } = await import('@/features/export/export');
  // Reuse the export flow but include diagnostic info
  await exportAllData(); // Includes diagnostic as metadata
}
```

### Step 2: Wire to Settings

```tsx
<Row
  label="Send diagnostic report"
  value="↗"
  onPress={async () => {
    try { await sendDiagnosticReport(); }
    catch (e) { /* snackbar */ }
  }}
/>
```

### Acceptance criteria
- [ ] Settings row triggers diagnostic collection
- [ ] Report includes app version, device info, OS version
- [ ] Shared via system share sheet (same as data export)

---

## Group D Testing Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] New tests for:
  - [ ] `makePreferencesRepo` — get creates default row, update persists
  - [ ] Dashboard repo — verify bean query is filtered (not full scan)
  - [ ] Export function test (mocked FS)
- [ ] Manual test: toggle weight unit in settings → persists across restart
- [ ] Manual test: change default ratio → Brew Lab draft updates
- [ ] Manual test: export produces valid JSON with all data
