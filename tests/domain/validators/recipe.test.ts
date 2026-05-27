import { validateRecipe } from '@/domain/validators/recipe';

describe('validateRecipe', () => {
  it('accepts a recipe with only beanId', () => {
    expect(validateRecipe({ beanId: 'b1' }).ok).toBe(true);
  });
  it('accepts a full recipe', () => {
    const r = validateRecipe({
      beanId: 'b1',
      sourceSessionId: 's1',
      doseG: 18,
      targetYieldG: 36,
      durationTargetS: 27,
      grinderLabel: 'Niche',
      grindSetting: '20',
      waterTempC: 93,
      ratioTarget: 2,
      notes: 'purge 4 turns coarser',
    });
    expect(r.ok).toBe(true);
  });
  it('rejects missing beanId', () => {
    expect(validateRecipe({ doseG: 18 }).ok).toBe(false);
  });
  it('rejects negative dose', () => {
    expect(validateRecipe({ beanId: 'b1', doseG: -1 }).ok).toBe(false);
  });
  it('rejects waterTempC above 100', () => {
    expect(validateRecipe({ beanId: 'b1', waterTempC: 130 }).ok).toBe(false);
  });
  it('surfaces issue path for the offending field', () => {
    const r = validateRecipe({ beanId: 'b1', ratioTarget: -2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0]?.path).toContain('ratioTarget');
  });
});
