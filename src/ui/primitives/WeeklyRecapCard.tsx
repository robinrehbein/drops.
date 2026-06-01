import { View } from 'react-native';

import { Stat } from './Stat';
import { Surface } from './Surface';
import { Text } from './Text';

import type { WeeklyRecap } from '@/features/insights/repo';
import { Icon } from '@/ui/icons/line';
import { useTheme } from '@/ui/theme/useTheme';

type Props = { recap: WeeklyRecap };

export function WeeklyRecapCard({ recap }: Props) {
  const t = useTheme();

  return (
    <Surface bg="paperDeep" padding="md" radius="md" bordered>
      <Text variant="heading">This week</Text>

      <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
        <Stat value={String(recap.totalShots)} label="shots" />
        <Stat value={`${recap.totalCaffeineMg} mg`} label="caffeine" />
        <Stat value={recap.avgRating ? String(recap.avgRating) : '—'} label="avg rating" />
      </View>

      {recap.mostUsedBean ? (
        <Text variant="body" style={{ marginTop: t.space.sm }}>
          Most brewed: {recap.mostUsedBean.name} ({recap.mostUsedBean.count}×)
        </Text>
      ) : null}

      {recap.improvementFromLastWeek !== null ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.xs,
            marginTop: t.space.xs,
          }}
        >
          <Icon
            name={recap.improvementFromLastWeek >= 0 ? 'trendUp' : 'trendDown'}
            size={14}
            color={recap.improvementFromLastWeek >= 0 ? t.colors.forest : t.colors.amber}
          />
          <Text
            variant="caption"
            style={{ color: recap.improvementFromLastWeek >= 0 ? t.colors.forest : t.colors.amber }}
          >
            {Math.abs(recap.improvementFromLastWeek).toFixed(1)} vs last week
          </Text>
        </View>
      ) : null}
    </Surface>
  );
}
