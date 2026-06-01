import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { LatLng } from '@/domain/places';

/**
 * Best-effort current position. Returns null when permission is denied or the
 * device can't provide a fix — callers treat that as "location unknown" rather
 * than an error, so the app never blocks or nags on a non-critical feature.
 */
async function fetchOrigin(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export function useDeviceLocation(): { origin: LatLng | null; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['device-location'],
    queryFn: fetchOrigin,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return { origin: query.data ?? null, isLoading: query.isLoading };
}
