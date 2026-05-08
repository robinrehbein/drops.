import { elapsedMs, secondsBetween } from '@/domain/time';

describe('elapsedMs', () => {
  it('returns positive ms when end > start', () => {
    expect(elapsedMs(1_000, 1_500)).toBe(500);
  });

  it('returns 0 if end is before start', () => {
    expect(elapsedMs(1_500, 1_000)).toBe(0);
  });
});

describe('secondsBetween', () => {
  it('returns fractional seconds', () => {
    expect(secondsBetween(0, 27_400)).toBeCloseTo(27.4, 3);
  });
});
