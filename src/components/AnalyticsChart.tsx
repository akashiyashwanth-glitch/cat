import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { ToolMetric } from '../core';
import { colors, spacing, typography, fontWeight } from '../theme';

interface AnalyticsChartProps {
  /** Per-tool metrics — `normalized` drives the current bar, `baselineNormalized`
   *  the (optional) baseline bar. */
  metrics: readonly ToolMetric[];
  /** On-screen chart height; kept small so the section stays compact. */
  height?: number;
}

// Compact SVG geometry mirroring the print chart (reportTemplate.ts) so the
// on-screen and printed representations match.
const VIEW_W = 340;
const VIEW_H = 174;
const PLOT_LEFT = 38;
const PLOT_RIGHT = VIEW_W - 8;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 140;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const TICKS = [0, 25, 50, 75, 100];
const COLOR_BASELINE = '#B9C4CE';
const COLOR_CURRENT = '#0F6E8C';
const TICK_COLOR = '#9AA7B2';
const AXIS_COLOR = '#16232E';
const GRID_COLOR = '#DDE4EA';

/** Shortens over-long labels used under the bars (mirrors the PDF chart). */
export function truncateShort(shortName: string, max = 10): string {
  return shortName.length > max ? `${shortName.slice(0, max - 1)}…` : shortName;
}

/**
 * Compact react-native-svg bar chart of normalized severity — current only,
 * or baseline-vs-current when any metric carries a `baselineNormalized`.
 *
 * Scales to its container via `viewBox` + width="100%", so the same geometry
 * stays crisp across phone widths without breaking layout height.
 */
export function AnalyticsChart({ metrics, height = 150 }: AnalyticsChartProps) {
  if (metrics.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tool results to chart.</Text>
      </View>
    );
  }

  const hasBaseline = metrics.some((m) => m.baselineNormalized !== undefined);
  const groupWidth = (PLOT_RIGHT - PLOT_LEFT) / metrics.length;
  const columns = hasBaseline ? 2 : 1;
  const barGap = 5;
  const barWidth = Math.min(24, (groupWidth - barGap - 6) / columns);

  const yFor = (value: number) => PLOT_BOTTOM - (value / 100) * PLOT_HEIGHT;

  const renderBar = (value: number, x: number, fill: string, isCurrent: boolean) => {
    const heightPx = value > 0 ? Math.max((value / 100) * PLOT_HEIGHT, 1) : 0;
    const y = yFor(value);
    const vLabel =
      heightPx >= 13 ? (
        <SvgText
          x={x + barWidth / 2}
          y={y - 3}
          textAnchor="middle"
          fontSize={8}
          fill={isCurrent ? colors.primaryDark : TICK_COLOR}
        >
          {Math.round(value)}
        </SvgText>
      ) : null;
    return (
      <>
        <Rect
          x={x}
          y={y}
          width={barWidth}
          height={heightPx}
          fill={fill}
          rx={1.5}
        />
        {vLabel}
      </>
    );
  };

  const groups = metrics.map((metric, index) => {
    const areaLeft = PLOT_LEFT + index * groupWidth + 3;
    const areaWidth = groupWidth - 6;
    const metricHasBaseline = metric.baselineNormalized !== undefined;
    const totalCols = columns * barWidth + barGap * (columns - 1);
    const startX = areaLeft + (areaWidth - totalCols) / 2;
    const labelX = areaLeft + areaWidth / 2;
    const centerOffset = metricHasBaseline ? 0 : (barWidth + barGap) / 2;

    let x = startX + centerOffset;
    const bars = [];
    if (metricHasBaseline) {
      bars.push(renderBar(metric.baselineNormalized ?? 0, x, COLOR_BASELINE, false));
      x += barWidth + barGap;
    }
    bars.push(renderBar(metric.normalized, x, COLOR_CURRENT, true));

    return (
      <React.Fragment key={metric.toolId}>
        {bars}
        <SvgText
          x={labelX}
          y={PLOT_BOTTOM + 15}
          textAnchor="middle"
          fontSize={9}
          fontWeight="600"
          fill={AXIS_COLOR}
        >
          {truncateShort(metric.shortName)}
        </SvgText>
      </React.Fragment>
    );
  });

  const grid = TICKS.map((tick) => {
    const y = yFor(tick);
    return (
      <React.Fragment key={tick}>
        <Line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={y}
          y2={y}
          stroke={GRID_COLOR}
          strokeDasharray="2 3"
          strokeWidth={1}
        />
        <SvgText x={4} y={y + 3} fontSize={8} fill={TICK_COLOR}>
          {tick}
        </SvgText>
      </React.Fragment>
    );
  });

  return (
    <Svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={height}
      accessibilityRole="image"
      accessibilityLabel="Tool severity bar chart, baseline vs current"
    >
      {grid}
      <Line
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={PLOT_BOTTOM}
        y2={PLOT_BOTTOM}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />
      {groups}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: typography.bodySm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

export default AnalyticsChart;