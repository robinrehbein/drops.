import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useRecentShots, useTodaySummary } from '@/features/dashboard/hooks';
import { useBeans } from '@/features/beans/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { Stat } from '@/ui/primitives/Stat';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function Daily() {
  const t = useTheme();
  const router = useRouter();
  const { data: today } = useTodaySummary();
  const { data: recent } = useRecentShots(3);
  const { data: beans } = useBeans();

  const beanName = (id: string) => beans?.find((b) => b.id === id)?.name ?? '—';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Daily" rightLabel="Settings" onRightPress={() => router.push('/(modals)/settings' as never)} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.lg }}>
        <Text variant="heading">Today, at a glance</Text>
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <Stat value={String(today?.shotsToday ?? 0)} label="shots today" />
          <Stat value={`${today?.estimatedCaffeineMg ?? 0} mg`} label="est. caffeine" />
        </View>
        {today?.lastBrew ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="label">LAST BREW</Text>
            <Text variant="heading" style={{ marginTop: t.space.xs }}>
              {today.lastBrew.beanName}
            </Text>
            <Text variant="caption" style={{ marginTop: 2 }}>
              {formatRatio(today.lastBrew.ratio)}
              {today.lastBrew.rating ? ` · ${'★'.repeat(today.lastBrew.rating)}` : ''}
            </Text>
          </Surface>
        ) : null}

        <Pill label="Start an Espresso Shot" size="lg" onPress={() => router.push('/lab' as never)} />

        {recent && recent.length > 0 ? (
          <View>
            <Text variant="heading" style={{ marginBottom: t.space.sm }}>Recent</Text>
            <View style={{ gap: t.space.sm }}>
              {recent.map((s) => (
                <Surface key={s.id} bg="paperDeep" padding="md" radius="md" bordered>
                  <View style={{ flexDirection: 'row', gap: t.space.md }}>
                    <MetricTile label="BEAN" value={beanName(s.beanId)} />
                    <MetricTile label="RATIO" value={formatRatio(brewRatio(s.doseG, s.yieldG ?? 0))} />
                    <MetricTile label="RATING" value={s.rating ? '★'.repeat(s.rating) : '—'} />
                  </View>
                </Surface>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
