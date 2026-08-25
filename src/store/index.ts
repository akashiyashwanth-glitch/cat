/**
 * Store index — single export surface for all zustand slices.
 *
 * - `useToolsStore`   — tool catalog cache (hydrated from `db/tools.ts`).
 * - `useSessionStore` — current patient + active session + answers.
 * - `useSettingsStore`— practitioner preferences / defaultEmails.
 *
 * The slices live in this folder as separate modules and are re-exported here
 * so the rest of the app has one import point (`src/store`).
 */

export { useToolsStore } from './toolsStore';
import { useSessionStore } from './sessionStore';
export { useSessionStore } from './sessionStore';
export { useSettingsStore } from './settingsStore';

export default useSessionStore;