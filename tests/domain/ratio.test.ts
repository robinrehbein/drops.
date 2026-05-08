import { brewRatio, formatRatio } from '@/domain/ratio';

describe('brewRatio', () => {
  it('returns yield / dose', () => {
    expect(brewRatio(18, 36)).toBeCloseTo(2);
    expect(brewRatio(18, 28.4)).toBeCloseTo(1.5778, 3);
  });

  it('returns null for invalid inputs', () => {
    expect(brewRatio(0, 36)).toBeNull();
    expect(brewRatio(-1, 36)).toBeNull();
    expect(brewRatio(18, -1)).toBeNull();
    expect(brewRatio(18, 0)).toBe(0); // zero yield is valid mid-pull
  });
});

describe('formatRatio', () => {
  it('formats as 1:N.NN', () => {
    expect(formatRatio(2)).toBe('1:2.00');
    expect(formatRatio(1.5778)).toBe('1:1.58');
  });

  it('returns "—" for null', () => {
    expect(formatRatio(null)).toBe('—');
  });
});
