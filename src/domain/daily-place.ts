import { distanceKm, type LatLng, type PlaceLike, sortPlaces } from './places';

/** A place the daily card can consider, plus the user's overlay. */
export type DailyCandidate = PlaceLike & {
  editorialNote: string | null;
  userData?: { wishlisted?: boolean | null; visitedAt?: unknown } | null;
};

export type DailyPick<T> = { place: T; distanceKm: number | null };

export type PickOptions = {
  /** Current location; when absent the pick is location-agnostic. */
  origin?: LatLng | null;
  /** Day key, "YYYY-MM-DD" — makes the pick stable within a day. */
  date: string;
  /** How many of the nearest places form the rotation pool. */
  max?: number;
};

/** Stable, order-independent hash of a date string → non-negative integer. */
function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (Math.imul(h, 31) + date.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Pick one curated, unvisited place to suggest for the given day.
 *
 * Eligible places are curated, have an editorial note, and aren't visited yet.
 * With an `origin`, the pool is the `max` nearest; without one it's all
 * eligible places (name-sorted). One is chosen deterministically from `date`,
 * so the suggestion is stable for the day and rotates the next.
 */
export function pickDailyPlace<T extends DailyCandidate>(
  places: T[],
  { origin = null, date, max = 8 }: PickOptions,
): DailyPick<T> | null {
  const eligible = places.filter((p) => p.curated && !!p.editorialNote && !p.userData?.visitedAt);
  if (eligible.length === 0) return null;

  const pool = origin
    ? sortPlaces(eligible, 'distance', origin).slice(0, max)
    : sortPlaces(eligible, 'name');

  const place = pool[hashDate(date) % pool.length]!;
  const dist =
    origin && place.lat != null && place.lng != null
      ? distanceKm(origin, { lat: place.lat, lng: place.lng })
      : null;
  return { place, distanceKm: dist };
}
