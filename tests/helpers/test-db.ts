import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import bundled from '@/db/migrations/bundle.json';
import { migrationStatements } from '@/db/migrate';
import * as schema from '@/db/schema';

export type TestDb = BetterSQLite3Database<typeof schema> & { _raw: Database.Database };

export function makeTestDb(): TestDb {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  for (const { sql } of bundled as { sql: string }[]) {
    for (const statement of migrationStatements(sql)) {
      sqlite.exec(statement);
    }
  }
  const db = drizzle(sqlite, { schema }) as unknown as TestDb;
  db._raw = sqlite;
  return db;
}
