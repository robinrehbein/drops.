import bundled from './migrations/bundle.json';
import { getDb } from './client';

type Migration = { tag: string; sql: string };

export function migrationStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function runMigrations(): Promise<void> {
  const db = getDb();
  // SQLite-side journal table (Drizzle-compatible name).
  // Uses raw exec to keep migration bootstrap independent of schema state.
  // @ts-expect-error — drizzle exposes session.client in expo-sqlite driver
  const raw = db.session.client as { execSync: (sql: string) => void };
  raw.execSync(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT NOT NULL UNIQUE,
    applied_at INTEGER NOT NULL
  );`);
  for (const m of bundled as Migration[]) {
    const exists = (raw as unknown as {
      getFirstSync: <T>(sql: string, params: unknown[]) => T | null;
    }).getFirstSync<{ id: number }>(`SELECT id FROM __drizzle_migrations WHERE tag = ?`, [m.tag]);
    if (exists) continue;
    raw.execSync('BEGIN;');
    try {
      for (const statement of migrationStatements(m.sql)) {
        raw.execSync(statement);
      }
      raw.execSync(
        `INSERT INTO __drizzle_migrations (tag, applied_at) VALUES ('${m.tag}', ${Date.now()});`,
      );
      raw.execSync('COMMIT;');
    } catch (e) {
      raw.execSync('ROLLBACK;');
      throw e;
    }
  }
}
