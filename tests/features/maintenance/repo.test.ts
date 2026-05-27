import { makeBeansRepo } from '@/features/beans/repo';
import { makeBrewRepo } from '@/features/brew/repo';
import { makeMachinesRepo } from '@/features/machines/repo';
import { makeMaintenanceRepo } from '@/features/maintenance/repo';
import { makeWaterRepo } from '@/features/water/repo';
import { makeTestDb } from '@tests/helpers/test-db';

async function seedMachine(db: ReturnType<typeof makeTestDb>) {
  const repo = makeMachinesRepo(db);
  return repo.addMachine({ name: 'Bianca', kind: 'espresso_machine' });
}

describe('maintenance repo', () => {
  it('addTask inserts and listTasksForMachine returns it', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    const task = await repo.addTask({
      machineId: machine.id,
      kind: 'backflush',
      label: 'Backflush group',
      cadenceKind: 'every_n_days',
      cadenceValue: 7,
    });
    const list = await repo.listTasksForMachine(machine.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(task.id);
  });

  it('softDeleteTask hides from list', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    const task = await repo.addTask({
      machineId: machine.id,
      kind: 'descale',
      label: 'Descale',
      cadenceKind: 'every_n_days',
      cadenceValue: 60,
    });
    await repo.softDeleteTask(task.id);
    expect(await repo.listTasksForMachine(machine.id)).toHaveLength(0);
  });

  it('inactive task excluded from list', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    await repo.addTask({
      machineId: machine.id,
      kind: 'custom',
      label: 'Paused',
      cadenceKind: 'every_n_days',
      cadenceValue: 30,
      active: false,
    });
    expect(await repo.listTasksForMachine(machine.id)).toHaveLength(0);
  });

  it('logTask snapshots currentShots and currentLiters', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    const beansRepo = makeBeansRepo(db);
    const brewRepo = makeBrewRepo(db);
    const waterRepo = makeWaterRepo(db);

    // Seed 2 completed sessions + a refill
    const bean = await beansRepo.addBean({ name: 'X' });
    for (let i = 0; i < 2; i++) {
      const s = await brewRepo.startSession({ beanId: bean.id, doseG: 18 });
      await brewRepo.endSession(s.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
      await brewRepo.finalizeWithNotes(s.id, { yieldG: 36, rating: 4 });
    }
    await waterRepo.addRefill(500);

    const task = await repo.addTask({
      machineId: machine.id,
      kind: 'filter_replace',
      label: 'Replace filter',
      cadenceKind: 'every_n_liters',
      cadenceValue: 60,
    });
    const log = await repo.logTask({ taskId: task.id });
    expect(log.shotsAtTime).toBe(2);
    expect(log.litersAtTime).toBeGreaterThanOrEqual(0);
  });

  it('tasksWithStatus reports ok for never-done task', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    await repo.addTask({
      machineId: machine.id,
      kind: 'backflush',
      label: 'BF',
      cadenceKind: 'every_n_shots',
      cadenceValue: 200,
    });
    const statuses = await repo.tasksWithStatus(machine.id);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.nextDue.status).toBe('ok');
    expect(statuses[0]?.nextDue.remaining).toBe(200);
    expect(statuses[0]?.lastDoneAt).toBeNull();
  });

  it('tasksWithStatus becomes overdue after logging with a stale shot count', async () => {
    const db = makeTestDb();
    const machine = await seedMachine(db);
    const repo = makeMaintenanceRepo(db);
    const beansRepo = makeBeansRepo(db);
    const brewRepo = makeBrewRepo(db);
    const bean = await beansRepo.addBean({ name: 'X' });

    const task = await repo.addTask({
      machineId: machine.id,
      kind: 'burr_clean',
      label: 'Burr',
      cadenceKind: 'every_n_shots',
      cadenceValue: 3,
    });

    // Log the task at shot count 0
    await repo.logTask({ taskId: task.id });

    // Brew 5 shots (past cadence of 3)
    for (let i = 0; i < 5; i++) {
      const s = await brewRepo.startSession({ beanId: bean.id, doseG: 18 });
      await brewRepo.endSession(s.id, { endedAt: new Date(), yieldG: 36, durationS: 27 });
      await brewRepo.finalizeWithNotes(s.id, { yieldG: 36, rating: 4 });
    }

    const statuses = await repo.tasksWithStatus(machine.id);
    expect(statuses[0]?.nextDue.status).toBe('overdue');
  });
});
