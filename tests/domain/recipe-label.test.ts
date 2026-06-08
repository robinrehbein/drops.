import { recipeLabel } from '@/domain/recipe-label';

const at = new Date('2026-06-08T09:00:00Z');

describe('recipeLabel', () => {
  it('combines dose→yield, time, and date', () => {
    expect(
      recipeLabel({ doseG: 18, targetYieldG: 36, durationTargetS: 28, savedAt: at }),
    ).toBe('18→36g · 28s · Jun 8');
  });

  it('keeps one decimal only when needed', () => {
    expect(
      recipeLabel({ doseG: 18.5, targetYieldG: 37, durationTargetS: null, savedAt: at }),
    ).toBe('18.5→37g · Jun 8');
  });

  it('falls back to dose-only then to a generic label', () => {
    expect(recipeLabel({ doseG: 18, targetYieldG: null, durationTargetS: null, savedAt: at })).toBe(
      '18g · Jun 8',
    );
  });
});
