import { View } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View>
      <Text variant="title">{value}</Text>
      <Text variant="caption" style={{ marginTop: t.space.xs }}>{label}</Text>
    </View>
  );
}
