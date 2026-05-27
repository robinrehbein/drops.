import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const machineInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  kind: z.enum(['espresso_machine', 'grinder', 'kettle', 'other']),
  model: z.string().trim().max(120).optional(),
  vendor: z.string().trim().max(120).optional(),
  acquiredOn: z.date().optional(),
  notes: z.string().max(2000).optional(),
  isPrimary: z.boolean().optional(),
});

export type MachineInput = z.infer<typeof machineInputSchema>;
export type MachineIssue = { path: (string | number)[]; message: string };

export function validateMachine(input: unknown): Result<MachineInput, MachineIssue[]> {
  const parsed = machineInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}
