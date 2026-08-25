import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Database connection + schema migration.
 *
 * The schema is tracked with SQLite's `PRAGMA user_version`. Each entry in
 * `MIGRATIONS` brings the database one version forward; the migration helper
 * applies only the pending steps and is safe to run on every launch.
 */

/** Name of the on-device SQLite file. */
export const DATABASE_NAME = 'cat.db';

/** Current schema version (also the target `PRAGMA user_version`). */
export const SCHEMA_VERSION = 1;

/**
 * Ordered list of DDL migrations. `MIGRATIONS[i]` upgrades the database to
 * version `i + 1`. Append (never edit) entries to add future migrations.
 */
const MIGRATIONS: ReadonlyArray<string> = [
  // v1 — core tables
  `-- v1
   CREATE TABLE IF NOT EXISTS patients (
     id         TEXT PRIMARY KEY,
     name       TEXT NOT NULL,
     mrn        TEXT,
     dob        TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS sessions (
     id            TEXT PRIMARY KEY,
     patient_id    TEXT NOT NULL,
     created_at    INTEGER NOT NULL,
     is_comparison INTEGER NOT NULL DEFAULT 0,
     completed_at  TEXT,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   CREATE TABLE IF NOT EXISTS tools (
     id          TEXT PRIMARY KEY,
     name        TEXT NOT NULL,
     config_json TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS session_tools (
     session_id   TEXT NOT NULL,
     tool_id      TEXT NOT NULL,
     ord          INTEGER NOT NULL DEFAULT 0,
     answers_json TEXT NOT NULL,
     score        REAL NOT NULL DEFAULT 0,
     raw_score    REAL NOT NULL DEFAULT 0,
     PRIMARY KEY (session_id, tool_id),
     FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
     FOREIGN KEY (tool_id)     REFERENCES tools(id)     ON DELETE CASCADE
   );
   CREATE TABLE IF NOT EXISTS settings (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_sessions_patient   ON sessions(patient_id);
   CREATE INDEX IF NOT EXISTS idx_session_tools_sess ON session_tools(session_id);
  `,
];

let db: SQLiteDatabase | null = null;

/**
 * Lazily opens (once) the shared connection to the app database.
 */
export function getDb(): SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

/** Reads the current `PRAGMA user_version` of an open database. */
export function getUserVersion(d: SQLiteDatabase): number {
  const row = d.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  return row && typeof row.user_version === 'number' ? row.user_version : 0;
}

/**
 * Applies any pending migrations, advancing `PRAGMA user_version` to fully
 * match `SCHEMA_VERSION`. Runs idempotently on every launch.
 */
export function migrateDatabase(d: SQLiteDatabase): void {
  const start = getUserVersion(d);
  for (let version = start; version < MIGRATIONS.length; version += 1) {
    d.execSync('BEGIN');
    try {
      d.execSync(MIGRATIONS[version]);
      d.execSync(`PRAGMA user_version = ${version + 1}`);
      d.execSync('COMMIT');
    } catch (error) {
      d.execSync('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Small dependency-free unique id generator. Avoids relying on
 * `crypto.randomUUID` which can be missing in bare React Native runtimes.
 */
export function generateId(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`;
}

/**
 * Opens the connection and brings the schema up to date. Returns the shared
 * connection for callers that want to run statements directly.
 */
export function initDatabase(): SQLiteDatabase {
  const database = getDb();
  migrateDatabase(database);
  return database;
}

export default initDatabase;