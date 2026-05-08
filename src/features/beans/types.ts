import type { beans } from '@/db/schema';

export type BeanRow = typeof beans.$inferSelect;
export type BeanInsert = typeof beans.$inferInsert;
