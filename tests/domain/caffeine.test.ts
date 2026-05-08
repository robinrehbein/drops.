import { caffeineForShot } from '@/domain/caffeine';

describe('caffeineForShot', () => {
  it('estimates ~10 mg/g for a medium roast at 18g', () => {
    expect(caffeineForShot(18, 3)).toBe(180);
  });

  it('uses higher coefficient for lighter roasts', () => {
    expect(caffeineForShot(18, 1)).toBe(216); // 12 mg/g
    expect(caffeineForShot(18, 5)).toBe(144); // 8 mg/g
  });

  it('falls back to medium-roast when level is missing', () => {
    expect(caffeineForShot(18, undefined)).toBe(180);
    expect(caffeineForShot(18, null)).toBe(180);
  });

  it('returns 0 for non-positive dose', () => {
    expect(caffeineForShot(0, 3)).toBe(0);
    expect(caffeineForShot(-1, 3)).toBe(0);
  });

  it('clamps roast level to 1..5', () => {
    expect(caffeineForShot(18, 0 as 1)).toBe(216); // clamped to 1
    expect(caffeineForShot(18, 9 as 5)).toBe(144); // clamped to 5
  });
});
