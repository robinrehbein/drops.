import { formatElapsed, formatGrams } from '@/domain/format';

describe('formatElapsed', () => {
  it('formats ms as MM:SS.t (one tenth)', () => {
    expect(formatElapsed(0)).toBe('00:00.0');
    expect(formatElapsed(18_400)).toBe('00:18.4');
    expect(formatElapsed(27_400)).toBe('00:27.4');
    expect(formatElapsed(125_900)).toBe('02:05.9');
  });

  it('clamps negative to 00:00.0', () => {
    expect(formatElapsed(-100)).toBe('00:00.0');
  });
});

describe('formatGrams', () => {
  it('formats with one decimal and unit', () => {
    expect(formatGrams(18)).toBe('18.0 g');
    expect(formatGrams(28.4)).toBe('28.4 g');
  });

  it('renders em-dash for null', () => {
    expect(formatGrams(null)).toBe('—');
  });
});
