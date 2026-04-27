import * as fs from 'fs';
import * as path from 'path';
import { parseBoaChecking } from '../../src/parsers/boa-checking';

const csv = fs.readFileSync(path.join(__dirname, '../fixtures/boa-checking.csv'), 'utf-8');

describe('parseBoaChecking', () => {
  it('skips the preamble and beginning balance row, returns 4 transactions', () => {
    const rows = parseBoaChecking(csv);
    expect(rows.length).toBe(4);
  });

  it('converts MM/DD/YYYY dates to ISO format', () => {
    const rows = parseBoaChecking(csv);
    expect(rows[0].dateIso).toBe('2026-03-05');
  });

  it('preserves positive amount for deposits', () => {
    const rows = parseBoaChecking(csv);
    const deposit = rows.find((r) => r.description.includes('ALICE'));
    expect(deposit?.amountCents).toBe(50000);
  });

  it('stores negative amount for debits', () => {
    const rows = parseBoaChecking(csv);
    const debit = rows.find((r) => r.description.includes('SUPERMARKET'));
    expect(debit?.amountCents).toBe(-7550);
  });

  it('handles amounts with commas correctly', () => {
    const rows = parseBoaChecking(csv);
    const payroll = rows.find((r) => r.description.includes('PAYROLL'));
    expect(payroll?.amountCents).toBe(200000);
  });

  it('normalizes description to uppercase', () => {
    const rows = parseBoaChecking(csv);
    rows.forEach((r) => expect(r.description).toBe(r.description.toUpperCase()));
  });

  it('preserves original description verbatim', () => {
    const rows = parseBoaChecking(csv);
    const deposit = rows.find((r) => r.originalDescription.includes('Alice Smith'));
    expect(deposit).toBeTruthy();
  });

  it('all rows have isPending = false', () => {
    const rows = parseBoaChecking(csv);
    rows.forEach((r) => expect(r.isPending).toBe(false));
  });

  it('net of all rows matches statement delta ($2,000.00)', () => {
    const rows = parseBoaChecking(csv);
    const net = rows.reduce((sum, r) => sum + r.amountCents, 0);
    // fixture: +500 - 75.50 - 424.50 + 2000 = 2000.00
    expect(net).toBe(200000);
  });
});
