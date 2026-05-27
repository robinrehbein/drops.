import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import appJson from '../../app.json';
import { formatVolume } from '@/domain/water';
import { usePreferences, useUpdatePreferences } from '@/features/preferences/hooks';
import { useAddFilterChange, useAddFlush, useAddWaterRefill, useWaterSummary } from '@/features/water/hooks';
import { exportAllData } from '@/features/export/export';
import { exportDebugLog } from '@/lib/debug-log';
import { Pill } from '@/ui/primitives/Pill';
import { ProgressBar } from '@/ui/primitives/ProgressBar';
import { Sheet } from '@/ui/primitives/Sheet';
import { Stepper } from '@/ui/primitives/Stepper';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { data: prefs } = usePreferences();
  const { data: water } = useWaterSummary();
  const updatePrefs = useUpdatePreferences();
  const addRefill = useAddWaterRefill();
  const addFilterChange = useAddFilterChange();
  const addFlush = useAddFlush();
  const [refillMl, setRefillMl] = useState(1800);
  const [flushMl, setFlushMl] = useState(60);
  const tankCapacityMl = prefs?.waterTankCapacityMl ?? 1800;
  const filterThresholdMl = prefs?.filterChangeThresholdMl ?? 50000;
  const tankTopOffMl = Math.max(0, tankCapacityMl - (water?.tankBalanceMl ?? 0));
  const filterProgress = (water?.consumedSinceFilterMl ?? 0) / filterThresholdMl;
  const waterDifferenceMl = (water?.refilledSinceFilterMl ?? 0) - (water?.consumedSinceFilterMl ?? 0);

  const sendReport = async () => {
    const text = exportDebugLog();
    const path = `${FileSystem.cacheDirectory}brewlog-debug.txt`;
    await FileSystem.writeAsStringAsync(path, text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Brewlog debug log' });
    }
  };

  const cycleWeightUnit = () => {
    updatePrefs.mutate({ weightUnit: prefs?.weightUnit === 'g' ? 'oz' : 'g' });
  };

  const cycleDefaultRatio = () => {
    const next = ((prefs?.defaultRatio ?? 2) + 0.5);
    updatePrefs.mutate({ defaultRatio: next > 4 ? 1 : next });
  };

  return (
    <Sheet>
      <Text variant="title">Settings</Text>
      <ScrollView contentContainerStyle={{ gap: t.space.md, marginTop: t.space.lg }}>
        <Text variant="label">WATER & FILTER</Text>
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            <WaterStat
              label="Filter"
              value={formatVolume(water?.consumedSinceFilterMl ?? 0)}
              caption={`of ${formatVolume(filterThresholdMl)}`}
            />
            <WaterStat
              label="Tank"
              value={formatVolume(water?.tankBalanceMl ?? 0)}
              caption={`of ${formatVolume(tankCapacityMl)}`}
            />
          </View>
          <View style={{ marginTop: t.space.md }}>
          <ProgressBar progress={filterProgress} />
          <Text variant="caption" style={{ marginTop: t.space.xs }}>
            {Math.round(Math.min(1, filterProgress) * 100)}% filter used · Last change {water?.lastFilterChangeAt
              ? formatDistanceToNow(water.lastFilterChangeAt, { addSuffix: true })
              : 'not logged'}
          </Text>
        </View>
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.md }}>
            <Pill
              label="Fill tank"
              onPress={() => addRefill.mutate(tankTopOffMl || tankCapacityMl)}
              disabled={addRefill.isPending}
              style={{ flex: 1 }}
            />
            <Pill
              label="Filter changed"
              variant="ghost"
              onPress={() => addFilterChange.mutate()}
              disabled={addFilterChange.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </Surface>

        <Surface bg="paper" padding="md" radius="md" bordered>
          <Text variant="label">REFILL</Text>
          <PresetGroup
            values={[500, 1000, tankCapacityMl]}
            selected={refillMl}
            labels={{
              [tankCapacityMl]: 'Full tank',
            }}
            onSelect={setRefillMl}
          />
          <Stepper label="Amount" unit="ml" min={100} max={4000} step={100} value={refillMl} onChange={setRefillMl} />
          <Pill
            label="Log refill"
            onPress={() => addRefill.mutate(refillMl)}
            disabled={addRefill.isPending}
            style={{ marginTop: t.space.md }}
          />
        </Surface>

        <Surface bg="paper" padding="md" radius="md" bordered>
          <Text variant="label">RINSE</Text>
          <Stepper label="Flush amount" unit="ml" min={10} max={500} step={10} value={flushMl} onChange={setFlushMl} />
          <Pill
            label="Log flush"
            variant="ghost"
            onPress={() => addFlush.mutate(flushMl)}
            disabled={addFlush.isPending}
            style={{ marginTop: t.space.md }}
          />
        </Surface>

        <Surface bg="paper" padding="md" radius="md" bordered>
          <Text variant="label">BALANCE</Text>
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <WaterStat label="Refilled" value={formatVolume(water?.refilledSinceFilterMl ?? 0)} />
            <WaterStat label="Difference" value={formatVolume(waterDifferenceMl)} />
          </View>
        </Surface>

        {water?.recentEvents.length ? (
          <Surface bg="paper" padding="md" radius="md" bordered>
            <Text variant="label">RECENT WATER LOG</Text>
            {water.recentEvents.slice(0, 5).map((event) => (
              <Row
                key={event.id}
                label={waterEventLabel(event.kind)}
                value={`${formatVolume(event.volumeMl)} · ${formatDistanceToNow(event.createdAt, { addSuffix: true })}`}
              />
            ))}
          </Surface>
        ) : null}

        <Text variant="label" style={{ marginTop: t.space.md }}>MACHINE</Text>
        <Surface bg="paper" padding="md" radius="md" bordered>
        <Stepper
          label="Tank capacity"
          unit="ml"
          min={500}
          max={4000}
          step={100}
          value={tankCapacityMl}
          onChange={(waterTankCapacityMl) => updatePrefs.mutate({ waterTankCapacityMl })}
        />
        <Stepper
          label="Filter threshold"
          unit="ml"
          min={5000}
          max={150000}
          step={5000}
          value={filterThresholdMl}
          onChange={(filterChangeThresholdMl) => updatePrefs.mutate({ filterChangeThresholdMl })}
        />
        <Stepper
          label="Puck absorption"
          unit="ml/g"
          min={0}
          max={5}
          step={0.25}
          value={prefs?.puckAbsorptionMlPerDoseG ?? 2}
          onChange={(puckAbsorptionMlPerDoseG) => updatePrefs.mutate({ puckAbsorptionMlPerDoseG })}
        />
        <Stepper
          label="Shot flush estimate"
          unit="ml"
          min={0}
          max={200}
          step={5}
          value={prefs?.shotFlushMl ?? 20}
          onChange={(shotFlushMl) => updatePrefs.mutate({ shotFlushMl })}
        />
        </Surface>

        <Text variant="label" style={{ marginTop: t.space.md }}>DAILY GOALS</Text>
        <Stepper
          label="Daily cups goal"
          min={1}
          max={12}
          step={1}
          value={prefs?.dailyCupsGoal ?? 4}
          onChange={(dailyCupsGoal) => updatePrefs.mutate({ dailyCupsGoal })}
        />

        <Text variant="label" style={{ marginTop: t.space.md }}>APP</Text>
        <Row label="Weight unit" value={prefs?.weightUnit ?? 'g'} onPress={cycleWeightUnit} />
        <Row label="Default ratio" value={`1:${(prefs?.defaultRatio ?? 2).toFixed(1)}`} onPress={cycleDefaultRatio} />
        <Row label="Extraction model TDS" value={`${((prefs?.tdsAssumed ?? 0.09) * 100).toFixed(1)}%`} />
        <Row label="Theme" value="Earthy Forest" />
        <Row label="Send diagnostic report" value="↗" onPress={sendReport} />
        <Row label="Export all data (JSON)" value="↗" onPress={async () => { try { await exportAllData(); } catch { /* cancelled */ } }} />
        <Row label="About" value={`Brewlog v${appJson.expo.version}`} />
      </ScrollView>
      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', padding: t.space.md, marginTop: t.space.lg }}>
        <Text variant="bodyStrong" color={t.colors.forest}>Done</Text>
      </Pressable>
    </Sheet>
  );
}

function WaterStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text variant="label">{label}</Text>
      <Text variant="heading" style={{ marginTop: t.space.xs }}>
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" style={{ marginTop: 2 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function PresetGroup({
  values,
  selected,
  labels,
  onSelect,
}: {
  values: number[];
  selected: number;
  labels?: Record<number, string>;
  onSelect: (value: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm, marginBottom: t.space.md }}>
      {values.map((value) => (
        <Pill
          key={value}
          label={labels?.[value] ?? `+${formatVolume(value)}`}
          variant={selected === value ? 'primary' : 'ghost'}
          onPress={() => onSelect(value)}
          style={{ flex: 1, paddingHorizontal: t.space.sm }}
        />
      ))}
    </View>
  );
}

function waterEventLabel(kind: string): string {
  switch (kind) {
    case 'refill':
      return 'Tank refill';
    case 'filter_change':
      return 'Filter changed';
    case 'shot_estimate':
      return 'Shot estimate';
    case 'flush':
      return 'Flush / rinse';
    case 'manual_adjustment':
      return 'Manual adjustment';
    default:
      return kind;
  }
}

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: t.space.md,
        borderBottomWidth: 1, borderBottomColor: t.colors.paperEdge,
      }}
    >
      <Text variant="body">{label}</Text>
      <Text variant="caption">{value}</Text>
    </Pressable>
  );
}
