import { eq, isNull } from 'drizzle-orm';

import { beans, brewSessions, brewMilestones, tastingNotes } from '@/db/schema';
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
});
