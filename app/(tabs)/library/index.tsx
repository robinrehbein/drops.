import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { differenceInDays } from 'date-fns';

import { useBeans } from '@/features/beans/hooks';
import type { BeanFilter } from '@/features/beans/repo';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
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
  const [filter, setFilter] = useState<BeanFilter>('active');
  const { data, isLoading, error } = useBeans(filter);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Library"
        rightLabel="+ Add"
        onRightPress={() => router.push('/library/new' as never)}
      />
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
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
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
                onPress={() => router.push(`/library/${b.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${b.name}`}
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
}
