import { TouchableOpacity } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { StatusBadge } from '@/ui/primitives/StatusBadge';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KIND_LABEL: Record<string, string> = {
  roaster: 'Roaster',
  coffee_shop: 'Coffee shop',
  cafe: 'Café',
};

export function PlaceCard({ place, onPress }: { place: PlaceWithUserData; onPress: () => void }) {
  const t = useTheme();
  const status = placeStatus(place.userData);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        backgroundColor: t.colors.paper,
        borderColor: t.colors.paperEdge,
        borderWidth: 1,
        borderRadius: t.radii.sm,
        padding: t.space.md,
        marginVertical: t.space.xs,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: t.space.sm,
        }}
      >
        <Text variant="title" style={{ flex: 1 }}>
          {place.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: t.space.xs, flexShrink: 0 }}>
          {place.curated ? <StatusBadge variant="curated" /> : null}
          {status !== 'none' ? <StatusBadge variant={status} /> : null}
        </View>
      </View>
      <Text variant="caption" style={{ color: t.colors.inkFaint, marginTop: t.space.xs }}>
        {KIND_LABEL[place.kind] ?? place.kind}
        {place.address ? ` · ${place.address}` : ''}
      </Text>
    </TouchableOpacity>
  );
}
