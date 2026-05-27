import { makeBeansRepo } from '@/features/beans/repo';
import { makeBrewRepo } from '@/features/brew/repo';
import { makeWaterRepo } from '@/features/water/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('water repo', () => {
  it('tracks refills, flushes, and shot estimates since the last filter change', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const repo = makeWaterRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const sessionA = await brew.startSession({ beanId: bean.id, doseG: 18 });
    const sessionB = await brew.startSession({ beanId: bean.id, doseG: 18 });

    await repo.addRefill(1800);
    await repo.addShotEstimate(sessionA.id, 92);
    await repo.addFilterChange();
    await repo.addRefill(1200);
    await repo.addFlush(60);
    await repo.addShotEstimate(sessionB.id, 88);

    const summary = await repo.summary();

    expect(summary.lastFilterChangeAt).toBeInstanceOf(Date);
    expect(summary.refilledSinceFilterMl).toBe(1200);
    expect(summary.consumedSinceFilterMl).toBe(148);
    expect(summary.eventCountSinceFilter).toBe(4);
    expect(summary.recentEvents[0]?.kind).toBe('shot_estimate');
  });
});
