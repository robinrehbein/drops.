import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './Text';

import { useTheme } from '@/ui/theme/useTheme';

export function MetricTile({ label, value }: { label: string; value: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.paperDeep,
        borderRadius: t.radii.md,
        paddingVertical: t.space.md,
        paddingHorizontal: t.space.md,
        minWidth: 96,
      }}
    >
      <Text variant="label">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text variant="numeral" style={{ marginTop: t.space.xs }}>
          {value}
        </Text>
      ) : (
        <View style={{ marginTop: t.space.xs }}>{value}</View>
      )}
    </View>
  );
}
