import { normalizeDescription } from '../../domain/normalize';
import { GenericRow } from '../generic-parser';
import { ParsedPdf, PdfSummary, PdfTextItem, SkippedCandidate } from './pdf-types';
import {
  groupByY,
  isCitiNoiseLine,
  parseAmountCents,
  parseDateMmDd,
  textOfRow,
} from './pdf-utils';

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Detect Citi PDF format variant.
 *
 * "new" (Apr onward): page 3 has an "Amount" column header at x > 450.
 *   Amount column: x > 480
 *
 * "old" (Jan/Feb/Mar): no such header.
 *   Amount column: 340 ≤ x ≤ 413
 *   Sidebar strip: items at x > 412 are removed BEFORE processing.
 *
 * Both formats share:
 *   Description column: x ≥ 155
 *   Date column:        x < 85 (MM/DD format — year inferred from period label)
 *   Y-tolerance:        3.5pt
 */
type CitiFormat = 'old' | 'new';

function detectFormat(items: PdfTextItem[]): CitiFormat {
  return items.some(i => i.page === 3 && i.text.toLowerCase() === 'amount' && i.x > 450)
    ? 'new'
    : 'old';
}

// ─── Section detection ────────────────────────────────────────────────────────

type CitiSection = 'payments' | 'purchases' | null;

function detectSection(rowText: string): CitiSection | undefined {
  const t = rowText.toLowerCase();
  if (t.startsWith('payments and other credits')) return 'payments';
  if (t.startsWith('standard purchases') || t === 'purchases') return 'purchases';
  return undefined;
}

// ─── Year inference ───────────────────────────────────────────────────────────

/**
 * Extract the statement year from the period label on pages 1–2.
 * Uses the last 4-digit year found (handles cross-year period end correctly
 * for common Dec→Jan edge case by using the end year).
 *
 * TODO: full cross-year support — detect start/end months and pick year per
 * transaction month (needed for Dec-billing-period transactions in late Nov).
 */
function extractStatementYear(items: PdfTextItem[]): number {
  const early = items.filter(i => i.page <= 2);
  const rows = groupByY(early, 8);
  for (const row of rows) {
    const text = textOfRow(row);
    const matches = [...text.matchAll(/\b(20\d{2})\b/g)];
    if (matches.length > 0) {
      return parseInt(matches[matches.length - 1][1], 10);
    }
  }
  return new Date().getFullYear();
}

function extractPeriodLabel(items: PdfTextItem[]): string {
  const early = items.filter(i => i.page <= 2);
  const rows = groupByY(early, 8);
  for (const row of rows) {
    const text = textOfRow(row);
    if (/\b20\d{2}\b/.test(text) && /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(text)) {
      return text.replace(/^for\s+/i, '').trim();
    }
  }
  return '';
}

// ─── Summary extraction ───────────────────────────────────────────────────────

const CITI_SUMMARY_LABELS: Record<string, string> = {
  'payments': 'payments',
  'credits': 'credits',
  'purchases': 'purchases',
};

/**
 * Extract Account Summary totals from pages 1–2.
 * Amounts are negated (sign-flipped) so they match the app's sign convention:
 *   payments/credits → positive (income)
 *   purchases       → negative (expense)
 */
function extractCitiSummary(
  items: PdfTextItem[],
  label: string,
): Pick<PdfSummary, 'label' | 'expectedTotals'> | null {
  const early = items.filter(i => i.page <= 2);
  const rows = groupByY(early, 8);
  const expectedTotals: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const rowText = textOfRow(rows[i]).toLowerCase();
    for (const [key, category] of Object.entries(CITI_SUMMARY_LABELS)) {
      if (rowText.startsWith(key)) {
        const amtInRow = rows[i]
          .filter(c => c.x > 400)
          .map(c => parseAmountCents(c.text))
          .find(v => v !== null);
        if (amtInRow !== undefined && amtInRow !== null) {
          expectedTotals[category] = -amtInRow; // flip sign to app convention
        } else if (i + 1 < rows.length) {
          const nextText = textOfRow(rows[i + 1]).trim();
          const amtNext = parseAmountCents(nextText);
          if (amtNext !== null) {
            expectedTotals[category] = -amtNext;
          }
        }
        break;
      }
    }
  }

  if (Object.keys(expectedTotals).length === 0) return null;
  return { label, expectedTotals };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildCitiSummary(
  base: Pick<PdfSummary, 'label' | 'expectedTotals'> | null,
  rows: GenericRow[],
): PdfSummary | null {
  if (!base || Object.keys(base.expectedTotals).length === 0) return null;

  const parsedPositive = rows
    .filter(r => r.amountCents > 0)
    .reduce((s, r) => s + r.amountCents, 0);
  const parsedNegative = rows
    .filter(r => r.amountCents < 0)
    .reduce((s, r) => s + r.amountCents, 0);

  // expectedTotals are already in app sign convention (payments/credits +, purchases -)
  const expectedPositive = Object.values(base.expectedTotals)
    .filter(v => v > 0)
    .reduce((s, v) => s + v, 0);
  const expectedNegative = Object.values(base.expectedTotals)
    .filter(v => v < 0)
    .reduce((s, v) => s + v, 0);

  const diffCents =
    Math.abs(parsedPositive - expectedPositive) +
    Math.abs(parsedNegative - expectedNegative);

  const parsedTotals: Record<string, number> = {
    income: parsedPositive,
    expenses: parsedNegative,
  };

  return { label: base.label, expectedTotals: base.expectedTotals, parsedTotals, diffCents };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a Citi credit card PDF statement.
 *
 * Input: word-level PdfTextItem[] from the Swift PDFKit module.
 * Output: ParsedPdf with rows, optional summary comparison, and skipped candidates.
 *
 * **SIGN CONVENTION — all amounts are negated:**
 *   Purchases are positive in the PDF  → negative (expense) in the app
 *   Payments are negative in the PDF   → positive (credit) in the app
 *
 * Format variants:
 *   old (Jan/Feb/Mar): amount 340 ≤ x ≤ 413; sidebar strip x > 412
 *   new (Apr+):        amount x > 480; detected by "Amount" header at x > 450 on page 3
 *
 * Column thresholds (confirmed against 4 real Citi statements):
 *   Date:       x < 85  (format MM/DD — year inferred from period label)
 *   Desc (old): 155 ≤ x < 340
 *   Desc (new): 155 ≤ x ≤ 480
 *   Amt (old):  340 ≤ x ≤ 413
 *   Amt (new):  x > 480
 *   Y-tol:      3.5pt
 *
 * Edge cases handled:
 *   1. Virtual-card annotation: "Digital account number ending in XXXX" rows
 *      are filtered as noise; the subsequent orphan-amount row is merged via
 *      the pending-state carry-forward mechanism.
 *   2. First-transaction date on its own Y-line (new format): queued as
 *      pendingDate and merged when the next row supplies description + amount.
 */
export function parseCitiPdf(items: PdfTextItem[]): ParsedPdf {
  const Y_TOL = 3.5;
  const format = detectFormat(items);
  const year = extractStatementYear(items);
  const label = extractPeriodLabel(items);

  // For old/mid format: strip sidebar items (x > 412) BEFORE grouping rows.
  // This is the critical fix for the sidebar dollar-amount collision —
  // sidebar items must be removed before the amount-column threshold is applied.
  const processedItems = format === 'old'
    ? items.filter(i => i.x <= 412)
    : items;

  const rows = groupByY(processedItems, Y_TOL);

  // Amount and description cell predicates vary by format
  const isAmtCell = format === 'new'
    ? (c: PdfTextItem) => c.x > 480 && parseAmountCents(c.text) !== null
    : (c: PdfTextItem) => c.x >= 340 && c.x <= 413 && parseAmountCents(c.text) !== null;

  const isDescCell = format === 'new'
    ? (c: PdfTextItem) => c.x >= 155 && c.x <= 480
    : (c: PdfTextItem) => c.x >= 155 && c.x < 340;

  const parsed: GenericRow[] = [];
  const skipped: SkippedCandidate[] = [];
  let section: CitiSection = null;

  // Pending state: date found but no amount yet (multi-row transaction)
  let pendingDate: string | null = null;
  let pendingDesc: string[] = [];

  function flushPending(amountCentsRaw: number, extraDesc: string = '') {
    if (!pendingDate) return;
    const rawDesc = [...pendingDesc, extraDesc].filter(Boolean).join(' ');
    const description = normalizeDescription(rawDesc);
    parsed.push({
      dateIso: pendingDate,
      amountCents: -amountCentsRaw, // sign flip
      description,
      originalDescription: rawDesc,
      isPending: false,
    });
    pendingDate = null;
    pendingDesc = [];
  }

  for (const row of rows) {
    const rowText = textOfRow(row);
    const t = rowText.toLowerCase();

    if (!rowText.trim()) continue;

    // Section header detection
    const newSection = detectSection(t);
    if (newSection !== undefined) {
      if (pendingDate) {
        skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
        pendingDate = null;
        pendingDesc = [];
      }
      section = newSection;
      continue;
    }

    // Skip rows before the first section header
    if (section === null) continue;
    // Skip known noise: totals, page headers, virtual-card annotations, etc.
    if (isCitiNoiseLine(rowText)) continue;

    const dateCell = row.find(c => c.x < 85 && parseDateMmDd(c.text) !== null);
    const amtCellItem = row.find(isAmtCell);

    if (dateCell) {
      // New date row: if there's an open pending with no amount yet, that pending
      // had no continuation amount — push to skipped (defensive, shouldn't happen).
      if (pendingDate && !amtCellItem) {
        skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
        pendingDate = null;
        pendingDesc = [];
      }

      const mmdd = parseDateMmDd(dateCell.text)!;
      const dateIso = `${year}-${mmdd.mm}-${mmdd.dd}`;
      const descItems = row.filter(isDescCell);
      const descText = descItems.map(c => c.text).join(' ').trim();

      if (amtCellItem) {
        // Complete transaction in one row
        const amountCentsRaw = parseAmountCents(amtCellItem.text)!;
        const description = normalizeDescription(descText);
        parsed.push({
          dateIso,
          amountCents: -amountCentsRaw, // sign flip
          description,
          originalDescription: descText,
          isPending: false,
        });
      } else {
        // Start a pending: description may continue on next row(s), or amount comes
        // on a later row (e.g., virtual-card annotation splits the row, or date is
        // on its own Y-line in new format)
        pendingDate = dateIso;
        pendingDesc = descText ? [descText] : [];
      }
      continue;
    }

    // No date cell — either a description continuation or an orphan amount row
    if (amtCellItem) {
      const amountCentsRaw = parseAmountCents(amtCellItem.text)!;
      if (pendingDate) {
        // Orphan-amount carry-forward: amount comes after a date+desc (or date-only) row.
        // This handles:
        //   1. Virtual-card annotation splitting merchant from amount (edge case 1).
        //   2. Date-only row in new format followed by desc+amount row (edge case 2).
        const extraDesc = row.filter(isDescCell).map(c => c.text).join(' ').trim();
        flushPending(amountCentsRaw, extraDesc);
      } else {
        // Orphan amount with no prior pending — skip candidate
        skipped.push({ rawText: rowText, possibleAmountCents: -amountCentsRaw });
      }
      continue;
    }

    // Description continuation row (no date, no amount)
    if (pendingDate) {
      const contDesc = row.filter(isDescCell).map(c => c.text).join(' ').trim();
      if (contDesc) pendingDesc.push(contDesc);
    }
    // Otherwise: non-transaction row (headers, footers) — ignore
  }

  // Flush any remaining open pending
  if (pendingDate) {
    skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
  }

  // ── Build summary comparison ──────────────────────────────────────────────
  const summaryBase = extractCitiSummary(items, label);
  const summary = buildCitiSummary(summaryBase, parsed);

  return { rows: parsed, summary: summary ?? undefined, skippedCandidates: skipped };
}
