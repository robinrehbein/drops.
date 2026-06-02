import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

let _db: ExpoSQLiteDatabase<typeof schema> | null = null;

export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (_db) return _db;
  const sqlite = SQLite.openDatabaseSync('drop.db', { useNewConnection: false });
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  _db = drizzle(sqlite, { schema });
  return _db;
}

/** For tests: replace the singleton with an in-memory better-sqlite3 backed Drizzle. */
export function __setDbForTests(db: ExpoSQLiteDatabase<typeof schema>): void {
  _db = db;
}
