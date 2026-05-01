import { PdfTextItem } from '../../../src/parsers/pdf-parsers/pdf-types';

/**
 * Synthetic PdfTextItem[] representing a minimal BoA checking statement.
 * Covers: deposits section, ATM section, other subtractions section, checks section,
 * a multi-line description row, and some noise rows that must be skipped.
 *
 * X/Y positions match the column thresholds verified against real statements:
 *   Date:            x=40    (< 85)
 *   Description:     x=100   (85–525)
 *   Regular amount:  x=541   (> 525)
 *   Check left-amt:  x=250   (230–330)
 *   Check right-date:x=350   (330–420)
 *   Check right-amt: x=541   (> 525)
 */

// Helper: build a row of items all at the same Y
function row(page: number, y: number, cells: Array<[number, string]>): PdfTextItem[] {
  return cells.map(([x, text]) => ({ page, x, y, text }));
}

export const BOA_STATEMENT_ITEMS: PdfTextItem[] = [
  // ── Page 1: Account Summary (for summary extraction) ──────────────────────
  // Period label
  ...row(1, 750, [[100, 'for'], [150, 'January'], [200, '23,'], [250, '2026'], [300, 'to'], [350, 'February'], [400, '19,'], [450, '2026']]),
  // Summary rows — label then amount on same row (high x)
  // Amounts match the synthetic fixture transactions so diffCents === 0
  ...row(1, 700, [[36, 'Deposits'], [80, 'and'], [120, 'other'], [165, 'additions'], [541, '3,541.91']]),
  ...row(1, 680, [[36, 'ATM'], [60, 'and'], [85, 'debit'], [115, 'card'], [155, 'subtractions'], [541, '-300.81']]),
  ...row(1, 660, [[36, 'Other'], [80, 'subtractions'], [541, '-1,634.95']]),
  ...row(1, 640, [[36, 'Checks'], [541, '-3,262.00']]),

  // ── Page 3: Noise rows (must be skipped) ──────────────────────────────────
  ...row(3, 790, [[36, 'KI'], [55, 'KIT'], [75, 'IP'], [200, '!'], [230, 'Account'], [280, '#'], [330, '0023'], [370, '4672'], [410, '5203']]),
  ...row(3, 775, [[36, 'Page'], [60, '3'], [80, 'of'], [100, '6']]),

  // ── Page 3: Deposits section ───────────────────────────────────────────────
  ...row(3, 760, [[36, 'Deposits'], [80, 'and'], [120, 'other'], [165, 'additions']]),

  // Deposit 1: single-row transaction
  ...row(3, 740, [
    [40, '01/23/26'],
    [91, 'APPFOLIO,'], [130, 'INC.'], [165, 'DES:PAYROLL'],
    [541, '2,688.91'],
  ]),

  // Deposit 2: multi-line — description on next row
  ...row(3, 720, [
    [40, '01/27/26'],
    [91, 'Zelle'], [120, 'payment'], [160, 'from'],
  ]),
  ...row(3, 708, [
    [91, 'Michelle'], [140, 'Chandler'], [200, 'for'], [230, 'Rent'],
    [541, '853.00'],
  ]),

  // Total deposits row (must be skipped)
  ...row(3, 690, [[36, 'Total'], [80, 'deposits'], [120, 'and'], [160, 'other'], [200, 'additions'], [541, '$9,810.30']]),

  // ── Page 3: ATM section ───────────────────────────────────────────────────
  ...row(3, 670, [[36, 'ATM'], [60, 'and'], [85, 'debit'], [115, 'card'], [155, 'subtractions']]),

  // ATM row 1
  ...row(3, 650, [
    [40, '01/30/26'],
    [91, 'PMNT'], [120, 'SENT'], [150, 'VENMO'], [190, '*Kai'], [215, 'Rol'],
    [541, '-88.06'],
  ]),

  // ATM row 2
  ...row(3, 630, [
    [40, '02/19/26'],
    [91, 'CHECKCARD'], [150, 'TMOBILE'], [200, 'AUTO'], [235, 'P'],
    [541, '-212.75'],
  ]),

  // ── Page 4: Other subtractions section ───────────────────────────────────
  ...row(4, 760, [[36, 'Other'], [80, 'subtractions']]),

  // Other subtraction 1
  ...row(4, 740, [
    [40, '01/27/26'],
    [91, 'Zelle'], [125, 'payment'], [165, 'to'], [185, 'Terry'], [215, 'Gock'],
    [541, '-20.00'],
  ]),

  // Other subtraction 2
  ...row(4, 720, [
    [40, '02/02/26'],
    [91, 'CITI'], [120, 'CARD'], [150, 'ONLINE'],
    [541, '-1,614.95'],
  ]),

  // ── Page 5: Checks section ────────────────────────────────────────────────
  ...row(5, 760, [[36, 'Checks']]),

  // Two checks on the same visual row (left + right columns)
  ...row(5, 740, [
    [40, '12/31/25'],  // left date
    [241, '100.00'],   // left amount (check 305)
    [350, '01/02/26'], // right date
    [541, '3,162.00'], // right amount (check 306)
  ]),

  // Total checks (must be skipped)
  ...row(5, 720, [[36, 'Total'], [80, 'checks'], [541, '$3,262.00']]),
];

/**
 * Expected totals matching the synthetic fixture above.
 * Deposits: +2,688.91 + 853.00 = $3,541.91 = 354191 cents
 * ATM:      -88.06 + -212.75 = -$300.81 = -30081 cents
 * Other:    -20.00 + -1,614.95 = -$1,634.95 = -163495 cents
 * Checks:   -$100.00 + -$3,162.00 = -$3,262.00 = -326200 cents
 */
export const BOA_EXPECTED = {
  depositsCents: 354_191,
  atmCents: -30_081,
  otherCents: -163_495,
  checksCents: -326_200,
  totalTransactions: 8, // 2 deposits + 2 ATM + 2 other + 2 checks
};
