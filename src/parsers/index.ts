import { ColumnConfig } from './column-config';
import { parseGeneric, GenericRow } from './generic-parser';

export type ParsedRow = GenericRow;

export function parseCsv(config: ColumnConfig, csvText: string): ParsedRow[] {
  return parseGeneric(config, csvText);
}

// ── PDF parsers ───────────────────────────────────────────────────────────────
export { parseBoaPdf }     from './pdf-parsers/boa-pdf-parser';
export { parseCitiPdf }    from './pdf-parsers/citi-pdf-parser';
export { parseGenericPdf } from './pdf-parsers/generic-pdf-parser';
export type { ParsedPdf, PdfTextItem, PdfSummary, SkippedCandidate } from './pdf-parsers/pdf-types';
