import { View } from 'react-native';

import type { CupsProgress } from '@/domain/cups';
import { useTheme } from '@/ui/theme/useTheme';
import { Icon } from '@/ui/icons/line';
import { Text } from './Text';

export function CupsRow({ progress }: { progress: CupsProgress }) {
  const t = useTheme();
  const { filled, total, overshoot } = progress;

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.xs }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={`cup-${i}`}
            testID={i < filled ? 'cup-filled' : 'cup-empty'}
          >
            <Icon name="cup" color={i < filled ? t.colors.forest : t.colors.inkFaint} size={22} />
          </View>
        ))}
        {Array.from({ length: overshoot }).map((_, i) => (
          <View key={`overshoot-${i}`} testID="cup-overshoot">
            <Icon name="cup" color={t.colors.amber} size={22} />
          </View>
        ))}
      </View>
      <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
        {filled} of {total}
      </Text>
    </View>
  );
}
