import { makeMachinesRepo } from '@/features/machines/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('machines repo', () => {
  it('addMachine inserts and is the primary if first', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    const m = await repo.addMachine({ name: 'Bianca', kind: 'espresso_machine' });
    expect(m.isPrimary).toBe(true);
    expect(m.kind).toBe('espresso_machine');
  });

  it('second machine with isPrimary false stays non-primary', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    await repo.addMachine({ name: 'Bianca', kind: 'espresso_machine' });
    const m2 = await repo.addMachine({ name: 'Niche', kind: 'grinder' });
    expect(m2.isPrimary).toBe(false);
  });

  it('addMachine with isPrimary:true steals the flag', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    const m1 = await repo.addMachine({ name: 'Old', kind: 'espresso_machine' });
    await repo.addMachine({ name: 'New', kind: 'espresso_machine', isPrimary: true });
    const updated = await repo.getMachine(m1.id);
    expect(updated?.isPrimary).toBe(false);
    const primary = await repo.getPrimary();
    expect(primary?.name).toBe('New');
  });

  it('setPrimary moves the flag exclusively', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    const m1 = await repo.addMachine({ name: 'A', kind: 'espresso_machine' });
    const m2 = await repo.addMachine({ name: 'B', kind: 'grinder' });
    await repo.setPrimary(m2.id);
    expect((await repo.getMachine(m1.id))?.isPrimary).toBe(false);
    expect((await repo.getMachine(m2.id))?.isPrimary).toBe(true);
  });

  it('getPrimary returns the flagged machine', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    await repo.addMachine({ name: 'A', kind: 'espresso_machine' });
    const primary = await repo.getPrimary();
    expect(primary?.name).toBe('A');
  });

  it('softDeleteMachine hides from list', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    const m = await repo.addMachine({ name: 'A', kind: 'kettle' });
    await repo.softDeleteMachine(m.id);
    expect(await repo.listMachines()).toHaveLength(0);
  });

  it('updateMachine changes name', async () => {
    const db = makeTestDb();
    const repo = makeMachinesRepo(db);
    const m = await repo.addMachine({ name: 'A', kind: 'other' });
    const updated = await repo.updateMachine(m.id, { name: 'B' });
    expect(updated.name).toBe('B');
  });
});
