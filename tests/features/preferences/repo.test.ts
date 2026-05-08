import { makePreferencesRepo } from '@/features/preferences/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('preferences repo', () => {
  it('get creates default row if missing', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    const prefs = await repo.get();
    expect(prefs.weightUnit).toBe('g');
    expect(prefs.defaultRatio).toBe(2);
    expect(prefs.themeId).toBe('earthy-forest');
    expect(prefs.tdsAssumed).toBe(0.09);
  });

  it('get returns existing row on subsequent calls', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    const first = await repo.get();
    const second = await repo.get();
    expect(first.id).toBe(second.id);
  });

  it('update persists changes', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    await repo.get();
    const updated = await repo.update({ weightUnit: 'oz', defaultRatio: 2.5 });
    expect(updated.weightUnit).toBe('oz');
    expect(updated.defaultRatio).toBe(2.5);
  });

  it('update only changes specified fields', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    await repo.get();
    const updated = await repo.update({ weightUnit: 'oz' });
    expect(updated.weightUnit).toBe('oz');
    expect(updated.defaultRatio).toBe(2); // unchanged
  });
});
