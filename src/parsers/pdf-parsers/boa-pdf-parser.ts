import { normalizeDescription } from '../../domain/normalize';
import { GenericRow } from '../generic-parser';
import { ParsedPdf, PdfSummary, PdfTextItem, SkippedCandidate } from './pdf-types';
import {
  groupByY,
  isBoaNoiseLine,
  parseAmountCents,
  parseDateMmDdYy,
  textOfRow,
} from './pdf-utils';

// ─── Section detection ────────────────────────────────────────────────────────

type BoaSection = 'deposits' | 'atm' | 'other' | 'checks' | null;

const SECTION_KEYS: Record<string, BoaSection> = {
  'deposits and other additions': 'deposits',
  'atm and debit card subtractions': 'atm',
  'other subtractions': 'other',
  'checks': 'checks',
};

function detectSection(rowText: string): BoaSection | undefined {
  const t = rowText.toLowerCase();
  for (const [key, section] of Object.entries(SECTION_KEYS)) {
    if (t.startsWith(key)) return section;
  }
  return undefined;
}

// ─── Summary extraction ───────────────────────────────────────────────────────

const SUMMARY_LABELS: Record<string, string> = {
  'deposits and other additions': 'deposits',
  'atm and debit card subtractions': 'atm',
  'other subtractions': 'other',
  'checks': 'checks',
};

/**
 * Extract the Account Summary totals from the first two pages.
 * BoA places the summary on page 1 with amounts on the same or adjacent items.
 */
function extractSummary(items: PdfTextItem[]): Pick<PdfSummary, 'label' | 'expectedTotals'> | null {
  // Only scan first 2 pages
  const early = items.filter(i => i.page <= 2);
  const rows = groupByY(early, 8); // looser tolerance for summary area

  const expectedTotals: Record<string, number> = {};
  let label = '';

  // Find the period label, e.g. "for January 23, 2026 to February 19, 2026"
  for (const row of rows) {
    const t = textOfRow(row).toLowerCase();
    if (t.includes(' to ') && (t.includes('20') )) {
      label = textOfRow(row).replace(/^for\s+/i, '').trim();
      break;
    }
  }

  // Extract section totals: look for label rows followed by an amount on the same or next row
  for (let i = 0; i < rows.length; i++) {
    const rowText = textOfRow(rows[i]).toLowerCase();
    for (const [key, category] of Object.entries(SUMMARY_LABELS)) {
      if (rowText.startsWith(key)) {
        // Amount might be in the same row (high x) or the next row
        const amtInRow = rows[i]
          .filter(c => c.x > 400)
          .map(c => parseAmountCents(c.text))
          .find(v => v !== null);
        if (amtInRow !== undefined && amtInRow !== null) {
          expectedTotals[category] = amtInRow;
        } else if (i + 1 < rows.length) {
          const nextText = textOfRow(rows[i + 1]).trim();
          const amtNext = parseAmountCents(nextText.replace(/^[+-]/, '').trim()) ??
                          parseAmountCents(nextText);
          if (amtNext !== null) {
            // deposits are positive, rest are negative in statement
            expectedTotals[category] = amtNext;
          }
        }
        break;
      }
    }
  }

  if (Object.keys(expectedTotals).length === 0) return null;
  return { label, expectedTotals };
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a Bank of America checking account PDF statement.
 *
 * Input: word-level PdfTextItem[] from the Swift PDFKit module.
 * Output: ParsedPdf with rows, optional summary comparison, and skipped candidates.
 *
 * Column thresholds (confirmed against 4 real statements):
 *   Date:              x < 85   (format MM/DD/YY)
 *   Regular amount:    x > 525
 *   Check left-amt:    230 < x < 330
 *   Check right-date:  330 < x < 420
 *   Y-tolerance:       4.0pt
 */
export function parseBoaPdf(items: PdfTextItem[]): ParsedPdf {
  const Y_TOL = 4.0;
  const rows = groupByY(items, Y_TOL);

  const parsed: GenericRow[] = [];
  const skipped: SkippedCandidate[] = [];
  let section: BoaSection = null;

  // Pending state: date found but no amount yet (multi-row transaction)
  let pendingDate: string | null = null;
  let pendingDesc: string[] = [];

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

  for (const row of rows) {
    const rowText = textOfRow(row);
    const t = rowText.toLowerCase();

    // Skip empty rows
    if (!rowText.trim()) continue;

    // Section header detection
    const newSection = detectSection(t);
    if (newSection !== undefined) {
      // Flush any open pending (shouldn't happen, but defensive)
      if (pendingDate) {
        skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
        pendingDate = null;
        pendingDesc = [];
      }
      section = newSection;
      continue;
    }

    // Skip rows before the first section header, and known noise lines
    if (section === null) continue;
    if (isBoaNoiseLine(t)) continue;

    // ── CHECKS section: two-column layout ───────────────────────────────────
    if (section === 'checks') {
      // Left column: date x<85, amount 230<x<330
      const leftDate = row.find(c => c.x < 85 && parseDateMmDdYy(c.text) !== null);
      const leftAmt  = row.find(c => c.x > 230 && c.x < 330 && parseAmountCents(c.text) !== null);
      // Right column: date 330<x<420, amount x>525
      const rightDate = row.find(c => c.x > 330 && c.x < 420 && parseDateMmDdYy(c.text) !== null);
      const rightAmt  = row.find(c => c.x > 525 && parseAmountCents(c.text) !== null);

      if (leftDate && leftAmt) {
        const dateIso = parseDateMmDdYy(leftDate.text)!;
        const amountCents = parseAmountCents(leftAmt.text)!;
        parsed.push({ dateIso, amountCents: -Math.abs(amountCents), description: 'CHECK', originalDescription: 'CHECK', isPending: false });
      }
      if (rightDate && rightAmt) {
        const dateIso = parseDateMmDdYy(rightDate.text)!;
        const amountCents = parseAmountCents(rightAmt.text)!;
        parsed.push({ dateIso, amountCents: -Math.abs(amountCents), description: 'CHECK', originalDescription: 'CHECK', isPending: false });
      }
      // If neither column matched but there's a standalone check number row, skip quietly
      continue;
    }

    // ── Regular sections ─────────────────────────────────────────────────────
    const dateCell = row.find(c => c.x < 85 && parseDateMmDdYy(c.text) !== null);
    const amtCell  = row.find(c => c.x > 525 && parseAmountCents(c.text) !== null);

    if (dateCell) {
      // If there's an open pending with no amount yet, this new date starts a new transaction.
      // The pending description row becomes a skipped candidate (unlikely, but defensive).
      if (pendingDate && !amtCell) {
        skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
        pendingDate = null;
        pendingDesc = [];
      }

      const dateIso = parseDateMmDdYy(dateCell.text)!;
      const descItems = row.filter(c => c.x >= 85 && c.x <= 525);
      const descText  = descItems.map(c => c.text).join(' ').trim();

      if (amtCell) {
        // Complete transaction in one row
        const amountCents = parseAmountCents(amtCell.text)!;
        const description = normalizeDescription(descText);
        parsed.push({ dateIso, amountCents, description, originalDescription: descText, isPending: false });
      } else {
        // Start a pending: description may continue on next row(s)
        pendingDate = dateIso;
        pendingDesc = descText ? [descText] : [];
      }
      continue;
    }

    // No date cell — this is either a description continuation or an orphan amount row
    if (amtCell) {
      const amountCents = parseAmountCents(amtCell.text)!;
      if (pendingDate) {
        // Description row(s) followed by amount row — complete the transaction
        const extraDesc = row.filter(c => c.x < 525).map(c => c.text).join(' ').trim();
        flushPending(amountCents, extraDesc);
      } else {
        // Orphan amount with no prior pending date — add to skipped candidates
        skipped.push({ rawText: rowText, possibleAmountCents: amountCents });
      }
      continue;
    }

    // Description continuation row (no date, no amount)
    if (pendingDate) {
      pendingDesc.push(rowText.trim());
    }
    // Otherwise: non-transaction row (headers, footers) — ignore
  }

  // Flush any remaining pending
  if (pendingDate) {
    skipped.push({ rawText: pendingDesc.join(' '), possibleDateIso: pendingDate });
  }

  // ── Build summary comparison ──────────────────────────────────────────────
  const summaryBase = extractSummary(items);
  const summary = buildSummary(summaryBase, parsed);

  return { rows: parsed, summary: summary ?? undefined, skippedCandidates: skipped };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(
  base: Pick<PdfSummary, 'label' | 'expectedTotals'> | null,
  rows: GenericRow[],
): PdfSummary | null {
  if (!base || Object.keys(base.expectedTotals).length === 0) return null;

  // Compute parsed totals by sign
  const depositsTotal = rows
    .filter(r => r.amountCents > 0)
    .reduce((s, r) => s + r.amountCents, 0);
  const subtractionsTotal = rows
    .filter(r => r.amountCents < 0)
    .reduce((s, r) => s + r.amountCents, 0);

  const parsedTotals: Record<string, number> = {
    deposits: depositsTotal,
    subtractions: subtractionsTotal,
  };

  // Diff: compare deposits and each subtraction category
  const expectedDeposits = base.expectedTotals['deposits'] ?? 0;
  const expectedSubs =
    (base.expectedTotals['atm'] ?? 0) +
    (base.expectedTotals['other'] ?? 0) +
    (base.expectedTotals['checks'] ?? 0);

  const diffCents =
    Math.abs(depositsTotal - expectedDeposits) +
    Math.abs(subtractionsTotal - expectedSubs);

  return {
    label: base.label,
    expectedTotals: base.expectedTotals,
    parsedTotals,
    diffCents,
  };
}
