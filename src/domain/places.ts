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

export type PlaceLike = {
  name: string;
  city: string | null;
  kind: string;
  curated: boolean;
  lat: number | null;
  lng: number | null;
};

const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function filterPlaces<T extends PlaceLike>(
  places: T[],
  f: { query?: string; kind?: string; city?: string; curatedOnly?: boolean } = {},
): T[] {
  const q = f.query ? norm(f.query) : '';
  return places.filter((p) => {
    if (q && !norm(p.name).includes(q)) return false;
    if (f.kind && p.kind !== f.kind) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.curatedOnly && !p.curated) return false;
    return true;
  });
}

export function groupByCity<T extends PlaceLike>(places: T[]): { city: string; places: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of places) {
    const city = p.city ?? 'Unknown';
    const arr = map.get(city) ?? [];
    arr.push(p);
    map.set(city, arr);
  }
  return [...map.entries()]
    .map(([city, ps]) => ({ city, places: [...ps].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

function distOrInf(p: PlaceLike, origin: LatLng): number {
  if (p.lat == null || p.lng == null) return Number.POSITIVE_INFINITY;
  return distanceKm(origin, { lat: p.lat, lng: p.lng });
}

export function sortPlaces<T extends PlaceLike>(
  places: T[],
  by: 'name' | 'distance',
  origin?: LatLng,
): T[] {
  const copy = [...places];
  if (by === 'distance' && origin) {
    return copy.sort((a, b) => distOrInf(a, origin) - distOrInf(b, origin));
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function placeStats(
  overlay: { wishlisted?: boolean | null; visitedAt?: unknown }[],
): { visited: number; wishlist: number } {
  let visited = 0;
  let wishlist = 0;
  for (const u of overlay) {
    if (u.visitedAt) visited++;
    else if (u.wishlisted) wishlist++;
  }
  return { visited, wishlist };
}
