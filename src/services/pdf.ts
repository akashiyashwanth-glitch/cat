import * as Print from 'expo-print';
import { Directory, File, Paths } from 'expo-file-system';

import type { Patient, Session, ToolDef } from '../types';
import { analyzeSession, analyzeComparison } from '../core/analytics';
import { buildComparativeHtml, buildReportHtml } from './reportTemplate';
import { getPatient, getTools } from '../db';

/**
 * PDF report generator (expo-print + expo-file-system).
 *
 * The HTML template is built by `reportTemplate.ts` (pure string builders),
 * printed to a PDF with `Print.printToFileAsync`, then moved out of the cache
 * directory into the app's Documents/reports folder so the file is stable and
 * shareable on both iOS and Android.
 */

/** A4 portrait at 72 PPI — 210 × 297 mm. */
export const A4_WIDTH_PX = 595;
export const A4_HEIGHT_PX = 842;

/** Sub-folder under Documents where generated reports are kept. */
export const REPORTS_DIRECTORY = 'reports';

export interface ReportOptions {
  /** Practitioner/clinic line printed under the header. */
  practitionerName?: string;
  /** Epoch ms used for the report date (defaults to the session date). */
  generatedAt?: number;
  /** Optional baseline session — draws baseline bars + deltas in the report. */
  baseline?: Session | null;
  /** Pre-hydrated tool catalog (skips a DB read). */
  tools?: readonly ToolDef[];
  /** Patient record (skips a DB read by patientId). */
  patient?: Patient | null;
  /** Set `false` to drop the session QR from page 1. */
  includeQr?: boolean;
}

/** Result returned to callers after the PDF lands in Documents. */
export interface GeneratedPDF {
  uri: string;
  name: string;
  size: number;
  numberOfPages?: number;
}

/** Makes a file-name-safe fragment out of a session id. */
export function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Stable Documents file name for a single-session report. */
export function reportFileName(sessionId: string): string {
  return `assessment-report-${sanitizeFilePart(sessionId)}.pdf`;
}

/** Stable Documents file name for a current-vs-previous report. */
export function comparativeFileName(currentId: string, previousId: string): string {
  return `comparative-report-${sanitizeFilePart(currentId)}-vs-${sanitizeFilePart(previousId)}.pdf`;
}

/** Resolves the tool catalog: prefer explicit `tools`, else read the DB. */
function resolveTools(tools?: readonly ToolDef[]): ToolDef[] {
  return tools && tools.length > 0 ? [...tools] : getTools();
}

/** Resolves the patient: prefer an explicit record, else read by `patientId`. */
function resolvePatient(patientId: string, patient?: Patient | null): Patient | undefined {
  return patient ?? (patientId ? getPatient(patientId) ?? undefined : undefined);
}

/**
 * Prints the HTML and relocates the resulting PDF into Documents/reports.
 * Returns the stable `{ uri, name, size }` of the persisted file.
 */
async function persistPdf(html: string, fileName: string): Promise<GeneratedPDF> {
  const { uri, numberOfPages } = await Print.printToFileAsync({
    html,
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
  });

  const printed = new File(uri);
  const reportsDir = new Directory(Paths.document, REPORTS_DIRECTORY);
  if (!reportsDir.exists) {
    reportsDir.create({ intermediates: true, idempotent: true });
  }

  const destination = new File(reportsDir, fileName);
  if (destination.exists) destination.delete();
  await printed.move(destination);

  return { uri: destination.uri, name: fileName, size: destination.size, numberOfPages };
}

/**
 * Generates the single-session A4 report PDF.
 *
 * PAGE 1: header (patient/date/session + QR) + KPI row + risk badge + bar chart.
 * PAGE 2+: itemized question→answer pages per tool.
 */
export async function generateReportPDF(
  session: Session,
  opts: ReportOptions = {},
): Promise<GeneratedPDF> {
  const tools = resolveTools(opts.tools);
  const analysis = analyzeSession(session, tools, opts.baseline ?? null);
  const patient = resolvePatient(session.patientId, opts.patient);
  const html = buildReportHtml(analysis, patient, tools, opts);
  return persistPdf(html, reportFileName(session.id));
}

/**
 * Generates the comparative A4 report PDF for `current` vs `previous`.
 *
 * Reuses the PAGE-1 overview (with baseline bars on the chart), adds the
 * per-tool `Previous | Current | Δ | % | Trend` table + insight paragraph, then
 * the current session's itemized tool pages.
 */
export async function generateComparativePDF(
  current: Session,
  previous: Session,
  opts: ReportOptions = {},
): Promise<GeneratedPDF> {
  const tools = resolveTools(opts.tools);
  const report = analyzeComparison(current, previous, tools);
  const patient = resolvePatient(current.patientId, opts.patient);
  const html = buildComparativeHtml(report, patient, tools, opts);
  return persistPdf(html, comparativeFileName(current.id, previous.id));
}

/** Combines resolvePatient/resolveTools into one convenience loader. */
export function reportDeps(
  session: Session,
  opts: ReportOptions = {},
): { tools: ToolDef[]; patient: Patient | undefined } {
  const tools = resolveTools(opts.tools);
  const patient = resolvePatient(session.patientId, opts.patient);
  return { tools, patient };
}

export default generateReportPDF;