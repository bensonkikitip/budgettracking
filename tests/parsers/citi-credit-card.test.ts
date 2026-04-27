import * as fs from 'fs';
import * as path from 'path';
import { parseCitiCreditCard } from '../../src/parsers/citi-credit-card';

const csv = fs.readFileSync(path.join(__dirname, '../fixtures/citi-cc.csv'), 'utf-8');

describe('parseCitiCreditCard', () => {
  it('parses all 5 rows', () => {
    const rows = parseCitiCreditCard(csv);
    expect(rows.length).toBe(5);
  });

  it('converts MM/DD/YYYY dates to ISO format', () => {
    const rows = parseCitiCreditCard(csv);
    expect(rows[0].dateIso).toBe('2026-03-25');
  });

  it('stores purchases (Debit) as negative cents', () => {
    const rows = parseCitiCreditCard(csv);
    const grocery = rows.find((r) => r.description.includes('GROCERY'));
    expect(grocery?.amountCents).toBe(-4500);
  });

  it('stores payments (Credit) as positive cents', () => {
    const rows = parseCitiCreditCard(csv);
    const payment = rows.find((r) => r.description.includes('ONLINE PAYMENT'));
    expect(payment?.amountCents).toBe(50000);
  });

  it('marks Pending rows correctly', () => {
    const rows = parseCitiCreditCard(csv);
    const pending = rows.find((r) => r.description.includes('COFFEE'));
    expect(pending?.isPending).toBe(true);
  });

  it('marks Cleared rows as not pending', () => {
    const rows = parseCitiCreditCard(csv);
    const cleared = rows.filter((r) => !r.isPending);
    expect(cleared.length).toBe(4);
  });

  it('does not store Member Name', () => {
    const rows = parseCitiCreditCard(csv);
    rows.forEach((r) => {
      expect(r.description).not.toContain('JANE DOE');
      expect(r.originalDescription).not.toContain('JANE DOE');
    });
  });

  it('normalizes description to uppercase', () => {
    const rows = parseCitiCreditCard(csv);
    rows.forEach((r) => expect(r.description).toBe(r.description.toUpperCase()));
  });
});
