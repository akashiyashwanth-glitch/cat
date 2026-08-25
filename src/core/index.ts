/**
 * Core business logic.
 *
 * Phase 1 ships a lightweight scoring helper used by the session store so
 * `addToolResult` can stamp a `score` when answers are written. The full
 * Assessment Engine / Analytics (percentiles, comparative deltas) arrives in
 * Phase 2.
 */

import type { Answer, AnswerValue, QuestionDef, ToolDef } from '../types';

/**
 * Computes a tool score from its question schema and the supplied answers.
 *
 * Scored inputs: the selected option score for `single-select`/`rating`
 * (option-backed) questions, and the summed option scores for `multiselect`.
 * `numeric` and `text` answers are intentionally not counted.
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
  if ((question.type === 'single-select' || question.type === 'rating') && typeof value === 'string') {
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

/**
 * Whether every required question in a tool has a non-blank answer.
 * Used by later phases when enabling the submit button.
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