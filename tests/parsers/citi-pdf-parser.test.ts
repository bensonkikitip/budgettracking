import { parseCitiPdf } from '../../src/parsers/pdf-parsers/citi-pdf-parser';
import {
  CITI_MID_EXPECTED,
  CITI_MID_STATEMENT_ITEMS,
  CITI_NEW_EXPECTED,
  CITI_NEW_STATEMENT_ITEMS,
  CITI_OLD_EXPECTED,
  CITI_OLD_STATEMENT_ITEMS,
} from '../fixtures/pdf/citi-fixture';

// ─── Old format (Jan / Feb layout) ───────────────────────────────────────────

describe('parseCitiPdf — old format', () => {
  const result = parseCitiPdf(CITI_OLD_STATEMENT_ITEMS);

  it('parses the expected number of transactions', () => {
    expect(result.rows).toHaveLength(CITI_OLD_EXPECTED.totalTransactions); // 4
  });

  it('all rows have isPending = false', () => {
    expect(result.rows.every(r => r.isPending === false)).toBe(true);
  });

  it('all rows have valid ISO dates', () => {
    for (const row of result.rows) {
      expect(row.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('payment and credit rows are positive after sign flip', () => {
    const positive = result.rows.filter(r => r.amountCents > 0);
    expect(positive.length).toBeGreaterThan(0);
    const sum = positive.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(CITI_OLD_EXPECTED.paymentsCents + CITI_OLD_EXPECTED.creditsCents);
  });

  it('purchase rows are negative after sign flip', () => {
    const negative = result.rows.filter(r => r.amountCents < 0);
    expect(negative.length).toBeGreaterThan(0);
    const sum = negative.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(CITI_OLD_EXPECTED.purchasesCents);
  });

  it('sidebar items are stripped (no description contains sidebar text)', () => {
    // The fixture has sidebar words 'some', 'sidebar', 'junk', 'more' at x > 412
    for (const row of result.rows) {
      expect(row.originalDescription.toLowerCase()).not.toMatch(/\bsome sidebar junk\b/);
      expect(row.originalDescription.toLowerCase()).not.toMatch(/\bmore sidebar\b/);
    }
  });

  it('skips noise rows (totals, page headers)', () => {
    const noisy = result.rows.filter(r => r.originalDescription.toLowerCase().startsWith('total'));
    expect(noisy).toHaveLength(0);
  });

  it('has no skipped candidates for well-formed input', () => {
    expect(result.skippedCandidates).toHaveLength(0);
  });

  it('extracts a summary label containing the year', () => {
    expect(result.summary).toBeDefined();
    expect(result.summary?.label).toMatch(/2026/);
  });

  it('summary has zero diff when all transactions parsed correctly', () => {
    expect(result.summary?.diffCents).toBe(0);
  });
});

// ─── Mid format — edge case 1: virtual-card annotation ───────────────────────

describe('parseCitiPdf — mid format (virtual-card annotation edge case)', () => {
  const result = parseCitiPdf(CITI_MID_STATEMENT_ITEMS);

  it('parses the expected number of transactions', () => {
    expect(result.rows).toHaveLength(CITI_MID_EXPECTED.totalTransactions); // 4
  });

  it('TST*BREAD SAVAGE is parsed correctly despite virtual-card annotation', () => {
    const breadSavage = result.rows.find(r => r.description.includes('BREAD') || r.description.includes('SAVAGE'));
    expect(breadSavage).toBeDefined();
    expect(breadSavage?.amountCents).toBe(CITI_MID_EXPECTED.breadSavageCents); // -1804
    expect(breadSavage?.dateIso).toBe('2026-03-15');
  });

  it('virtual-card annotation line does not appear in any description', () => {
    for (const row of result.rows) {
      expect(row.originalDescription.toLowerCase()).not.toContain('digital account number');
    }
  });

  it('all purchases are negative after sign flip', () => {
    const purchases = result.rows.filter(r => r.amountCents < 0);
    const sum = purchases.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(CITI_MID_EXPECTED.purchasesCents);
  });

  it('has no skipped candidates', () => {
    expect(result.skippedCandidates).toHaveLength(0);
  });

  it('summary has zero diff', () => {
    expect(result.summary?.diffCents).toBe(0);
  });
});

// ─── New format — edge case 2: first-transaction date on its own line ─────────

describe('parseCitiPdf — new format (first-transaction date on own line)', () => {
  const result = parseCitiPdf(CITI_NEW_STATEMENT_ITEMS);

  it('parses the expected number of transactions', () => {
    expect(result.rows).toHaveLength(CITI_NEW_EXPECTED.totalTransactions); // 3
  });

  it('LA CHAPALA MARKET is parsed correctly (date was on a separate line)', () => {
    const laChapala = result.rows.find(r => r.description.includes('CHAPALA') || r.description.includes('LA'));
    expect(laChapala).toBeDefined();
    expect(laChapala?.amountCents).toBe(CITI_NEW_EXPECTED.laChapalaMarketCents); // -795
    expect(laChapala?.dateIso).toBe('2026-03-04');
  });

  it('Costco purchase parsed with correct date and amount', () => {
    const costco = result.rows.find(r => r.description.includes('COSTCO'));
    expect(costco).toBeDefined();
    expect(costco?.amountCents).toBe(-10_000);
    expect(costco?.dateIso).toBe('2026-04-10');
  });

  it('payment is positive after sign flip', () => {
    const payment = result.rows.find(r => r.amountCents > 0);
    expect(payment).toBeDefined();
    expect(payment?.amountCents).toBe(CITI_NEW_EXPECTED.paymentCents); // 80000
  });

  it('all purchases are negative after sign flip', () => {
    const purchases = result.rows.filter(r => r.amountCents < 0);
    const sum = purchases.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(CITI_NEW_EXPECTED.purchasesCents);
  });

  it('has no skipped candidates', () => {
    expect(result.skippedCandidates).toHaveLength(0);
  });

  it('summary has zero diff', () => {
    expect(result.summary?.diffCents).toBe(0);
  });
});

// ─── Sign-flip invariant: purchases always negative, payments always positive ─

describe('parseCitiPdf — sign flip invariant', () => {
  it('all purchases are negative (old format)', () => {
    const result = parseCitiPdf(CITI_OLD_STATEMENT_ITEMS);
    const purchases = result.rows.filter(r => r.amountCents < 0);
    purchases.forEach(r => expect(r.amountCents).toBeLessThan(0));
  });

  it('payment rows are positive (old format)', () => {
    const result = parseCitiPdf(CITI_OLD_STATEMENT_ITEMS);
    const payments = result.rows.filter(r => r.amountCents > 0);
    expect(payments.length).toBeGreaterThan(0);
    payments.forEach(r => expect(r.amountCents).toBeGreaterThan(0));
  });
});
