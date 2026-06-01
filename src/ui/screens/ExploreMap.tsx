import { type CameraRef, Marker } from '@maplibre/maplibre-react-native';
import type { Ref } from 'react';
import { Pressable } from 'react-native';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { BaseMap } from '@/ui/maps/BaseMap';

// Germany center — fallback view when no place has coordinates yet.
const GERMANY = { lat: 51.16, lng: 10.45 };

// Pin color by personal status, falling back to curated vs. plain.
function pinColor(p: PlaceWithUserData): string {
  const status = placeStatus(p.userData);
  if (status === 'visited') return '#2f6db1';
  if (status === 'wishlist') return '#e08a2f';
  return p.curated ? '#2e7d4f' : '#c0392b';
}

export function ExploreMap({
  places,
  onSelect,
  selectedId,
  cameraRef,
}: {
  places: PlaceWithUserData[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  cameraRef?: Ref<CameraRef> | undefined;
}) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const first = withCoords[0];
  return (
    <BaseMap
      testID="map-view"
      center={first ? { lat: first.lat!, lng: first.lng! } : GERMANY}
      zoom={first ? 11 : 5}
      cameraRef={cameraRef}
    >
      {withCoords.map((p) => {
        const selected = p.id === selectedId;
        const size = selected ? 22 : 16;
        return (
          <Marker
            key={p.id}
            testID="map-marker"
            lngLat={[p.lng!, p.lat!]}
            anchor="bottom"
            onPress={() => onSelect(p.id)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={p.name}
              onPress={() => onSelect(p.id)}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: pinColor(p),
                borderWidth: selected ? 3 : 2,
                borderColor: '#fff',
              }}
            />
          </Marker>
        );
      })}
    </BaseMap>
  );
}
