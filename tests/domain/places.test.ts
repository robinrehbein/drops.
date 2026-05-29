import { distanceKm, placeStatus } from '@/domain/places';

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
