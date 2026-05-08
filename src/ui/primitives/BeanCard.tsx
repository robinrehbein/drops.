import { View } from 'react-native';
import { differenceInDays } from 'date-fns';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export type BeanCardProps = {
  name: string;
  subtitle?: string;
  roastedOn?: Date | null;
  remainingPct?: number | null;
};

export function BeanCard({ name, subtitle, roastedOn, remainingPct }: BeanCardProps) {
  const t = useTheme();
  const daysSinceRoast = roastedOn ? differenceInDays(new Date(), roastedOn) : null;
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
          width: 48, height: 48, borderRadius: t.radii.sm,
          backgroundColor: t.colors.forestDeep,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text variant="bodyStrong" color={t.colors.paper}>☕</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{name}</Text>
        {subtitle ? <Text variant="caption" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
        {remainingPct != null ? (
          <View style={{ height: 4, backgroundColor: t.colors.paperEdge, borderRadius: 2, marginTop: t.space.sm, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(0, Math.min(100, remainingPct))}%`, height: 4, backgroundColor: t.colors.forest }} />
          </View>
        ) : null}
      </View>
      {daysSinceRoast != null ? (
        <View style={{ paddingHorizontal: t.space.sm, paddingVertical: 4, borderRadius: t.radii.pill, backgroundColor: t.colors.paperDeep }}>
          <Text variant="label" color={t.colors.forest}>{daysSinceRoast}d</Text>
        </View>
      ) : null}
    </View>
  );
}
