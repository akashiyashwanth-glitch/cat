/**
 * Data layer placeholder.
 *
 * Phase 1 introduces the expo-sqlite connection, schema & migrations
 * (`PRAGMA user_version`) and typed repositories. This module exists now so
 * the folder structure is wired and can be imported cleanly.
 */

export interface DbStatus {
  initialized: boolean;
}

export const dbStatus: DbStatus = { initialized: false };

export async function initDatabase(): Promise<DbStatus> {
  // Implemented in Phase 1 (open expo-sqlite, run migrations, seed tools).
  dbStatus.initialized = true;
  return dbStatus;
}

export default initDatabase;