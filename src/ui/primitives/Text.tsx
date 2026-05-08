import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import type { TextVariant } from '@/ui/theme/tokens';

export type TextProps = Omit<RNTextProps, 'style'> & {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
};

export function Text({ variant = 'body', color, align, style, children, ...rest }: TextProps) {
  const theme = useTheme();
  const v = theme.typography[variant];
  const computed: TextStyle = {
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    color: color ?? v.color ?? theme.colors.ink,
    ...(v.letterSpacing != null && { letterSpacing: v.letterSpacing }),
    ...(v.textTransform && { textTransform: v.textTransform }),
    ...(v.fontVariant && { fontVariant: v.fontVariant as TextStyle['fontVariant'] }),
    ...(align && { textAlign: align }),
  };
  return (
    <RNText {...rest} style={style == null ? computed : [computed, style]}>
      {children}
    </RNText>
  );
}
