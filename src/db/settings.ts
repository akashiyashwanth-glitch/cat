import type { Settings } from '../types';
import { getDb } from './database';

/** Settings repository — key/value rows in the `settings` table. */

/** Row key under which the whole Settings object is stored as JSON. */
export const SETTINGS_KEY = 'app_settings';

/** Fallbacks used when no settings row exists yet. */
export const DEFAULT_SETTINGS: Settings = { defaultEmails: [] };

/** Reads the settings object, falling back to defaults if absent/corrupt. */
export function getSettings(): Settings {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [SETTINGS_KEY],
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(row.value) as Settings;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Persists the complete settings object (INSERT OR REPLACE). */
export function saveSettings(settings: Settings): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(settings),
  ]);
}

/** Loads current settings, applies a partial patch and persists it. */
export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  saveSettings(next);
  return next;
}

export default getSettings;