/**
 * Design tokens for the Clinical Assessment Tracker.
 *
 * A clean clinical palette with a single primary accent, a spacing scale,
 * radii, a typography scale, and large touch-target sizing (>= 48px).
 */

export const colors = {
  // Primary accent (clinical teal-blue)
  primary: '#0F6E8C',
  primaryDark: '#0B556D',
  primaryLight: '#D6EAF2',
  onPrimary: '#FFFFFF',

  // Neutrals / surfaces
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F5',

  // Text
  text: '#16232E',
  textMuted: '#5F7080',
  textOnSurface: '#16232E',

  // Lines
  border: '#DDE4EA',

  // Semantic
  danger: '#C13A3A',
  dangerLight: '#F9E3E3',
  success: '#2E8B57',
  successLight: '#E2F4EA',
  warning: '#D99A2B',
  warningLight: '#FBF1DC',
  info: '#0F6E8C',
} as const;

export type ColorName = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: 32,
  headline: 24,
  title: 18,
  body: 16,
  bodySm: 14,
  caption: 12,
  overline: 11,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum recommended touch target (>= 48px) per WCAG / platform guidance. */
export const touch = {
  /** Preferred large touch target size. */
  target: 48,
  /** Absolute minimum acceptable touch target. */
  targetMin: 44,
  /** Vertical padding commonly added to controls to reach target. */
  controlHeight: 48,
} as const;

export const layout = {
  screenPadding: spacing.base, // 16
  contentMaxWidth: 640,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography: { ...typography },
  fontWeight,
  touch: touch,
  layout,
} as const;

export default theme;