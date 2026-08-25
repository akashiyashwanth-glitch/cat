import type {
  NavigatorScreenParams,
} from '@react-navigation/native';

/**
 * Route parameter lists shared across the navigation tree.
 * Keeping these in one place lets screens, navigators and typed hooks
 * reference the exact same shape.
 */

/** Bottom tab wrapper: Home | History | Profile. */
export type TabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

/** Root native stack: the tab wrapper + all feature screens. */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Splash: undefined;
  PatientEntry: undefined;
  AssessmentForm: undefined;
  ReviewSubmit: undefined;
  ReportPreview: undefined;
  Scanner: undefined;
  Comparative: undefined;
};

/**
 * Shared types for the Clinical Assessment Tracker.
 *
 * These mirror `GUIDE.md` §4 (data model / source of truth) and are mapped
 * onto the SQLite tables created in `src/db`. Every tool is described by its
 * question schema (`config_json`); a session stores `ToolResult`s that are
 * written through to `session_tools`.
 */

/** The five supported question renderings. One engine renders all tools. */
export type QuestionType =
  | 'single-select'
  | 'multiselect'
  | 'rating'
  | 'numeric'
  | 'text';

/** A single choice for single-select, multiselect and rating items. */
export interface Option {
  /** Stable identifier used as the stored answer value. */
  value: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Contribution to the overall tool score when selected. */
  score: number;
}

/** One question inside a tool's config schema. */
export interface QuestionDef {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: Option[];
  /** Inclusive lower bound for numeric/rating scales. */
  min?: number;
  /** Inclusive upper bound for numeric/rating scales. */
  max?: number;
  /** Whether the question must be answered before submit. */
  required?: boolean;
}

/** Full definition of an assessment tool (assembled from the `tools` table). */
export interface ToolDef {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  questions: QuestionDef[];
  /** Informational ceiling of the summed score (not necessarily all questions). */
  maxScore: number;
}

/** Values a patient can supply for a single question. */
export type AnswerValue = string | number | string[] | null;

/** A single question ↔ answer pair. */
export interface Answer {
  questionId: string;
  value: AnswerValue;
}

/** Persisted result of one tool within a session (`session_tools`). */
export interface ToolResult {
  toolId: string;
  answers: Answer[];
  score: number;
}

/** A completed or in-progress assessment session (`sessions`). */
export interface Session {
  id: string;
  patientId: string;
  toolResults: ToolResult[];
  /** Epoch milliseconds when the session was created. */
  createdAt: number;
  /** ISO timestamp once marked complete, or null while in progress. */
  completedAt?: string | null;
}

/** A patient record (`patients`). */
export interface Patient {
  id: string;
  name: string;
  mrn?: string;
  dob?: string;
  createdAt: number;
}

/** Practitioner preferences / default report recipients (`settings`). */
export interface Settings {
  defaultEmails: string[];
  practitionerName?: string;
  notes?: string;
}

/** Per-tool comparison used by the comparative screen (Phase 2+). */
export interface ComparativeResult {
  patientId: string;
  baseline: Session;
  current: Session;
  perTool: Array<{
    toolId: string;
    toolName: string;
    baselineScore: number;
    currentScore: number;
    delta: number;
  }>;
  generatedAt: number;
}

// Route helpers for convenience
export const TAB_ROUTES: (keyof TabParamList)[] = ['Home', 'History', 'Profile'];

export const STACK_ROUTES: (keyof RootStackParamList)[] = [
  'Tabs',
  'Splash',
  'PatientEntry',
  'AssessmentForm',
  'ReviewSubmit',
  'ReportPreview',
  'Scanner',
  'Comparative',
];