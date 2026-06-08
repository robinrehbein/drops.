import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

// Optional fields are `.nullish()` (null | undefined | value): recipes carry
// explicit nulls for unset params (e.g. a manual recipe with no temp).
export const recipeInputSchema = z.object({
  beanId: z.string().trim().min(1, 'beanId is required'),
  name: z.string().trim().max(120).nullish(),
  sourceSessionId: z.string().trim().min(1).nullish(),
  doseG: z.number().positive().max(100).nullish(),
  targetYieldG: z.number().positive().max(500).nullish(),
  durationTargetS: z.number().positive().max(600).nullish(),
  grinderLabel: z.string().trim().max(120).nullish(),
  grindSetting: z.string().trim().max(60).nullish(),
  waterTempC: z.number().min(1).max(100).nullish(),
  ratioTarget: z.number().positive().max(20).nullish(),
  notes: z.string().max(2000).nullish(),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type RecipeIssue = { path: (string | number)[]; message: string };

export function validateRecipe(input: unknown): Result<RecipeInput, RecipeIssue[]> {
  const parsed = recipeInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  // Zod 4's path is PropertyKey[] (includes symbol); filter to (string|number)[] for the public API.
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}
