import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useRecentShots, useTodaySummary } from '@/features/dashboard/hooks';
import { useWeeklyRecap } from '@/features/insights/hooks';
import { useBeans } from '@/features/beans/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useAddWaterRefill, useWaterSummary } from '@/features/water/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { formatVolume } from '@/domain/water';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Stat } from '@/ui/primitives/Stat';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { WeeklyRecapCard } from '@/ui/primitives/WeeklyRecapCard';
import { useTheme } from '@/ui/theme/useTheme';

export default function Daily() {
  const t = useTheme();
  const router = useRouter();
  const { data: today } = useTodaySummary();
  const { data: recap } = useWeeklyRecap();
  const { data: recent } = useRecentShots(3);
  const { data: beans } = useBeans();
  const { data: prefs } = usePreferences();
  const { data: water } = useWaterSummary();
  const addRefill = useAddWaterRefill();

  const beanName = (id: string) => beans?.find((b) => b.id === id)?.name ?? '—';
  const tankCapacityMl = prefs?.waterTankCapacityMl ?? 1800;
  const filterThresholdMl = prefs?.filterChangeThresholdMl ?? 50000;
  const tankTopOffMl = Math.max(0, tankCapacityMl - (water?.tankBalanceMl ?? 0));
  const filterProgress = (water?.consumedSinceFilterMl ?? 0) / filterThresholdMl;

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

        <Pill label="Start an Espresso Shot" size="lg" onPress={() => router.push('/lab' as never)} />

        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="label">WATER</Text>
              <Text variant="heading" style={{ marginTop: t.space.xs }}>
                {formatVolume(water?.consumedSinceFilterMl ?? 0)} since filter
              </Text>
              <Text variant="caption" style={{ marginTop: 2 }}>
                {formatVolume(water?.tankBalanceMl ?? 0)} estimated in tank
              </Text>
            </View>
            <Pill
              label="Fill"
              variant="ghost"
              onPress={() => addRefill.mutate(tankTopOffMl || tankCapacityMl)}
              disabled={addRefill.isPending}
              style={{ minWidth: 82 }}
            />
          </View>
          <View style={{ marginTop: t.space.md }}>
            <ProgressBar progress={filterProgress} />
            <Text variant="caption" style={{ marginTop: t.space.xs }}>
              Filter {Math.round(Math.min(1, filterProgress) * 100)}% used · tank {formatVolume(tankCapacityMl)}
            </Text>
          </View>
        </Surface>

        {recap && recap.totalShots > 0 ? (
          <WeeklyRecapCard recap={recap} />
        ) : null}

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
