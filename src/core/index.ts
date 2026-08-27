/**
 * Core business logic.
 *
 * Phase 1 ships a lightweight scoring helper used by the session store so
 * `addToolResult` can stamp a `score` when answers are written.
 *
 * The full Assessment Engine / Analytics (percentiles, comparative deltas)
 * arrives in Phase 2.
 */

export { scoreToolResult, hasCompleteAnswers } from './scoring';
export { default } from './scoring';