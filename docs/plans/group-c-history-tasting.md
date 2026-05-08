# Group C — History & Tasting

**Goal:** Make the History and Tasting Note screens complete and delightful: grouped-by-day history, bean filtering, working sensory sliders, and a richer session detail view.

**Can run in parallel with:** Groups A, B, D, E
**Estimated effort:** Medium (2–3 sessions)

---

## Task C1: History — Grouped by Day

**Problem:** The spec says *"list grouped by day"* but `history.tsx` renders a flat chronological list. As sessions accumulate, finding "yesterday's shots" requires scanning individual timestamps.

**Files to modify:**
- `app/(tabs)/lab/history.tsx`

### Step 1: Group sessions by date

```tsx
import { startOfDay, format, isToday, isYesterday, isSameDay } from 'date-fns';

type DayGroup = {
  key: string;
  label: string;
  sessions: SessionRow[];
};

function groupByDay(sessions: SessionRow[]): DayGroup[] {
  const groups = new Map<string, SessionRow[]>();

  for (const s of sessions) {
    const day = startOfDay(s.startedAt).toISOString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(s);
  }

  return Array.from(groups.entries()).map(([day, items]) => {
    const date = new Date(day);
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else label = format(date, 'EEEE, MMM d'); // "Thursday, May 8"

    return { key: day, label, sessions: items };
  });
}
```

### Step 2: Render grouped sections

Replace the flat `sessions.map(...)` with:

```tsx
const groups = useMemo(() => groupByDay(sessions ?? []), [sessions]);

{groups.map((g) => (
  <View key={g.key}>
    <Text variant="label" style={{ marginTop: t.space.md, marginBottom: t.space.sm }}>
      {g.label}
    </Text>
    {g.sessions.map((s) => (
      <Pressable key={s.id} onPress={() => router.push(`/lab/session/${s.id}` as never)}>
        {/* existing session card */}
      </Pressable>
    ))}
  </View>
))}
```

### Acceptance criteria
- [ ] Sessions grouped under "Today", "Yesterday", or "Thursday, May 8" headers
- [ ] Within each group, sessions ordered by time (newest first)
- [ ] Empty state still works when no sessions exist
- [ ] Performance acceptable with 100+ sessions

---

## Task C2: History — Bean Filter

**Problem:** The spec mentions *"filterable by bean"* but there's no filter UI. With 100+ shots across 10+ beans, finding shots with a specific bean requires scrolling.

**Files to modify:**
- `app/(tabs)/lab/history.tsx`

### Step 1: Add filter state and UI

```tsx
const [filterBeanId, setFilterBeanId] = useState<string | null>(null);
```

### Step 2: Horizontal scrollable bean chip row

Above the session list, add a filter bar:

```tsx
<View style={{ marginBottom: t.space.md }}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm }}>
    <Pill
      label="All beans"
      variant={filterBeanId === null ? 'primary' : 'ghost'}
      onPress={() => setFilterBeanId(null)}
    />
    {(beans ?? []).map((b) => (
      <Pill
        key={b.id}
        label={b.name}
        variant={filterBeanId === b.id ? 'primary' : 'ghost'}
        onPress={() => setFilterBeanId(b.id)}
      />
    ))}
  </ScrollView>
</View>
```

### Step 3: Apply filter to sessions

```tsx
const filteredSessions = useMemo(() => {
  if (!sessions) return [];
  if (!filterBeanId) return sessions;
  return sessions.filter(s => s.beanId === filterBeanId);
}, [sessions, filterBeanId]);

// Use filteredSessions instead of sessions in groupByDay
const groups = useMemo(() => groupByDay(filteredSessions), [filteredSessions]);
```

### Step 4: Preserve filter on back navigation

Store the filter in the brew store or a URL param so it persists when navigating to session detail and back:

```tsx
// Option A: URL param
const params = useLocalSearchParams<{ beanFilter?: string }>();
useEffect(() => {
  if (params.beanFilter) setFilterBeanId(params.beanFilter);
}, [params.beanFilter]);
```

### Acceptance criteria
- [ ] Horizontal scrollable bean filter chips above history list
- [ ] "All beans" chip (default) shows all sessions
- [ ] Tapping a bean chip filters to only that bean's sessions
- [ ] Day grouping still works correctly with filter applied
- [ ] Filter persists across navigation to session detail and back
- [ ] Empty state shown when filter yields no results ("No shots with this bean yet")

---

## Task C3: Tasting Note — Sensory Sliders

**Problem:** The `tasting-note.tsx` declares `mouthfeel`, `acidity`, `sweetness`, `bitterness`, `balance` state variables but never renders any UI to adjust them. They're saved at their default value (3) every time.

**Files to modify:**
- `app/(tabs)/modals)/tasting-note.tsx`

### Step 1: Build a reusable SensorySlider component

**Create:** `src/ui/primitives/SensorySlider.tsx`

```tsx
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/ui/theme/useTheme';

type SensorySliderProps = {
  label: string;       // e.g. "Acidity"
  value: number;       // 1–5
  onChange: (v: number) => void;
};

export function SensorySlider({ label, value, onChange }: SensorySliderProps) {
  const t = useTheme();

  return (
    <View style={{ marginBottom: t.space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text variant="body">{label}</Text>
        <Text variant="numeral">{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: t.space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: t.radii.sm,
              backgroundColor: n <= value ? t.colors.forest : t.colors.paperEdge,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="caption"
              style={{ color: n <= value ? t.colors.paper : t.colors.inkSoft }}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

### Step 2: Wire sliders into tasting-note.tsx

After the yield Stepper and rating stars, add:

```tsx
<View style={{ marginTop: t.space.lg }}>
  <Text variant="heading">Sensory profile</Text>
</View>

<SensorySlider label="Mouthfeel" value={mouthfeel} onChange={setMouthfeel} />
<SensorySlider label="Acidity" value={acidity} onChange={setAcidity} />
<SensorySlider label="Sweetness" value={sweetness} onChange={setSweetness} />
<SensorySlider label="Bitterness" value={bitterness} onChange={setBitterness} />
<SensorySlider label="Balance" value={balance} onChange={setBalance} />
```

### Acceptance criteria
- [ ] All 5 sensory dimensions have interactive 1–5 sliders
- [ ] Sliders default to 3 (current behavior)
- [ ] Values are saved to `tasting_notes` table on Save
- [ ] Component has accessibility labels for each dimension
- [ ] Works well on small screens (no overflow)

---

## Task C4: Session Detail — Tasting Notes Display

**Problem:** Session detail shows milestones and comment but not the tasting notes data (mouthfeel, acidity, sweetness, bitterness, balance, flavor tags). This data is saved but invisible.

**Files to modify:**
- `app/(tabs)/lab/session/[id].tsx`

### Step 1: Add hook for tasting notes

```ts
// src/features/brew/hooks.ts — add if not present
export function useTastingNotes(sessionId: string) {
  const { brew } = useRepos();
  return useQuery({
    queryKey: ['tastingNotes', sessionId],
    queryFn: () => brew.tastingNotesForSession(sessionId),
    enabled: sessionId.length > 0,
  });
}
```

### Step 2: Query tasting_notes table in repo

```ts
// src/features/brew/repo.ts
async tastingNotesForSession(sessionId: string): Promise<TastingNoteRow | null> {
  const rows = await db
    .select()
    .from(tastingNotes)
    .where(eq(tastingNotes.sessionId, sessionId))
    .limit(1);
  return rows[0] ?? null;
}
```

### Step 3: Render sensory radar/bar chart

After the milestones section:

```tsx
const { data: tastingNote } = useTastingNotes(id ?? '');

// ...

{tastingNote ? (
  <Surface bg="paperDeep" padding="md" radius="md" bordered>
    <Text variant="heading">Tasting notes</Text>
    <View style={{ marginTop: t.space.sm, gap: t.space.xs }}>
      {[
        { label: 'Mouthfeel', value: tastingNote.mouthfeel },
        { label: 'Acidity', value: tastingNote.acidity },
        { label: 'Sweetness', value: tastingNote.sweetness },
        { label: 'Bitterness', value: tastingNote.bitterness },
        { label: 'Balance', value: tastingNote.balance },
      ].map(({ label, value }) => (
        value != null ? (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body">{label}</Text>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <View key={n} style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: n <= value ? t.colors.forest : t.colors.paperEdge,
                }} />
              ))}
            </View>
          </View>
        ) : null
      ))}
    </View>

    {tastingNote.flavorTags && tastingNote.flavorTags.length > 0 ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.xs, marginTop: t.space.sm }}>
        {tastingNote.flavorTags.map(tag => (
          <View key={tag} style={{
            backgroundColor: t.colors.forestPale,
            paddingHorizontal: t.space.sm,
            paddingVertical: 2,
            borderRadius: t.radii.pill,
          }}>
            <Text variant="caption">{tag}</Text>
          </View>
        ))}
      </View>
    ) : null}

    {tastingNote.comment ? (
      <Text variant="body" style={{ marginTop: t.space.sm }}>{tastingNote.comment}</Text>
    ) : null}
  </Surface>
) : null}
```

### Acceptance criteria
- [ ] Session detail shows tasting notes if they exist
- [ ] Sensory dimensions rendered as dot indicators (filled/empty)
- [ ] Flavor tags rendered as pills
- [ ] Comment shown
- [ ] Section hidden when no tasting notes exist for the session
- [ ] Existing session detail tests pass

---

## Task C5: Pull-to-Refresh on Lists

**Problem:** Library and History have no refresh mechanism. Data changes don't reflect until TanStack Query cache expires.

**Files to modify:**
- `app/(tabs)/library/index.tsx`
- `app/(tabs)/lab/history.tsx`

### Step 1: Add RefreshControl to both ScrollViews

```tsx
import { RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

// Inside each component:
const qc = useQueryClient();
const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await qc.invalidateQueries({ queryKey: ['beans'] }); // or ['sessions']
  setRefreshing(false);
}, [qc]);

// On the ScrollView:
<ScrollView
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.forest} />}
  // ...existing props
>
```

### Acceptance criteria
- [ ] Pull down on Library list triggers refresh
- [ ] Pull down on History list triggers refresh
- [ ] Refresh indicator uses the forest green theme color
- [ ] Spinner disappears when data is fresh

---

## Task C6: Tasting Note — Confirm Discard Dialog

**Problem:** The spec says *"Confirm dialog ('Discard this shot?') then return to IdleSetup"* but `tasting-note.tsx` discards immediately on tap with no confirmation.

**Files to modify:**
- `app/(tabs)/modals)/tasting-note.tsx`

### Step 1: Add confirmation state

```tsx
const [confirmDiscard, setConfirmDiscard] = useState(false);
```

### Step 2: Two-step discard

```tsx
<Pill
  label={confirmDiscard ? 'Tap again to confirm discard' : 'Discard shot'}
  variant={confirmDiscard ? 'danger' : 'ghost'}
  onPress={() => {
    if (confirmDiscard) onDiscard();
    else setConfirmDiscard(true);
  }}
  style={{ marginTop: t.space.md }}
/>

// Reset confirmation after 3 seconds
useEffect(() => {
  if (!confirmDiscard) return;
  const id = setTimeout(() => setConfirmDiscard(false), 3000);
  return () => clearTimeout(id);
}, [confirmDiscard]);
```

### Acceptance criteria
- [ ] First tap on "Discard shot" changes label to "Tap again to confirm" and turns danger color
- [ ] Second tap within 3 seconds actually discards
- [ ] After 3 seconds without second tap, reverts to original state
- [ ] This prevents accidental discards without a modal dialog interruption

---

## Group C Testing Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] New tests for:
  - [ ] `groupByDay` utility function unit test
  - [ ] SensorySlider component test (tap changes value)
  - [ ] `tastingNotesForSession` repo test
  - [ ] History filtering logic test
- [ ] Manual test: history shows grouped sections with day headers
- [ ] Manual test: bean filter chips work
- [ ] Manual test: tasting note sensory sliders save correctly
- [ ] Manual test: session detail shows tasting notes
- [ ] Manual test: pull-to-refresh works on both lists
- [ ] Manual test: discard requires two taps
