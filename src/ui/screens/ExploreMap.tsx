import {
  type CameraRef,
  type MapRef,
  Marker,
  UserLocation,
  type ViewPadding,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState, type Ref } from 'react';
import { Pressable } from 'react-native';

import { placeStatus } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { BaseMap } from '@/ui/maps/BaseMap';

// Germany center — fallback view when no place has coordinates yet.
const GERMANY = { lat: 51.16, lng: 10.45 };
const INITIAL_MARKER_LIMIT = 80;
const MARKER_BATCH_SIZE = 80;
const MARKER_BATCH_DELAY_MS = 80;

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
  mapRef,
  showUserLocation = false,
  contentInset,
  onUserPan,
}: {
  places: PlaceWithUserData[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  cameraRef?: Ref<CameraRef> | undefined;
  mapRef?: Ref<MapRef> | undefined;
  /** Render the device's location puck (once location permission is granted). */
  showUserLocation?: boolean;
  /** Inset so the camera centers above the list sheet. */
  contentInset?: ViewPadding;
  /** Fired when the user pans/zooms by gesture. */
  onUserPan?: () => void;
}) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const first = withCoords[0];
  const [markerLimit, setMarkerLimit] = useState(INITIAL_MARKER_LIMIT);

  useEffect(() => {
    setMarkerLimit(INITIAL_MARKER_LIMIT);
  }, [places]);

  useEffect(() => {
    if (markerLimit >= withCoords.length) return;
    const timer = setTimeout(() => {
      setMarkerLimit((current) => Math.min(current + MARKER_BATCH_SIZE, withCoords.length));
    }, MARKER_BATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [markerLimit, withCoords.length]);

  const visiblePlaces = useMemo(() => {
    if (withCoords.length <= markerLimit) return withCoords;
    const selected = selectedId ? withCoords.find((p) => p.id === selectedId) : undefined;
    const selectedSlots = selected ? 1 : 0;
    const base = withCoords.slice(0, Math.max(0, markerLimit - selectedSlots));
    if (!selected || base.some((p) => p.id === selected.id)) return base;
    return [selected, ...base];
  }, [markerLimit, selectedId, withCoords]);

  return (
    <BaseMap
      testID="map-view"
      center={first ? { lat: first.lat!, lng: first.lng! } : GERMANY}
      zoom={first ? 11 : 5}
      cameraRef={cameraRef}
      mapRef={mapRef}
      {...(contentInset ? { contentInset } : {})}
      {...(onUserPan ? { onUserPan } : {})}
    >
      {showUserLocation ? <UserLocation accuracy /> : null}
      {visiblePlaces.map((p) => {
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
