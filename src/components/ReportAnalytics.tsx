import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionAnalysis, ToolMetric } from '../core';
import { colors, radii, spacing, typography, fontWeight } from '../theme';
import AnalyticsChart from './AnalyticsChart';
import RiskBadge from './RiskBadge';

interface ReportAnalyticsProps {
  /** Aggregated session analytics (with optional baseline deltas attached). */
  analysis: SessionAnalysis;
  /** Optional human label for the baseline session, e.g. "Previous visit". */
  baselineLabel?: string;
}

/** Percent formatting shared by the KPI row and delta list. */
function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Compact 3-up KPI row: Total, Average severity, Highest-risk tool. */
function SummaryKpis({ analysis }: { analysis: SessionAnalysis }) {
  return (
    <View style={styles.kpiRow}>
      <View style={styles.kpi}>
        <Text style={styles.kpiValue}>
          {analysis.totalScore || analysis.totalMaxScore ? analysis.totalScore : '—'}
        </Text>
        <Text style={styles.kpiSub}>
          Total · {analysis.toolCount} {analysis.toolCount === 1 ? 'tool' : 'tools'}
        </Text>
      </View>
      <View style={styles.kpi}>
        <Text style={styles.kpiValue}>{pct(analysis.average)}</Text>
        <Text style={styles.kpiSub}>Avg severity</Text>
      </View>
      <View style={styles.kpi}>
        <Text style={styles.kpiValue} numberOfLines={1}>
          {analysis.highestRisk?.shortName ?? '—'}
        </Text>
        <Text style={styles.kpiSub}>
          {analysis.highestRisk
            ? `${analysis.highestRisk.riskLevel.label} · ${pct(analysis.highestRisk.normalized)}`
            : 'No tool results'}
        </Text>
      </View>
    </View>
  );
}

/** Per-tool delta chips shown only when a baseline analysis is available. */
function DeltaList({
  metrics,
  baselineLabel,
}: {
  metrics: readonly ToolMetric[];
  baselineLabel?: string;
}) {
  const deltas = metrics
    .filter((m) => m.delta !== undefined)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  if (deltas.length === 0) {
    return (
      <Text style={styles.emptyNote}>
        No previous session to compare against — run a second assessment to see
        baseline-vs-current deltas here and in the PDF.
      </Text>
    );
  }

  return (
    <View style={styles.deltaBlock}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#B9C4CE' }]} />
          <Text style={styles.legendText}>{baselineLabel ?? 'Baseline'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
      </View>
      <View style={styles.deltaRow}>
        <Text style={styles.deltaLabel}>Largest change</Text>
        {deltas.slice(0, 2).map((metric) => {
          const delta = metric.delta ?? 0;
          const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';
          const tone = delta > 0 ? styles.worse : delta < 0 ? styles.better : styles.flat;
          return (
            <View key={metric.toolId} style={styles.deltaPill}>
              <Text style={styles.deltaPillName} numberOfLines={1}>
                {metric.shortName}
              </Text>
              <Text style={[styles.deltaPillValue, tone]}>
                {delta > 0 ? '+' : ''}
                {delta} {arrow}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The ReportPreview "Analytics" section — the compact on-screen companion to
 * the PDF's page-1 summary. Composed of the KPI row, overall risk badge, and
 * the react-native-svg baseline-vs-current bar chart.
 */
export function ReportAnalytics({ analysis, baselineLabel }: ReportAnalyticsProps) {
  const hasBaseline = analysis.tools.some((t) => t.baselineNormalized !== undefined);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ANALYTICS</Text>
      <Text style={styles.title}>Session summary</Text>

      <View style={styles.riskLine}>
        <Text style={styles.riskCaption}>Overall severity</Text>
        <RiskBadge
          level={analysis.overallRisk}
          hint={analysis.toolCount > 0 ? pct(analysis.average) : 'No data'}
        />
      </View>

      <SummaryKpis analysis={analysis} />

      <Text style={styles.sectionTitle}>
        {hasBaseline ? 'Severity by tool — baseline vs current' : 'Severity by tool'}
      </Text>
      <AnalyticsChart metrics={analysis.tools} />

      <DeltaList metrics={analysis.tools} baselineLabel={baselineLabel} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.base,
  },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.4,
    color: colors.primary,
  },
  title: {
    fontSize: typography.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: -spacing.xs,
  },
  riskLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  riskCaption: { fontSize: typography.caption, color: colors.textMuted, fontWeight: fontWeight.medium },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
  },
  kpiValue: {
    fontSize: typography.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  kpiSub: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  legendRow: { flexDirection: 'row', gap: spacing.base },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: typography.caption, color: colors.textMuted },
  deltaBlock: { gap: spacing.sm },
  deltaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  deltaLabel: {
    fontSize: typography.caption,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    width: '100%',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: '100%',
  },
  deltaPillName: {
    fontSize: typography.caption,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  deltaPillValue: { fontSize: typography.caption, fontWeight: fontWeight.bold },
  better: { color: colors.success },
  worse: { color: colors.danger },
  flat: { color: colors.textMuted },
  emptyNote: {
    fontSize: typography.bodySm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

export default ReportAnalytics;