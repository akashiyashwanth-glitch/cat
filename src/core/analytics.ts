import type { Answer, ComparativeResult, Session, ToolDef } from '../types';
import { clamp, maxScorable, normalizeScore } from './scoring';

/**
 * Analytics layer for report generation.
 *
 * Normalizes raw scores to a 0–100 scale, classifies risk through configurable
 * threshold rules, aggregates per-tool metrics into a summary (`totalScore`,
 * `average`, `highestRisk`, min/max across tools), and builds the baseline-vs-
 * current deltas used by the comparative report and its bar chart.
 */

export type Trend = 'up' | 'down' | 'flat';

/** A configurable risk band keyed off the normalized (0–100) score. */
export interface RiskLevel {
  /** Stable identifier, e.g. `'severe'`. */
  id: string;
  /** Human label shown in the report/UI, e.g. `'Severe'`. */
  label: string;
  /** Inclusive lower bound of the band on a normalized 0–100 scale. */
  from: number;
  /** Hex color used by the PDF risk badge. */
  color: string;
  /** Severity ordering — larger rank is higher risk. */
  rank: number;
}

/** Default risk bands (normalized percentages). Pass your own to customize. */
export const DEFAULT_RISK_LEVELS: readonly RiskLevel[] = [
  { id: 'minimal', label: 'Minimal', from: 0, color: '#2E8B57', rank: 0 },
  { id: 'mild', label: 'Mild', from: 25, color: '#D99A2B', rank: 1 },
  { id: 'moderate', label: 'Moderate', from: 50, color: '#D97B2B', rank: 2 },
  { id: 'severe', label: 'Severe', from: 75, color: '#C13A3A', rank: 3 },
];

/** Classifies a normalized 0–100 value into the highest band it surpasses. */
export function getRiskLevel(
  normalizedPct: number,
  levels: readonly RiskLevel[] = DEFAULT_RISK_LEVELS,
): RiskLevel {
  const value = clamp(normalizedPct, 0, 100);
  let best = levels[0];
  for (const level of levels) {
    if (value >= level.from) best = level;
  }
  return best ?? levels[0];
}

/** A process-friendly trend label for a raw (current − baseline) delta. */
export function trendForDelta(delta: number | undefined): Trend | undefined {
  if (delta === undefined || !Number.isFinite(delta)) return undefined;
  if (delta > 0.5) return 'up';
  if (delta < -0.5) return 'down';
  return 'flat';
}

/** One scored tool inside a session, with optional baseline comparison. */
export interface ToolMetric {
  toolId: string;
  name: string;
  shortName: string;
  description?: string;
  score: number;
  maxScore: number;
  /** Raw score normalized to 0–100. */
  normalized: number;
  /** Risk band for `normalized`. */
  riskLevel: RiskLevel;
  /** Number of answered questions. */
  answered: number;
  /** Total questions defined by the tool. */
  total: number;
  /** Completion ratio (0–1), 0 when the tool has no questions. */
  completion: number;

  // Baseline comparison (undefined when no baseline was supplied).
  baselineScore?: number;
  /** `baselineScore` normalized to the same 0–100 scale as `normalized`. */
  baselineNormalized?: number;
  /** Risk band for `baselineNormalized`. */
  baselineRiskLevel?: RiskLevel;
  /** current − baseline (raw points). */
  delta?: number;
  /** `delta / baseline * 100` — undefined when baseline is 0. */
  pctChange?: number;
  trend?: Trend;
}

/** Aggregated view of one session ready for the report template. */
export interface SessionAnalysis {
  session: Session;
  tools: ToolMetric[];
  /** Sum of raw tool scores. */
  totalScore: number;
  /** Sum of every tool's maxScore. */
  totalMaxScore: number;
  /** Number of tools with results, 0 for an empty session. */
  toolCount: number;
  /** Average of per-tool normalized percentages (0–100), 0 for no tools. */
  average: number;
  /** Highest-risk tool (by risk band, then normalized, then name). */
  highestRisk: ToolMetric | null;
  /** Lowest-risk tool. */
  lowestRisk: ToolMetric | null;
  /** Smallest normalized score across tools (null when none). */
  minNormalized: number | null;
  /** Largest normalized score across tools (null when none). */
  maxNormalized: number | null;
  minTool: ToolMetric | null;
  maxTool: ToolMetric | null;
  /** Overall session risk — the risk of the highest-risk tool. */
  overallRisk: RiskLevel;
}

/** True when `value` is a blank answer (mirrors `hasCompleteAnswers`). */
export function isBlankAnswer(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Counts questions answered with a non-blank value. */
export function countAnswered(answers: readonly Answer[], tool: ToolDef): number {
  const byQuestion = new Map<string, Answer>();
  for (const answer of answers) byQuestion.set(answer.questionId, answer);
  return tool.questions.reduce((count, question) => {
    const answer = byQuestion.get(question.id);
    return isBlankAnswer(answer?.value) ? count : count + 1;
  }, 0);
}

/**
 * Analyzes a session: scores are already stamped on `ToolResult`s, so this
 * normalizes them, computes risk/completion per tool, compares against an
 * optional baseline session and aggregates the summary stats.
 */
export function analyzeSession(
  session: Session,
  tools: readonly ToolDef[],
  baseline?: Session | null,
): SessionAnalysis {
  const metrics: ToolMetric[] = [];
  let totalScore = 0;
  let totalMaxScore = 0;

  for (const result of session.toolResults) {
    const tool = tools.find((t) => t.id === result.toolId);
    if (!tool) continue;

    const answered = countAnswered(result.answers, tool);
    const total = tool.questions.length;
    const maxScore = tool.maxScore > 0 ? tool.maxScore : maxScorable(tool);
    const normalized = normalizeScore(result.score, maxScore);

    const baselineResult = baseline?.toolResults.find((b) => b.toolId === result.toolId);
    let baselineScore: number | undefined;
    let baselineNormalized: number | undefined;
    let baselineRiskLevel: RiskLevel | undefined;
    let delta: number | undefined;
    let pctChange: number | undefined;
    if (baselineResult) {
      baselineScore = baselineResult.score;
      baselineNormalized = normalizeScore(baselineScore, maxScore);
      baselineRiskLevel = getRiskLevel(baselineNormalized);
      delta = result.score - baselineScore;
      if (baselineScore !== 0) pctChange = (delta / baselineScore) * 100;
    }

    const metric: ToolMetric = {
      toolId: tool.id,
      name: tool.name,
      shortName: tool.shortName,
      description: tool.description,
      score: result.score,
      maxScore,
      normalized,
      riskLevel: getRiskLevel(normalized),
      answered,
      total,
      completion: total > 0 ? answered / total : 0,
      baselineScore,
      baselineNormalized,
      baselineRiskLevel,
      delta,
      pctChange,
      trend: trendForDelta(delta),
    };
    metrics.push(metric);
    totalScore += result.score;
    totalMaxScore += maxScore;
  }

  // Ordering helpers shared by highest/lowest and min/max picks.
  const byRisk = [...metrics].sort(
    (a, b) =>
      b.riskLevel.rank - a.riskLevel.rank ||
      b.normalized - a.normalized ||
      a.name.localeCompare(b.name),
  );
  const byNormalized = [...metrics].sort(
    (a, b) => a.normalized - b.normalized || a.name.localeCompare(b.name),
  );

  const highestRisk = byRisk[0] ?? null;
  const lowestRisk = byRisk[byRisk.length - 1] ?? null;
  const minTool = byNormalized[0] ?? null;
  const maxTool = byNormalized[byNormalized.length - 1] ?? null;
  const average =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.normalized, 0) / metrics.length
      : 0;

  return {
    session,
    tools: metrics,
    totalScore,
    totalMaxScore,
    toolCount: metrics.length,
    average,
    highestRisk,
    lowestRisk,
    minNormalized: minTool?.normalized ?? null,
    maxNormalized: maxTool?.normalized ?? null,
    minTool,
    maxTool,
    overallRisk: highestRisk?.riskLevel ?? getRiskLevel(average),
  };
}

/** Min/max normalized score across tools (null-safe for empty sessions). */
export function minMaxAcrossTools(
  tools: readonly ToolMetric[],
): { min: ToolMetric | null; max: ToolMetric | null } {
  if (tools.length === 0) return { min: null, max: null };
  const sorted = [...tools].sort(
    (a, b) => a.normalized - b.normalized || a.name.localeCompare(b.name),
  );
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

/** Full comparative picture: two analyses plus per-tool deltas + insight. */
export interface ComparativeReport {
  current: SessionAnalysis;
  baseline: SessionAnalysis;
  /** Current metrics with baseline deltas, sorted by |delta| descending. */
  perTool: ToolMetric[];
  /** Auto-generated insight sentence from the largest-delta tool. */
  insight: string;
}

/** Builds the comparative analysis current-vs-previous for the PDF template. */
export function analyzeComparison(
  current: Session,
  previous: Session,
  tools: readonly ToolDef[],
): ComparativeReport {
  const baseline = analyzeSession(previous, tools);
  const currentAnalysis = analyzeSession(current, tools, previous);

  const perTool = currentAnalysis.tools
    .filter((metric) => metric.delta !== undefined)
    .sort(
      (a, b) =>
        Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) ||
        a.name.localeCompare(b.name),
    );

  return {
    current: currentAnalysis,
    baseline,
    perTool,
    insight: buildInsight(perTool),
  };
}

/** Generates the one-line clinical takeaway from the largest-delta tool. */
export function buildInsight(perTool: readonly ToolMetric[]): string {
  const top = perTool[0];
  if (!top) {
    return 'Comparisons require tools scored in both the previous and current sessions.';
  }
  const { name, baselineScore, score, delta, pctChange } = top;
  const direction =
    (delta ?? 0) > 0 ? 'worsened' : (delta ?? 0) < 0 ? 'improved' : 'held steady';
  const points = `${baselineScore ?? 0} \u2192 ${score}`;
  const percent =
    pctChange !== undefined && Number.isFinite(pctChange)
      ? ` (${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}%)`
      : '';
  if ((delta ?? 0) === 0) {
    return `${name} held steady at ${score} points since the previous assessment.`;
  }
  return `${name} ${direction} from ${points}${percent} \u2014 the largest change across tools this visit.`;
}

/**
 * Builds the `ComparativeResult` object consumed by the scanner/compare flow
 * (Phase 8): a plain, transportable per-tool comparison of raw scores with none
 * of the fuller `ComparativeReport` analytics attached. Reuses the underlying
 * baseline session so callers still have the source `Session`s to compare.
 */
export function buildComparativeResult(
  current: Session,
  previous: Session,
  tools: readonly ToolDef[],
): ComparativeResult {
  const baseline = analyzeSession(previous, tools);
  const currentAnalysis = analyzeSession(current, tools, previous);

  const perTool = currentAnalysis.tools
    .map((metric) => {
      const baselineMetric = baseline.tools.find((b) => b.toolId === metric.toolId);
      const baselineScore = baselineMetric?.score ?? 0;
      const currentScore = metric.score;
      return {
        toolId: metric.toolId,
        toolName: metric.shortName,
        baselineScore,
        currentScore,
        delta: currentScore - baselineScore,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.delta) - Math.abs(a.delta) ||
        a.toolName.localeCompare(b.toolName),
    );

  return {
    patientId: current.patientId,
    baseline: previous,
    current,
    perTool,
    generatedAt: Date.now(),
  };
}

export default analyzeSession;