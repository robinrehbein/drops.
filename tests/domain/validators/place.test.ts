import { validatePlace, validateUserData, placeKindSchema } from '@/domain/validators/place';

describe('validatePlace', () => {
  it('accepts a minimal user place', () => {
    expect(validatePlace({ name: 'Misch Misch', kind: 'cafe' }).ok).toBe(true);
  });
  it('rejects empty name', () => {
    const r = validatePlace({ name: '   ', kind: 'cafe' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0]!.message).toMatch(/name is required/);
  });
  it('rejects bad kind', () => {
    expect(validatePlace({ name: 'X', kind: 'bar' }).ok).toBe(false);
  });
  it('rejects out-of-range coords', () => {
    expect(validatePlace({ name: 'X', kind: 'cafe', lat: 200, lng: 0 }).ok).toBe(false);
  });
  it('exposes the kind enum', () => {
    expect(placeKindSchema.options).toEqual(['roaster', 'coffee_shop', 'cafe']);
  });
});

describe('validateUserData', () => {
  it('accepts a rating in range', () => {
    expect(validateUserData({ rating: 4, notes: 'great flat white' }).ok).toBe(true);
  });
  it('rejects rating out of range', () => {
    expect(validateUserData({ rating: 9 }).ok).toBe(false);
  });
});
