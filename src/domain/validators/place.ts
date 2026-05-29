import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const placeKindSchema = z.enum(['roaster', 'coffee_shop', 'cafe']);

export const placeInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(160),
  kind: placeKindSchema,
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).optional(),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  website: z.string().trim().url().max(300).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
});
export type PlaceInput = z.infer<typeof placeInputSchema>;

export const userDataInputSchema = z.object({
  wishlisted: z.boolean().optional(),
  visitedAt: z.date().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});
export type UserDataInput = z.infer<typeof userDataInputSchema>;

export type PlaceIssue = { path: (string | number)[]; message: string };

// Zod 4 does not export SafeParseReturnType; use a minimal structural union instead.
type SafeParseResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

function toResult<T>(parsed: SafeParseResult<T>): Result<T, PlaceIssue[]> {
  if (parsed.success) return ok(parsed.data);
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}

export function validatePlace(input: unknown): Result<PlaceInput, PlaceIssue[]> {
  return toResult(placeInputSchema.safeParse(input));
}

export function validateUserData(input: unknown): Result<UserDataInput, PlaceIssue[]> {
  return toResult(userDataInputSchema.safeParse(input));
}
