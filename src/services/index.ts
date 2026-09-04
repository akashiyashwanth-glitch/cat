/**
 * Services layer.
 *
 * - `qr.ts`            — session QR payloads + inline SVG QR markup for the PDF.
 * - `reportTemplate.ts`— pure HTML template builders (page 1 analytics, tool
 *   detail pages, comparative table) consumed by expo-print.
 * - `pdf.ts`           — expo-print + expo-file-system: renders the HTML to an
 *   A4 PDF and persists it in the Documents directory.
 */

export {
  generateReportPDF,
  generateComparativePDF,
  reportFileName,
  comparativeFileName,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  REPORTS_DIRECTORY,
  type ReportOptions,
  type GeneratedPDF,
} from './pdf';
export {
  qrSvgMarkup,
  sessionQrSvgMarkup,
  sessionPayload,
  SESSION_PAYLOAD_PREFIX,
  DEFAULT_QR_SIZE,
  modulesToSvgPath,
} from './qr';
export {
  buildReportHtml,
  buildComparativeHtml,
  buildHeaderPage,
  buildBarChartSvg,
  buildToolDetailPages,
  buildComparativeSection,
  formatAnswerValue,
  formatDate,
  formatPercent,
  sessionReportDate,
  truncateLabel,
  escapeHtml,
  type ReportTemplateOptions,
} from './reportTemplate';