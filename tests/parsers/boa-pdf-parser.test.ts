import { parseBoaPdf } from '../../src/parsers/pdf-parsers/boa-pdf-parser';
import { BOA_EXPECTED, BOA_STATEMENT_ITEMS } from '../fixtures/pdf/boa-fixture';

describe('parseBoaPdf', () => {
  const result = parseBoaPdf(BOA_STATEMENT_ITEMS);

  it('parses the expected number of transactions', () => {
    expect(result.rows).toHaveLength(BOA_EXPECTED.totalTransactions);
  });

  it('all rows have isPending = false', () => {
    expect(result.rows.every(r => r.isPending === false)).toBe(true);
  });

  it('all rows have valid ISO dates', () => {
    for (const row of result.rows) {
      expect(row.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('deposits are positive', () => {
    const deposits = result.rows.filter(r => r.amountCents > 0);
    expect(deposits.length).toBeGreaterThan(0);
    const sum = deposits.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(BOA_EXPECTED.depositsCents);
  });

  it('ATM rows are negative', () => {
    // Two ATM rows: -88.06 and -212.75
    const atm = result.rows.filter(r => r.amountCents === -8806 || r.amountCents === -21275);
    expect(atm).toHaveLength(2);
  });

  it('checks are negative', () => {
    const checks = result.rows.filter(r => r.description === 'CHECK');
    expect(checks).toHaveLength(2);
    checks.forEach(c => expect(c.amountCents).toBeLessThan(0));
    const sum = checks.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(BOA_EXPECTED.checksCents);
  });

  it('multi-line description is concatenated correctly', () => {
    // The Zelle payment deposit has description split across two rows
    const zelle = result.rows.find(r => r.description.includes('ZELLE') && r.amountCents === 85300);
    expect(zelle).toBeDefined();
    expect(zelle?.description).toMatch(/MICHELLE|CHANDLER|RENT/i);
  });

  it('skips noise rows (totals, page headers)', () => {
    // No row should have a description that starts with "Total"
    const noisy = result.rows.filter(r => r.originalDescription.toLowerCase().startsWith('total'));
    expect(noisy).toHaveLength(0);
  });

  it('has no skipped candidates for well-formed input', () => {
    expect(result.skippedCandidates).toHaveLength(0);
  });

  it('extracts a summary with the correct label', () => {
    expect(result.summary).toBeDefined();
    expect(result.summary?.label).toContain('2026');
  });

  it('summary has zero diff when all transactions parsed correctly', () => {
    // The fixture amounts are designed to match
    expect(result.summary?.diffCents).toBe(0);
  });
});

describe('parseBoaPdf — orphan amount carry-forward', () => {
  it('merges a description row into the prior date row when amount comes separately', () => {
    // Simulate: date row with no amount, then a row with just the amount
    const items = [
      // Section header
      { page: 1, x: 36, y: 800, text: 'Deposits' },
      { page: 1, x: 60, y: 800, text: 'and' },
      { page: 1, x: 80, y: 800, text: 'other' },
      { page: 1, x: 110, y: 800, text: 'additions' },
      // Date + description, no amount
      { page: 1, x: 40, y: 750, text: '02/05/26' },
      { page: 1, x: 91, y: 750, text: 'SOME' },
      { page: 1, x: 120, y: 750, text: 'MERCHANT' },
      // Description continuation
      { page: 1, x: 91, y: 738, text: 'EXTRA' },
      { page: 1, x: 120, y: 738, text: 'INFO' },
      // Amount row (separate Y group)
      { page: 1, x: 541, y: 726, text: '100.00' },
    ];
    const result = parseBoaPdf(items);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amountCents).toBe(10000);
    expect(result.rows[0].dateIso).toBe('2026-02-05');
    expect(result.rows[0].description).toContain('SOME');
  });
});
