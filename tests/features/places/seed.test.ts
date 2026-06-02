import { makePlacesRepo } from '@/features/places/repo';
import { seedPlacesIfNeeded } from '@/features/places/seed';
import seedData from '@/features/places/seed/places.seed.json';
import { makeTestDb } from '@tests/helpers/test-db';

it('seeds once and is idempotent', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const n1 = await seedPlacesIfNeeded(repo);
  expect(n1).toBeGreaterThan(0);
  const n2 = await seedPlacesIfNeeded(repo);
  expect(n2).toBe(0);
  expect((await repo.listPlaces()).length).toBe(n1);
});

it('ships only concrete non-generic image urls for imaged seed places', () => {
  const genericFallbacks = new Set([
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80',
  ]);
  const generic = seedData.places.filter((p) => p.imageUrl && genericFallbacks.has(p.imageUrl));
  const invalid = seedData.places.filter((p) => p.imageUrl && !/^https?:\/\//.test(p.imageUrl));
  expect(generic).toEqual([]);
  expect(invalid).toEqual([]);
});
