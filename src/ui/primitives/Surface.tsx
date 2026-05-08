import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';

export type SurfaceProps = ViewProps & {
  bg?: 'paper' | 'paperDeep';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  radius?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
};

export function Surface({ bg = 'paper', padding = 'md', radius = 'md', bordered, style, children, ...rest }: SurfaceProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.colors[bg],
          padding: t.space[padding],
          borderRadius: t.radii[radius],
          ...(bordered && { borderWidth: 1, borderColor: t.colors.paperEdge }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
