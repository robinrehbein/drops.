import { type CameraRef } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { filterPlaces, placeStatus, sortPlaces, type LatLng } from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import { Text } from '@/ui/primitives/Text';
import { ExploreMap } from '@/ui/screens/ExploreMap';
import { PlaceDetailSheet } from '@/ui/screens/PlaceDetailSheet';
import {
  LIST_SHEET_SNAP_RATIOS,
  PlaceListSheet,
  type StatusFilter,
} from '@/ui/screens/PlaceListSheet';
import { useTheme } from '@/ui/theme/useTheme';

export function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: places = [] } = usePlaces();
  const cameraRef = useRef<CameraRef>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listSheetIndex, setListSheetIndex] = useState(1);
  const nearest = origin !== null;

  const byStatus = useMemo(
    () =>
      places.filter((p) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'curated') return p.curated;
        return placeStatus(p.userData) === statusFilter;
      }),
    [places, statusFilter],
  );
  const filtered = useMemo(() => filterPlaces(byStatus, { query }), [byStatus, query]);
  const sorted = useMemo(
    () => sortPlaces(filtered, nearest ? 'distance' : 'name', origin ?? undefined),
    [filtered, nearest, origin],
  );

  function mapBottomPadding(): number {
    const ratio = LIST_SHEET_SNAP_RATIOS[listSheetIndex] ?? LIST_SHEET_SNAP_RATIOS[1];
    return Math.round(height * ratio);
  }

  function focusCoordinate(coord: LatLng, zoom: number) {
    cameraRef.current?.flyTo({
      center: [coord.lng, coord.lat],
      zoom,
      duration: 600,
      padding: { top: insets.top + theme.space.md, right: 0, bottom: mapBottomPadding(), left: 0 },
    });
  }

  function selectPlace(id: string) {
    const p = places.find((x) => x.id === id);
    if (p?.lat != null && p?.lng != null) {
      focusCoordinate({ lat: p.lat, lng: p.lng }, 14);
    }
    setSelectedId(id);
  }

  async function toggleNearest() {
    if (nearest) {
      setOrigin(null);
      return;
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setOrigin(o);
    focusCoordinate(o, 12);
  }

  const fab = {
    position: 'absolute' as const,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.paperEdge,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.paper }}>
      <ExploreMap
        places={sorted}
        onSelect={selectPlace}
        selectedId={selectedId}
        cameraRef={cameraRef}
      />

      {/* Add place (top-right) */}
      <Pressable
        testID="add-place"
        accessibilityRole="button"
        accessibilityLabel={t('explore.addPlace')}
        onPress={() => router.push('/explore/new' as never)}
        style={[fab, { top: insets.top + theme.space.md, right: theme.space.lg, backgroundColor: theme.colors.paper }]}
      >
        <Text variant="title" color={theme.colors.forest}>
          ＋
        </Text>
      </Pressable>

      {/* Locate / nearest (above the sheet's mid snap) */}
      <Pressable
        testID="sort-nearest"
        accessibilityRole="button"
        accessibilityLabel={t('explore.nearMe')}
        onPress={toggleNearest}
        style={[
          fab,
          {
            bottom: '52%',
            right: theme.space.lg,
            backgroundColor: nearest ? theme.colors.forest : theme.colors.paper,
          },
        ]}
      >
        <Text variant="title" color={nearest ? theme.colors.paper : theme.colors.forest}>
          ◎
        </Text>
      </Pressable>

      <PlaceListSheet
        places={sorted}
        query={query}
        onQuery={setQuery}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onSelect={selectPlace}
        nearest={nearest}
        onSnapIndexChange={(index) => {
          if (index >= 0) setListSheetIndex(index);
        }}
      />

      <PlaceDetailSheet placeId={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}
