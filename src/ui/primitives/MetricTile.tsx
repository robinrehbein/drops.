import { View } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export function MetricTile({ label, value }: { label: string; value: string }) {
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
      <Text variant="numeral" style={{ marginTop: t.space.xs }}>
        {value}
      </Text>
    </View>
  );
}
