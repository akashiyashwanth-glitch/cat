/**
 * Data layer entry point.
 *
 * `initDb()` orchestrates a full boot: it lazily opens the expo-sqlite
 * connection, creates the schema via `PRAGMA user_version` migrations, and
 * seeds the sample tools on first launch. Every typed repository is
 * re-exported from this single module so screens can import the whole layer
 * from one place.
 */

import { DATABASE_NAME, SCHEMA_VERSION, initDatabase } from './database';
import { seedTools } from './tools';

export interface DbStatus {
  initialized: boolean;
  databaseName: string;
  schemaVersion: number;
  seeded: boolean;
  error?: string;
}

let status: DbStatus = {
  initialized: false,
  databaseName: DATABASE_NAME,
  schemaVersion: SCHEMA_VERSION,
  seeded: false,
};

/**
 * Opens the database, migrates it to `SCHEMA_VERSION`, and seeds the sample
 * tools when the `tools` table is empty. Idempotent — safe to call each launch.
 */
export async function initDb(): Promise<DbStatus> {
  if (status.initialized) return status;
  try {
    initDatabase(); // open connection + apply pending migrations
    seedTools();    // seed PHQ-9 + GAD-7 only on first run
    status = {
      initialized: true,
      databaseName: DATABASE_NAME,
      schemaVersion: SCHEMA_VERSION,
      seeded: true,
    };
  } catch (error) {
    status = {
      ...status,
      initialized: false,
      error: error instanceof Error ? error.message : String(error),
    };
    throw error;
  }
  return status;
}

// Core connection + migration helpers.
export {
  DATABASE_NAME,
  SCHEMA_VERSION,
  generateId,
  getDb,
  getUserVersion,
  initDatabase,
  migrateDatabase,
} from './database';

// Typed repositories.
export * from './tools';
export * from './patients';
export * from './sessions';
export * from './settings';

export default initDb;