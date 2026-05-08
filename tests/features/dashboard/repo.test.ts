import { makeBeansRepo } from '@/features/beans/repo';
import { makeBrewRepo } from '@/features/brew/repo';
import { makeDashboardRepo } from '@/features/dashboard/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('dashboard repo', () => {
  it('todaySummary counts only sessions completed today', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const dash = makeDashboardRepo(db);

    const bean = await beans.addBean({ name: 'X', roastLevel: 3 });
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const a = await brew.startSession({ beanId: bean.id, doseG: 18 });
    await brew.endSession(a.id, { endedAt: yesterday, yieldG: 36, durationS: 27 });

    const b = await brew.startSession({ beanId: bean.id, doseG: 18 });
    await brew.endSession(b.id, { endedAt: today, yieldG: 36, durationS: 28 });

    const summary = await dash.todaySummary();
    expect(summary.shotsToday).toBe(1);
    expect(summary.estimatedCaffeineMg).toBe(180); // 18g × 10mg/g (roast 3)
  });

  it('recentShots returns the most recent N completed sessions', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const brew = makeBrewRepo(db);
    const dash = makeDashboardRepo(db);

    const bean = await beans.addBean({ name: 'X' });
    for (let i = 0; i < 5; i++) {
      const s = await brew.startSession({ beanId: bean.id, doseG: 18 });
      await brew.endSession(s.id, { endedAt: new Date(1000 + i * 1000), yieldG: 36, durationS: 27 });
    }
    const recent = await dash.recentShots(3);
    expect(recent).toHaveLength(3);
  });
});
