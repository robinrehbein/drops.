import { View } from 'react-native';
import { differenceInDays } from 'date-fns';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export type BeanCardProps = {
  name: string;
  subtitle?: string;
  roastedOn?: Date | null;
  remainingPct?: number | null;
  wouldBuyAgain?: boolean | null;
};

function freshnessColor(days: number, t: ReturnType<typeof useTheme>): string {
  if (days <= 7) return t.colors.forest;
  if (days <= 21) return t.colors.amber;
  if (days <= 45) return t.colors.inkSoft;
  return t.colors.inkFaint;
}

function freshnessLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days <= 1) return '1d old';
  if (days <= 7) return `${days}d old`;
  if (days <= 14) return `${days}d · peak?`;
  if (days <= 21) return `${days}d · resting`;
  return `${days}d`;
}

export function BeanCard({ name, subtitle, roastedOn, remainingPct, wouldBuyAgain }: BeanCardProps) {
  const t = useTheme();
  const daysSinceRoast = roastedOn ? differenceInDays(new Date(), roastedOn) : null;

  const weightBarColor = remainingPct != null
    ? remainingPct > 20
      ? t.colors.forest
      : remainingPct > 5
        ? t.colors.amber
        : t.colors.danger
    : undefined;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.space.md,
        backgroundColor: t.colors.paper,
        borderColor: t.colors.paperEdge,
        borderWidth: 1,
        borderRadius: t.radii.md,
        padding: t.space.md,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 56, height: 56, borderRadius: t.radii.sm,
          backgroundColor: t.colors.paperDeep,
          borderColor: t.colors.paperEdge,
          borderWidth: 1,
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ position: 'absolute', top: 9, width: 24, height: 32, borderRadius: 12, backgroundColor: t.colors.forestDeep }} />
        <View style={{ position: 'absolute', top: 16, left: 26, width: 20, height: 28, borderRadius: 10, backgroundColor: t.colors.forest }} />
        <View style={{ position: 'absolute', top: 24, left: 15, width: 26, height: 24, borderRadius: 13, backgroundColor: t.colors.amber }} />
        <View style={{ position: 'absolute', bottom: 0, width: 56, height: 18, backgroundColor: t.colors.forestPale }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{name}</Text>
        {subtitle ? <Text variant="caption" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
        {remainingPct != null ? (
          <View style={{ marginTop: t.space.sm }}>
            <View style={{ height: 4, backgroundColor: t.colors.paperEdge, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, remainingPct))}%`, height: 4, backgroundColor: weightBarColor, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text variant="caption" color={remainingPct <= 20 ? t.colors.amber : t.colors.inkSoft}>
                {remainingPct <= 20 ? 'Running low' : ''}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: t.space.xs }}>
        {wouldBuyAgain === true ? (
          <View style={{ paddingHorizontal: t.space.sm, paddingVertical: 4, borderRadius: t.radii.pill, backgroundColor: t.colors.forest }}>
            <Text variant="label" color={t.colors.paper}>BUY AGAIN</Text>
          </View>
        ) : null}
        {daysSinceRoast != null ? (
          <View style={{ paddingHorizontal: t.space.sm, paddingVertical: 4, borderRadius: t.radii.pill, backgroundColor: freshnessColor(daysSinceRoast, t) }}>
            <Text variant="label" color={t.colors.paper}>{freshnessLabel(daysSinceRoast)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
