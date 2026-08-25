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
 * Placeholder domain types for the clinical assessment domain.
 * These will be fully fleshed out in Phase 1 (data layer & stores); here
 * we declare the minimal surface so the shell can reference something.
 */

export type QuestionType =
  | 'single-select'
  | 'multiselect'
  | 'rating'
  | 'numeric'
  | 'text';

export interface Option {
  key: string;
  label: string;
  value: number;
}

export interface QuestionDef {
  key: string;
  prompt: string;
  type: QuestionType;
  options?: Option[];
  unit?: string;
  min?: number;
  max?: number;
}

export interface ToolDef {
  id: string;
  title: string;
  abbreviation: string;
  description: string;
  questions: QuestionDef[];
}

export interface Patient {
  id: string;
  name: string;
  mrn?: string;
  dob?: string;
  createdAt: number;
}

export interface Settings {
  practitionerName?: string;
  defaultEmails: string[];
  notes?: string;
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