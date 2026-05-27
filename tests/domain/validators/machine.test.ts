import { validateMachine } from '@/domain/validators/machine';

describe('validateMachine', () => {
  it('accepts a minimal espresso machine', () => {
    expect(validateMachine({ name: 'Lelit Bianca', kind: 'espresso_machine' }).ok).toBe(true);
  });
  it('accepts all optional fields', () => {
    const r = validateMachine({
      name: 'Niche Zero',
      kind: 'grinder',
      model: 'Zero',
      vendor: 'Niche',
      acquiredOn: new Date(),
      notes: 'single dose',
      isPrimary: true,
    });
    expect(r.ok).toBe(true);
  });
  it('rejects empty name', () => {
    expect(validateMachine({ name: '', kind: 'kettle' }).ok).toBe(false);
  });
  it('rejects unknown kind', () => {
    expect(validateMachine({ name: 'X', kind: 'spaceship' }).ok).toBe(false);
  });
  it('surfaces the offending path', () => {
    const r = validateMachine({ name: '', kind: 'other' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error[0]?.path).toContain('name');
  });
});
