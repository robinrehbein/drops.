import { estimateShotWaterMl, formatVolume } from '@/domain/water';

describe('estimateShotWaterMl', () => {
  it('estimates tank usage from yield, puck absorption, and flush water', () => {
    expect(estimateShotWaterMl(18, 36)).toBe(92);
  });

  it('handles invalid dose conservatively', () => {
    expect(estimateShotWaterMl(0, 36)).toBe(36);
  });
});

describe('formatVolume', () => {
  it('formats milliliters and liters', () => {
    expect(formatVolume(920)).toBe('920 ml');
    expect(formatVolume(1800)).toBe('1.8 l');
  });
});
