import { ScrollView, View, type ViewProps } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';

export type SheetProps = ViewProps & { scroll?: boolean };

export function Sheet({ scroll = true, style, children, ...rest }: SheetProps) {
  const t = useTheme();
  const Inner = scroll ? ScrollView : View;
  return (
    <View
      {...rest}
      style={[
        {
          flex: 1,
          backgroundColor: t.colors.paper,
          borderTopLeftRadius: t.radii.lg,
          borderTopRightRadius: t.radii.lg,
          paddingTop: t.space.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
          backgroundColor: t.colors.paperEdge, marginBottom: t.space.lg,
        }}
      />
      <Inner contentContainerStyle={{ padding: t.space.lg, paddingBottom: t.space.xxl }}>
        {children}
      </Inner>
    </View>
  );
}
