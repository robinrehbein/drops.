import { uuid } from '@/domain/ids';

describe('uuid', () => {
  it('produces a 36-char string with hyphens at the right places', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces unique ids on consecutive calls', () => {
    const set = new Set(Array.from({ length: 1000 }, () => uuid()));
    expect(set.size).toBe(1000);
  });
});
