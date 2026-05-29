export type LatLng = { lat: number; lng: number };
export type PlaceStatus = 'wishlist' | 'visited' | 'none';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function placeStatus(
  u?: { wishlisted?: boolean | null; visitedAt?: unknown } | null,
): PlaceStatus {
  if (!u) return 'none';
  if (u.visitedAt) return 'visited';
  if (u.wishlisted) return 'wishlist';
  return 'none';
}
