import { create } from 'zustand';
import type { ToolDef } from '../types';
import { getTools } from '../db/tools';

/**
 * Tools store — in-memory cache of the tool catalog.
 *
 * The database stays the source of truth; `loadTools()` hydrates this slice
 * from `src/db/tools.ts`. It is intentionally not zustand-persisted so the DB
 * remains the single system of record for tool configs.
 */

interface ToolsState {
  /** All loaded assessment tools, ordered by name. */
  tools: ToolDef[];
  /** Whether `loadTools()` has completed at least once this session. */
  loaded: boolean;
  /** Loads tools from the database (synchronous read) and returns them. */
  loadTools: () => ToolDef[];
}

export const useToolsStore = create<ToolsState>((set) => ({
  tools: [],
  loaded: false,
  loadTools: () => {
    const tools = getTools();
    set({ tools, loaded: true });
    return tools;
  },
}));

export default useToolsStore;