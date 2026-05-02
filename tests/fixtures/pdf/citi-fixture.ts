import { PdfTextItem } from '../../../src/parsers/pdf-parsers/pdf-types';

/**
 * Synthetic PdfTextItem[] for Citi credit card statement fixtures.
 *
 * Three format variants are covered:
 *   "old"  (Jan/Feb) — sidebar strip at x>412, amount 340≤x≤413, desc x≥155
 *   "mid"  (Mar)     — same layout as old but contains the virtual-card-annotation edge case
 *   "new"  (Apr)     — "Amount" header at x>450 on page 3, amount x>480, desc x≥155
 *
 * SIGN CONVENTION: ALL Citi amounts are negated by the parser.
 *   Purchases are positive in the PDF  → negative (expense) in the app
 *   Payments are negative in the PDF   → positive (credit) in the app
 *
 * Column thresholds (confirmed against 4 real Citi statements):
 *   Y-tolerance:          3.5pt
 *   Old/mid amount:       340 ≤ x ≤ 413
 *   New amount:           x > 480
 *   Description:          x ≥ 155 (both formats)
 *   Sidebar strip:        x > 412 stripped BEFORE noise check (old/mid only)
 */

// Helper: build a row of items all at the same Y
function row(page: number, y: number, cells: Array<[number, string]>): PdfTextItem[] {
  return cells.map(([x, text]) => ({ page, x, y, text }));
}

// ─── OLD FORMAT (Jan / Feb layout) ───────────────────────────────────────────

export const CITI_OLD_STATEMENT_ITEMS: PdfTextItem[] = [
  // ── Page 1: Account Summary ────────────────────────────────────────────────
  // Period label
  ...row(1, 750, [[100, 'January'], [150, '1,'], [200, '2026'], [250, '-'], [300, 'January'], [350, '31,'], [400, '2026']]),
  // Summary rows: Payments, Credits, Purchases
  ...row(1, 700, [[36, 'Payments'], [541, '-1,500.00']]),
  ...row(1, 680, [[36, 'Credits'], [541, '-50.00']]),
  ...row(1, 660, [[36, 'Purchases'], [541, '63.66']]),  // matches synthetic transactions: 45.67 + 17.99

  // ── Page 3: Transactions ───────────────────────────────────────────────────
  // Noise: page header with account fragment
  ...row(3, 790, [[36, 'Page'], [60, '3'], [80, 'of'], [100, '6']]),

  // Section header: Payments
  ...row(3, 760, [[100, 'Payments'], [120, 'and'], [150, 'Other'], [200, 'Credits']]),

  // Payment 1: date MM/DD, description, negative amount (negative in PDF → positive after flip)
  ...row(3, 740, [
    [36, '01/05'],
    [155, 'PAYMENT'], [200, 'THANK'], [240, 'YOU'],
    [370, '-1,500.00'],
    // Sidebar noise at x>412 — must be stripped before noise check
    [420, 'some'], [450, 'sidebar'], [490, 'junk'],
  ]),

  // Credit 1: returned item
  ...row(3, 720, [
    [36, '01/10'],
    [155, 'AMAZON'], [200, 'RETURN'],
    [370, '-50.00'],
    [420, 'more'], [450, 'sidebar'],
  ]),

  // Section header: Purchases
  ...row(3, 700, [[100, 'Standard'], [150, 'Purchases']]),

  // Purchase 1: single-row
  ...row(3, 680, [
    [36, '01/15'],
    [155, 'TRADER'], [195, "JOE'S"], [235, '#123'],
    [370, '45.67'],
    [420, 'sidebar'],
  ]),

  // Purchase 2: single-row
  ...row(3, 660, [
    [36, '01/20'],
    [155, 'NETFLIX.COM'],
    [370, '17.99'],
    [420, 'sidebar'],
  ]),

  // Total line — must be skipped
  ...row(3, 640, [[36, 'Total'], [80, 'Purchases'], [370, '63.66']]),
];

/**
 * Sign-flipped expected values:
 *   Payments:  -(-1500.00) = +150000 cents
 *   Credits:   -(-50.00)   = +5000 cents
 *   Purchases: -(45.67)    = -4567 cents; -(17.99) = -1799 cents
 */
export const CITI_OLD_EXPECTED = {
  totalTransactions: 4, // 1 payment + 1 credit + 2 purchases
  paymentsCents: 150_000,  // after sign flip: positive
  creditsCents: 5_000,     // after sign flip: positive
  purchasesCents: -6_366,  // after sign flip: -4567 + -1799
};

// ─── MID FORMAT (Mar — virtual card annotation edge case) ─────────────────────

/**
 * Edge case: "Digital account number ending in XXXX" appears between
 * the merchant name and the amount row, splitting the transaction.
 *
 * The parser must:
 *   1. Filter out the annotation line (noise filter)
 *   2. Carry the orphan amount forward to the preceding date+description
 */
export const CITI_MID_STATEMENT_ITEMS: PdfTextItem[] = [
  // ── Page 1: Summary ────────────────────────────────────────────────────────
  ...row(1, 750, [[100, 'March'], [150, '1,'], [200, '2026'], [250, '-'], [300, 'March'], [350, '31,'], [400, '2026']]),
  ...row(1, 700, [[36, 'Payments'], [541, '-1,200.00']]),
  ...row(1, 680, [[36, 'Credits'], [541, '0.00']]),
  ...row(1, 660, [[36, 'Purchases'], [541, '1,018.04']]),

  // ── Page 3: Transactions ───────────────────────────────────────────────────
  ...row(3, 760, [[100, 'Payments'], [120, 'and'], [150, 'Other'], [200, 'Credits']]),

  ...row(3, 740, [
    [36, '03/10'],
    [155, 'PAYMENT'], [200, 'THANK'], [240, 'YOU'],
    [370, '-1,200.00'],
  ]),

  ...row(3, 720, [[100, 'Standard'], [150, 'Purchases']]),

  // Normal purchase before edge case
  ...row(3, 700, [
    [36, '03/12'],
    [155, 'STARBUCKS'], [200, '#4567'],
    [370, '8.50'],
  ]),

  // Edge-case purchase: "TST*BREAD SAVAGE" — virtual card annotation splits the row
  // Row 1: date + merchant name (no amount)
  ...row(3, 680, [
    [36, '03/15'],
    [155, 'TST*BREAD'], [200, 'SAVAGE'],
    // NO amount here
  ]),
  // Row 2: virtual card annotation (MUST be filtered as noise)
  ...row(3, 668, [
    [155, 'Digital'], [195, 'account'], [235, 'number'], [285, 'ending'], [325, 'in'], [355, '6594'],
    // Note: this row has no amount either
  ]),
  // Row 3: amount-only row (orphan — MUST be merged with the preceding date row)
  ...row(3, 656, [
    [370, '18.04'],
  ]),

  // Normal purchase after edge case
  ...row(3, 640, [
    [36, '03/20'],
    [155, 'WHOLE'], [190, 'FOODS'],
    [370, '991.50'],
  ]),
];

export const CITI_MID_EXPECTED = {
  totalTransactions: 4, // 1 payment + 3 purchases (starbucks, bread savage, whole foods)
  paymentCents: 120_000,        // -(-1200.00) flipped
  breadSavageCents: -1_804,     // -(18.04) flipped — edge case transaction
  purchasesCents: -101_804,     // -(8.50 + 18.04 + 991.50) = -101804 flipped
};

// ─── NEW FORMAT (Apr) ─────────────────────────────────────────────────────────

/**
 * "New" format: page 3 has an "Amount" column header at x>450.
 * Transaction amounts are at x>480 (instead of 340≤x≤413).
 * This triggers the format-detection switch in the parser.
 *
 * Also includes a second edge case: the first transaction's date "03/04"
 * is embedded in the section header text box (pdfminer artifact).
 * PDFKit word-level extraction gives it its own Y, so it appears as a
 * separate item and gets parsed as the date for the first transaction.
 */
export const CITI_NEW_STATEMENT_ITEMS: PdfTextItem[] = [
  // ── Page 1: Summary ────────────────────────────────────────────────────────
  ...row(1, 750, [[100, 'April'], [150, '1,'], [200, '2026'], [250, '-'], [300, 'April'], [350, '30,'], [400, '2026']]),
  ...row(1, 700, [[36, 'Payments'], [541, '-800.00']]),
  ...row(1, 680, [[36, 'Credits'], [541, '0.00']]),
  ...row(1, 660, [[36, 'Purchases'], [541, '107.95']]),

  // ── Page 3: New format — "Amount" column header signals new layout ─────────
  // Format detection: "Amount" at x>450
  ...row(3, 790, [[36, 'Date'], [155, 'Description'], [485, 'Amount']]),

  ...row(3, 760, [[100, 'Payments'], [120, 'and'], [150, 'Other'], [200, 'Credits']]),

  ...row(3, 740, [
    [36, '03/28'],
    [155, 'PAYMENT'], [200, 'RECEIVED'],
    [490, '-800.00'],
  ]),

  // Section header for Standard Purchases
  // The first date "03/04" is on its own line (word-level extraction separates it)
  ...row(3, 720, [[100, 'Standard'], [150, 'Purchases']]),
  ...row(3, 710, [[36, '03/04']]),  // first transaction date on its own Y — must be queued

  // First purchase (LA CHAPALA MARKET) — no date on this row (it was above)
  ...row(3, 700, [
    [155, 'LA'], [175, 'CHAPALA'], [220, 'MARKET'],
    [490, '7.95'],
  ]),

  // Second purchase — normal row with date
  ...row(3, 680, [
    [36, '04/10'],
    [155, 'COSTCO'], [195, 'WHSE'], [235, '#1234'],
    [490, '100.00'],
  ]),
];

export const CITI_NEW_EXPECTED = {
  totalTransactions: 3, // 1 payment + 2 purchases
  paymentCents: 80_000,           // -(-800.00) flipped
  laChapalaMarketCents: -795,     // -(7.95) flipped — edge case transaction
  purchasesCents: -10_795,        // -(7.95 + 100.00) flipped
};
