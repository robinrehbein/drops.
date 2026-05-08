import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const sessionInputSchema = z.object({
  beanId: z.string().min(1),
  method: z.literal('espresso'), // v1: espresso only; widened in v1.3
  startedAt: z.date(),
  endedAt: z.date().optional(),
  doseG: z.number().positive(),
  yieldG: z.number().nonnegative().optional(),
  durationS: z.number().nonnegative().optional(),
  preInfusionS: z.number().nonnegative().optional(),
  firstDropS: z.number().nonnegative().optional(),
  grinderLabel: z.string().max(120).optional(),
  grindSetting: z.string().max(120).optional(),
  waterTempC: z.number().min(0).max(120).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionIssue = { path: (string | number)[]; message: string };

export function validateSession(input: unknown): Result<SessionInput, SessionIssue[]> {
  const parsed = sessionInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  // Zod 4's path is PropertyKey[] (includes symbol); filter to (string|number)[] for the public API.
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}
