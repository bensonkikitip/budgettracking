import { parseGenericPdf } from '../../src/parsers/pdf-parsers/generic-pdf-parser';
import { PdfTextItem } from '../../src/parsers/pdf-parsers/pdf-types';

// Helper: build a row of items all at the same Y
function row(page: number, y: number, cells: Array<[number, string]>): PdfTextItem[] {
  return cells.map(([x, text]) => ({ page, x, y, text }));
}

const GENERIC_ITEMS: PdfTextItem[] = [
  // Section-like noise (must be skipped)
  ...row(1, 800, [[36, 'Page'], [60, '1'], [80, 'of'], [100, '4']]),

  // Transaction 1: MM/DD/YY date + description + amount
  ...row(1, 750, [
    [36, '01/15/26'],
    [100, 'WALMART'], [145, '#1234'],
    [450, '-52.37'],
  ]),

  // Transaction 2: MM/DD/YYYY date
  ...row(1, 730, [
    [36, '02/03/2026'],
    [100, 'AMAZON.COM'],
    [450, '-19.99'],
  ]),

  // Transaction 3: YYYY-MM-DD date
  ...row(1, 710, [
    [36, '2026-02-10'],
    [100, 'SALARY'], [140, 'DEPOSIT'],
    [450, '2000.00'],
  ]),

  // Transaction 4: multi-line — date+desc on first row, amount on second
  ...row(1, 690, [
    [36, '02/14/26'],
    [100, 'STARBUCKS'], [150, '#567'],
  ]),
  ...row(1, 678, [
    [450, '8.75'],
  ]),

  // Transaction 5: date only on one row, desc+amount on next
  ...row(1, 660, [
    [36, '02/20/26'],
  ]),
  ...row(1, 648, [
    [100, 'NETFLIX'],
    [450, '17.99'],
  ]),

  // Total row — must be skipped
  ...row(1, 630, [[36, 'Total'], [80, 'Credits'], [450, '2000.00']]),
];

describe('parseGenericPdf', () => {
  const result = parseGenericPdf(GENERIC_ITEMS);

  it('parses all date+amount rows as transactions', () => {
    expect(result.rows).toHaveLength(5);
  });

  it('all rows have isPending = false', () => {
    expect(result.rows.every(r => r.isPending === false)).toBe(true);
  });

  it('all rows have valid ISO dates', () => {
    for (const row of result.rows) {
      expect(row.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('parses MM/DD/YY date correctly', () => {
    const walmart = result.rows.find(r => r.description.includes('WALMART'));
    expect(walmart).toBeDefined();
    expect(walmart?.dateIso).toBe('2026-01-15');
    expect(walmart?.amountCents).toBe(-5237);
  });

  it('parses MM/DD/YYYY date correctly', () => {
    const amazon = result.rows.find(r => r.description.includes('AMAZON'));
    expect(amazon).toBeDefined();
    expect(amazon?.dateIso).toBe('2026-02-03');
  });

  it('parses YYYY-MM-DD date correctly', () => {
    const salary = result.rows.find(r => r.description.includes('SALARY'));
    expect(salary).toBeDefined();
    expect(salary?.dateIso).toBe('2026-02-10');
    expect(salary?.amountCents).toBe(200_000);
  });

  it('multi-line transaction: amount on next row merged correctly', () => {
    const starbucks = result.rows.find(r => r.description.includes('STARBUCKS'));
    expect(starbucks).toBeDefined();
    expect(starbucks?.amountCents).toBe(875);
    expect(starbucks?.dateIso).toBe('2026-02-14');
  });

  it('date-only row queued and merged with next description+amount row', () => {
    const netflix = result.rows.find(r => r.description.includes('NETFLIX'));
    expect(netflix).toBeDefined();
    expect(netflix?.amountCents).toBe(1799);
    expect(netflix?.dateIso).toBe('2026-02-20');
  });

  it('skips noise rows (page headers, totals)', () => {
    const noisy = result.rows.filter(r => r.originalDescription.toLowerCase().startsWith('total'));
    expect(noisy).toHaveLength(0);
    // "Page 1 of 4" row should not produce a transaction
    const page = result.rows.filter(r => r.originalDescription.toLowerCase().startsWith('page'));
    expect(page).toHaveLength(0);
  });

  it('has no skipped candidates for well-formed input', () => {
    expect(result.skippedCandidates).toHaveLength(0);
  });

  it('does not produce a summary (format unknown)', () => {
    expect(result.summary).toBeUndefined();
  });
});
