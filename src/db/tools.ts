import type { Option, QuestionDef, ToolDef } from '../types';
import { getDb } from './database';

/**
 * Tool repository + first-launch seeding.
 *
 * Tool schemas are stored as `config_json` in the `tools` table. Seeding runs
 * only when the table is empty (`count(*)` guard) so it happens exactly once
 * on first launch.
 */

/** Shared 0–3 frequency scale used by PHQ-9 and GAD-7 core items. */
const FREQ_OPTIONS: Option[] = [
  { value: 'not-at-all', label: 'Not at all', score: 0 },
  { value: 'several-days', label: 'Several days', score: 1 },
  { value: 'more-than-half', label: 'More than half the days', score: 2 },
  { value: 'nearly-every-day', label: 'Nearly every day', score: 3 },
];

/** 0–3 difficulty scale (used by the PHQ-9 final item). */
const DIFFICULTY_OPTIONS: Option[] = [
  { value: 'not-difficult', label: 'Not difficult at all', score: 0 },
  { value: 'somewhat', label: 'Somewhat difficult', score: 1 },
  { value: 'very', label: 'Very difficult', score: 2 },
  { value: 'extremely', label: 'Extremely difficult', score: 3 },
];

/** Builds a scored 0–3 single-select question. */
function freqItem(id: string, prompt: string): QuestionDef {
  return { id, prompt, type: 'single-select', options: FREQ_OPTIONS, required: true };
}

/** Patient Health Questionnaire — 9 (depression screen). */
function buildPhq9(): ToolDef {
  const questions: QuestionDef[] = [
    freqItem('phq_1', 'Little interest or pleasure in doing things.'),
    freqItem('phq_2', 'Feeling down, depressed, or hopeless.'),
    freqItem('phq_3', 'Trouble falling or staying asleep, or sleeping too much.'),
    freqItem('phq_4', 'Feeling tired or having little energy.'),
    freqItem('phq_5', 'Poor appetite or overeating.'),
    freqItem('phq_6', 'Feeling bad about yourself — or that you are a failure, or let yourself or your family down.'),
    freqItem('phq_7', 'Trouble concentrating on things, such as reading the newspaper or watching television.'),
    freqItem('phq_8', 'Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless.'),
    freqItem('phq_9', 'Thoughts that you would be better off dead, or of hurting yourself in some way.'),
    {
      id: 'phq_10',
      prompt: 'On how many of the past 14 days did these difficulties make it hard to do work, take care of things, or get along with people?',
      type: 'numeric',
      min: 0,
      max: 14,
      required: false,
    },
    {
      id: 'phq_11',
      prompt: 'How difficult have these problems made it to do your work, take care of things, or get along with other people?',
      type: 'rating',
      options: DIFFICULTY_OPTIONS,
      required: false,
    },
    {
      id: 'phq_12',
      prompt: 'Which of the following have you also experienced over the past two weeks? (select all that apply)',
      type: 'multiselect',
      required: false,
      options: [
        { label: 'Sleep disturbances', value: 'sleep', score: 0 },
        { label: 'Changes in appetite', value: 'appetite', score: 0 },
        { label: 'Fatigue / low energy', value: 'fatigue', score: 0 },
        { label: 'Difficulty concentrating', value: 'concentration', score: 0 },
      ],
    },
    {
      id: 'phq_13',
      prompt: 'Is there anything else you would like the clinician to know?',
      type: 'text',
      required: false,
    },
  ];

  return {
    id: 'phq9',
    name: 'Patient Health Questionnaire-9',
    shortName: 'PHQ-9',
    description: 'Nine-item screen for depression severity (score 0–27).',
    questions,
    maxScore: 27,
  };
}
/** Generalized Anxiety Disorder — 7 (anxiety screen). */
function buildGad7(): ToolDef {
  const questions: QuestionDef[] = [
    freqItem('gad_1', 'Feeling nervous, anxious, or on edge.'),
    freqItem('gad_2', 'Not being able to stop or control worrying.'),
    freqItem('gad_3', 'Worrying too much about different things.'),
    freqItem('gad_4', 'Trouble relaxing.'),
    freqItem('gad_5', 'Being so restless that it is hard to sit still.'),
    freqItem('gad_6', 'Becoming easily annoyed or irritable.'),
    freqItem('gad_7', 'Feeling afraid, as if something awful might happen.'),
    {
      id: 'gad_8',
      prompt: 'On a scale of 0–10, rate your current overall level of anxiety.',
      type: 'rating',
      min: 0,
      max: 10,
      required: false,
    },
    {
      id: 'gad_9',
      prompt: 'Approximately how many days in the past week did you feel anxious for most of the day?',
      type: 'numeric',
      min: 0,
      max: 7,
      required: false,
    },
    {
      id: 'gad_10',
      prompt: 'Which physical symptoms have accompanied your anxiety over the past two weeks? (select all that apply)',
      type: 'multiselect',
      required: false,
      options: [
        { label: 'Racing heart / palpitations', value: 'palpitations', score: 0 },
        { label: 'Trembling or shaking', value: 'trembling', score: 0 },
        { label: 'Sweating', value: 'sweating', score: 0 },
        { label: 'Shortness of breath', value: 'shortness', score: 0 },
        { label: 'Dizziness', value: 'dizziness', score: 0 },
        { label: 'Nausea / stomach upset', value: 'nausea', score: 0 },
      ],
    },
    {
      id: 'gad_11',
      prompt: 'Any additional notes about your anxiety?',
      type: 'text',
      required: false,
    },
  ];

  return {
    id: 'gad7',
    name: 'Generalized Anxiety Disorder-7',
    shortName: 'GAD-7',
    description: 'Seven-item generalized anxiety screen (score 0–21).',
    questions,
    maxScore: 21,
  };
}

/** The sample tools seeded on first launch. */
export const SEED_TOOLS: ToolDef[] = [buildPhq9(), buildGad7()];

interface ToolRow {
  id: string;
  name: string;
  config_json: string;
}

interface ToolConfig {
  shortName?: string;
  description?: string;
  questions: QuestionDef[];
  maxScore: number;
}

/** Converts a DB row + parsed `config_json` back into a `ToolDef`. */
function rowToTool(row: ToolRow): ToolDef {
  const config: ToolConfig = JSON.parse(row.config_json) as ToolConfig;
  return {
    id: row.id,
    name: row.name,
    shortName: config.shortName ?? row.name,
    description: config.description,
    questions: config.questions ?? [],
    maxScore: config.maxScore ?? 0,
  };
}

/** Inserts or replaces a single tool definition. */
export function insertTool(tool: ToolDef): void {
  const configJson = JSON.stringify({
    shortName: tool.shortName,
    description: tool.description,
    questions: tool.questions,
    maxScore: tool.maxScore,
  });
  getDb().runSync('INSERT OR REPLACE INTO tools (id, name, config_json) VALUES (?, ?, ?)', [
    tool.id,
    tool.name,
    configJson,
  ]);
}

/** Loads one tool by id, or null. */
export function getTool(id: string): ToolDef | null {
  const row = getDb().getFirstSync<ToolRow>('SELECT id, name, config_json FROM tools WHERE id = ?', [id]);
  return row ? rowToTool(row) : null;
}

/** Loads all tools, ordered alphabetically by name. */
export function getTools(): ToolDef[] {
  const rows = getDb().getAllSync<ToolRow>(
    'SELECT id, name, config_json FROM tools ORDER BY name ASC',
  );
  return rows.map(rowToTool);
}

/**
 * Seeds the sample tools on first launch. Safe to call every time — it
 * short-circuits as soon as the table contains any rows.
 */
export function seedTools(): void {
  const count = getDb().getFirstSync<{ c: number }>('SELECT count(*) AS c FROM tools');
  if ((count?.c ?? 0) > 0) return;
  for (const tool of SEED_TOOLS) insertTool(tool);
}

export default getTools;