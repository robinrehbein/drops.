import { eq } from 'drizzle-orm';

import { beans } from '@/db/schema';
import { makePlacesRepo } from '@/features/places/repo';
import { makeTestDb } from '@tests/helpers/test-db';

describe('places repo — basics', () => {
  it('adds a user place and reads it back', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'Misch Misch', kind: 'cafe', city: 'Stuttgart' });
    expect(p.source).toBe('user');
    expect(p.id).toBeTruthy();
    const got = await repo.getPlace(p.id);
    expect(got?.name).toBe('Misch Misch');
    expect(got?.userData).toBeNull();
  });

  it('lists places sorted by name and lists distinct cities', async () => {
    const repo = makePlacesRepo(makeTestDb());
    await repo.addPlace({ name: 'Zebra', kind: 'cafe', city: 'Berlin' });
    await repo.addPlace({ name: 'Alpha', kind: 'cafe', city: 'Stuttgart' });
    const list = await repo.listPlaces();
    expect(list.map((p) => p.name)).toEqual(['Alpha', 'Zebra']);
    expect(await repo.listCities()).toEqual(['Berlin', 'Stuttgart']);
  });

  it('rejects an invalid place', async () => {
    const repo = makePlacesRepo(makeTestDb());
    await expect(repo.addPlace({ name: '', kind: 'cafe' })).rejects.toThrow();
  });
});

describe('places repo — overlay & seed', () => {
  it('setUserData upserts then updates the same row', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    await repo.setUserData(p.id, { wishlisted: true });
    await repo.setUserData(p.id, { rating: 5, notes: 'top' });
    const got = await repo.getPlace(p.id);
    expect(got?.userData?.wishlisted).toBe(true);
    expect(got?.userData?.rating).toBe(5);
    expect(await repo.listWishlist()).toHaveLength(1);
  });

  it('toggleWishlist flips state', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    expect((await repo.toggleWishlist(p.id)).wishlisted).toBe(true);
    expect((await repo.toggleWishlist(p.id)).wishlisted).toBe(false);
  });

  it('visited shows in listVisited and not in listWishlist', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    await repo.setUserData(p.id, { wishlisted: true, visitedAt: new Date() });
    expect(await repo.listVisited()).toHaveLength(1);
    expect(await repo.listWishlist()).toHaveLength(0);
  });

  it('upsertSeed inserts new, updates facts, preserves user overlay', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    await repo.upsertSeed([
      { osmId: 'n1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', curated: true },
    ]);
    const list1 = await repo.listPlaces();
    expect(list1).toHaveLength(1);
    const firstSeededPlace = list1[0];
    expect(firstSeededPlace).toBeDefined();
    await repo.setUserData(firstSeededPlace!.id, { wishlisted: true });
    await repo.upsertSeed([
      {
        osmId: 'n1',
        name: 'Mókuska',
        kind: 'cafe',
        city: 'Stuttgart',
        address: 'Johannesstr. 34',
        curated: true,
      },
    ]);
    const list2 = await repo.listPlaces();
    expect(list2).toHaveLength(1);
    const updatedSeededPlace = list2[0];
    expect(updatedSeededPlace).toBeDefined();
    expect(updatedSeededPlace!.address).toBe('Johannesstr. 34');
    expect(updatedSeededPlace!.userData?.wishlisted).toBe(true);
  });

  it('linkBean sets beans.source_place_id', async () => {
    const db = makeTestDb();
    const repo = makePlacesRepo(db);
    const p = await repo.addPlace({ name: 'Roaster', kind: 'roaster' });
    const now = new Date();
    await db
      .insert(beans)
      .values({
        id: 'b1',
        name: 'Bean',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      } as never);
    await repo.linkBean('b1', p.id);
    const rows = await db.select().from(beans).where(eq(beans.id, 'b1'));
    const bean = rows[0];
    expect(bean).toBeDefined();
    expect(bean!.sourcePlaceId).toBe(p.id);
  });

  it('setUserData with visitedAt:null clears a prior visit', async () => {
    const repo = makePlacesRepo(makeTestDb());
    const p = await repo.addPlace({ name: 'A', kind: 'cafe' });
    await repo.setUserData(p.id, { visitedAt: new Date() });
    expect(await repo.listVisited()).toHaveLength(1);
    await repo.setUserData(p.id, { visitedAt: null });
    expect(await repo.listVisited()).toHaveLength(0);
    const got = await repo.getPlace(p.id);
    expect(got?.userData?.visitedAt).toBeNull();
  });
});
