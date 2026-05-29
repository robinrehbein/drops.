import { distanceKm, placeStatus, filterPlaces, groupByCity, sortPlaces, placeStats } from '@/domain/places';

describe('distanceKm', () => {
  it('is zero for identical points', () => {
    expect(distanceKm({ lat: 48.77, lng: 9.18 }, { lat: 48.77, lng: 9.18 })).toBeCloseTo(0, 5);
  });
  it('matches a known distance (Stuttgart → Munich ≈ 190 km)', () => {
    const d = distanceKm({ lat: 48.7758, lng: 9.1829 }, { lat: 48.1372, lng: 11.5756 });
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(205);
  });
});

describe('placeStatus', () => {
  it('none for missing overlay', () => {
    expect(placeStatus(null)).toBe('none');
    expect(placeStatus(undefined)).toBe('none');
  });
  it('visited wins over wishlist', () => {
    expect(placeStatus({ wishlisted: true, visitedAt: new Date() })).toBe('visited');
  });
  it('wishlist when wishlisted and not visited', () => {
    expect(placeStatus({ wishlisted: true, visitedAt: null })).toBe('wishlist');
  });
  it('none when neither', () => {
    expect(placeStatus({ wishlisted: false, visitedAt: null })).toBe('none');
  });
});

const P = (over: Partial<Parameters<typeof filterPlaces>[0][number]> = {}) => ({
  name: 'Café', city: 'Stuttgart', kind: 'cafe', curated: false, lat: null, lng: null, ...over,
});

describe('filterPlaces', () => {
  const list = [
    P({ name: 'Mókuska', curated: true }),
    P({ name: 'Harrys', kind: 'roaster', curated: true }),
    P({ name: 'Starbucks', city: 'Berlin' }),
  ];
  it('matches name case/diacritic-insensitively', () => {
    expect(filterPlaces(list, { query: 'mokuska' }).map((p) => p.name)).toEqual(['Mókuska']);
  });
  it('filters by kind', () => {
    expect(filterPlaces(list, { kind: 'roaster' }).map((p) => p.name)).toEqual(['Harrys']);
  });
  it('filters by city', () => {
    expect(filterPlaces(list, { city: 'Berlin' }).map((p) => p.name)).toEqual(['Starbucks']);
  });
  it('curatedOnly drops non-curated', () => {
    expect(filterPlaces(list, { curatedOnly: true }).map((p) => p.name)).toEqual(['Mókuska', 'Harrys']);
  });
  it('no filter returns all', () => {
    expect(filterPlaces(list, {})).toHaveLength(3);
    expect(filterPlaces(list)).toHaveLength(3);
  });
});

describe('groupByCity', () => {
  it('groups, sorts cities and places, defaults null city to Unknown', () => {
    const res = groupByCity([P({ name: 'B', city: 'Wien' }), P({ name: 'A', city: 'Wien' }), P({ name: 'C', city: null })]);
    expect(res.map((g) => g.city)).toEqual(['Unknown', 'Wien']);
    expect(res[1].places.map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('sortPlaces', () => {
  it('by name', () => {
    expect(sortPlaces([P({ name: 'B' }), P({ name: 'A' })], 'name').map((p) => p.name)).toEqual(['A', 'B']);
  });
  it('by distance, missing coords sink to the end', () => {
    const near = P({ name: 'near', lat: 48.78, lng: 9.18 });
    const far = P({ name: 'far', lat: 52.52, lng: 13.4 });
    const noCoord = P({ name: 'noCoord' });
    const res = sortPlaces([far, noCoord, near], 'distance', { lat: 48.78, lng: 9.18 });
    expect(res.map((p) => p.name)).toEqual(['near', 'far', 'noCoord']);
  });
  it('by distance without origin falls back to name', () => {
    expect(sortPlaces([P({ name: 'B' }), P({ name: 'A' })], 'distance').map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('placeStats', () => {
  it('counts visited and wishlist (visited not double-counted)', () => {
    expect(placeStats([
      { wishlisted: true, visitedAt: null },
      { wishlisted: true, visitedAt: new Date() },
      { wishlisted: false, visitedAt: null },
    ])).toEqual({ visited: 1, wishlist: 1 });
  });
});
