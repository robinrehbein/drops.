import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { cupsTowardGoal } from '@/domain/cups';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { formatVolume } from '@/domain/water';
import { useBeans } from '@/features/beans/hooks';
import { useRecentShots, useTodaySummary } from '@/features/dashboard/hooks';
import { useWeeklyRecap } from '@/features/insights/hooks';
import { usePrimaryMachine } from '@/features/machines/hooks';
import { useTasksWithStatus } from '@/features/maintenance/hooks';
import { useDailyPlace } from '@/features/places/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useAddWaterRefill, useWaterSummary } from '@/features/water/hooks';
import { CupsRow } from '@/ui/primitives/CupsRow';
import { DailyPlaceCard } from '@/ui/primitives/DailyPlaceCard';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { ReadinessRow } from '@/ui/primitives/ReadinessRow';
import { StarRating } from '@/ui/primitives/StarRating';
import { Stat } from '@/ui/primitives/Stat';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { WeeklyRecapCard } from '@/ui/primitives/WeeklyRecapCard';
import { useLayout } from '@/ui/layout/useLayout';
import { useTheme } from '@/ui/theme/useTheme';

export default function Daily() {
  const t = useTheme();
  const router = useRouter();
  const { isTablet } = useLayout();
  const { data: today } = useTodaySummary();
  const { data: recap } = useWeeklyRecap();
  const { data: recent } = useRecentShots(3);
  const { data: beans } = useBeans();
  const { data: prefs } = usePreferences();
  const { data: water } = useWaterSummary();
  const { data: primaryMachine } = usePrimaryMachine();
  const dailyPlace = useDailyPlace();
  const { data: machineTasks = [] } = useTasksWithStatus(primaryMachine?.id ?? null);
  const addRefill = useAddWaterRefill();

  const beanName = (id: string) => beans?.find((b) => b.id === id)?.name ?? '—';
  const tankCapacityMl = prefs?.waterTankCapacityMl ?? 1800;
  const filterThresholdMl = prefs?.filterChangeThresholdMl ?? 50000;
  const tankTopOffMl = Math.max(0, tankCapacityMl - (water?.tankBalanceMl ?? 0));
  const filterProgress = (water?.consumedSinceFilterMl ?? 0) / filterThresholdMl;

  const dailyGoal = prefs?.dailyCupsGoal ?? 4;
  const cupsProgress = cupsTowardGoal(today?.shotsToday ?? 0, dailyGoal);
  const topTasks = machineTasks.slice(0, 3);

  // Shared content blocks — rendered in both phone (single scroll) and tablet (two columns)

  const actionColumn = (
    <>
      {/* Cups progress */}
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <CupsRow progress={cupsProgress} />
      </Surface>

      {/* Brew CTA */}
      <Pill
        label="Start an Espresso Shot"
        size="lg"
        onPress={() => router.push('/lab' as never)}
      />

      {/* Machine readiness */}
      {primaryMachine ? (
        <Pressable
          onPress={() => router.push(`/care/${primaryMachine.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${primaryMachine.name} details`}
        >
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="heading">{primaryMachine.name}</Text>
            {topTasks.length > 0 ? (
              topTasks.map((task) => (
                <ReadinessRow key={task.id} label={task.label} status={task.nextDue} />
              ))
            ) : (
              <Text variant="caption" color={t.colors.inkFaint} style={{ marginTop: t.space.xs }}>
                All tasks up to date
              </Text>
            )}
          </Surface>
        </Pressable>
      ) : (
        <Surface bg="paperDeep" padding="sm" radius="md" bordered>
          <Text variant="caption" color={t.colors.inkSoft}>
            Add a machine in Settings → Machines to track readiness.
          </Text>
        </Surface>
      )}

      {/* Water */}
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
            Filter {Math.round(Math.min(1, filterProgress) * 100)}% used · tank{' '}
            {formatVolume(tankCapacityMl)}
          </Text>
        </View>
      </Surface>
    </>
  );

  const statsColumn = (
    <>
      {/* Nearby place */}
      <DailyPlaceCard pick={dailyPlace} />

      {/* Today at a glance */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginTop: 2 }}>
            <Text variant="caption">{formatRatio(today.lastBrew.ratio)}</Text>
            {today.lastBrew.rating ? (
              <>
                <Text variant="caption">·</Text>
                <StarRating value={today.lastBrew.rating} size={12} />
              </>
            ) : null}
          </View>
        </Surface>
      ) : null}

      {today?.bestShot ? (
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <Text variant="label">BEST SHOT TODAY</Text>
          <Text variant="heading" style={{ marginTop: t.space.xs }}>
            {today.bestShot.beanName}
          </Text>
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.xs }}>
            <StarRating value={today.bestShot.rating} size={14} />
            <Text variant="numeral">{formatRatio(today.bestShot.ratio)}</Text>
            <Text variant="numeral">{today.bestShot.durationS.toFixed(1)}s</Text>
          </View>
        </Surface>
      ) : null}

      {/* Weekly recap */}
      {recap && recap.totalShots > 0 ? <WeeklyRecapCard recap={recap} /> : null}

      {/* Recent shots */}
      {recent && recent.length > 0 ? (
        <View>
          <Text variant="heading" style={{ marginBottom: t.space.sm }}>
            Recent
          </Text>
          <View style={{ gap: t.space.sm }}>
            {recent.map((s) => (
              <Surface key={s.id} bg="paperDeep" padding="md" radius="md" bordered>
                <View style={{ flexDirection: 'row', gap: t.space.md }}>
                  <MetricTile label="BEAN" value={beanName(s.beanId)} />
                  <MetricTile
                    label="RATIO"
                    value={formatRatio(brewRatio(s.doseG, s.yieldG ?? 0))}
                  />
                  <MetricTile label="RATING" value={s.rating ? <StarRating value={s.rating} size={14} /> : '—'} />
                </View>
              </Surface>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );

  if (isTablet) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
        <Header
          title="Daily"
          rightLabel="Settings"
          onRightPress={() => router.push('/(modals)/settings' as never)}
        />
        {/* Two-column grid: action left, stats right */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView
            style={{ flex: 1, borderRightWidth: 1, borderRightColor: t.colors.paperEdge }}
            contentContainerStyle={{ padding: t.space.lg, gap: t.space.lg }}
          >
            {actionColumn}
          </ScrollView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: t.space.lg, gap: t.space.lg }}
          >
            {statsColumn}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Phone: single scroll column (original layout)
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Daily"
        rightLabel="Settings"
        onRightPress={() => router.push('/(modals)/settings' as never)}
      />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.lg }}>
        {actionColumn}
        {statsColumn}
      </ScrollView>
    </View>
  );
}
