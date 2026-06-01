import { pickDailyPlace, type DailyCandidate } from '@/domain/daily-place';

const C = (over: Partial<DailyCandidate> = {}): DailyCandidate => ({
  name: 'X',
  city: 'Berlin',
  kind: 'cafe',
  curated: true,
  lat: null,
  lng: null,
  editorialNote: 'A lovely spot.',
  userData: null,
  ...over,
});

const STUTTGART = { lat: 48.7758, lng: 9.1829 };

describe('pickDailyPlace', () => {
  it('returns null for an empty list', () => {
    expect(pickDailyPlace([], { date: '2026-06-01' })).toBeNull();
  });

  it('returns null when nothing is eligible', () => {
    const places = [
      C({ name: 'NotCurated', curated: false }),
      C({ name: 'NoNote', editorialNote: null }),
      C({ name: 'Visited', userData: { visitedAt: new Date() } }),
    ];
    expect(pickDailyPlace(places, { date: '2026-06-01' })).toBeNull();
  });

  it('keeps wishlisted (but unvisited) places eligible', () => {
    const places = [C({ name: 'Wishy', userData: { wishlisted: true, visitedAt: null } })];
    expect(pickDailyPlace(places, { date: '2026-06-01' })?.place.name).toBe('Wishy');
  });

  it('is stable for the same date and rotates across days', () => {
    const places = ['A', 'B', 'C', 'D', 'E'].map((name) => C({ name }));
    const day1 = pickDailyPlace(places, { date: '2026-06-01' })?.place.name;
    expect(pickDailyPlace(places, { date: '2026-06-01' })?.place.name).toBe(day1);

    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const date = `2026-06-${String(d).padStart(2, '0')}`;
      seen.add(pickDailyPlace(places, { date })!.place.name);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('biases to the nearest places when an origin is given', () => {
    const near = C({ name: 'near', lat: 48.78, lng: 9.18 });
    const mid = C({ name: 'mid', lat: 49.0, lng: 9.5 });
    const far = C({ name: 'far', lat: 52.52, lng: 13.4 });
    const places = [far, mid, near];
    // pool capped at the 2 nearest → 'far' can never be chosen
    for (let d = 1; d <= 28; d++) {
      const date = `2026-06-${String(d).padStart(2, '0')}`;
      const name = pickDailyPlace(places, { origin: STUTTGART, date, max: 2 })!.place.name;
      expect(name).not.toBe('far');
    }
  });

  it('returns the distance when origin and coordinates are present', () => {
    const place = C({ name: 'here', lat: 48.7758, lng: 9.1829 });
    const res = pickDailyPlace([place], { origin: STUTTGART, date: '2026-06-01' });
    expect(res?.distanceKm).toBeCloseTo(0, 1);
  });

  it('returns a null distance without an origin', () => {
    const res = pickDailyPlace([C({ name: 'A', lat: 48.7, lng: 9.1 })], { date: '2026-06-01' });
    expect(res?.place.name).toBe('A');
    expect(res?.distanceKm).toBeNull();
  });

  it('returns a null distance when the chosen place lacks coordinates', () => {
    const res = pickDailyPlace([C({ name: 'A', lat: null, lng: null })], {
      origin: STUTTGART,
      date: '2026-06-01',
    });
    expect(res?.distanceKm).toBeNull();
  });
});
