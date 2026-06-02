import type { places, placeUserData } from '@/db/schema';

export type PlaceRow = typeof places.$inferSelect;
export type PlaceInsert = typeof places.$inferInsert;
export type PlaceUserDataRow = typeof placeUserData.$inferSelect;
export type PlaceWithUserData = PlaceRow & { userData: PlaceUserDataRow | null };

/** One entry of the bundled seed JSON (see scripts/build-places-seed.js). */
export type SeedPlace = {
  osmId: string;
  name: string;
  kind: 'roaster' | 'coffee_shop' | 'cafe';
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  imageUrl?: string;
  openingHours?: string;
  tags?: string[];
  curated?: boolean;
  editorialNote?: string;
};
