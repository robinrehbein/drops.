import { validateSession } from '@/domain/validators/session';

describe('validateSession', () => {
  it('accepts a valid in-progress session (no yield/end yet)', () => {
    const r = validateSession({
      beanId: 'b1',
      method: 'espresso',
      doseG: 18,
      startedAt: new Date(),
    });
    expect(r.ok).toBe(true);
  });

  it('requires positive dose', () => {
    const r = validateSession({ beanId: 'b1', method: 'espresso', doseG: 0, startedAt: new Date() });
    expect(r.ok).toBe(false);
  });

  it('rejects unknown method', () => {
    const r = validateSession({ beanId: 'b1', method: 'tea', doseG: 18, startedAt: new Date() });
    expect(r.ok).toBe(false);
  });

  it('rejects rating outside 1..5', () => {
    const r = validateSession({
      beanId: 'b1', method: 'espresso', doseG: 18, startedAt: new Date(), rating: 7,
    });
    expect(r.ok).toBe(false);
  });
});
