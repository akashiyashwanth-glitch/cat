import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AsyncStorage as AsyncStorageShim } from 'expo-sqlite/kv-store';
import type { Answer, Patient, Session, ToolResult } from '../types';
import {
  createSession as dbCreateSession,
  finalizeSession as dbFinalizeSession,
  saveToolResult as dbSaveToolResult,
} from '../db/sessions';
import { scoreToolResult } from '../core';
import { useToolsStore } from './toolsStore';

/**
 * Session store — the working surface of the assessment flow.
 *
 * Holds the current patient, the active session and its answers (inside
 * `activeSession.toolResults`). Mutations write through to SQLite so the DB
 * remains the source of truth; the slice is also zustand-persisted (via
 * `expo-sqlite/kv-store`) so an interrupted assessment can be resumed after a
 * relaunch.
 */

interface SessionState {
  /** Patient currently being assessed (null before intake). */
  patient: Patient | null;
  /** The in-progress session; `toolResults` carry the answers. */
  activeSession: Session | null;

  /** Sets the current patient (no side effects). */
  setPatient: (patient: Patient | null) => void;
  /** Directly swaps the active session (e.g. when reopening one from history). */
  setActiveSession: (session: Session | null) => void;
  /** Persists a new session row and makes it active. */
  startSession: (patient: Patient) => Session;
  /** Adds/replaces one tool's answers, scores them, and writes to `session_tools`. */
  addToolResult: (toolId: string, answers: Answer[]) => void;
  /** Marks the active session complete in the DB and in state. */
  finalizeSession: () => void;
  /** Clears the in-memory patient + session (history rows are kept). */
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      patient: null,
      activeSession: null,

      setPatient: (patient) => set({ patient }),

      setActiveSession: (activeSession) => set({ activeSession }),

      startSession: (patient) => {
        const activeSession = dbCreateSession(patient.id);
        set({ patient, activeSession });
        return activeSession;
      },

      addToolResult: (toolId, answers) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const tool = useToolsStore.getState().tools.find((t) => t.id === toolId);
        const score = tool ? scoreToolResult(tool, answers) : 0;

        const toolResults = [...activeSession.toolResults];
        const existingIndex = toolResults.findIndex((t) => t.toolId === toolId);
        const order = existingIndex >= 0 ? existingIndex : toolResults.length;
        const result: ToolResult = { toolId, answers, score };

        if (existingIndex >= 0) toolResults[existingIndex] = result;
        else toolResults.push(result);

        dbSaveToolResult(activeSession.id, result, order);
        set({ activeSession: { ...activeSession, toolResults } });
      },

      finalizeSession: () => {
        const { activeSession } = get();
        if (!activeSession) return;
        const completedAt = new Date().toISOString();
        dbFinalizeSession(activeSession.id, completedAt);
        set({ activeSession: { ...activeSession, completedAt } });
      },

      clearSession: () => set({ patient: null, activeSession: null }),
    }),
    {
      name: 'cat-session',
      // expo-sqlite's kv-store ships an AsyncStorage-compatible adapter
      // (backed by SQLite) — persistence stays offline-first without the
      // async-storage package.
      storage: createJSONStorage(() => AsyncStorageShim),
      partialize: (state) => ({
        patient: state.patient,
        activeSession: state.activeSession,
      }),
    },
  ),
);

export default useSessionStore;