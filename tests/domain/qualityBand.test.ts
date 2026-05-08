import { qualityBand } from '@/domain/extraction';

describe('qualityBand', () => {
  it('returns "under" for extraction < 18%', () => {
    expect(qualityBand(0.10)).toBe('under');
    expect(qualityBand(0.17)).toBe('under');
    expect(qualityBand(0.001)).toBe('under');
    expect(qualityBand(0)).toBe('under');
  });

  it('returns "balanced" for extraction 18–22%', () => {
    expect(qualityBand(0.18)).toBe('balanced');
    expect(qualityBand(0.20)).toBe('balanced');
    expect(qualityBand(0.22)).toBe('balanced');
  });

  it('returns "over" for extraction > 22%', () => {
    expect(qualityBand(0.23)).toBe('over');
    expect(qualityBand(0.30)).toBe('over');
    expect(qualityBand(1)).toBe('over');
  });

  it('returns "unknown" for null', () => {
    expect(qualityBand(null)).toBe('unknown');
  });
});
