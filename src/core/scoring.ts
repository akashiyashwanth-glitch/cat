import type { Answer, AnswerValue, QuestionDef, ToolDef } from '../types';

/**
 * Core scoring helper.
 *
 * Computes a tool's result score from its question schema (`ToolDef`) and the
 * supplied answers. Scored inputs:
 * - `single-select` / option-backed `rating`: the selected option's `score`;
 * - `multiselect`: the summed `score` of every selected option.
 *
 * `numeric`, text-style `rating` and `text` answers are intentionally not
 * counted (they have no option `score`), matching how replies are written.
 */
export function scoreToolResult(tool: ToolDef, answers: readonly Answer[]): number {
  const byQuestion = new Map<string, Answer>();
  for (const answer of answers) byQuestion.set(answer.questionId, answer);

  let total = 0;
  for (const question of tool.questions) {
    const answer = byQuestion.get(question.id);
    if (!answer) continue;
    total += scoreQuestion(question, answer.value);
  }
  return total;
}

function scoreQuestion(question: QuestionDef, value: AnswerValue): number {
  if (
    (question.type === 'single-select' || question.type === 'rating') &&
    typeof value === 'string'
  ) {
    return question.options?.find((option) => option.value === value)?.score ?? 0;
  }
  if (question.type === 'multiselect' && Array.isArray(value)) {
    let sum = 0;
    for (const selected of value) {
      sum += question.options?.find((option) => option.value === selected)?.score ?? 0;
    }
    return sum;
  }
  return 0; // numeric / text / unanswered
}

/** Clamps a finite number into the inclusive `[min, max]` range (non-finite → `min`). */
export function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes a raw tool score into a 0–100 percentage of its `maxScore`.
 *
 * Returns 0 whenever the max is missing / non-positive so report formulas never
 * divide by zero, and clamps the result so a raw score that accidentally exceeds
 * the declared ceiling still produces a max of 100%.
 */
export function normalizeScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  return clamp(score / maxScore, 0, 100) * 100;
}

/**
 * Sum of the largest achievable per-question scores for the input types that
 * `scoreToolResult` actually counts (option-backed single-select/rating and
 * multiselect). Used as a fallback when a tool omits `maxScore`.
 */
export function maxScorable(tool: ToolDef): number {
  return tool.questions.reduce((sum, question) => {
    if (question.type === 'single-select' || question.type === 'rating') {
      const options = question.options ?? [];
      return sum + (options.length > 0 ? Math.max(...options.map((o) => o.score)) : 0);
    }
    if (question.type === 'multiselect') {
      const options = question.options ?? [];
      return sum + options.reduce((s, o) => s + Math.max(o.score, 0), 0);
    }
    return sum;
  }, 0);
}

/**
 * Whether every required question in a tool has a non-blank answer.
 * Used when deciding whether a session can be submitted.
 */
export function hasCompleteAnswers(tool: ToolDef, answers: readonly Answer[]): boolean {
  const byQuestion = new Map<string, Answer>();
  for (const answer of answers) byQuestion.set(answer.questionId, answer);

  for (const question of tool.questions) {
    if (!question.required) continue;
    const answer = byQuestion.get(question.id);
    const blank =
      !answer ||
      answer.value === null ||
      answer.value === '' ||
      (Array.isArray(answer.value) && answer.value.length === 0);
    if (blank) return false;
  }
  return true;
}

export default scoreToolResult;
