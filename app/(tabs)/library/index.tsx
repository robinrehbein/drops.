import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { differenceInDays } from 'date-fns';

import { useBeans } from '@/features/beans/hooks';
import { useSessions } from '@/features/brew/hooks';
import { useBean } from '@/features/beans/hooks';
import type { BeanFilter } from '@/features/beans/repo';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { SplitPane } from '@/ui/primitives/SplitPane';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useLayout } from '@/ui/layout/useLayout';
import { useTheme } from '@/ui/theme/useTheme';

const FILTERS: { value: BeanFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'finished', label: 'Finished' },
  { value: 'would_buy', label: '👍 Buy again' },
  { value: 'all', label: 'All' },
];

export default function LibraryIndex() {
  const router = useRouter();
  const t = useTheme();
  const { isTablet } = useLayout();
  const [filter, setFilter] = useState<BeanFilter>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, error } = useBeans(filter);

  function handleBeanPress(id: string) {
    if (isTablet) {
      setSelectedId((prev) => (prev === id ? null : id));
    } else {
      router.push(`/library/${id}` as never);
    }
  }

  const list = (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Library"
        rightLabel="+ Add"
        onRightPress={() => router.push('/library/new' as never)}
      />
      {/* Shot history entry */}
      <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md }}>
        <Pill
          label="Shot history"
          variant="ghost"
          onPress={() => router.push('/lab/history' as never)}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
      {/* Filter chips */}
      <View style={{ flexDirection: 'row', paddingHorizontal: t.space.lg, paddingTop: t.space.sm, gap: t.space.sm }}>
        {FILTERS.map((f) => (
          <Pill
            key={f.value}
            label={f.label}
            variant={filter === f.value ? 'primary' : 'ghost'}
            onPress={() => setFilter(f.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: filter === f.value }}
            accessibilityLabel={`Library filter ${f.label}`}
          />
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        {isLoading ? (
          <Text variant="caption">Loading…</Text>
        ) : error ? (
          <Text variant="caption" color={t.colors.danger}>
            Couldn't load beans. Pull to retry.
          </Text>
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={filter === 'active' ? 'No active beans' : 'Nothing here yet'}
            {...(filter === 'active' ? {
              body: 'Add your first bag to start logging brews.',
              cta: { label: 'Add a bean', onPress: () => router.push('/library/new' as never) },
            } : {})
            }
          />
        ) : (
          data.map((b) => {
            const remainingPct =
              b.startWeightG && b.remainingWeightG != null
                ? (b.remainingWeightG / b.startWeightG) * 100
                : null;
            const finishedDays = b.finishedAt ? differenceInDays(new Date(), b.finishedAt) : null;
            return (
              <Pressable
                key={b.id}
                onPress={() => handleBeanPress(b.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${b.name}`}
                style={isTablet && selectedId === b.id ? {
                  borderRadius: t.radii.md,
                  borderWidth: 2,
                  borderColor: t.colors.forest,
                } : undefined}
              >
                <BeanCard
                  name={b.name}
                  subtitle={[
                    b.origin,
                    b.process,
                    finishedDays != null ? `finished ${finishedDays}d ago` : null,
                  ].filter(Boolean).join(' · ')}
                  roastedOn={b.roastedOn ?? null}
                  remainingPct={remainingPct}
                  wouldBuyAgain={b.wouldBuyAgain}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const detail = selectedId ? (
    <BeanQuickDetail
      beanId={selectedId}
      onOpenFull={() => router.push(`/library/${selectedId}` as never)}
    />
  ) : (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.paper }}>
      <Text variant="caption">Select a bean to preview</Text>
    </View>
  );

  return (
    <SplitPane list={list} detail={detail} />
  );
}

// ---------------------------------------------------------------------------
// Tablet right-panel: quick bean summary
// ---------------------------------------------------------------------------

function BeanQuickDetail({ beanId, onOpenFull }: { beanId: string; onOpenFull: () => void }) {
  const t = useTheme();
  const { data: bean } = useBean(beanId);
  const { data: sessions } = useSessions(beanId);

  if (!bean) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.paper }}>
        <Text variant="caption">Loading…</Text>
      </View>
    );
  }

  const sessionCount = sessions?.length ?? 0;
  const rated = (sessions ?? []).filter((s) => s.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
      : null;
  const lastSession = sessions && sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const lastRatio =
    lastSession
      ? brewRatio(lastSession.doseG, lastSession.yieldG ?? 0)
      : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.paper }}
      contentContainerStyle={{ padding: t.space.xl, gap: t.space.lg }}
    >
      {/* Identity */}
      <View>
        <Text variant="title">{bean.name}</Text>
        {bean.roaster ? <Text variant="body" color={t.colors.inkSoft}>{bean.roaster}</Text> : null}
        {[bean.origin, bean.process].filter(Boolean).length > 0 ? (
          <Text variant="caption" style={{ marginTop: t.space.xs }}>
            {[bean.origin, bean.process].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      {/* Quick stats */}
      {sessionCount > 0 ? (
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <Text variant="label">QUICK STATS</Text>
          <View style={{ flexDirection: 'row', gap: t.space.lg, marginTop: t.space.sm }}>
            <View>
              <Text variant="numeral">{sessionCount}</Text>
              <Text variant="caption">shots</Text>
            </View>
            {avgRating != null ? (
              <View>
                <Text variant="numeral">{avgRating.toFixed(1)} ★</Text>
                <Text variant="caption">avg rating</Text>
              </View>
            ) : null}
            {lastRatio != null ? (
              <View>
                <Text variant="numeral">{formatRatio(lastRatio)}</Text>
                <Text variant="caption">last ratio</Text>
              </View>
            ) : null}
          </View>
        </Surface>
      ) : (
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <Text variant="caption">No shots logged yet.</Text>
        </Surface>
      )}

      {/* Notes preview */}
      {bean.notes ? (
        <Surface bg="paper" padding="md" radius="md" bordered>
          <Text variant="label">NOTES</Text>
          <Text variant="body" style={{ marginTop: t.space.xs }} numberOfLines={4}>
            {bean.notes}
          </Text>
        </Surface>
      ) : null}

      <Pill label="Open full detail →" onPress={onOpenFull} />
    </ScrollView>
  );
}
