import type { maintenanceLogs, maintenanceTasks } from '@/db/schema';
import type { NextDue } from '@/domain/maintenance';

export type MaintenanceTaskRow = typeof maintenanceTasks.$inferSelect;
export type MaintenanceLogRow = typeof maintenanceLogs.$inferSelect;

export type TaskWithStatus = MaintenanceTaskRow & {
  lastDoneAt: Date | null;
  nextDue: NextDue;
};
