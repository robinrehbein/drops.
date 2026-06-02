import { type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { filterPlaces, placeStatus, sortPlaces, type LatLng } from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import { logDebug } from '@/lib/debug-log';
import { Text } from '@/ui/primitives/Text';
import { ExploreMap } from '@/ui/screens/ExploreMap';
import { PlaceDetailSheet } from '@/ui/screens/PlaceDetailSheet';
import {
  LIST_SHEET_SNAP_RATIOS,
  PlaceListSheet,
  type SortMode,
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
  const mapRef = useRef<MapRef>(null);
  // Last zoom we set programmatically — fallback when the live map zoom can't be
  // read (e.g. in tests where the native map is mocked).
  const zoomRef = useRef(5);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listSheetIndex, setListSheetIndex] = useState(1);
  const nearest = origin !== null;
  // Effective sort: distance only works with an origin. Without one, fall back
  // to name regardless of the user's pick so the list never looks random.
  const effectiveSort: SortMode = nearest && sortMode === 'distance' ? 'distance' : 'name';

  // The sheet writes its top Y here; the locate button hugs it like Google Maps.
  // Seed with the initial (mid) snap so the button starts in the right spot
  // before the sheet first reports its layout.
  const sheetTop = useSharedValue(height * (1 - LIST_SHEET_SNAP_RATIOS[1]));
  const FAB_SIZE = 44;
  const STACK_GAP = theme.space.sm;
  // Vertical control stack, top→bottom: [zoom in] [zoom out] [locate]. The whole
  // stack hugs the top edge of the list sheet and follows it as it's dragged.
  const CONTROLS_HEIGHT = FAB_SIZE * 3 + STACK_GAP * 2;
  // Never rise above the add-place FAB (top-right); clamp the stack there when
  // the sheet is expanded so the buttons never overlap it.
  const controlsMinTop = insets.top + theme.space.md + FAB_SIZE + theme.space.sm;
  const controlsGap = theme.space.md;
  const controlsStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.max(controlsMinTop, sheetTop.value - controlsGap - CONTROLS_HEIGHT) },
    ],
  }));

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
    () => sortPlaces(filtered, effectiveSort, origin ?? undefined),
    [filtered, effectiveSort, origin],
  );

  function mapBottomPadding(): number {
    const ratio = LIST_SHEET_SNAP_RATIOS[listSheetIndex] ?? LIST_SHEET_SNAP_RATIOS[1];
    return Math.round(height * ratio);
  }

  function focusCoordinate(coord: LatLng, zoom: number) {
    zoomRef.current = zoom;
    cameraRef.current?.flyTo({
      center: [coord.lng, coord.lat],
      zoom,
      duration: 600,
      padding: { top: insets.top + theme.space.md, right: 0, bottom: mapBottomPadding(), left: 0 },
    });
  }

  async function zoomMap(delta: 1 | -1) {
    const liveZoom = await mapRef.current?.getZoom().catch(() => null);
    const currentZoom = liveZoom ?? zoomRef.current;
    const nextZoom = Math.min(18, Math.max(2, Math.round(currentZoom) + delta));
    zoomRef.current = nextZoom;
    cameraRef.current?.zoomTo(nextZoom, {
      duration: 250,
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

  // Fetch the device location, drop the puck, centre the map, and sort by
  // distance. Always re-centres (never a silent toggle-off) and surfaces every
  // failure path — denied permission or an unavailable fix — instead of dying
  // quietly, which previously made the button look dead.
  async function locateMe() {
    logDebug('info', 'explore: locate tapped');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logDebug('warn', `explore: location permission ${status}`);
        Alert.alert(t('explore.locationDeniedTitle'), t('explore.locationDeniedBody'));
        return;
      }
      // A fresh fix often never arrives on an emulator or with cold GPS, so
      // fall back to the last known position before giving up.
      const pos =
        (await Location.getCurrentPositionAsync({}).catch(() => null)) ??
        (await Location.getLastKnownPositionAsync().catch(() => null));
      if (!pos) {
        logDebug('warn', 'explore: no position available');
        Alert.alert(t('explore.locationErrorTitle'), t('explore.locationErrorBody'));
        return;
      }
      const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setOrigin(o);
      // First successful fix auto-switches to distance sort so the closest
      // places surface immediately. The user can still toggle back to A-Z.
      setSortMode('distance');
      focusCoordinate(o, 12);
      logDebug('info', 'explore: centred on user location');
    } catch (err) {
      logDebug('error', `explore: locate failed: ${String(err)}`);
      Alert.alert(t('explore.locationErrorTitle'), t('explore.locationErrorBody'));
    }
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
    // Sit above the list sheet's host container (zIndex/elevation 10) so taps
    // always reach the FAB rather than the sheet on both iOS and Android.
    zIndex: 20,
    elevation: 20,
  };

  // Circle visuals without positioning — used inside the animated locate wrapper.
  const fabCircle = {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
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
        mapRef={mapRef}
        showUserLocation={nearest}
      />

      {/* Add place (top-right) */}
      <Pressable
        testID="add-place"
        accessibilityRole="button"
        accessibilityLabel={t('explore.addPlace')}
        onPress={() => router.push('/explore/new' as never)}
        style={[
          fab,
          {
            top: insets.top + theme.space.md,
            right: theme.space.lg,
            backgroundColor: theme.colors.paper,
          },
        ]}
      >
        <Text variant="title" color={theme.colors.forest}>
          ＋
        </Text>
      </Pressable>

      {/* Locate me — hugs the top edge of the list sheet and follows it as the
          sheet is dragged, like the Google Maps re-centre button. Hidden while a
          place detail sheet is open so it never floats over that sheet. */}
      {selectedId == null ? (
        <Animated.View
          style={[
            { position: 'absolute', top: 0, right: theme.space.lg, zIndex: 20, elevation: 20 },
            controlsStyle,
          ]}
        >
          <Pressable
            testID="map-zoom-in"
            accessibilityRole="button"
            accessibilityLabel={t('explore.zoomIn')}
            onPress={() => void zoomMap(1)}
            style={[fabCircle, { marginBottom: STACK_GAP, backgroundColor: theme.colors.paper }]}
          >
            <Text variant="title" color={theme.colors.forest}>
              +
            </Text>
          </Pressable>
          <Pressable
            testID="map-zoom-out"
            accessibilityRole="button"
            accessibilityLabel={t('explore.zoomOut')}
            onPress={() => void zoomMap(-1)}
            style={[fabCircle, { marginBottom: STACK_GAP, backgroundColor: theme.colors.paper }]}
          >
            <Text variant="title" color={theme.colors.forest}>
              -
            </Text>
          </Pressable>
          <Pressable
            testID="sort-nearest"
            accessibilityRole="button"
            accessibilityLabel={t('explore.nearMe')}
            onPress={locateMe}
            style={[
              fabCircle,
              { backgroundColor: nearest ? theme.colors.forest : theme.colors.paper },
            ]}
          >
            <Text variant="title" color={nearest ? theme.colors.paper : theme.colors.forest}>
              ◎
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <PlaceListSheet
        places={sorted}
        query={query}
        onQuery={setQuery}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onSelect={selectPlace}
        sortMode={effectiveSort}
        onSortMode={setSortMode}
        canSortByDistance={nearest}
        nearest={nearest}
        animatedPosition={sheetTop}
        onSnapIndexChange={(index) => {
          if (index >= 0) setListSheetIndex(index);
        }}
      />

      <PlaceDetailSheet placeId={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}
