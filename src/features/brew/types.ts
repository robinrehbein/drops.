import type { brewSessions, brewMilestones, tastingNotes } from '@/db/schema';

export type SessionRow = typeof brewSessions.$inferSelect;
export type MilestoneRow = typeof brewMilestones.$inferSelect;
export type TastingNoteRow = typeof tastingNotes.$inferSelect;
