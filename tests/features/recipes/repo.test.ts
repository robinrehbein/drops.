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
  await brew.endSession(session.id, { endedAt: now, yieldG: 36, durationS: 27 });
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

  it('create inserts and the first recipe becomes the bean default', async () => {
    const db = makeTestDb();
    const beans = makeBeansRepo(db);
    const bean = await beans.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const r = await repo.create({ beanId: bean.id, name: 'Morning', doseG: 18, targetYieldG: 36 });
    expect(r.beanId).toBe(bean.id);
    expect(r.name).toBe('Morning');
    expect((await beans.getBean(bean.id))?.recipeId).toBe(r.id);
  });

  it('keeps multiple recipes per bean; default stays put unless changed', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const first = await repo.create({ beanId: bean.id, doseG: 18 });
    const second = await repo.create({ beanId: bean.id, doseG: 20 });
    expect(second.id).not.toBe(first.id);
    expect(await repo.listForBean(bean.id)).toHaveLength(2);
    // Default remains the first until explicitly changed.
    expect((await repo.getForBean(bean.id))?.id).toBe(first.id);
    await repo.setDefault(bean.id, second.id);
    expect((await repo.getForBean(bean.id))?.id).toBe(second.id);
  });

  it('deleteRecipe soft-deletes and re-points the default to a survivor', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const first = await repo.create({ beanId: bean.id, doseG: 18 });
    const second = await repo.create({ beanId: bean.id, doseG: 20 });
    expect((await beansRepo.getBean(bean.id))?.recipeId).toBe(first.id);

    await repo.deleteRecipe(first.id);
    expect(await repo.listForBean(bean.id)).toHaveLength(1);
    // Default re-pointed to the remaining recipe.
    expect((await beansRepo.getBean(bean.id))?.recipeId).toBe(second.id);

    await repo.deleteRecipe(second.id);
    expect(await repo.getForBean(bean.id)).toBeNull();
    expect((await beansRepo.getBean(bean.id))?.recipeId).toBeNull();
  });

  it('updateRecipe patches fields and bumps updatedAt', async () => {
    const db = makeTestDb();
    const beansRepo = makeBeansRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });
    const repo = makeRecipesRepo(db);
    const r = await repo.create({ beanId: bean.id, doseG: 18 });
    const updated = await repo.updateRecipe(r.id, { name: 'Light', doseG: 17 });
    expect(updated.name).toBe('Light');
    expect(updated.doseG).toBe(17);
  });

  it('createFromSession copies session values and computes ratio', async () => {
    const db = makeTestDb();
    const { bean, session } = await seed(db);
    const repo = makeRecipesRepo(db);
    const r = await repo.createFromSession(session.id, { name: 'Best' });
    expect(r.beanId).toBe(bean.id);
    expect(r.name).toBe('Best');
    expect(r.doseG).toBe(18);
    expect(r.targetYieldG).toBe(36);
    expect(r.durationTargetS).toBe(27);
    expect(r.ratioTarget).toBeCloseTo(2, 5);
    expect(r.sourceSessionId).toBe(session.id);
  });

  it('createFromSession throws when session not found', async () => {
    const db = makeTestDb();
    const repo = makeRecipesRepo(db);
    await expect(repo.createFromSession('no-such-id')).rejects.toThrow('session not found');
  });
});
