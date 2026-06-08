import {
  Camera,
  type CameraRef,
  Map,
  type MapProps,
  type MapRef,
  type ViewPadding,
} from '@maplibre/maplibre-react-native';
import type { ReactNode, Ref } from 'react';

import type { LatLng } from '@/domain/places';
import { OSM_STYLE } from './osmStyle';

type BaseMapProps = {
  /** Initial map center. */
  center: LatLng;
  /** Initial zoom (MapLibre zoom level, ~0 world … ~18 street). */
  zoom: number;
  /** When false, all touch interaction is disabled (static preview). */
  interactive?: boolean;
  /** Tap handler returning the pressed coordinate. */
  onPressCoord?: (coord: LatLng) => void;
  /** Imperative camera handle for flyTo/easeTo from the parent. */
  cameraRef?: Ref<CameraRef> | undefined;
  /** Imperative map handle (e.g. getZoom) for the parent's zoom controls. */
  mapRef?: Ref<MapRef> | undefined;
  /** Show + track the user's location dot. */
  trackUserLocation?: boolean;
  /** Inset between the map frame and its logical viewport, so the camera
   *  centers content in the visible area (e.g. above a bottom sheet). */
  contentInset?: ViewPadding;
  /** Fired when the user pans/zooms the map by gesture (not programmatically). */
  onUserPan?: () => void;
  testID: string;
  children?: ReactNode;
};

/**
 * Thin wrapper over MapLibre's <Map>: applies the keyless OSM style, converts
 * our {lat,lng} convention to MapLibre's [lng,lat] tuples, and exposes a
 * simplified tap callback. Shared by the explore, add-place, and detail maps.
 */
export function BaseMap({
  center,
  zoom,
  interactive = true,
  onPressCoord,
  cameraRef,
  mapRef,
  trackUserLocation = false,
  contentInset,
  onUserPan,
  testID,
  children,
}: BaseMapProps) {
  // Spread onPress only when provided — exactOptionalPropertyTypes forbids
  // passing an explicit `undefined` for an optional callback prop.
  const pressProps: Pick<MapProps, 'onPress'> | undefined = onPressCoord
    ? {
        onPress: (e) => {
          const [lng, lat] = e.nativeEvent.lngLat;
          onPressCoord({ lat, lng });
        },
      }
    : undefined;
  // Spread optional props only when present — exactOptionalPropertyTypes forbids
  // passing explicit `undefined` for optional props (ref, trackUserLocation).
  const cameraProps = {
    ...(cameraRef ? { ref: cameraRef } : {}),
    ...(trackUserLocation ? { trackUserLocation: 'default' as const } : {}),
  };
  // Forward the map ref only when provided (exactOptionalPropertyTypes forbids
  // passing an explicit `undefined` ref).
  const mapRefProp = mapRef ? { ref: mapRef } : {};
  // Spread optional props only when present (exactOptionalPropertyTypes).
  const insetProps = contentInset ? { contentInset } : {};
  // Only user-driven region changes deactivate "follow me" — programmatic
  // flyTo/zoomTo report userInteraction=false and must be ignored.
  const panProps: Pick<MapProps, 'onRegionIsChanging'> | undefined = onUserPan
    ? {
        onRegionIsChanging: (e) => {
          if (e.nativeEvent.userInteraction) onUserPan();
        },
      }
    : undefined;
  return (
    <Map
      style={{ flex: 1 }}
      {...mapRefProp}
      testID={testID}
      mapStyle={OSM_STYLE}
      logo={false}
      compass={false}
      attribution={false}
      dragPan={interactive}
      touchZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      doubleTapZoom={interactive}
      {...insetProps}
      {...panProps}
      {...pressProps}
    >
      <Camera initialViewState={{ center: [center.lng, center.lat], zoom }} {...cameraProps} />
      {children}
    </Map>
  );
}
