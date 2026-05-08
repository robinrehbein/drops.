import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.space.lg,
        paddingTop: insets.top + t.space.md,
        paddingBottom: t.space.md,
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
