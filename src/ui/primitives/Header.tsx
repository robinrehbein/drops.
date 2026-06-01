import { View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';

import { usePressAnimation } from '@/ui/icons/animations';
import { Icon } from '@/ui/icons/line';
import { useTheme } from '@/ui/theme/useTheme';

export type HeaderProps = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function Header({ title, onBack, rightLabel, onRightPress }: HeaderProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const backAnim = usePressAnimation();
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
            onPressIn={backAnim.onPressIn}
            onPressOut={backAnim.onPressOut}
          >
            <Animated.View
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
                backAnim.style,
              ]}
            >
              <Icon name="arrowLeft" size={18} color={t.colors.forest} />
              <Text variant="bodyStrong" color={t.colors.forest}>
                Back
              </Text>
            </Animated.View>
          </Pressable>
        ) : null}
      </View>
      <Text variant="title" color={t.colors.forest}>
        {title}
      </Text>
      <View style={{ width: 64, alignItems: 'flex-end' }}>
        {rightLabel && onRightPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightLabel}
            onPress={onRightPress}
          >
            <Text variant="bodyStrong" color={t.colors.forest}>
              {rightLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
