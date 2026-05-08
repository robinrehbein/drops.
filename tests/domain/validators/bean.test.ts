import { validateBean } from '@/domain/validators/bean';

describe('validateBean', () => {
  it('accepts a minimal valid input (name only)', () => {
    const r = validateBean({ name: 'Yirgacheffe' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Yirgacheffe');
  });

  it('rejects empty name', () => {
    const r = validateBean({ name: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContainEqual(expect.objectContaining({ path: ['name'] }));
  });

  it('rejects roast level out of range', () => {
    const r = validateBean({ name: 'X', roastLevel: 9 });
    expect(r.ok).toBe(false);
  });

  it('coerces flavorTags to a string[]', () => {
    const r = validateBean({ name: 'X', flavorTags: ['bergamot', 'jasmine'] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.flavorTags).toEqual(['bergamot', 'jasmine']);
  });

  it('rejects negative weights', () => {
    const r = validateBean({ name: 'X', startWeightG: -5 });
    expect(r.ok).toBe(false);
  });
});
