import { makeBeansRepo } from '@/features/beans/repo';
import { makeBrewRepo } from '@/features/brew/repo';
import { makeRecipesRepo } from '@/features/recipes/repo';
import { makeTestDb } from '@tests/helpers/test-db';

async function seed(db: ReturnType<typeof makeTestDb>) {
  const beansRepo = makeBeansRepo(db);
  const brew = makeBrewRepo(db);
  const bean = await beansRepo.addBean({ name: 'Yirg' });
  const session = await brew.startSession({
    beanId: bean.id,
    doseG: 18,
    grinderLabel: 'Niche',
    grindSetting: '20',
    waterTempC: 93,
  });
  const now = new Date();
  await brew.endSession(session.id, {
    endedAt: now,
    yieldG: 36,
    durationS: 27,
  });
  await brew.finalizeWithNotes(session.id, { yieldG: 36, rating: 4 });
  const finalized = await brew.getSession(session.id);
  return { bean, session: finalized! };
}

describe('recipes repo', () => {
  it('getForBean returns null when no recipe', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    expect(await repo.getForBean(bean.id)).toBeNull();
  });

  it('saveForBean inserts and sets beans.recipeId', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const r = await repo.saveForBean({ beanId: bean.id, doseG: 18, targetYieldG: 36 });
    expect(r.beanId).toBe(bean.id);
    expect(r.doseG).toBe(18);
    const updatedBean = await beans.getBean(bean.id);
    expect(updatedBean?.recipeId).toBe(r.id);
  });

  it('second saveForBean replaces in-place (same id, live count stays 1)', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const first = await repo.saveForBean({ beanId: bean.id, doseG: 18 });
    const second = await repo.saveForBean({ beanId: bean.id, doseG: 20 });
    expect(second.id).toBe(first.id); // same row, updated
    expect(second.doseG).toBe(20);
    expect(await repo.getForBean(bean.id)).not.toBeNull();
  });

  it('saveFromSession copies session values and computes ratio', async () => {
    const db = makeTestDb();
    const { bean, session } = await seed(db);
    const repo = makeRecipesRepo(db);
    const r = await repo.saveFromSession(session.id);
    expect(r.beanId).toBe(bean.id);
    expect(r.doseG).toBe(18);
    expect(r.targetYieldG).toBe(36);
    expect(r.durationTargetS).toBe(27);
    expect(r.ratioTarget).toBeCloseTo(2, 5);
    expect(r.sourceSessionId).toBe(session.id);
  });

  it('clearForBean soft-deletes recipe and nulls beans.recipeId', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    await repo.saveForBean({ beanId: bean.id, doseG: 18 });
    await repo.clearForBean(bean.id);
    expect(await repo.getForBean(bean.id)).toBeNull();
    expect((await beansRepo.getBean(bean.id))?.recipeId).toBeNull();
  });

  it('saveFromSession throws when session not found', async () => {
    const db = makeTestDb();
    const repo = makeRecipesRepo(db);
    await expect(repo.saveFromSession('no-such-id')).rejects.toThrow('session not found');
  });
});
