import { makeBeansRepo } from '@/features/beans/repo';
import { makePlacesRepo } from '@/features/places/repo';
import { makeTestDb } from '@tests/helpers/test-db';

it('links a bean to a place via the repo', async () => {
  const db = makeTestDb();
  const beans = makeBeansRepo(db);
  const places = makePlacesRepo(db);
  const bean = await beans.addBean({ name: 'Ethiopia' });
  const place = await places.addPlace({ name: 'Mókuska', kind: 'roaster' });
  await places.linkBean(bean.id, place.id);
  const got = await beans.getBean(bean.id);
  expect(got?.sourcePlaceId).toBe(place.id);
});

it('lists beans by their source place', async () => {
  const db = makeTestDb();
  const beans = makeBeansRepo(db);
  const places = makePlacesRepo(db);
  const place = await places.addPlace({ name: 'Mókuska', kind: 'roaster' });
  const a = await beans.addBean({ name: 'Ethiopia' });
  const b = await beans.addBean({ name: 'Colombia' });
  await beans.addBean({ name: 'Unlinked' });
  await places.linkBean(a.id, place.id);
  await places.linkBean(b.id, place.id);
  const linked = await beans.listBySourcePlace(place.id);
  expect(linked.map((x) => x.name)).toEqual(['Colombia', 'Ethiopia']); // sorted by name
});
