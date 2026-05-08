# Group B — Bean Management

**Goal:** Make the Bean Library fully functional: edit beans, show freshness badges, track remaining weight visually, and expand the add-bean form.

**Can run in parallel with:** Groups A, C, D, E
**Estimated effort:** Medium (2–3 sessions)

---

## Task B1: Bean Edit Mode

**Problem:** The spec says *"Edit pencil toggles into edit mode"* but `[id].tsx` is read-only. Users can't correct typos, update remaining weight, or add missing fields.

**Files to modify:**
- `app/(tabs)/library/[id].tsx`

### Step 1: Add edit toggle state

```tsx
const [editing, setEditing] = useState(false);
const updateBean = useUpdateBean(); // add this hook (see B2)
```

### Step 2: Build edit form (reuse new.tsx pattern)

When `editing === true`, render the same form fields from `new.tsx` but pre-filled:

```tsx
{editing ? (
  <BeanForm
    initial={{
      name: bean.name,
      roaster: bean.roaster ?? '',
      origin: bean.origin ?? '',
      roastLevel: bean.roastLevel ?? undefined,
      startWeightG: bean.startWeightG ?? undefined,
      // ... all other fields
    }}
    onSubmit={async (input) => {
      await updateBean.mutateAsync({ id: bean.id, patch: input });
      setEditing(false);
      show('Bean updated');
    }}
    submitLabel="Save changes"
  />
) : (
  // Existing read-only view
)}
```

### Step 3: Extract shared form component

To avoid duplicating the form between `new.tsx` and `[id].tsx`:

**Create:** `src/ui/forms/BeanForm.tsx`

```tsx
type BeanFormProps = {
  initial?: Partial<BeanInput>;
  onSubmit: (input: BeanInput) => Promise<void>;
  submitLabel: string;
  isPending?: boolean;
};
```

This component renders all bean fields with validation. Both `new.tsx` and `[id].tsx` use it.

### Step 4: Add edit pencil to Header

```tsx
<Header
  title="Bean"
  onBack={() => router.back()}
  rightLabel={editing ? 'Cancel' : 'Edit'}
  onRightPress={() => setEditing(!editing)}
/>
```

### Acceptance criteria
- [ ] Bean detail has an Edit button in the header
- [ ] Tapping Edit switches to a pre-filled form
- [ ] Saving persists changes and returns to read-only view
- [ ] Cancel discards changes and returns to read-only view
- [ ] All existing fields are editable; new fields from B3 appear here too

---

## Task B2: Update Bean Hook + Repo Method

**Problem:** The beans repo has `updateBean` but there's no `useUpdateBean` hook exposed.

**Files to modify:**
- `src/features/beans/hooks.ts`

### Step 1: Add mutation hook

```ts
// src/features/beans/hooks.ts
export function useUpdateBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BeanInput> }) =>
      beans.updateBean(id, patch),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['beans'] });
      void qc.invalidateQueries({ queryKey: ['bean', id] });
    },
  });
}
```

### Acceptance criteria
- [ ] `useUpdateBean` invalidates both the bean list and the single-bean query
- [ ] Returns updated row on success

---

## Task B3: Expand New Bean Form

**Problem:** The schema supports 15+ fields but the form only exposes `name`, `roaster`, `origin`, `roastLevel`, `startWeight`. Missing: `process`, `variety`, `countryCode`, `altitudeMasl`, `pricePaid`, `flavorTags`, `notes`.

**Files to modify:**
- `src/ui/forms/BeanForm.tsx` (new, from B1)
- `app/(tabs)/library/new.tsx` (refactor to use BeanForm)

### Step 1: Design expandable sections

The form has two zones:

1. **Primary** (always visible): Name, Roaster, Origin, Roast Level, Start Weight
2. **Details** (expandable accordion): Process, Variety, Country Code, Altitude, Price Paid (amount + currency), Flavor Tags, Notes

```tsx
const [showDetails, setShowDetails] = useState(false);

// After primary fields:
<Pressable onPress={() => setShowDetails(!showDetails)} style={{ ... }}>
  <Text variant="bodyStrong" color={t.colors.forest}>
    {showDetails ? '▼ Less details' : '▶ More details'}
  </Text>
</Pressable>

{showDetails ? (
  <View style={{ gap: t.space.md }}>
    {/* Process picker */}
    {/* Variety text input */}
    {/* Country code text input (2 chars) */}
    {/* Altitude number input */}
    {/* Price paid + currency row */}
    {/* Flavor tags (reusable chip selector like tasting-note) */}
    {/* Notes multiline input */}
  </View>
) : null}
```

### Step 2: Process picker

Use the enum from the validator: `'washed' | 'natural' | 'honey' | 'anaerobic' | 'other'`

```tsx
const PROCESSES = ['washed', 'natural', 'honey', 'anaerobic', 'other'];
// Render as Pill chips (same pattern as tasting-note flavor tags)
```

### Step 3: Flavor tag input

Reuse the same chip pattern from `tasting-note.tsx`. Add a text input + "Add" button to let users create custom tags:

```tsx
const COMMON_FLAVORS = ['chocolate', 'citrus', 'berry', 'floral', 'nutty', 'caramel', 'stone fruit', 'spice'];
// + free-text input for custom tags
```

### Acceptance criteria
- [ ] All 15 schema fields are editable through the form
- [ ] Primary fields are always visible; detail fields are behind an accordion
- [ ] Form validates via the existing `validateBean` zod schema
- [ ] Backward compatible: old beans (with null fields) render correctly

---

## Task B4: Days-Since-Roast Badge on Bean Cards

**Problem:** Specialty coffee users care deeply about freshness. `roastedOn` exists in the schema and `BeanCard` receives it, but no visual indicator shows how fresh the bean is.

**Files to modify:**
- `src/ui/primitives/BeanCard.tsx`

### Step 1: Compute days since roast

```tsx
import { differenceInDays } from 'date-fns';

// Inside BeanCard component:
const daysSinceRoast = roastedOn ? differenceInDays(new Date(), roastedOn) : null;
```

### Step 2: Render freshness badge

Add a small pill/chip on the card:

```tsx
const freshnessColor = (days: number): string => {
  if (days <= 7) return t.colors.forest;       // Fresh (green)
  if (days <= 21) return t.colors.amber;        // Good (amber)
  if (days <= 45) return t.colors.inkSoft;      // Aging (muted)
  return t.colors.inkFaint;                     // Old (faint)
};

const freshnessLabel = (days: number): string => {
  if (days <= 1) return 'Today';
  if (days <= 7) return `${days}d old`;
  if (days <= 14) return `${days}d · peak?`;
  if (days <= 21) return `${days}d · resting`;
  return `${days}d`;
};

// Render as a small pill in the top-right of the card:
{daysSinceRoast !== null ? (
  <View style={{
    backgroundColor: freshnessColor(daysSinceRoast),
    paddingHorizontal: t.space.sm,
    paddingVertical: 2,
    borderRadius: t.radii.pill,
  }}>
    <Text variant="caption" style={{ color: t.colors.paper }}>
      {freshnessLabel(daysSinceRoast)}
    </Text>
  </View>
) : null}
```

### Acceptance criteria
- [ ] BeanCard shows "14d · peak?" badge when roastedOn is set
- [ ] Color transitions: green (≤7d) → amber (≤21d) → muted (≤45d) → faint (>45d)
- [ ] No badge when roastedOn is null
- [ ] All existing BeanCard tests pass

---

## Task B5: Bean Weight Tracker Visual

**Problem:** `remainingWeightG` is decremented per shot but the card only shows a percentage number. A visual progress bar would be more intuitive.

**Files to modify:**
- `src/ui/primitives/BeanCard.tsx`

### Step 1: Add weight progress bar

Below the bean name/subtitle, render a thin progress bar:

```tsx
{remainingPct !== null ? (
  <View style={{ marginTop: t.space.sm }}>
    <View style={{
      height: 4,
      backgroundColor: t.colors.paperEdge,
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <View style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, remainingPct))}%`,
        backgroundColor: remainingPct > 20
          ? t.colors.forest
          : remainingPct > 5
            ? t.colors.amber
            : t.colors.danger,
        borderRadius: 2,
      }} />
    </View>
    <Text variant="caption" style={{ marginTop: 2 }}>
      {remainingWeightG != null ? `${remainingWeightG.toFixed(0)}g left` : ''}
    </Text>
  </View>
) : null}
```

### Step 2: Add "running low" indicator

When remaining < 20% of start weight, show a subtle indicator:

```tsx
{remainingPct !== null && remainingPct <= 20 && (
  <Text variant="caption" color={t.colors.amber} style={{ marginTop: 2 }}>
    Running low
  </Text>
)}
```

### Acceptance criteria
- [ ] BeanCard shows a thin progress bar proportional to remaining weight
- [ ] Bar color changes: green (>20%) → amber (≤20%) → red (≤5%)
- [ ] "Running low" text appears when below 20%
- [ ] No bar when startWeightG is not set

---

## Task B6: Bean Detail — Quick Stats

**Problem:** The "History with this bean" section only shows a shot count. Users want aggregate insights.

**Files to modify:**
- `app/(tabs)/library/[id].tsx`

### Step 1: Compute stats from loaded sessions

```tsx
const stats = useMemo(() => {
  if (!sessions || sessions.length === 0) return null;
  const rated = sessions.filter(s => s.rating != null);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
    : null;
  const avgRatio = sessions.reduce((sum, s) => sum + brewRatio(s.doseG, s.yieldG ?? 0), 0) / sessions.length;
  const bestShot = rated.length > 0
    ? rated.reduce((best, s) => (s.rating ?? 0) > (best.rating ?? 0) ? s : best, rated[0])
    : null;
  const avgDuration = sessions.reduce((sum, s) => sum + (s.durationS ?? 0), 0) / sessions.length;
  return { avgRating, avgRatio, bestShot, avgDuration, total: sessions.length };
}, [sessions]);
```

### Step 2: Render stats section

```tsx
{stats ? (
  <View style={{ gap: t.space.md }}>
    <View style={{ flexDirection: 'row', gap: t.space.md }}>
      <MetricTile label="SHOTS" value={String(stats.total)} />
      <MetricTile label="AVG RATING" value={stats.avgRating ? `${stats.avgRating.toFixed(1)}★` : '—'} />
      <MetricTile label="AVG RATIO" value={formatRatio(stats.avgRatio)} />
    </View>
    <View style={{ flexDirection: 'row', gap: t.space.md }}>
      <MetricTile label="AVG TIME" value={`${stats.avgDuration.toFixed(1)}s`} />
      <MetricTile label="BEST" value={stats.bestShot ? `${stats.bestShot.rating}★` : '—'} />
    </View>

    {/* Link to dialing helper */}
    <Pill
      label="Dialing history →"
      variant="ghost"
      onPress={() => router.push(`/lab/dialing?beanId=${bean.id}` as never)}
    />
  </View>
) : null}
```

### Acceptance criteria
- [ ] Bean detail shows average rating, ratio, duration, and best shot
- [ ] Stats section hidden when no sessions exist
- [ ] Link to dialing helper (requires Group A Task A5)

---

## Group B Testing Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all existing tests green)
- [ ] New tests for:
  - [ ] `useUpdateBean` hook test
  - [ ] BeanForm component test (validation, submission, pre-fill)
  - [ ] `freshnessLabel` / `freshnessColor` unit tests
- [ ] Manual test: edit a bean → save → verify persisted
- [ ] Manual test: add bean with all fields → verify saved
- [ ] Manual test: bean card shows freshness badge and weight bar
