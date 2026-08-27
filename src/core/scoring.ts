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
