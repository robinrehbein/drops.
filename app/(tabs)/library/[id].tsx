import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { differenceInDays, format } from 'date-fns';

import type { BeanInput } from '@/domain/validators/bean';
import { useBean, useRestoreBean, useSetBeanStatus, useSetWouldBuyAgain, useSoftDeleteBean, useUpdateBean } from '@/features/beans/hooks';
import { useSessions, useTastingNotesForBean } from '@/features/brew/hooks';
import { useLinkBeanSource, usePlaces } from '@/features/places/hooks';
import { useRecipeForBean, useClearRecipe } from '@/features/recipes/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { tastingRadar } from '@/domain/tasting';
import { costPerShot } from '@/domain/cost';
import { useSnackbarStore } from '@/state/snackbar';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { RecipeCard } from '@/ui/primitives/RecipeCard';
import { SensoryRadar } from '@/ui/primitives/SensoryRadar';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function BeanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: bean } = useBean(id ?? '');
  const { data: sessions } = useSessions(id);
  const { data: places = [] } = usePlaces();
  const { data: recipe } = useRecipeForBean(id ?? null);
  const { data: tastingNoteRows } = useTastingNotesForBean(id ?? null);
  const softDelete = useSoftDeleteBean();
  const restore = useRestoreBean();
  const updateBean = useUpdateBean();
  const setStatus = useSetBeanStatus();
  const setWouldBuy = useSetWouldBuyAgain();
  const linkBeanSource = useLinkBeanSource();
  const clearRecipe = useClearRecipe();
  const show = useSnackbarStore((s) => s.show);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRoaster, setEditRoaster] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  // Quick stats from sessions
  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const rated = sessions.filter((s) => s.rating != null);
    const avgRating = rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
      : null;
    const ratios = sessions.map((s) => brewRatio(s.doseG, s.yieldG ?? 0)).filter((r): r is number => r !== null);
    const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.durationS ?? 0), 0) / sessions.length;
    const avgDose = sessions.reduce((sum, s) => sum + s.doseG, 0) / sessions.length;
    const bestShot = rated.length > 0
      ? rated.reduce((best, s) => (s.rating ?? 0) > (best.rating ?? 0) ? s : best, rated[0]!)
      : null;
    return { avgRating, avgRatio, avgDuration, avgDose, bestShot, total: sessions.length };
  }, [sessions]);

  const radarAxes = useMemo(() => {
    if (!tastingNoteRows || tastingNoteRows.length === 0) return null;
    return tastingRadar(tastingNoteRows.map((n) => {
      const note: Partial<import('@/domain/tasting').TastingAxes> = {};
      if (n.mouthfeel != null) note.mouthfeel = n.mouthfeel;
      if (n.acidity != null) note.acidity = n.acidity;
      if (n.sweetness != null) note.sweetness = n.sweetness;
      if (n.bitterness != null) note.bitterness = n.bitterness;
      if (n.balance != null) note.balance = n.balance;
      return note;
    }));
  }, [tastingNoteRows]);

  if (!bean) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="caption">Bean not found</Text>
      </View>
    );
  }

  const remainingPct =
    bean.startWeightG && bean.remainingWeightG != null
      ? (bean.remainingWeightG / bean.startWeightG) * 100
      : null;

  const onDelete = async () => {
    await softDelete.mutateAsync(bean.id);
    show('Bean deleted', { label: 'Undo', onPress: () => restore.mutate(bean.id) });
    router.back();
  };

  const startEdit = () => {
    setEditName(bean.name);
    setEditRoaster(bean.roaster ?? '');
    setEditOrigin(bean.origin ?? '');
    setEditNotes(bean.notes ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const patch: Partial<BeanInput> = {};
    const trimmedName = editName.trim();
    const trimmedRoaster = editRoaster.trim();
    const trimmedOrigin = editOrigin.trim();
    const trimmedNotes = editNotes.trim();
    if (trimmedName) patch.name = trimmedName;
    if (trimmedRoaster) patch.roaster = trimmedRoaster;
    if (trimmedOrigin) patch.origin = trimmedOrigin;
    if (trimmedNotes) patch.notes = trimmedNotes;
    await updateBean.mutateAsync({ id: bean.id, patch });
    setEditing(false);
    show('Bean updated');
  };

  const cost = bean && stats
    ? costPerShot({ pricePaidMinor: bean.pricePaidMinor ?? null, startWeightG: bean.startWeightG ?? null, avgDoseG: stats.avgDose })
    : null;

  const sourcePlace = places.find((p) => p.id === bean.sourcePlaceId) ?? null;

  const selectSourcePlace = async (placeId: string | null) => {
    await linkBeanSource.mutateAsync({ beanId: bean.id, placeId });
    setSourcePickerOpen(false);
    show(placeId ? 'Source linked' : 'Source cleared');
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: t.colors.paperEdge,
    borderRadius: t.radii.md,
    padding: t.space.md,
    backgroundColor: t.colors.paperDeep,
    color: t.colors.ink,
    fontFamily: t.fonts.sans,
    fontSize: 15,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Bean"
        onBack={() => router.back()}
        rightLabel={editing ? 'Cancel' : 'Edit'}
        onRightPress={() => editing ? setEditing(false) : startEdit()}
      />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <BeanCard
          name={bean.name}
          subtitle={[bean.origin, bean.process].filter(Boolean).join(' · ')}
          roastedOn={bean.roastedOn ?? null}
          remainingPct={remainingPct}
        />

        {editing ? (
          <View style={{ gap: t.space.md }}>
            <View>
              <Text variant="label">NAME *</Text>
              <TextInput value={editName} onChangeText={setEditName} style={inputStyle} />
            </View>
            <View>
              <Text variant="label">ROASTER</Text>
              <TextInput value={editRoaster} onChangeText={setEditRoaster} style={inputStyle} />
            </View>
            <View>
              <Text variant="label">ORIGIN</Text>
              <TextInput value={editOrigin} onChangeText={setEditOrigin} style={inputStyle} />
            </View>
            <View>
              <Text variant="label">NOTES</Text>
              <TextInput value={editNotes} onChangeText={setEditNotes} multiline style={{ ...inputStyle, minHeight: 60 }} />
            </View>
            <Pill
              label={updateBean.isPending ? 'Saving…' : 'Save changes'}
              onPress={saveEdit}
              disabled={updateBean.isPending || editName.trim().length === 0}
              size="lg"
            />
          </View>
        ) : (
          <>
            {/* Recipe section */}
            <View>
              <Text variant="heading">Recipe</Text>
              <View style={{ marginTop: t.space.sm }}>
                <RecipeCard
                  recipe={recipe ?? null}
                  {...(recipe?.savedAt ? { savedFromCaption: `saved ${recipe.savedAt.toLocaleDateString()}` } : {})}
                  onEdit={() => router.push({ pathname: '/(modals)/recipe-save', params: { beanId: id, sessionId: recipe?.sourceSessionId ?? '' } } as never)}
                  {...(recipe ? { onClear: () => { clearRecipe.mutate(id ?? ''); show('Recipe cleared'); } } : {})}
                />
              </View>
            </View>

            {/* Would buy again */}
            <View>
              <Text variant="heading">Would buy again?</Text>
              <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm }}>
                <Pill
                  label="👍 Yes"
                  variant={bean.wouldBuyAgain === true ? 'primary' : 'ghost'}
                  onPress={() => setWouldBuy.mutate({ id: bean.id, value: true })}
                />
                <Pill
                  label="👎 No"
                  variant={bean.wouldBuyAgain === false ? 'danger' : 'ghost'}
                  onPress={() => setWouldBuy.mutate({ id: bean.id, value: false })}
                />
                <Pill
                  label="Undecided"
                  variant={bean.wouldBuyAgain === null ? 'ghost' : 'ghost'}
                  onPress={() => setWouldBuy.mutate({ id: bean.id, value: null })}
                />
              </View>
            </View>

            <View>
              <Text variant="heading">Source</Text>
              <Text variant="caption" style={{ marginTop: t.space.xs }}>
                {sourcePlace ? sourcePlace.name : 'No source place linked'}
              </Text>
              <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm }}>
                <Pill label="Choose source" variant="ghost" onPress={() => setSourcePickerOpen((v) => !v)} />
                {sourcePlace ? <Pill label="Clear" variant="ghost" onPress={() => selectSourcePlace(null)} /> : null}
              </View>
              {sourcePickerOpen ? (
                <View style={{ marginTop: t.space.sm }}>
                  {places.map((place) => (
                    <PlaceCard key={place.id} place={place} onPress={() => selectSourcePlace(place.id)} />
                  ))}
                </View>
              ) : null}
            </View>

            {/* Sensory radar */}
            {radarAxes ? (
              <View>
                <Text variant="heading">Sensory profile</Text>
                <View style={{ marginTop: t.space.sm }}>
                  <SensoryRadar axes={radarAxes} />
                </View>
              </View>
            ) : null}

            {bean.notes ? (
              <View>
                <Text variant="label">NOTES</Text>
                <Text variant="body" style={{ marginTop: t.space.xs }}>{bean.notes}</Text>
              </View>
            ) : null}

            {bean.roastedOn ? (() => {
              const days = differenceInDays(new Date(), bean.roastedOn);
              let advice: string;
              let adviceColor: string;
              if (days < 5) { advice = 'Still resting — wait a few more days'; adviceColor = t.colors.amber; }
              else if (days <= 14) { advice = 'Peak flavor window'; adviceColor = t.colors.forest; }
              else if (days <= 30) { advice = 'Past peak — still enjoyable'; adviceColor = t.colors.inkSoft; }
              else { advice = 'Consider using soon'; adviceColor = t.colors.inkFaint; }
              return (
                <View style={{ backgroundColor: t.colors.paperDeep, borderRadius: t.radii.md, borderWidth: 1, borderColor: t.colors.paperEdge, padding: t.space.md }}>
                  <Text variant="heading">Freshness</Text>
                  <Text variant="body" style={{ marginTop: t.space.sm }}>
                    Roasted {days} {days === 1 ? 'day' : 'days'} ago ({format(bean.roastedOn, 'MMM d, yyyy')})
                  </Text>
                  <Text variant="caption" style={{ marginTop: t.space.xs, color: adviceColor }}>{advice}</Text>
                </View>
              );
            })() : null}

            <View style={{ marginTop: t.space.lg }}>
              <Text variant="heading">History with this bean</Text>
              <Text variant="caption" style={{ marginTop: t.space.xs }}>
                {sessions?.length ?? 0} {sessions?.length === 1 ? 'shot' : 'shots'}
              </Text>
            </View>

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
                <Pill
                  label="Dialing history →"
                  variant="ghost"
                  onPress={() => router.push(`/lab/dialing?beanId=${bean.id}` as never)}
                />
              </View>
            ) : null}

            {/* Fun facts */}
            {cost != null && bean.pricePaidCurrency ? (
              <Surface bg="paperDeep" padding="md" radius="md" bordered>
                <Text variant="heading">Fun facts</Text>
                <Text variant="body" style={{ marginTop: t.space.xs }}>
                  Cost per shot: {(cost / 100).toFixed(2)} {bean.pricePaidCurrency}
                </Text>
              </Surface>
            ) : null}

            {/* Lifecycle */}
            <Surface bg="paperDeep" padding="md" radius="md" bordered>
              <Text variant="heading">Status</Text>
              <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm }}>
                {(['active', 'finished', 'archived'] as const).map((s) => (
                  <Pill
                    key={s}
                    label={s.charAt(0).toUpperCase() + s.slice(1)}
                    variant={bean.status === s ? 'primary' : 'ghost'}
                    onPress={() => setStatus.mutate({ id: bean.id, status: s })}
                  />
                ))}
              </View>
              {bean.status === 'finished' && bean.finishedAt ? (
                <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
                  Finished {bean.finishedAt.toLocaleDateString()}
                </Text>
              ) : null}
            </Surface>

            <Pill label="Delete bean" variant="danger" onPress={onDelete} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
