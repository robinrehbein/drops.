import MapView, { Marker } from 'react-native-maps';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';

// Pin color by personal status, falling back to curated vs. plain.
function pinColor(p: PlaceWithUserData): string {
  const status = placeStatus(p.userData);
  if (status === 'visited') return 'blue';
  if (status === 'wishlist') return 'orange';
  return p.curated ? 'green' : 'red';
}

export function ExploreMap({
  places,
  onSelect,
}: {
  places: PlaceWithUserData[];
  onSelect: (id: string) => void;
}) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const first = withCoords[0];
  return (
    <MapView
      style={{ flex: 1 }}
      testID="map-view"
      initialRegion={
        first
          ? { latitude: first.lat!, longitude: first.lng!, latitudeDelta: 0.2, longitudeDelta: 0.2 }
          : { latitude: 51.16, longitude: 10.45, latitudeDelta: 6, longitudeDelta: 6 }
      }
    >
      {withCoords.map((p) => (
        <Marker
          key={p.id}
          testID="map-marker"
          coordinate={{ latitude: p.lat!, longitude: p.lng! }}
          title={p.name}
          pinColor={pinColor(p)}
          onPress={() => onSelect(p.id)}
        />
      ))}
    </MapView>
  );
}
