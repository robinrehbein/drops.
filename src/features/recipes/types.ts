import type { recipes } from '@/db/schema';

export type RecipeRow = typeof recipes.$inferSelect;
