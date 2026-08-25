import { create } from 'zustand';

/**
 * Global app shell store placeholder.
 *
 * Feature slices (tools, session, settings, etc.) and persistence are
 * implemented starting in Phase 1. This keeps a created-by-zustand store
 * wired in so the dependency is exercised from the shell.
 */

interface AppShellState {
  /** Whether the app finished its boot sequence (DB init, settings load). */
  ready: boolean;
  markReady: () => void;
}

export const useAppStore = create<AppShellState>((set) => ({
  ready: false,
  markReady: () => set({ ready: true }),
}));

export default useAppStore;