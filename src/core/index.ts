/**
 * Core business logic.
 *
 * - `scoring.ts`   — score computation + normalization to 0–100%.
 * - `analytics.ts` — risk threshold rules, per-tool/session aggregation,
 *   min/max across tools, and comparative (baseline-vs-current) deltas.
 */

export { scoreToolResult, hasCompleteAnswers, normalizeScore, maxScorable, clamp } from './scoring';
export {
  analyzeSession,
  analyzeComparison,
  buildComparativeResult,
  getRiskLevel,
  minMaxAcrossTools,
  trendForDelta,
  countAnswered,
  isBlankAnswer,
  DEFAULT_RISK_LEVELS,
  type RiskLevel,
  type Trend,
  type ToolMetric,
  type SessionAnalysis,
  type ComparativeReport,
} from './analytics';
export type { ComparativeResult } from '../types';
export { default } from './scoring';