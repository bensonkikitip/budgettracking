import { PdfTextItem } from './pdf-types';

/**
 * Groups PdfTextItems into visual rows by proximity on the Y axis.
 * Items are assumed pre-sorted by (page ASC, y DESC, x ASC).
 * A new group starts whenever the Y distance to the current group's
 * reference Y exceeds `tolerance`.
 */
export function groupByY(items: PdfTextItem[], tolerance: number): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > tolerance) return b.y - a.y; // higher Y first (PDF coords: 0 = bottom)
    return a.x - b.x;
  });

  const groups: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let refY: number | null = null;
  let refPage: number | null = null;

  for (const item of sorted) {
    const samePage = refPage === null || item.page === refPage;
    const closeEnough = refY === null || Math.abs(item.y - refY) <= tolerance;

    if (samePage && closeEnough) {
      current.push(item);
      if (refY === null) {
        refY = item.y;
        refPage = item.page;
      }
    } else {
      if (current.length > 0) groups.push(current);
      current = [item];
      refY = item.y;
      refPage = item.page;
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Regex for a dollar amount: optional minus, optional $, digits with commas, decimal cents */
const AMOUNT_RE = /^-?\$?([\d,]+\.\d{2})$/;

/**
 * Parses a dollar string to cents. Returns null if not a valid amount.
 * Handles: $1,234.56  -$1,234.56  1234.56  -1234.56
 */
export function parseAmountCents(text: string): number | null {
  const s = text.trim();
  const negative = s.startsWith('-');
  const clean = s.replace(/^-/, '').replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+\.\d{2}$/.test(clean)) return null;
  const cents = Math.round(parseFloat(clean) * 100);
  return negative ? -cents : cents;
}

/** MM/DD/YY → YYYY-MM-DD. Two-digit years: 00–29 → 2000–2029, 30–99 → 1930–1999 */
export function parseDateMmDdYy(text: string): string | null {
  const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const [, mm, dd, yy] = m;
  const year = parseInt(yy, 10) <= 29 ? 2000 + parseInt(yy, 10) : 1900 + parseInt(yy, 10);
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** MM/DD → null (incomplete — caller must supply year context) */
export function parseDateMmDd(text: string): { mm: string; dd: string } | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{2})$/);
  if (!m) return null;
  return { mm: m[1].padStart(2, '0'), dd: m[2] };
}

/** MM/DD/YYYY → YYYY-MM-DD */
export function parseDateMmDdYyyy(text: string): string | null {
  const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/** YYYY-MM-DD → YYYY-MM-DD (pass-through with validation) */
export function parseDateIso(text: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null;
}

/** Join all text in a row into a single string */
export function textOfRow(row: PdfTextItem[]): string {
  return row.map(i => i.text).join(' ').trim();
}

/** True if the Citi line is noise: totals, page headers, virtual-card annotations */
export function isCitiNoiseLine(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.startsWith('total') ||
    t.startsWith('page ') ||
    /^digital account number ending in \d+/.test(t) ||
    t.includes('minimum payment') ||
    t.includes('credit limit') ||
    t.includes('available credit') ||
    t.includes('payment due') ||
    t.includes('beginning balance') ||
    t.includes('ending balance') ||
    t.includes('continued on') ||
    /^\d{4}\s\d{4}\s\d{4}$/.test(t.trim()) // account number fragments
  );
}

/** True if the text looks like a noise/header/total line we should skip */
export function isBoaNoiseLine(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.startsWith('total') ||
    t.startsWith('page ') ||
    t.startsWith('ki kit ip') ||
    t.includes('account #') ||
    t.includes('beginning balance') ||
    t.includes('ending balance') ||
    t.includes('service fees') ||
    t.includes('continued on') ||
    t.includes('check images') ||
    t.includes('braille and large print') ||
    t.includes('bankamericard') ||
    t.includes('bankamerica') ||
    t.includes('scheduled and recurring') ||
    t.includes('send money now') ||
    /^\d{4}\s\d{4}\s\d{4}$/.test(t.trim()) // account number fragments
  );
}
