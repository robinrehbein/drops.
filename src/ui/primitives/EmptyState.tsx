import { View, type ViewProps } from 'react-native';

import { Pill } from './Pill';
import { Text } from './Text';

import { Icon, type IconName } from '@/ui/icons/line';
import { useTheme } from '@/ui/theme/useTheme';

export type EmptyStateProps = ViewProps & {
  icon?: IconName;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = 'cup', title, body, cta, style, ...rest }: EmptyStateProps) {
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
      <View style={{ marginBottom: t.space.md }}>
        <Icon name={icon} size={32} color={t.colors.inkSoft} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text
          variant="caption"
          align="center"
          style={{ marginTop: t.space.xs, marginBottom: t.space.md }}
        >
          {body}
        </Text>
      ) : null}
      {cta ? <Pill label={cta.label} onPress={cta.onPress} /> : null}
    </View>
  );
}
