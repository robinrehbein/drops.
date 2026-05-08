import { extractionPercent } from '@/domain/extraction';

describe('extractionPercent', () => {
  it('computes EY using default TDS assumption', () => {
    // 18g dose, 36g yield, default TDS 0.09 → (36 * 0.09) / 18 = 0.18
    expect(extractionPercent(18, 36)).toBeCloseTo(0.18, 4);
  });

  it('accepts a custom tdsAssumed', () => {
    expect(extractionPercent(18, 36, 0.1)).toBeCloseTo(0.2, 4);
  });

  it('returns null for non-positive dose', () => {
    expect(extractionPercent(0, 36)).toBeNull();
    expect(extractionPercent(-1, 36)).toBeNull();
  });

  it('clamps to 0 for negative or zero yield', () => {
    expect(extractionPercent(18, 0)).toBe(0);
    expect(extractionPercent(18, -1)).toBe(0);
  });

  it('clamps to 1 for impossibly large yields', () => {
    expect(extractionPercent(1, 1000, 0.1)).toBe(1);
  });
});
