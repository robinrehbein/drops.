import { View, Pressable } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export type HeaderProps = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function Header({ title, onBack, rightLabel, onRightPress }: HeaderProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.space.lg,
        paddingVertical: t.space.md,
        backgroundColor: t.colors.paper,
      }}
    >
      <View style={{ width: 64 }}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
          >
            <Text variant="bodyStrong" color={t.colors.forest}>← Back</Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="title" color={t.colors.forest}>{title}</Text>
      <View style={{ width: 64, alignItems: 'flex-end' }}>
        {rightLabel && onRightPress ? (
          <Pressable accessibilityRole="button" accessibilityLabel={rightLabel} onPress={onRightPress}>
            <Text variant="bodyStrong" color={t.colors.forest}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
