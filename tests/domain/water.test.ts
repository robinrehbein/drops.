import { estimateShotWaterMl, formatVolume } from '@/domain/water';

describe('estimateShotWaterMl', () => {
  it('estimates tank usage from yield, puck absorption, and flush water', () => {
    expect(estimateShotWaterMl(18, 36)).toBe(92);
  });

  it('handles invalid dose conservatively', () => {
    expect(estimateShotWaterMl(0, 36)).toBe(36);
    expect(estimateShotWaterMl(NaN, 36)).toBe(36);
    expect(estimateShotWaterMl(0, 0)).toBe(0); // yieldG is 0 (falsy) → Math.max(0, 0)
  });

  it('falls back to puck absorption when yield is invalid', () => {
    expect(estimateShotWaterMl(18, -1)).toBe(36); // 18 * 2
    expect(estimateShotWaterMl(18, NaN)).toBe(36);
  });

  it('honors custom puck absorption and flush options', () => {
    expect(estimateShotWaterMl(20, 40, { puckAbsorptionMlPerDoseG: 3, flushMl: 10 })).toBe(110);
  });
});

describe('formatVolume', () => {
  it('formats milliliters and liters', () => {
    expect(formatVolume(920)).toBe('920 ml');
    expect(formatVolume(1800)).toBe('1.8 l');
  });

  it('handles non-finite input', () => {
    expect(formatVolume(NaN)).toBe('0 ml');
  });

  it('formats negative large volumes with absolute-value check', () => {
    expect(formatVolume(-1500)).toBe('-1.5 l');
  });
});
