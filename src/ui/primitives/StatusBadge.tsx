import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export type BadgeVariant = 'curated' | 'visited' | 'wishlist';

const LABEL: Record<BadgeVariant, string> = {
  curated: 'Curated',
  visited: 'Visited',
  wishlist: 'Wishlist',
};

export function StatusBadge({ variant }: { variant: BadgeVariant }) {
  const t = useTheme();
  const bg =
    variant === 'curated'
      ? t.colors.forest
      : variant === 'visited'
        ? t.colors.ink
        : t.colors.paperEdge;
  const fg = variant === 'wishlist' ? t.colors.ink : t.colors.paper;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: t.radii.pill,
        paddingHorizontal: t.space.sm,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" style={{ color: fg }}>
        {LABEL[variant]}
      </Text>
    </View>
  );
}
