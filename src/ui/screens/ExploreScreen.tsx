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
  // Location permission gates the native puck; granting it lets MapLibre draw +
  // refine the dot immediately, without waiting on our one-shot JS fix.
  const [locationGranted, setLocationGranted] = useState(false);
  // Whether the camera is currently centred on the user (Google-Maps-style):
  // the locate button is "active" only while true, and any user pan clears it.
  const [following, setFollowing] = useState(false);
  const followingRef = useRef(false);
  const setFollow = (v: boolean) => {
    followingRef.current = v;
    setFollowing(v);
  };
  // Measured map viewport height (excludes the tab bar), used to centre the
  // camera in the area above the list sheet rather than the full window.
  const [mapHeight, setMapHeight] = useState(0);
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

  // Inset the camera's logical viewport so coordinates centre in the strip of
  // map visible above the list sheet — not the full window. Using the measured
  // map height keeps this correct on devices where the tab bar shrinks the map.
  const sheetRatio = LIST_SHEET_SNAP_RATIOS[listSheetIndex] ?? LIST_SHEET_SNAP_RATIOS[1];
  const mapContentInset = {
    top: Math.round(insets.top + theme.space.md),
    bottom: Math.round((mapHeight || height) * sheetRatio),
    left: 0,
    right: 0,
  };

  function focusCoordinate(coord: LatLng, zoom: number) {
    zoomRef.current = zoom;
    cameraRef.current?.flyTo({ center: [coord.lng, coord.lat], zoom, duration: 600 });
  }

  async function zoomMap(delta: 1 | -1) {
    const liveZoom = await mapRef.current?.getZoom().catch(() => null);
    const currentZoom = liveZoom ?? zoomRef.current;
    const nextZoom = Math.min(18, Math.max(2, Math.round(currentZoom) + delta));
    zoomRef.current = nextZoom;
    cameraRef.current?.zoomTo(nextZoom, { duration: 250 });
  }

  function selectPlace(id: string) {
    const p = places.find((x) => x.id === id);
    if (p?.lat != null && p?.lng != null) {
      focusCoordinate({ lat: p.lat, lng: p.lng }, 14);
    }
    setSelectedId(id);
  }

  // Apply a position fix: enable distance sort and re-centre — but only while
  // still following, so a user pan between the cached and fresh fix isn't undone.
  function applyFix(pos: { coords: { latitude: number; longitude: number } }) {
    const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setOrigin(o);
    // First fix auto-switches to distance sort so the closest places surface.
    // The user can still toggle back to A–Z.
    setSortMode('distance');
    if (followingRef.current) focusCoordinate(o, 12);
  }

  // Tap = re-centre on the device and follow it. Granting permission alone lets
  // the native puck draw right away; a cached fix centres instantly while a
  // fresh fix refines in the background. Surfaces every failure path — denied
  // permission or no fix at all — instead of dying quietly.
  async function locateMe() {
    logDebug('info', 'explore: locate tapped');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logDebug('warn', `explore: location permission ${status}`);
        Alert.alert(t('explore.locationDeniedTitle'), t('explore.locationDeniedBody'));
        return;
      }
      setLocationGranted(true);
      setFollow(true);

      // Instant: a cached fix (if any) centres without waiting on cold GPS.
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) applyFix(last);

      // Refine with a fresh fix; emulators/cold GPS may never return one.
      const fresh = await Location.getCurrentPositionAsync({}).catch(() => null);
      if (fresh) {
        applyFix(fresh);
        logDebug('info', 'explore: centred on user location');
      } else if (!last) {
        logDebug('warn', 'explore: no position available');
        Alert.alert(t('explore.locationErrorTitle'), t('explore.locationErrorBody'));
        setFollow(false);
      }
    } catch (err) {
      logDebug('error', `explore: locate failed: ${String(err)}`);
      Alert.alert(t('explore.locationErrorTitle'), t('explore.locationErrorBody'));
      setFollow(false);
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
      <View style={{ flex: 1 }} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
        <ExploreMap
          places={sorted}
          onSelect={selectPlace}
          selectedId={selectedId}
          cameraRef={cameraRef}
          mapRef={mapRef}
          showUserLocation={locationGranted}
          contentInset={mapContentInset}
          onUserPan={() => {
            if (followingRef.current) setFollow(false);
          }}
        />
      </View>

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
            accessibilityState={{ selected: following }}
            onPress={locateMe}
            style={[
              fabCircle,
              { backgroundColor: following ? theme.colors.forest : theme.colors.paper },
            ]}
          >
            <Text variant="title" color={following ? theme.colors.paper : theme.colors.forest}>
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
