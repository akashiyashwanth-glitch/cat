import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AsyncStorage as AsyncStorageShim } from 'expo-sqlite/kv-store';
import type { Settings } from '../types';
import { getSettings, saveSettings } from '../db/settings';

/**
 * Settings store — practitioner preferences / default report recipients.
 *
 * Hydrated from the `settings` table (`loadSettings()`), written through on
 * change, and zustand-persisted so the values are available immediately on
 * relaunch while the DB stays the single source of truth.
 */

const FALLBACK_SETTINGS: Settings = { defaultEmails: [] };

interface SettingsState {
  settings: Settings;
  /** Reads settings from the DB and hydrates the slice. */
  loadSettings: () => Settings;
  /** Replaces the whole settings object and persists it. */
  setSettings: (settings: Settings) => void;
  /** Applies a partial patch (e.g. `{ defaultEmails })` and persists it. */
  updateSettings: (patch: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...FALLBACK_SETTINGS },

      loadSettings: () => {
        const loaded = getSettings();
        set({ settings: loaded });
        return loaded;
      },

      setSettings: (settings) => {
        saveSettings(settings);
        set({ settings });
      },

      updateSettings: (patch) => {
        const next = { ...get().settings, ...patch };
        saveSettings(next);
        set({ settings: next });
      },
    }),
    {
      name: 'cat-settings',
      storage: createJSONStorage(() => AsyncStorageShim),
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

export default useSettingsStore;