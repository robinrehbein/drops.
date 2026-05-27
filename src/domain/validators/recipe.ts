import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const recipeInputSchema = z.object({
  beanId: z.string().trim().min(1, 'beanId is required'),
  sourceSessionId: z.string().trim().min(1).optional(),
  doseG: z.number().positive().max(100).optional(),
  targetYieldG: z.number().positive().max(500).optional(),
  durationTargetS: z.number().positive().max(600).optional(),
  grinderLabel: z.string().trim().max(120).optional(),
  grindSetting: z.string().trim().max(60).optional(),
  waterTempC: z.number().min(1).max(100).optional(),
  ratioTarget: z.number().positive().max(20).optional(),
  notes: z.string().max(2000).optional(),
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
