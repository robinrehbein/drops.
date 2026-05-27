import { tastingRadar } from '@/domain/tasting';

describe('tastingRadar', () => {
  it('returns null for no notes', () => {
    expect(tastingRadar([])).toBeNull();
  });
  it('returns null when notes carry no axes', () => {
    expect(tastingRadar([{}, {}])).toBeNull();
  });
  it('returns a single note unchanged', () => {
    expect(
      tastingRadar([{ mouthfeel: 4, acidity: 3, sweetness: 5, bitterness: 2, balance: 4 }]),
    ).toEqual({ mouthfeel: 4, acidity: 3, sweetness: 5, bitterness: 2, balance: 4 });
  });
  it('averages each axis across notes', () => {
    expect(
      tastingRadar([
        { mouthfeel: 4, acidity: 2, sweetness: 4, bitterness: 2, balance: 4 },
        { mouthfeel: 2, acidity: 4, sweetness: 2, bitterness: 4, balance: 2 },
      ]),
    ).toEqual({ mouthfeel: 3, acidity: 3, sweetness: 3, bitterness: 3, balance: 3 });
  });
  it('averages only present values per axis and rounds to 1 decimal', () => {
    const r = tastingRadar([{ acidity: 5 }, { acidity: 4 }, { acidity: 4 }]);
    expect(r?.acidity).toBeCloseTo(4.3, 5); // (5+4+4)/3 = 4.333 → 4.3
    expect(r?.mouthfeel).toBe(0); // axis never set → 0
  });
});
