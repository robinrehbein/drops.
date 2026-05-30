import type { PlacesRepo } from './repo';
import seedData from './seed/places.seed.json';
import type { SeedPlace } from './types';

/** Imports the bundled seed once. Returns number of rows seeded (0 if already present). */
export async function seedPlacesIfNeeded(repo: PlacesRepo): Promise<number> {
  const existing = await repo.listPlaces();
  if (existing.some((p) => p.source === 'seed')) return 0;
  const seedPlaces = (seedData as { places: SeedPlace[] }).places;
  return repo.upsertSeed(seedPlaces);
}
