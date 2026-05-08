import { makeBeansRepo } from '@/features/beans/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('beans repo', () => {
  it('addBean inserts and returns the row with generated id and timestamps', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    const created = await repo.addBean({ name: 'Yirgacheffe' });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.name).toBe('Yirgacheffe');
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('listBeans returns live rows ordered by name', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    await repo.addBean({ name: 'Brazil' });
    await repo.addBean({ name: 'Colombia' });
    await repo.addBean({ name: 'Ethiopia' });
    const list = await repo.listBeans();
    expect(list.map((b) => b.name)).toEqual(['Brazil', 'Colombia', 'Ethiopia']);
  });

  it('softDeleteBean hides it from list', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    const a = await repo.addBean({ name: 'A' });
    await repo.softDeleteBean(a.id);
    const list = await repo.listBeans();
    expect(list).toHaveLength(0);
  });

  it('restoreBean unsets deleted_at', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    const a = await repo.addBean({ name: 'A' });
    await repo.softDeleteBean(a.id);
    await repo.restoreBean(a.id);
    expect(await repo.listBeans()).toHaveLength(1);
  });

  it('updateBean sets updated_at and persists changes', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    const a = await repo.addBean({ name: 'A' });
    const before = a.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    const updated = await repo.updateBean(a.id, { name: 'A2', roaster: 'Onyx' });
    expect(updated.name).toBe('A2');
    expect(updated.roaster).toBe('Onyx');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before);
  });

  it('rejects invalid input via validator', async () => {
    const db = makeTestDb();
    const repo = makeBeansRepo(db);
    await expect(repo.addBean({ name: '' })).rejects.toThrow(/name/);
  });
});
