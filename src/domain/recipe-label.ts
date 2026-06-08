import { format } from 'date-fns';

/** Minimal shape needed to auto-label a recipe. */
export type RecipeLabelInput = {
  doseG: number | null;
  targetYieldG: number | null;
  durationTargetS: number | null;
  savedAt: Date;
};

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Human label for a recipe that has no explicit name: key params + save date,
 * e.g. "18→36g · 28s · Jun 8". Falls back to "Recipe" when nothing is set.
 */
export function recipeLabel(recipe: RecipeLabelInput): string {
  const parts: string[] = [];
  if (recipe.doseG != null && recipe.targetYieldG != null) {
    parts.push(`${num(recipe.doseG)}→${num(recipe.targetYieldG)}g`);
  } else if (recipe.doseG != null) {
    parts.push(`${num(recipe.doseG)}g`);
  }
  if (recipe.durationTargetS != null) parts.push(`${Math.round(recipe.durationTargetS)}s`);
  if (recipe.savedAt) parts.push(format(recipe.savedAt, 'MMM d'));
  return parts.length ? parts.join(' · ') : 'Recipe';
}
