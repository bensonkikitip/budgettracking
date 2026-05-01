import { normalizeDescription } from '../../domain/normalize';
import { GenericRow } from '../generic-parser';
import { ParsedPdf, PdfTextItem, SkippedCandidate } from './pdf-types';
import {
  groupByY,
  parseAmountCents,
  parseDateIso,
  parseDateMmDd,
  parseDateMmDdYy,
  parseDateMmDdYyyy,
  textOfRow,
} from './pdf-utils';

/**
 * Best-effort heuristic parser for unsupported bank PDF statements.
 *
 * Strategy:
 *   1. Group items into visual rows by Y proximity (3.5pt tolerance).
 *   2. For each row, try to find a date cell (any of the supported formats)
 *      and a dollar amount cell.
 *   3. Rows where both are found → parsed as transactions.
 *   4. Rows where only a date is found → start a pending (multi-line description).
 *   5. Rows where neither date nor amount is found, but there's a pending →
 *      append text as description continuation.
 *   6. Rows with amount but no date and a pending → flush the pending.
 *   7. Otherwise: ignored (headers, footers, noise).
 *
 * No summary comparison is produced (format is unknown, so expected totals
 * cannot be extracted reliably). `summary` will always be `undefined`.
 *
 * Amount heuristic: the first cell at x > 200 whose text parses as a dollar
 * amount is used. This intentionally wide threshold captures most single-column
 * layouts without knowing the exact column positions.
 *
 * Description heuristic: cells between the date (x < 80) and the amount
 * (rightmost) are treated as description.
 */
export function parseGenericPdf(items: PdfTextItem[]): ParsedPdf {
  const Y_TOL = 3.5;
  const rows = groupByY(items, Y_TOL);

  const parsed: GenericRow[] = [];
  const skipped: SkippedCandidate[] = [];

  let pendingDate: string | null = null;
  let pendingDesc: string[] = [];

  function tryParseDate(text: string): string | null {
    return (
      parseDateMmDdYy(text) ??
      parseDateMmDdYyyy(text) ??
      parseDateIso(text) ??
      null
    );
  }

  function tryParseDateMmDd(text: string, fallbackYear: number): string | null {
    const mmdd = parseDateMmDd(text);
    if (!mmdd) return null;
    return `${fallbackYear}-${mmdd.mm}-${mmdd.dd}`;
  }

  function flushPending(amountCents: number, extraDesc: string = '') {
    if (!pendingDate) return;
    const rawDesc = [...pendingDesc, extraDesc].filter(Boolean).join(' ');
    const description = normalizeDescription(rawDesc);
    parsed.push({
      dateIso: pendingDate,
      amountCents,
      description,
      originalDescription: rawDesc,
      isPending: false,
    });
    pendingDate = null;
    pendingDesc = [];
  }

  // Infer a fallback year from any 4-digit year in the document
  const docYear = (() => {
    for (const item of items) {
      const m = item.text.match(/\b(20\d{2})\b/);
      if (m) return parseInt(m[1], 10);
    }
    return new Date().getFullYear();
  })();

  for (const row of rows) {
    const rowText = textOfRow(row);
    if (!rowText.trim()) continue;

    // Skip obvious noise: "Total ..." / "Page N of M"
    const t = rowText.toLowerCase();
    if (t.startsWith('total') || t.startsWith('page ')) continue;

    // Find date cell: first item at x < 80 that looks like a date
    const dateCell = row.find(c => c.x < 80 && tryParseDate(c.text) !== null)
      ?? row.find(c => c.x < 80 && tryParseDateMmDd(c.text, docYear) !== null);

    // Find amount cell: rightmost cell that parses as a dollar amount
    const amtCandidates = row.filter(c => c.x > 200 && parseAmountCents(c.text) !== null);
    const amtCell = amtCandidates.length > 0
      ? amtCandidates.reduce((best, c) => c.x > best.x ? c : best)
      : null;

    if (dateCell) {
      if (pendingDate && !amtCell) {
        skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
        pendingDate = null;
        pendingDesc = [];
      }

      const dateIso = tryParseDate(dateCell.text)
        ?? tryParseDateMmDd(dateCell.text, docYear)!;

      const amtX = amtCell ? amtCell.x : Infinity;
      const descItems = row.filter(c => c.x >= 80 && c.x < amtX);
      const descText = descItems.map(c => c.text).join(' ').trim();

      if (amtCell) {
        const amountCents = parseAmountCents(amtCell.text)!;
        const description = normalizeDescription(descText);
        parsed.push({
          dateIso,
          amountCents,
          description,
          originalDescription: descText,
          isPending: false,
        });
      } else {
        pendingDate = dateIso;
        pendingDesc = descText ? [descText] : [];
      }
      continue;
    }

    if (amtCell) {
      const amountCents = parseAmountCents(amtCell.text)!;
      if (pendingDate) {
        const amtX = amtCell.x;
        const extraDesc = row.filter(c => c.x >= 80 && c.x < amtX).map(c => c.text).join(' ').trim();
        flushPending(amountCents, extraDesc);
      } else {
        skipped.push({ rawText: rowText, possibleAmountCents: amountCents });
      }
      continue;
    }

    // Description continuation
    if (pendingDate) {
      pendingDesc.push(rowText.trim());
    }
  }

  if (pendingDate) {
    skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
  }

  // No summary for generic parser — format is unknown
  return { rows: parsed, summary: undefined, skippedCandidates: skipped };
}
