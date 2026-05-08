import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const beanInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  roaster: z.string().trim().max(120).optional(),
  origin: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().length(2).optional(),
  process: z.enum(['washed', 'natural', 'honey', 'anaerobic', 'other']).optional(),
  variety: z.string().trim().max(120).optional(),
  roastLevel: z.number().int().min(1).max(5).optional(),
  roastedOn: z.date().optional(),
  altitudeMasl: z.number().int().nonnegative().optional(),
  startWeightG: z.number().nonnegative().optional(),
  pricePaidMinor: z.number().int().nonnegative().optional(),
  pricePaidCurrency: z.string().trim().length(3).optional(),
  flavorTags: z.array(z.string().trim().min(1)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export type BeanInput = z.infer<typeof beanInputSchema>;
export type BeanIssue = { path: (string | number)[]; message: string };

export function validateBean(input: unknown): Result<BeanInput, BeanIssue[]> {
  const parsed = beanInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(parsed.error.issues.map((i) => ({ path: [...i.path], message: i.message })));
}
