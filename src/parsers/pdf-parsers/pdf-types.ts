import { GenericRow } from '../generic-parser';

export interface PdfTextItem {
  page: number;
  x: number;
  y: number;
  text: string;
}

export interface ParsedPdf {
  rows: GenericRow[];
  summary?: PdfSummary;
  skippedCandidates: SkippedCandidate[];
}

export interface PdfSummary {
  /** Human-readable period label, e.g. "Jan 23 – Feb 19, 2026" */
  label: string;
  /** Expected totals extracted from the statement's own Account Summary section (cents) */
  expectedTotals: Record<string, number>;
  /** Totals computed from parsed rows (cents) */
  parsedTotals: Record<string, number>;
  /** Absolute difference in cents across all categories — 0 means perfect match */
  diffCents: number;
}

export interface SkippedCandidate {
  /** Raw joined text of the line(s) the parser could not fully resolve */
  rawText: string;
  /** Dollar amount found in the line, in cents (undefined if none detected) */
  possibleAmountCents?: number;
  /** ISO date found in the line (undefined if none detected) */
  possibleDateIso?: string;
}
