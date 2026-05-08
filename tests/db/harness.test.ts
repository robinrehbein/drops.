import { makeTestDb } from '@tests/helpers/test-db';
import { beans } from '@/db/schema';

describe('test db harness', () => {
  it('creates the beans table and accepts an insert', () => {
    const db = makeTestDb();
    db.insert(beans).values({
      id: 'b1',
      name: 'Yirgacheffe',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
    const rows = db.select().from(beans).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Yirgacheffe');
  });
});
