import { costPerShot } from '@/domain/cost';

describe('costPerShot', () => {
  it('computes minor units per shot', () => {
    // 250 g / 18 g = 13.89 shots; 1500 / 13.89 = 108
    expect(costPerShot({ pricePaidMinor: 1500, startWeightG: 250, avgDoseG: 18 })).toBe(108);
  });
  it('returns null if price missing', () => {
    expect(costPerShot({ pricePaidMinor: null, startWeightG: 250, avgDoseG: 18 })).toBeNull();
  });
  it('returns null if start weight missing', () => {
    expect(costPerShot({ pricePaidMinor: 1500, startWeightG: null, avgDoseG: 18 })).toBeNull();
  });
  it('returns null if avg dose missing', () => {
    expect(costPerShot({ pricePaidMinor: 1500, startWeightG: 250, avgDoseG: null })).toBeNull();
  });
  it('returns null on non-positive dose or weight', () => {
    expect(costPerShot({ pricePaidMinor: 1500, startWeightG: 250, avgDoseG: 0 })).toBeNull();
    expect(costPerShot({ pricePaidMinor: 1500, startWeightG: 0, avgDoseG: 18 })).toBeNull();
  });
});
