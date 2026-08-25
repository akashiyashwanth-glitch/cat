import type { Answer, Session, ToolResult } from '../types';
import { generateId, getDb } from './database';

/** Session repository — CRUD over the `sessions` + `session_tools` tables. */

interface SessionRow {
  id: string;
  patient_id: string;
  created_at: number;
  completed_at: string | null;
}

interface SessionToolRow {
  tool_id: string;
  ord: number;
  answers_json: string;
  score: number;
}

/** Creates a new, empty session for a patient and persists it immediately. */
export function createSession(patientId: string): Session {
  const id = generateId('sess');
  const createdAt = Date.now();
  getDb().runSync('INSERT INTO sessions (id, patient_id, created_at) VALUES (?, ?, ?)', [
    id,
    patientId,
    createdAt,
  ]);
  return { id, patientId, toolResults: [], createdAt };
}

/**
 * Upserts one tool's result into `session_tools`. Existing results for the
 * same tool are replaced; `order` controls display ordering within the form.
 */
export function saveToolResult(sessionId: string, result: ToolResult, order = 0): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO session_tools
       (session_id, tool_id, ord, answers_json, score, raw_score)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      result.toolId,
      order,
      JSON.stringify(result.answers),
      result.score,
      result.score, // raw_score reserved for store-grade analytics (Phase 2)
    ],
  );
}

/** Rebuilds a `ToolResult` from a `session_tools` row. */
function rowToToolResult(row: SessionToolRow): ToolResult {
  let answers: Answer[] = [];
  try {
    const parsed = JSON.parse(row.answers_json) as Answer[];
    answers = Array.isArray(parsed) ? parsed : [];
  } catch {
    answers = [];
  }
  return { toolId: row.tool_id, answers, score: row.score ?? 0 };
}

function rowToSession(row: SessionRow, toolResults: ToolResult[]): Session {
  return {
    id: row.id,
    patientId: row.patient_id,
    toolResults,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

/** Loads a session with all of its tool results, or null. */
export function getSession(id: string): Session | null {
  const row = getDb().getFirstSync<SessionRow>(
    'SELECT id, patient_id, created_at, completed_at FROM sessions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  const tools = getDb().getAllSync<SessionToolRow>(
    'SELECT tool_id, ord, answers_json, score FROM session_tools WHERE session_id = ? ORDER BY ord ASC',
    [id],
  );
  return rowToSession(row, tools.map(rowToToolResult));
}

/** Lists sessions, optionally filtered to a patient, newest first. */
export function listSessions(patientId?: string): Session[] {
  const where = patientId ? 'WHERE patient_id = ?' : '';
  const params = patientId ? [patientId] : [];
  const rows = getDb().getAllSync<SessionRow>(
    `SELECT id, patient_id, created_at, completed_at FROM sessions ${where} ORDER BY created_at DESC`,
    params,
  );
  // Load tool results for each session (fits the offline-first flow; N small).
  return rows.map((row) => {
    const session = getSession(row.id);
    return session ?? rowToSession(row, []);
  });
}

/** Marks a session complete by stamping an ISO `completedAt`. */
export function finalizeSession(id: string, completedAt?: string): void {
  const stamp = completedAt ?? new Date().toISOString();
  getDb().runSync('UPDATE sessions SET completed_at = ? WHERE id = ?', [stamp, id]);
}

/** Deletes a session and its tool results (FK cascade). */
export function deleteSession(id: string): void {
  getDb().runSync('DELETE FROM sessions WHERE id = ?', [id]);
}

export default getSession;