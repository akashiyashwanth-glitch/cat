import type { Answer, AnswerValue, Patient, QuestionDef, ToolDef } from '../types';
import type {
  ComparativeReport,
  RiskLevel,
  SessionAnalysis,
  ToolMetric,
} from '../core/analytics';
import { sessionQrSvgMarkup } from './qr';

/**
 * Pure HTML report template builders (no expo imports).
 *
 * `expo-print` renders the produced HTML in a WebView and rasterizes it into an
 * A4 PDF, so the template is deliberately self-contained: inline CSS, inline
 * SVG (QR + bars), and escaped text — no external fonts, images or scripts.
 *
 * Layered layout:
 * - PAGE 1 (`buildHeaderPage`): header + session QR, KPI row, risk badge, bar chart.
 * - PAGE 2+ (`buildToolDetailPages` → `buildToolSection`): one page per tool with
 *   itemized question→answer rows and `page-break-before` between sections.
 * - comparative (`buildComparativeSection`): per-tool Previous|Current|Δ|%|trend
 *   table + auto insight.
 */

export interface ReportTemplateOptions {
  /** Title shown under the header brand, e.g. "Assessment Report". */
  title?: string;
  /** Practitioner/clinic line in the header (omitted when empty). */
  practitionerName?: string;
  /** Epoch ms override for the report date (defaults to the session date). */
  generatedAt?: number;
  /** Set `false` to drop the session QR. */
  includeQr?: boolean;
}

/** HTML-escapes any value so patient/answer text never breaks the template. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Locale-independent `Sep 1, 2026` style date for the report header. */
export function formatDate(epoch: number): string {
  const date = new Date(epoch);
  if (Number.isNaN(date.getTime())) return '—';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Report date backing a session: completion stamp when present, else created. */
export function sessionReportDate(
  session: { createdAt: number; completedAt?: string | null },
): number {
  if (session.completedAt) {
    const parsed = Date.parse(session.completedAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return session.createdAt;
}

/** Round-to-integer percentage for compact labels. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Shortens over-long tool names used as axis labels in the chart. */
export function truncateLabel(label: string, max = 14): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

const REPORT_CSS = `\
@page { size: A4 portrait; margin: 13mm 12mm 16mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #16232E; font-size: 12px; line-height: 1.45;
}
.page { position: relative; page-break-after: always; }
.tool-section { page-break-before: always; }
.empty { color: #5F7080; font-style: italic; }

.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;
  padding-bottom: 10px; border-bottom: 3px solid #0F6E8C; }
.header-left { flex: 1; min-width: 0; }
.header-right { flex-shrink: 0; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 1.6px; color: #0F6E8C; }
.report-title { font-size: 16px; font-weight: 800; color: #16232E; margin-top: 2px; }
.patient { font-size: 22px; font-weight: 700; color: #16232E; margin-top: 6px; }
.meta { font-size: 11px; color: #5F7080; margin-top: 2px; }
.section-title { font-size: 11px; font-weight: 700; letter-spacing: 1.4px; color: #0F6E8C;
  text-transform: uppercase; margin: 14px 0 8px; }

.kpi-row { display: flex; gap: 8px; }
.kpi { flex: 1; border: 1px solid #DDE4EA; border-radius: 12px; background: #FFFFFF; padding: 10px 12px; }
.kpi-value { font-size: 20px; font-weight: 800; color: #16232E; }
.kpi-sub { font-size: 10px; color: #5F7080; margin-top: 2px; }
.risk-line { margin-top: 10px; font-size: 12px; color: #16232E; }
.risk-badge { display: inline-block; padding: 3px 12px; border-radius: 999px; color: #FFFFFF;
  font-weight: 700; font-size: 11px; }
.chart-box { margin-top: 4px; }
.legend { display: flex; gap: 16px; font-size: 10px; color: #5F7080; margin-top: 4px; }
.legend-item { display: flex; align-items: center; gap: 5px; }
.swatch { width: 10px; height: 10px; display: inline-block; border-radius: 2px; }

.tool-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.tool-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: #0F6E8C; }
.tool-title { font-size: 18px; font-weight: 800; color: #16232E; margin-top: 2px; }
.tool-score-chip { flex-shrink: 0; background: #D6EAF2; border-radius: 12px; padding: 8px 12px;
  text-align: center; }
.tool-score-chip .num { font-size: 20px; font-weight: 800; color: #0B556D; }
.tool-score-chip .max { font-size: 10px; color: #0B556D; }
.tool-description { font-size: 11px; color: #5F7080; margin-top: 4px; }
.tool-stats { margin: 8px 0 4px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.stat-pill { background: #EEF2F5; border: 1px solid #DDE4EA; border-radius: 999px; padding: 2px 10px;
  font-size: 10px; color: #16232E; }
.qrow { border-bottom: 1px solid #EEF2F5; padding: 9px 0; }
.qhead { display: flex; align-items: center; gap: 8px; }
.qnum { background: #D6EAF2; color: #0B556D; font-size: 9px; font-weight: 800; border-radius: 999px;
  padding: 1px 8px; }
.qreq { font-size: 9px; color: #D99A2B; font-weight: 600; }
.qprompt { font-size: 12px; font-weight: 600; color: #16232E; margin-top: 4px; }
.qanswer { font-size: 12px; color: #16232E; margin-top: 2px; white-space: pre-wrap; }
.qa-empty { color: #9AA7B2; font-style: italic; }

.comparative-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
.comparative-table th, .comparative-table td { border: 1px solid #DDE4EA; padding: 6px 8px; text-align: left; }
.comparative-table th { background: #D6EAF2; color: #0B556D; font-size: 10px; }
.comparative-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.trend-better { color: #2E8B57; font-weight: 700; }
.trend-worse { color: #C13A3A; font-weight: 700; }
.trend-flat { color: #5F7080; }
.insight { border-left: 3px solid #0F6E8C; background: #F1F7FA; padding: 8px 12px; font-size: 12px;
  margin: 10px 0; }
`;

/** Wraps rendered pages in a full, well-formed HTML document. */
export function documentShell(pagesMarkup: string, title = 'Assessment Report'): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>${pagesMarkup}</body>
</html>`;
}
/** Inline risk badge chip (colored pill). */
export function buildRiskBadgeHtml(risk: RiskLevel): string {
  return `<span class="risk-badge" style="background:${risk.color}">${escapeHtml(risk.label)} risk</span>`;
}

/**
 * Summary KPI row: Total score, Average normalized severity, Highest-risk tool.
 */
export function buildSummaryKpis(analysis: SessionAnalysis): string {
  const toolWord = analysis.toolCount === 1 ? 'tool' : 'tools';
  const total = analysis.totalScore || analysis.totalMaxScore ? `${analysis.totalScore}` : '—';

  const highest = analysis.highestRisk;
  const highestValue = highest ? escapeHtml(highest.shortName) : '—';
  const highestSub = highest
    ? `${escapeHtml(highest.riskLevel.label)} · ${formatPercent(highest.normalized)}`
    : 'No tool results';

  return `<div class="kpi-row">
  <div class="kpi"><div class="kpi-value">${total}</div>
    <div class="kpi-sub">Total score across ${analysis.toolCount} ${toolWord}</div></div>
  <div class="kpi"><div class="kpi-value">${formatPercent(analysis.average)}</div>
    <div class="kpi-sub">Average severity (normalized)</div></div>
  <div class="kpi"><div class="kpi-value">${highestValue}</div>
    <div class="kpi-sub">Highest-risk tool · ${highestSub}</div></div>
</div>`;
}

/** PAGE 1 — header + QR, KPIs, risk badge and the baseline-vs-current chart. */
export function buildHeaderPage(
  analysis: SessionAnalysis,
  patient: Patient | null | undefined,
  opts: ReportTemplateOptions = {},
): string {
  const session = analysis.session;
  const patientName = patient?.name || (session.patientId ? 'Patient on file' : 'Unknown patient');
  const mrnLine = patient?.mrn ? `<div class="meta">MRN: ${escapeHtml(patient.mrn)}</div>` : '';
  const reportDate = formatDate(opts.generatedAt ?? sessionReportDate(session));
  const clinicianLine = opts.practitionerName
    ? `<div class="meta">Clinician: ${escapeHtml(opts.practitionerName)}</div>`
    : '';
  const qr =
    opts.includeQr === false
      ? ''
      : `<div class="header-right">${sessionQrSvgMarkup(session.id)}</div>`;

  const chartTitle = analysis.tools.some((t) => t.baselineScore !== undefined)
    ? 'Severity by tool — baseline vs current'
    : 'Severity by tool';

  return `<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="eyebrow">CLINICAL ASSESSMENT TRACKER</div>
      <div class="report-title">${escapeHtml(opts.title ?? 'Assessment Report')}</div>
      <div class="patient">${escapeHtml(patientName)}</div>
      ${mrnLine}
      <div class="meta">${reportDate} &nbsp;·&nbsp; Session ${escapeHtml(session.id)}</div>
      ${clinicianLine}
    </div>
    ${qr}
  </div>

  <div class="section-title">Summary</div>
  ${buildSummaryKpis(analysis)}
  <div class="risk-line">Overall risk: ${buildRiskBadgeHtml(analysis.overallRisk)}</div>

  <div class="section-title">${chartTitle}</div>
  <div class="chart-box">${buildBarChartSvg(analysis)}</div>
</div>`;
}
// Chart geometry (pure SVG, WebView-safe on both platforms).
const CHART_WIDTH = 560;
const CHART_HEIGHT = 178;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 142;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const TICKS = [0, 25, 50, 75, 100];
const COLOR_BASELINE = '#B9C4CE';
const COLOR_CURRENT = '#0F6E8C';

/** SVG bar chart of normalized severity — current only, or baseline-vs-current. */
export function buildBarChartSvg(analysis: SessionAnalysis): string {
  const tools = analysis.tools;
  if (tools.length === 0) {
    return '<p class="empty">No tool data to chart.</p>';
  }

  const hasBaseline = tools.some((t) => t.baselineNormalized !== undefined);
  const groupWidth = CHART_WIDTH / tools.length;

  const grid = TICKS.map((tick) => {
    const y = PLOT_BOTTOM - (tick / 100) * PLOT_HEIGHT;
    return (
      `<line x1="0" x2="${CHART_WIDTH}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" ` +
      `stroke="#DDE4EA" stroke-dasharray="2 3" stroke-width="1"/>` +
      `<text x="4" y="${(y - 3).toFixed(1)}" font-size="8" fill="#9AA7B2">${tick}</text>`
    );
  }).join('');

  const bars = tools
    .map((metric, index) => {
      const areaLeft = index * groupWidth + 12;
      const areaWidth = groupWidth - 24;
      const columns = hasBaseline ? 2 : 1;
      const gap = 6;
      const barWidth = Math.min(28, (areaWidth - (columns - 1) * gap) / columns);
      const totalCols = columns * barWidth + (columns - 1) * gap;
      const startX = areaLeft + (areaWidth - totalCols) / 2;
      const labelX = areaLeft + areaWidth / 2;

      const bar = (value: number, x: number, fill: string) => {
        const height = value > 0 ? Math.max((value / 100) * PLOT_HEIGHT, 1) : 0;
        const y = PLOT_BOTTOM - height;
        const vLabel =
          height >= 14
            ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" ` +
              `text-anchor="middle" font-size="8" fill="#5F7080">${Math.round(value)}</text>`
            : '';
        return (
          `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${height.toFixed(1)}" ` +
          `fill="${fill}" rx="1"/>${vLabel}`
        );
      };

      let rects = '';
      let currentX = startX;
      if (hasBaseline) {
        rects += bar(metric.baselineNormalized ?? 0, currentX, COLOR_BASELINE);
        currentX += barWidth + gap;
      }
      rects += bar(metric.normalized, currentX, COLOR_CURRENT);

      return (
        `${rects}` +
        `<text x="${labelX.toFixed(1)}" y="${PLOT_BOTTOM + 14}" text-anchor="middle" ` +
        `font-size="9" fill="#16232E" font-weight="600">${escapeHtml(truncateLabel(metric.shortName))}</text>`
      );
    })
    .join('');

  const axis = `<line x1="0" x2="${CHART_WIDTH}" y1="${PLOT_BOTTOM}" y2="${PLOT_BOTTOM}" stroke="#16232E" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" role="img" aria-label="Tool severity bar chart">
${grid}${axis}${bars}
</svg>${hasBaseline ? buildBarChartLegend() : ''}`;
}

/** Legend explaining the two bar fills (shown only when a baseline exists). */
export function buildBarChartLegend(): string {
  return `<div class="legend">
  <span class="legend-item"><span class="swatch" style="background:${COLOR_BASELINE}"></span>Baseline</span>
  <span class="legend-item"><span class="swatch" style="background:${COLOR_CURRENT}"></span>Current</span>
</div>`;
}
/** Formatted, non-escaped text for a single answer value. */
export function formatAnswerValue(
  question: QuestionDef,
  value: AnswerValue | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    const labels = value
      .map((entry) => question.options?.find((o) => o.value === entry)?.label ?? String(entry))
      .filter((label) => label.length > 0);
    return labels.length > 0 ? labels.join(', ') : 'None selected';
  }
  if (
    (question.type === 'single-select' || question.type === 'rating') &&
    typeof value === 'string'
  ) {
    return question.options?.find((o) => o.value === value)?.label ?? value;
  }
  return String(value);
}

const EMPTY_ANSWERS: readonly Answer[] = [];

function answersForTool(
  analysis: SessionAnalysis,
  toolId: string,
): readonly Answer[] {
  return (
    analysis.session.toolResults.find((result) => result.toolId === toolId)?.answers ??
    EMPTY_ANSWERS
  );
}

/** One itemized question → answer row. */
export function buildQuestionRow(
  question: QuestionDef,
  value: AnswerValue | undefined,
  index: number,
): string {
  const answered = formatAnswerValue(question, value);
  const answerHtml = answered
    ? `<div class="qanswer">${escapeHtml(answered)}</div>`
    : '<div class="qanswer"><span class="qa-empty">Not answered</span></div>';
  const required = question.required ? '<span class="qreq">Required</span>' : '';
  return `<div class="qrow">
  <div class="qhead"><span class="qnum">Q${index + 1}</span>${required}</div>
  <div class="qprompt">${escapeHtml(question.prompt)}</div>
  ${answerHtml}
</div>`;
}

/** Full tool page: title, score chip, risk/label row, itemized answers. */
export function buildToolSection(
  metric: ToolMetric,
  analysis: SessionAnalysis,
  tool: ToolDef | undefined,
  index: number,
  total: number,
): string {
  const descriptor = tool
    ? `${escapeHtml(metric.shortName)} · Tool ${index + 1} of ${total}`
    : `Tool ${index + 1} of ${total}`;
  const descriptionLine = tool?.description
    ? `<div class="tool-description">${escapeHtml(tool.description)}</div>`
    : '';

  const deltaPill =
    metric.baselineScore !== undefined && metric.delta !== undefined
      ? `<span class="stat-pill">Δ ${metric.delta > 0 ? '+' : ''}${metric.delta} vs baseline</span>`
      : '';

  const questionRows = tool
    ? tool.questions
        .map((question, questionIndex) => {
          const answer = answersForTool(analysis, tool.id).find(
            (row) => row.questionId === question.id,
          );
          return buildQuestionRow(question, answer?.value, questionIndex);
        })
        .join('')
    : '<p class="empty">No question definitions available for this tool.</p>';

  return `<div class="tool-section">
  <div class="tool-head">
    <div>
      <div class="tool-eyebrow">${descriptor}</div>
      <div class="tool-title">${escapeHtml(metric.name)}</div>
    </div>
    <div class="tool-score-chip">
      <div class="num">${metric.score}</div>
      <div class="max">of ${metric.maxScore}</div>
    </div>
  </div>
  ${descriptionLine}
  <div class="tool-stats">
    ${buildRiskBadgeHtml(metric.riskLevel)}
    <span class="stat-pill">${formatPercent(metric.normalized)} severity</span>
    <span class="stat-pill">${metric.answered}/${metric.total} answered</span>
    ${deltaPill}
  </div>
  ${questionRows}
</div>`;
}

/** PAGE 2+ — one page per tool with itemized answers. */
export function buildToolDetailPages(
  analysis: SessionAnalysis,
  tools: readonly ToolDef[],
): string {
  if (analysis.tools.length === 0) {
    return '<div class="tool-section"><p class="empty">No tool results were recorded for this session.</p></div>';
  }
  return analysis.tools
    .map((metric, index) =>
      buildToolSection(metric, analysis, tools.find((t) => t.id === metric.toolId), index, analysis.tools.length),
    )
    .join('');
}
/** Per-tool comparative table with delta, % change and trend arrows. */
export function buildComparativeSection(report: ComparativeReport): string {
  const rows = report.perTool
    .map((metric) => {
      const delta = metric.delta ?? 0;
      const trendClass = delta > 0 ? 'trend-worse' : delta < 0 ? 'trend-better' : 'trend-flat';
      const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';
      const pct =
        metric.pctChange !== undefined && Number.isFinite(metric.pctChange)
          ? `${metric.pctChange > 0 ? '+' : ''}${metric.pctChange.toFixed(0)}%`
          : '—';
      return `<tr>
  <td>${escapeHtml(metric.name)}</td>
  <td class="num">${metric.baselineScore ?? 0}</td>
  <td class="num">${metric.score}</td>
  <td class="num ${trendClass}">${delta > 0 ? '+' : ''}${delta}</td>
  <td class="num ${trendClass}">${pct}</td>
  <td class="${trendClass}">${arrow}</td>
</tr>`;
    })
    .join('');

  const emptyRows =
    rows || '<tr><td colspan="6" class="empty">No tools scored in both sessions.</td></tr>';

  return `<div class="tool-section">
  <div class="tool-eyebrow">COMPARATIVE</div>
  <div class="tool-title">Current vs Previous</div>
  <div class="insight">${escapeHtml(report.insight)}</div>
  <table class="comparative-table">
    <thead>
      <tr><th>Tool</th><th>Previous</th><th>Current</th><th>Δ</th><th>% Change</th><th>Trend</th></tr>
    </thead>
    <tbody>${emptyRows}</tbody>
  </table>
</div>`;
}

/** Complete single-session HTML report (page 1 + tool detail pages). */
export function buildReportHtml(
  analysis: SessionAnalysis,
  patient: Patient | null | undefined,
  tools: readonly ToolDef[],
  opts: ReportTemplateOptions = {},
): string {
  const pages = [buildHeaderPage(analysis, patient, opts), buildToolDetailPages(analysis, tools)];
  return documentShell(pages.join('\n'), opts.title ?? 'Assessment Report');
}

/** Complete comparative HTML report (overview + table + current tool details). */
export function buildComparativeHtml(
  report: ComparativeReport,
  patient: Patient | null | undefined,
  tools: readonly ToolDef[],
  opts: ReportTemplateOptions = {},
): string {
  const pages = [
    buildHeaderPage(report.current, patient, {
      ...opts,
      title: opts.title ?? 'Comparative Assessment Report',
    }),
    buildComparativeSection(report),
    buildToolDetailPages(report.current, tools),
  ];
  return documentShell(pages.join('\n'), 'Comparative Assessment Report');
}

export default buildReportHtml;