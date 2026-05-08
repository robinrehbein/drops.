import { makeBeansRepo } from '@/features/beans/repo';
import { makeBrewRepo } from '@/features/brew/repo';
import { makeInsightsRepo } from '@/features/insights/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('insights repo — weeklyRecap', () => {
  it('returns zero stats when no sessions exist', async () => {
    const db = makeTestDb();
    const insights = makeInsightsRepo(db);

    const recap = await insights.weeklyRecap();
    expect(recap.totalShots).toBe(0);
    expect(recap.totalCaffeineMg).toBe(0);
    expect(recap.avgRating).toBeNull();
    expect(recap.bestShot).toBeNull();
    expect(recap.mostUsedBean).toBeNull();
    expect(recap.improvementFromLastWeek).toBeNull();
  });

  it('computes totals from this week sessions', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const insights = makeInsightsRepo(db);

    const bean = await beansRepo.addBean({ name: 'Yirgacheffe', roastLevel: 3, startWeightG: 250 });
    const s = await brew.startSession({ beanId: bean.id, doseG: 18 });
    await brew.endSession(s.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    await brew.finalizeWithNotes(s.id, { rating: 4 });

    const recap = await insights.weeklyRecap();
    expect(recap.totalShots).toBe(1);
    expect(recap.totalCaffeineMg).toBeGreaterThan(0);
    expect(recap.avgRating).toBe(4);
  });

  it('finds the best shot by rating', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const insights = makeInsightsRepo(db);

    const bean = await beansRepo.addBean({ name: 'X', startWeightG: 500 });
    const s1 = await brew.startSession({ beanId: bean.id, doseG: 18 });
    await brew.endSession(s1.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    await brew.finalizeWithNotes(s1.id, { rating: 3 });

    const s2 = await brew.startSession({ beanId: bean.id, doseG: 18 });
    await brew.endSession(s2.id, { endedAt: new Date(), yieldG: 38, durationS: 25 });
    await brew.finalizeWithNotes(s2.id, { rating: 5 });

    const recap = await insights.weeklyRecap();
    expect(recap.bestShot?.rating).toBe(5);
  });

  it('identifies the most-used bean', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const insights = makeInsightsRepo(db);

    const beanA = await beansRepo.addBean({ name: 'Ethiopia', startWeightG: 250 });
    const beanB = await beansRepo.addBean({ name: 'Colombia', startWeightG: 250 });

    // 2 shots with beanA
    for (let i = 0; i < 2; i++) {
      const s = await brew.startSession({ beanId: beanA.id, doseG: 18 });
      await brew.endSession(s.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    }
    // 1 shot with beanB
    const s3 = await brew.startSession({ beanId: beanB.id, doseG: 18 });
    await brew.endSession(s3.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });

    const recap = await insights.weeklyRecap();
    expect(recap.mostUsedBean?.name).toBe('Ethiopia');
    expect(recap.mostUsedBean?.count).toBe(2);
  });
});
