import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useBeans } from '@/features/beans/hooks';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function LibraryIndex() {
  const router = useRouter();
  const t = useTheme();
  const { data, isLoading, error } = useBeans();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Library"
        rightLabel="+ Add"
        onRightPress={() => router.push('/library/new' as never)}
      />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        {isLoading ? (
          <Text variant="caption">Loading…</Text>
        ) : error ? (
          <Text variant="caption" color={t.colors.danger}>
            Couldn't load beans. Pull to retry.
          </Text>
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No beans yet"
            body="Add your first bag to start logging brews."
            cta={{ label: 'Add a bean', onPress: () => router.push('/library/new' as never) }}
          />
        ) : (
          data.map((b) => {
            const remainingPct =
              b.startWeightG && b.remainingWeightG != null
                ? (b.remainingWeightG / b.startWeightG) * 100
                : null;
            return (
              <Pressable key={b.id} onPress={() => router.push(`/library/${b.id}` as never)}>
                <BeanCard
                  name={b.name}
                  subtitle={[b.origin, b.process].filter(Boolean).join(' · ')}
                  roastedOn={b.roastedOn ?? null}
                  remainingPct={remainingPct}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
