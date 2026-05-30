import { makePlacesRepo } from '@/features/places/repo';
import { seedPlacesIfNeeded } from '@/features/places/seed';
import { makeTestDb } from '@tests/helpers/test-db';

it('seeds once and is idempotent', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const n1 = await seedPlacesIfNeeded(repo);
  expect(n1).toBeGreaterThan(0);
  const n2 = await seedPlacesIfNeeded(repo);
  expect(n2).toBe(0);
  expect((await repo.listPlaces()).length).toBe(n1);
});
