import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Pill } from './Pill';
import { Text } from './Text';

export type EmptyStateProps = ViewProps & {
  icon?: string;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = '☕', title, body, cta, style, ...rest }: EmptyStateProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.colors.paper,
          borderColor: t.colors.paperEdge,
          borderWidth: 1,
          borderStyle: 'dashed',
          padding: t.space.xl,
          borderRadius: t.radii.lg,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 32, marginBottom: t.space.md }}>{icon}</Text>
      <Text variant="heading" align="center">{title}</Text>
      {body ? (
        <Text variant="caption" align="center" style={{ marginTop: t.space.xs, marginBottom: t.space.md }}>
          {body}
        </Text>
      ) : null}
      {cta ? <Pill label={cta.label} onPress={cta.onPress} /> : null}
    </View>
  );
}
