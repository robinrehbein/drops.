import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { beans, placeUserData, places } from '@/db/schema';
import * as schema from '@/db/schema';
import { uuid } from '@/domain/ids';
import {
  type PlaceInput,
  type UserDataInput,
  validatePlace,
  validateUserData,
} from '@/domain/validators/place';
import type { PlaceRow, PlaceUserDataRow, PlaceWithUserData, SeedPlace } from './types';

type Db = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

type PlaceWhere = ReturnType<typeof and>;

export type PlacesRepo = {
  addPlace: (input: PlaceInput) => Promise<PlaceRow>;
  getPlace: (id: string) => Promise<PlaceWithUserData | null>;
  hasSeedPlaces: () => Promise<boolean>;
  listPlaces: () => Promise<PlaceWithUserData[]>;
  listCities: () => Promise<string[]>;
  listWishlist: () => Promise<PlaceWithUserData[]>;
  listVisited: () => Promise<PlaceWithUserData[]>;
  setUserData: (placeId: string, patch: UserDataInput) => Promise<PlaceUserDataRow>;
  toggleWishlist: (placeId: string) => Promise<PlaceUserDataRow>;
  linkBean: (beanId: string, placeId: string | null) => Promise<void>;
  upsertSeed: (seed: SeedPlace[]) => Promise<number>;
};

function validationMessage(issues: { message: string }[]): string {
  return issues.map((i) => i.message).join('; ');
}

function withUserData(row: {
  places: PlaceRow;
  place_user_data: PlaceUserDataRow | null;
}): PlaceWithUserData {
  return { ...row.places, userData: row.place_user_data };
}

function normalizeUserPatch(patch: UserDataInput): Partial<PlaceUserDataRow> {
  const out: Partial<PlaceUserDataRow> = {};
  if (patch.wishlisted !== undefined) out.wishlisted = patch.wishlisted;
  if (patch.visitedAt !== undefined) out.visitedAt = patch.visitedAt;
  if (patch.rating !== undefined) out.rating = patch.rating;
  if (patch.notes !== undefined) out.notes = patch.notes;
  return out;
}

export function makePlacesRepo(db: Db): PlacesRepo {
  async function rowsWithUserData(where?: PlaceWhere): Promise<PlaceWithUserData[]> {
    const q = db
      .select()
      .from(places)
      .leftJoin(placeUserData, eq(placeUserData.placeId, places.id))
      .orderBy(asc(places.name));
    const rows = where ? await q.where(where) : await q;
    return rows.map(withUserData);
  }

  const repo: PlacesRepo = {
    async addPlace(input) {
      const v = validatePlace(input);
      if (!v.ok) throw new Error(validationMessage(v.error));
      const now = new Date();
      const row: PlaceRow = {
        id: uuid(),
        source: 'user',
        externalId: null,
        name: v.value.name,
        kind: v.value.kind,
        city: v.value.city ?? null,
        country: v.value.country ?? 'DE',
        address: v.value.address ?? null,
        lat: v.value.lat ?? null,
        lng: v.value.lng ?? null,
        website: v.value.website ?? null,
        imageUrl: null,
        openingHours: null,
        tags: v.value.tags ?? null,
        curated: false,
        editorialNote: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(places).values(row);
      return row;
    },

    async getPlace(id) {
      const rows = await rowsWithUserData(and(eq(places.id, id)));
      return rows[0] ?? null;
    },

    async hasSeedPlaces() {
      const rows = await db
        .select()
        .from(places)
        .where(eq(places.source, 'seed'))
        .limit(1);
      return rows.length > 0;
    },

    async listPlaces() {
      return rowsWithUserData();
    },

    async listCities() {
      const rows = await db
        .select()
        .from(places)
        .where(isNotNull(places.city))
        .orderBy(asc(places.city));
      return [...new Set(rows.map((r) => r.city).filter((city): city is string => !!city))];
    },

    async listWishlist() {
      return rowsWithUserData(
        and(eq(placeUserData.wishlisted, true), isNull(placeUserData.visitedAt)),
      );
    },

    async listVisited() {
      return rowsWithUserData(and(isNotNull(placeUserData.visitedAt)));
    },

    async setUserData(placeId, patch) {
      const v = validateUserData(patch);
      if (!v.ok) throw new Error(validationMessage(v.error));
      const now = new Date();
      const existing = await db
        .select()
        .from(placeUserData)
        .where(eq(placeUserData.placeId, placeId));
      if (existing[0]) {
        const updated: PlaceUserDataRow = {
          ...existing[0],
          ...normalizeUserPatch(v.value),
          updatedAt: now,
        };
        await db.update(placeUserData).set(updated).where(eq(placeUserData.placeId, placeId));
        return updated;
      }
      const row: PlaceUserDataRow = {
        id: uuid(),
        placeId,
        wishlisted: v.value.wishlisted ?? false,
        visitedAt: v.value.visitedAt ?? null,
        rating: v.value.rating ?? null,
        notes: v.value.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(placeUserData).values(row);
      return row;
    },

    async toggleWishlist(placeId) {
      const existing = await db
        .select()
        .from(placeUserData)
        .where(eq(placeUserData.placeId, placeId));
      return repo.setUserData(placeId, { wishlisted: !(existing[0]?.wishlisted ?? false) });
    },

    async linkBean(beanId, placeId) {
      await db
        .update(beans)
        .set({ sourcePlaceId: placeId, updatedAt: new Date() })
        .where(eq(beans.id, beanId));
    },

    async upsertSeed(seed) {
      const now = new Date();
      let count = 0;
      function factsForSeed(s: SeedPlace) {
        return {
          name: s.name,
          kind: s.kind,
          city: s.city ?? null,
          country: s.country ?? 'DE',
          address: s.address ?? null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          website: s.website ?? null,
          imageUrl: s.imageUrl ?? null,
          openingHours: s.openingHours ?? null,
          tags: s.tags ?? null,
          curated: s.curated ?? false,
          editorialNote: s.editorialNote ?? null,
          updatedAt: now,
        };
      }
      const writeSeedSync = (tx: Db) => {
        for (const s of seed) {
          const existing = tx.select().from(places).where(eq(places.externalId, s.osmId)).all();
          const facts = factsForSeed(s);
          if (existing[0]) {
            tx.update(places).set(facts).where(eq(places.id, existing[0].id)).run();
          } else {
            tx.insert(places).values({
              id: uuid(),
              source: 'seed',
              externalId: s.osmId,
              createdAt: now,
              ...facts,
            }).run();
          }
          count++;
        }
      };
      const writeSeedAsync = async (tx: Db) => {
        for (const s of seed) {
          const existing = await tx.select().from(places).where(eq(places.externalId, s.osmId));
          const facts = factsForSeed(s);
          if (existing[0]) {
            await tx.update(places).set(facts).where(eq(places.id, existing[0].id));
          } else {
            await tx.insert(places).values({
              id: uuid(),
              source: 'seed',
              externalId: s.osmId,
              createdAt: now,
              ...facts,
            });
          }
          count++;
        }
      };
      const supportsSyncExecution =
        typeof db.select().from(places).limit(0).all === 'function';
      if ('transaction' in db && typeof db.transaction === 'function') {
        if (supportsSyncExecution) {
          db.transaction((tx) => writeSeedSync(tx as Db));
        } else {
          await db.transaction((tx) => writeSeedAsync(tx as Db));
        }
      } else {
        await writeSeedAsync(db);
      }
      return count;
    },
  };

  return repo;
}
