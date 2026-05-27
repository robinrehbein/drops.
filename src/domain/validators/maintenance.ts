import { z } from 'zod';

import { type Result, err, ok } from '@/domain/result';

export const maintenanceTaskInputSchema = z.object({
  machineId: z.string().trim().min(1, 'machineId is required'),
  kind: z.enum([
    'backflush',
    'gasket_replace',
    'burr_clean',
    'filter_replace',
    'descale',
    'group_screen_clean',
    'custom',
  ]),
  label: z.string().trim().min(1, 'label is required').max(120),
  cadenceKind: z.enum(['every_n_days', 'every_n_shots', 'every_n_liters']),
  cadenceValue: z.number().positive(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export type MaintenanceTaskInput = z.infer<typeof maintenanceTaskInputSchema>;
export type MaintenanceTaskIssue = { path: (string | number)[]; message: string };

export function validateMaintenanceTask(
  input: unknown,
): Result<MaintenanceTaskInput, MaintenanceTaskIssue[]> {
  const parsed = maintenanceTaskInputSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    })),
  );
}
