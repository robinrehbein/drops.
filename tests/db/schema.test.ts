import { eq, isNull } from 'drizzle-orm';

import {
  beans,
  brewSessions,
  brewMilestones,
  tastingNotes,
  recipes,
  machines,
  maintenanceTasks,
  maintenanceLogs,
} from '@/db/schema';
import { uuid } from '@/domain/ids';
import { makeTestDb } from '@tests/helpers/test-db';

describe('schema', () => {
  it('cascades brew_milestones and tasting_notes when a session is deleted (hard)', () => {
    const db = makeTestDb();
    const beanId = uuid();
    db.insert(beans).values({ id: beanId, name: 'X', createdAt: new Date(), updatedAt: new Date() }).run();

    const sessionId = uuid();
    db.insert(brewSessions).values({
      id: sessionId, beanId, method: 'espresso', doseG: 18,
      startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }).run();

    db.insert(brewMilestones).values({
      id: uuid(), sessionId, kind: 'first_drop', tSeconds: 7, createdAt: new Date(),
    }).run();
    db.insert(tastingNotes).values({
      id: uuid(), sessionId, createdAt: new Date(), updatedAt: new Date(),
    }).run();

    db.delete(brewSessions).where(eq(brewSessions.id, sessionId)).run();

    expect(db.select().from(brewMilestones).all()).toHaveLength(0);
    expect(db.select().from(tastingNotes).all()).toHaveLength(0);
  });

  it('rejects deleting a bean that has sessions (RESTRICT)', () => {
    const db = makeTestDb();
    const beanId = uuid();
    db.insert(beans).values({ id: beanId, name: 'X', createdAt: new Date(), updatedAt: new Date() }).run();
    db.insert(brewSessions).values({
      id: uuid(), beanId, method: 'espresso', doseG: 18,
      startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }).run();

    expect(() => db.delete(beans).where(eq(beans.id, beanId)).run()).toThrow();
  });

  it('soft-delete sets deleted_at and live queries filter it', () => {
    const db = makeTestDb();
    const liveId = uuid();
    const deletedId = uuid();
    db.insert(beans).values({
      id: liveId, name: 'Live', createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.insert(beans).values({
      id: deletedId, name: 'Deleted', createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.update(beans).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(beans.id, deletedId)).run();
    const live = db.select().from(beans).where(isNull(beans.deletedAt)).all();
    expect(live).toHaveLength(1);
    expect(live[0]?.id).toBe(liveId);
  });

  it('enforces unique tasting_notes per session', () => {
    const db = makeTestDb();
    const beanId = uuid();
    const sessionId = uuid();
    db.insert(beans).values({ id: beanId, name: 'X', createdAt: new Date(), updatedAt: new Date() }).run();
    db.insert(brewSessions).values({
      id: sessionId, beanId, method: 'espresso', doseG: 18,
      startedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.insert(tastingNotes).values({
      id: uuid(), sessionId, createdAt: new Date(), updatedAt: new Date(),
    }).run();
    expect(() => {
      db.insert(tastingNotes).values({
        id: uuid(), sessionId, createdAt: new Date(), updatedAt: new Date(),
      }).run();
    }).toThrow();
  });

  it('defaults bean.status to active and round-trips would_buy_again boolean', () => {
    const db = makeTestDb();
    const id = uuid();
    db.insert(beans).values({ id, name: 'X', createdAt: new Date(), updatedAt: new Date() }).run();
    const row = db.select().from(beans).where(eq(beans.id, id)).all()[0];
    expect(row?.status).toBe('active');
    expect(row?.wouldBuyAgain).toBeNull();

    db.update(beans).set({ wouldBuyAgain: true }).where(eq(beans.id, id)).run();
    expect(db.select().from(beans).where(eq(beans.id, id)).all()[0]?.wouldBuyAgain).toBe(true);
    db.update(beans).set({ wouldBuyAgain: false }).where(eq(beans.id, id)).run();
    expect(db.select().from(beans).where(eq(beans.id, id)).all()[0]?.wouldBuyAgain).toBe(false);
  });

  it('allows multiple recipes per bean and cascades on bean delete', () => {
    const db = makeTestDb();
    const beanId = uuid();
    db.insert(beans).values({ id: beanId, name: 'X', createdAt: new Date(), updatedAt: new Date() }).run();
    // A bean can now hold several recipes; the default is tracked by beans.recipeId.
    db.insert(recipes).values({
      id: uuid(), beanId, name: 'Morning', savedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.insert(recipes).values({
      id: uuid(), beanId, savedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }).run();
    expect(db.select().from(recipes).all()).toHaveLength(2);

    // bean has no sessions, so delete is allowed and cascades the recipes
    db.delete(beans).where(eq(beans.id, beanId)).run();
    expect(db.select().from(recipes).all()).toHaveLength(0);
  });

  it('round-trips machine.is_primary boolean', () => {
    const db = makeTestDb();
    const id = uuid();
    db.insert(machines).values({
      id, name: 'Bianca', kind: 'espresso_machine', isPrimary: true,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    const row = db.select().from(machines).where(eq(machines.id, id)).all()[0];
    expect(row?.isPrimary).toBe(true);
  });

  it('cascades maintenance tasks and logs when a machine is deleted', () => {
    const db = makeTestDb();
    const machineId = uuid();
    const taskId = uuid();
    db.insert(machines).values({
      id: machineId, name: 'Bianca', kind: 'espresso_machine',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.insert(maintenanceTasks).values({
      id: taskId, machineId, kind: 'backflush', label: 'Backflush',
      cadenceKind: 'every_n_days', cadenceValue: 7,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    db.insert(maintenanceLogs).values({
      id: uuid(), taskId, doneAt: new Date(), createdAt: new Date(),
    }).run();

    db.delete(machines).where(eq(machines.id, machineId)).run();
    expect(db.select().from(maintenanceTasks).all()).toHaveLength(0);
    expect(db.select().from(maintenanceLogs).all()).toHaveLength(0);
  });

  it('defaults maintenance_task.active to true', () => {
    const db = makeTestDb();
    const machineId = uuid();
    db.insert(machines).values({
      id: machineId, name: 'M', kind: 'grinder', createdAt: new Date(), updatedAt: new Date(),
    }).run();
    const taskId = uuid();
    db.insert(maintenanceTasks).values({
      id: taskId, machineId, kind: 'burr_clean', label: 'Burr clean',
      cadenceKind: 'every_n_shots', cadenceValue: 200,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    expect(db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, taskId)).all()[0]?.active).toBe(true);
  });
});
