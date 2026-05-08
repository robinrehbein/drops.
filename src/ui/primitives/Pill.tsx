import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export type PillVariant = 'primary' | 'ghost' | 'danger';

export type PillProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: PillVariant;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Pill({ label, variant = 'primary', size = 'md', style, ...rest }: PillProps) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.colors.forest, fg: t.colors.paper, border: 'transparent' },
    ghost:   { bg: 'transparent',    fg: t.colors.forest, border: t.colors.forest },
    danger:  { bg: t.colors.danger,  fg: t.colors.paper, border: 'transparent' },
  }[variant];
  const padV = size === 'lg' ? t.space.lg : t.space.md;
  const padH = size === 'lg' ? t.space.xl : t.space.lg;
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          backgroundColor: pressed && variant === 'primary' ? t.colors.forestDeep : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'ghost' ? 1 : 0,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: t.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="bodyStrong" color={palette.fg}>
        {label}
      </Text>
    </Pressable>
  );
}
