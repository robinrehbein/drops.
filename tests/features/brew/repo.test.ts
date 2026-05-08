import { makeBrewRepo } from '@/features/brew/repo';
import { makeBeansRepo } from '@/features/beans/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('brew repo', () => {
  it('startSession inserts a row with started_at and no ended_at', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X', startWeightG: 250 });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeNull();
  });

  it('addMilestone appends to brew_milestones', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.addMilestone(session.id, 'first_drop', 7.4);
    const ms = await repo.listMilestones(session.id);
    expect(ms).toHaveLength(1);
    expect(ms[0]?.kind).toBe('first_drop');
  });

  it('endSession sets ended_at, duration, and yield', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(session.id, { endedAt: new Date(session.startedAt.getTime() + 27_400), yieldG: 36, durationS: 27.4 });
    const reread = await repo.getSession(session.id);
    expect(reread?.endedAt).not.toBeNull();
    expect(reread?.yieldG).toBe(36);
    expect(reread?.durationS).toBe(27.4);
  });

  it('finalizeWithNotes inserts tasting_notes and decrements bean.remaining_weight_g', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X', startWeightG: 250 });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(session.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    await repo.finalizeWithNotes(session.id, { rating: 4, mouthfeel: 4, acidity: 3, sweetness: 4, bitterness: 2, balance: 4, flavorTags: ['bergamot'] });
    const updatedBean = await beans.getBean(bean.id);
    expect(updatedBean?.remainingWeightG).toBe(232); // 250 - 18
  });

  it('discardSession soft-deletes the session and does not change bean weight', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X', startWeightG: 250 });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(session.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    await repo.discardSession(session.id);
    const updatedBean = await beans.getBean(bean.id);
    expect(updatedBean?.remainingWeightG).toBe(250);
    expect(await repo.getSession(session.id)).toBeNull(); // live query filters deleted
  });

  it('listSessions returns only completed, non-deleted, newest first', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const a = await repo.startSession({ beanId: bean.id, doseG: 18 });
    const b = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(a.id, { endedAt: new Date(1_000), yieldG: 36, durationS: 27 });
    await repo.endSession(b.id, { endedAt: new Date(2_000), yieldG: 36, durationS: 28 });
    // b is newer → first
    const list = await repo.listSessions();
    expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('findInProgress returns the unfinished session if any', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    expect(await repo.findInProgress()).toBeNull();
    const s = await repo.startSession({ beanId: bean.id, doseG: 18 });
    const found = await repo.findInProgress();
    expect(found?.id).toBe(s.id);
    await repo.endSession(s.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    expect(await repo.findInProgress()).toBeNull();
  });

  it('shotsForBean returns only sessions for the given bean, newest first', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const beanA = await beans.addBean({ name: 'A' });
    const beanB = await beans.addBean({ name: 'B' });
    const sa = await repo.startSession({ beanId: beanA.id, doseG: 18 });
    const sb = await repo.startSession({ beanId: beanB.id, doseG: 18 });
    const sc = await repo.startSession({ beanId: beanA.id, doseG: 17 });
    await repo.endSession(sa.id, { endedAt: new Date(1_000), yieldG: 36, durationS: 27 });
    await repo.endSession(sb.id, { endedAt: new Date(2_000), yieldG: 36, durationS: 28 });
    await repo.endSession(sc.id, { endedAt: new Date(3_000), yieldG: 34, durationS: 25 });
    const result = await repo.shotsForBean(beanA.id);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual([sc.id, sa.id]); // newest first
  });

  it('shotsForBean respects limit', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    for (let i = 0; i < 5; i++) {
      const s = await repo.startSession({ beanId: bean.id, doseG: 18 });
      await repo.endSession(s.id, { endedAt: new Date(i * 1000), yieldG: 36, durationS: 27 });
    }
    const result = await repo.shotsForBean(bean.id, 3);
    expect(result).toHaveLength(3);
  });

  it('lastShotForBean returns the most recent completed session for that bean', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const s1 = await repo.startSession({ beanId: bean.id, doseG: 18, grindSetting: '3.0' });
    await repo.endSession(s1.id, { endedAt: new Date(1_000), yieldG: 36, durationS: 27 });
    const s2 = await repo.startSession({ beanId: bean.id, doseG: 18, grindSetting: '3.5' });
    await repo.endSession(s2.id, { endedAt: new Date(2_000), yieldG: 38, durationS: 25 });
    const last = await repo.lastShotForBean(bean.id);
    expect(last?.id).toBe(s2.id);
    expect(last?.grindSetting).toBe('3.5');
  });

  it('lastShotForBean returns null for a bean with no sessions', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    expect(await repo.lastShotForBean(bean.id)).toBeNull();
  });

  it('tastingNotesForSession returns notes if they exist', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X', startWeightG: 250 });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(session.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    await repo.finalizeWithNotes(session.id, {
      rating: 4, mouthfeel: 4, acidity: 3, sweetness: 5,
      bitterness: 2, balance: 4, flavorTags: ['bergamot', 'jasmine'],
    });
    const notes = await repo.tastingNotesForSession(session.id);
    expect(notes).not.toBeNull();
    expect(notes?.mouthfeel).toBe(4);
    expect(notes?.flavorTags).toEqual(['bergamot', 'jasmine']);
  });

  it('tastingNotesForSession returns null when no notes exist', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const repo = makeBrewRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const session = await repo.startSession({ beanId: bean.id, doseG: 18 });
    await repo.endSession(session.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
    expect(await repo.tastingNotesForSession(session.id)).toBeNull();
  });
});
