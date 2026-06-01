import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { format } from 'date-fns';

import { useBean } from '@/features/beans/hooks';
import { useShotsForBean } from '@/features/brew/hooks';
import { useDialingAdvice } from '@/features/dialing/hooks';
import type { SessionRow } from '@/features/brew/types';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { CoachCard } from '@/ui/primitives/CoachCard';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function DialingScreen() {
  const { beanId } = useLocalSearchParams<{ beanId: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: bean } = useBean(beanId ?? '');
  const { data: shots } = useShotsForBean(beanId ?? null, 5);
  const { advice } = useDialingAdvice(beanId ?? null);

  if (!shots || shots.length < 2) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
        <Header title="Dialing" onBack={() => router.back()} />
        <EmptyState
          title="Not enough data"
          body="Pull at least 2 shots with this bean to see a dialing comparison."
        />
      </View>
    );
  }

  const reversed = [...shots].reverse(); // oldest first for comparison

  // Find which params changed between consecutive shots
  const changes = (i: number, field: keyof (typeof shots)[0]): boolean => {
    if (i === 0) return false;
    const prev = reversed[i - 1];
    const curr = reversed[i];
    return prev![field] !== curr![field];
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title={`Dialing: ${bean?.name ?? 'Bean'}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <CoachCard advice={advice} />
        <Text variant="caption">{shots.length} shots · newest on right</Text>

        {/* Comparison table */}
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 500 }}>
              {/* Header row */}
              <View
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.paperEdge,
                  paddingBottom: t.space.sm,
                }}
              >
                <View style={{ width: 90 }}>
                  <Text variant="label">PARAM</Text>
                </View>
                {reversed.map((s, i) => (
                  <View key={s.id} style={{ flex: 1, minWidth: 80 }}>
                    <Text variant="label">#{reversed.length - i}</Text>
                  </View>
                ))}
              </View>

              {/* Date row */}
              <ComparisonRow
                label="Date"
                values={reversed.map((s) => format(s.startedAt, 'M/d'))}
                changes={reversed.map((_, i) => i > 0)}
                t={t}
              />

              {/* Grind */}
              <ComparisonRow
                label="Grind"
                values={reversed.map((s) => s.grindSetting ?? '—')}
                changes={reversed.map((_, i) => changes(i, 'grindSetting'))}
                t={t}
              />

              {/* Dose */}
              <ComparisonRow
                label="Dose"
                values={reversed.map((s) => `${s.doseG.toFixed(1)}g`)}
                changes={reversed.map((_, i) => changes(i, 'doseG'))}
                t={t}
              />

              {/* Yield */}
              <ComparisonRow
                label="Yield"
                values={reversed.map((s) => (s.yieldG != null ? `${s.yieldG.toFixed(1)}g` : '—'))}
                changes={reversed.map((_, i) => changes(i, 'yieldG'))}
                t={t}
              />

              {/* Ratio */}
              <ComparisonRow
                label="Ratio"
                values={reversed.map((s) => formatRatio(brewRatio(s.doseG, s.yieldG ?? 0)))}
                changes={reversed.map((_, i) => {
                  if (i === 0) return false;
                  const prev = brewRatio(reversed[i - 1]!.doseG, reversed[i - 1]!.yieldG ?? 0);
                  const curr = brewRatio(reversed[i]!.doseG, reversed[i]!.yieldG ?? 0);
                  return prev !== curr;
                })}
                t={t}
              />

              {/* Duration */}
              <ComparisonRow
                label="Time"
                values={reversed.map((s) =>
                  s.durationS != null ? `${s.durationS.toFixed(1)}s` : '—',
                )}
                changes={reversed.map((_, i) => {
                  if (i === 0) return false;
                  const diff = Math.abs(
                    (reversed[i]!.durationS ?? 0) - (reversed[i - 1]!.durationS ?? 0),
                  );
                  return diff > 0.5;
                })}
                t={t}
              />

              {/* Rating */}
              <ComparisonRow
                label="Rating"
                values={reversed.map((s) => (s.rating ? '★'.repeat(s.rating) : '—'))}
                changes={reversed.map((_, i) => changes(i, 'rating'))}
                t={t}
                highlightColor={t.colors.forest}
              />
            </View>
          </ScrollView>
        </Surface>

        {/* Trend summary */}
        {shots.length >= 2 ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="heading">Trend</Text>
            <TrendSummary shots={shots} t={t} />
          </Surface>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ComparisonRow({
  label,
  values,
  changes,
  t,
  highlightColor,
}: {
  label: string;
  values: string[];
  changes: boolean[];
  t: ReturnType<typeof useTheme>;
  highlightColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: t.colors.paperEdge,
        paddingVertical: t.space.xs,
      }}
    >
      <View style={{ width: 90 }}>
        <Text variant="caption" color={t.colors.inkSoft}>
          {label}
        </Text>
      </View>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, minWidth: 80 }}>
          <Text
            variant="numeral"
            color={changes[i] ? (highlightColor ?? t.colors.amber) : t.colors.ink}
            style={{ fontWeight: changes[i] ? '700' : '400' }}
          >
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TrendSummary({ shots, t }: { shots: SessionRow[]; t: ReturnType<typeof useTheme> }) {
  if (!shots || shots.length < 2) return null;

  const newest = shots[0];
  const oldest = shots[shots.length - 1];

  if (!newest || !oldest) return null;

  const ratingDelta = (newest.rating ?? 0) - (oldest.rating ?? 0);
  const timeDelta = (newest.durationS ?? 0) - (oldest.durationS ?? 0);

  return (
    <View style={{ marginTop: t.space.sm, gap: t.space.xs }}>
      {ratingDelta !== 0 ? (
        <Text variant="body" color={ratingDelta > 0 ? t.colors.forest : t.colors.amber}>
          Rating: {ratingDelta > 0 ? '↑' : '↓'} {Math.abs(ratingDelta).toFixed(0)}★ across{' '}
          {shots.length} shots
        </Text>
      ) : (
        <Text variant="body" color={t.colors.inkSoft}>
          Rating: steady across {shots.length} shots
        </Text>
      )}
      {Math.abs(timeDelta) > 0.5 ? (
        <Text variant="body" color={t.colors.inkSoft}>
          Time: {timeDelta > 0 ? '↑' : '↓'} {Math.abs(timeDelta).toFixed(1)}s
        </Text>
      ) : null}
    </View>
  );
}
