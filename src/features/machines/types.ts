import type { machines } from '@/db/schema';

export type MachineRow = typeof machines.$inferSelect;
