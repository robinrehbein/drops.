import { err, ok, type Result } from '@/domain/result';

describe('Result', () => {
  it('ok wraps a value with ok=true', () => {
    const r: Result<number, string> = ok(5);
    expect(r).toEqual({ ok: true, value: 5 });
  });

  it('err wraps an error with ok=false', () => {
    const r: Result<number, string> = err('boom');
    expect(r).toEqual({ ok: false, error: 'boom' });
  });

  it('discriminates correctly via the ok flag', () => {
    const r: Result<number, string> = ok(7);
    if (r.ok) {
      expect(r.value).toBe(7);
    } else {
      throw new Error('discriminated wrong');
    }
  });
});
