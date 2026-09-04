import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RiskLevel } from '../core';
import { radii, spacing, typography, fontWeight } from '../theme';

interface RiskBadgeProps {
  /** Risk band to render — supplies the label + background color. */
  level: RiskLevel;
  /** Overrides the badge text (defaults to `${level.label} risk`). */
  label?: string;
  /** Optional plain suffix appended after the label, e.g. ' · 34%'. */
  hint?: string;
}

/**
 * Compact colored risk pill used across on-screen analytics (mirrors the PDF's
 * `risk-badge`). Colored entirely by `level.color` so the same band carries the
 * same meaning in both the native UI and the generated report.
 */
export function RiskBadge({ level, label, hint }: RiskBadgeProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: level.color }]}>
        <Text style={styles.pillText}>{label ?? `${level.label} risk`}</Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pillText: { color: '#FFFFFF', fontSize: typography.bodySm, fontWeight: fontWeight.bold },
  hint: { fontSize: typography.bodySm, color: '#5F7080', fontWeight: fontWeight.medium },
});

export default RiskBadge;
