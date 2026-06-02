import { TouchableOpacity } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

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

const KIND_MARK: Record<string, string> = {
  roaster: 'R',
  coffee_shop: 'C',
  cafe: 'C',
};

export function PlaceCard({ place, onPress }: { place: PlaceWithUserData; onPress: () => void }) {
  const t = useTheme();
  // Fall back to the letter badge if the remote image fails to load (404,
  // hotlink-blocked, etc.) — not just when imageUrl is null. Reset on url
  // change so recycled list rows don't inherit a stale failure.
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [place.imageUrl]);
  const status = placeStatus(place.userData);
  const kindLabel = KIND_LABEL[place.kind] ?? place.kind;
  const locationLabel = [kindLabel, place.city].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        backgroundColor: t.colors.paper,
        borderColor: t.colors.paperEdge,
        borderWidth: 1,
        borderRadius: t.radii.md,
        padding: t.space.md,
        marginVertical: t.space.xs,
        flexDirection: 'row',
        gap: t.space.md,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: t.radii.sm,
          backgroundColor: place.curated ? t.colors.forestPale : t.colors.paperDeep,
          borderColor: place.curated ? t.colors.forest : t.colors.paperEdge,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {place.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: place.imageUrl }}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            testID="place-image"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text variant="heading" color={place.curated ? t.colors.forestDeep : t.colors.inkSoft}>
            {KIND_MARK[place.kind] ?? 'P'}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: t.space.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="heading">{place.name}</Text>
            <Text variant="caption" style={{ color: t.colors.forest, marginTop: 2 }}>
              {locationLabel}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: t.space.xs,
              flexShrink: 0,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {place.curated ? <StatusBadge variant="curated" /> : null}
            {status !== 'none' ? <StatusBadge variant={status} /> : null}
          </View>
        </View>
        {place.address ? (
          <Text variant="caption" style={{ color: t.colors.inkFaint, marginTop: t.space.xs }}>
            {place.address}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
