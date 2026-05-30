import {
  resolveDialingTarget,
  buildShotSignal,
  dialingAdvice,
  nudgeGrind,
  type DialingTarget,
} from '@/domain/dialing';

const TARGET: DialingTarget = { ratioTarget: 2, timeMinS: 25, timeMaxS: 30 };

describe('resolveDialingTarget', () => {
  const prefs = { dialTimeMinS: 25, dialTimeMaxS: 30, defaultRatio: 2 };

  it('uses prefs window and default ratio when no recipe', () => {
    expect(resolveDialingTarget(null, prefs)).toEqual({ ratioTarget: 2, timeMinS: 25, timeMaxS: 30 });
  });

  it('recipe ratioTarget overrides defaultRatio', () => {
    expect(resolveDialingTarget({ ratioTarget: 2.5, durationTargetS: null }, prefs).ratioTarget).toBe(2.5);
  });

  it('recipe durationTargetS recenters the window keeping prefs half-width', () => {
    // prefs half-width = (30-25)/2 = 2.5; centered on 32 → [29.5, 34.5]
    expect(resolveDialingTarget({ ratioTarget: null, durationTargetS: 32 }, prefs)).toEqual({
      ratioTarget: 2,
      timeMinS: 29.5,
      timeMaxS: 34.5,
    });
  });
});

describe('buildShotSignal', () => {
  it('merges session fields with tasting axes', () => {
    const sig = buildShotSignal(
      { doseG: 18, yieldG: 36, durationS: 27, rating: 4 },
      { acidity: 3, bitterness: 3, balance: 4 },
    );
    expect(sig).toEqual({ doseG: 18, yieldG: 36, durationS: 27, rating: 4, acidity: 3, bitterness: 3, balance: 4 });
  });

  it('tolerates a missing tasting note', () => {
    const sig = buildShotSignal({ doseG: 18, yieldG: 36, durationS: 27, rating: null }, null);
    expect(sig.acidity).toBeNull();
    expect(sig.bitterness).toBeNull();
  });
});

describe('dialingAdvice', () => {
  it('returns null when there is no shot', () => {
    expect(dialingAdvice(null, TARGET)).toBeNull();
  });

  it('sour taste → grind finer, taste wins, time corroborates → high confidence', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 22, acidity: 5, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('sour');
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.confidence).toBe('high'); // sour + fast agree
  });

  it('bitter taste → grind coarser, magnitude medium for strong net', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 34, acidity: 1, bitterness: 5, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('bitter');
    expect(a.primary.lever).toBe('grind-coarser');
    expect(a.primary.magnitude).toBe('medium');
  });

  it('taste wins on conflict (sour but slow) → finer, low confidence', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 34, acidity: 5, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.confidence).toBe('low');
  });

  it('no taste, time too fast → finer from time only', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 20 }, TARGET)!;
    expect(a.verdict).toBe('too-fast');
    expect(a.primary.lever).toBe('grind-finer');
    expect(a.primary.magnitude).toBe('medium'); // off by 5s (>4)
  });

  it('no taste, time too slow but only slightly → coarser, small, low confidence', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 32 }, TARGET)!;
    expect(a.verdict).toBe('too-slow');
    expect(a.primary.magnitude).toBe('small'); // off by 2s
    expect(a.confidence).toBe('low');
  });

  it('balanced taste + in-range time → dialed-in with a ratio secondary', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(a.verdict).toBe('dialed-in');
    expect(a.primary.lever).toBe('dialed-in');
    expect(a.secondary?.lever).toBe('ratio-up');
  });

  it('no duration and no taste → low confidence in-range fallback', () => {
    const a = dialingAdvice({ doseG: 18, yieldG: null, durationS: null }, TARGET)!;
    expect(a.confidence).toBe('low');
    expect(a.verdict).toBe('in-range');
  });

  it('sour taste with no time recorded → high confidence, rationale has no time note', () => {
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: null, acidity: 5, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('sour');
    expect(a.confidence).toBe('high');
    expect(a.rationale).not.toContain('s ·'); // no time note
  });

  it('sour taste, small net (just above threshold) → small magnitude', () => {
    // net = 2.0 < TASTE_MEDIUM(2.5) → small
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 4, bitterness: 2, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('sour');
    expect(a.primary.magnitude).toBe('small');
  });

  it('bitter taste, small net → small magnitude', () => {
    // net = 1 - 3 = -2.0 > -TASTE_MEDIUM(-2.5) → small
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 1, bitterness: 3, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('bitter');
    expect(a.primary.magnitude).toBe('small');
  });

  it('neutral taste (no clear sour/bitter, low balance) falls through to time signal', () => {
    // acidity=3, bitterness=3, net=0, balance=2 (<4) → tasteDir=null; time too slow → too-slow
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 32, acidity: 3, bitterness: 3, balance: 2 },
      TARGET,
    )!;
    expect(a.verdict).toBe('too-slow');
  });

  it('neutral taste with null balance falls through to time signal', () => {
    // net=0, balance=null → (null ?? 0) = 0 < 4 → tasteDir=null; time in-range → dialed-in
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 3, bitterness: 3, balance: null },
      TARGET,
    )!;
    expect(a.verdict).toBe('dialed-in');
  });

  it('no taste, time very slow (>4s over) → coarser, medium magnitude, high confidence', () => {
    // 35s, max=30, delta=5 > TIME_MEDIUM_S(4) → medium, and no taste → high confidence
    const a = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 35 }, TARGET)!;
    expect(a.verdict).toBe('too-slow');
    expect(a.primary.magnitude).toBe('medium');
    expect(a.confidence).toBe('high');
  });

  it('balanced taste but time fast → low confidence (taste contradicts time)', () => {
    // balance=5 → balanced, net in neutral zone; time=20 → fast; tasteDir=balanced contradicts time → low
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 20, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(a.verdict).toBe('too-fast');
    expect(a.confidence).toBe('low');
  });

  it('dialed-in with no duration → rationale omits time portion', () => {
    // balance=5 → balanced taste; no time
    const a = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: null, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(a.verdict).toBe('dialed-in');
    expect(a.rationale).not.toContain('s —'); // no time segment
  });
});

describe('nudgeGrind', () => {
  const finer = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 20 }, TARGET)!; // grind-finer, medium
  it('decrements a numeric grind for finer by the magnitude steps', () => {
    expect(nudgeGrind('12', finer)).toBe('10'); // medium = 2 steps, finer = minus
  });
  it('increments for coarser', () => {
    const coarser = dialingAdvice({ doseG: 18, yieldG: 36, durationS: 32 }, TARGET)!; // small coarser
    expect(nudgeGrind('12', coarser)).toBe('13'); // small = 1 step, coarser = plus
  });
  it('leaves non-numeric grind unchanged', () => {
    expect(nudgeGrind('fine-3', finer)).toBe('fine-3');
  });
  it('returns the current value unchanged when advice is not a grind lever', () => {
    const dialed = dialingAdvice(
      { doseG: 18, yieldG: 36, durationS: 27, acidity: 3, bitterness: 3, balance: 5 },
      TARGET,
    )!;
    expect(nudgeGrind('12', dialed)).toBe('12');
  });
  it('returns null when grind is null', () => {
    expect(nudgeGrind(null, finer)).toBeNull();
  });
});
