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
    expect(prefs.waterTankCapacityMl).toBe(1800);
    expect(prefs.filterChangeThresholdMl).toBe(50000);
    expect(prefs.puckAbsorptionMlPerDoseG).toBe(2);
    expect(prefs.shotFlushMl).toBe(20);
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

  it('defaults dailyCupsGoal to 4 and caffeineTargetMg to null', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    const prefs = await repo.get();
    expect(prefs.dailyCupsGoal).toBe(4);
    expect(prefs.caffeineTargetMg).toBeNull();
  });

  it('updates dailyCupsGoal and caffeineTargetMg', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    await repo.get();
    const updated = await repo.update({ dailyCupsGoal: 2, caffeineTargetMg: 300 });
    expect(updated.dailyCupsGoal).toBe(2);
    expect(updated.caffeineTargetMg).toBe(300);
    const cleared = await repo.update({ caffeineTargetMg: null });
    expect(cleared.caffeineTargetMg).toBeNull();
  });

  it('seeds the dialing target-time window defaults', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    const prefs = await repo.get();
    expect(prefs.dialTimeMinS).toBe(25);
    expect(prefs.dialTimeMaxS).toBe(30);
  });

  it('updates the dialing window', async () => {
    const db = makeTestDb();
    const repo = makePreferencesRepo(db);
    await repo.get();
    const updated = await repo.update({ dialTimeMinS: 27, dialTimeMaxS: 33 });
    expect(updated.dialTimeMinS).toBe(27);
    expect(updated.dialTimeMaxS).toBe(33);
  });
});
