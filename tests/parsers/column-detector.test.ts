import * as fs from 'fs';
import * as path from 'path';
import { detectColumnConfig } from '../../src/parsers/column-detector';
import { parseGeneric } from '../../src/parsers/generic-parser';

function fixture(name: string) {
  return fs.readFileSync(path.join(__dirname, '../fixtures', name), 'utf-8');
}

// ─── Bank of America Checking (preamble + signed amount) ───────────────────

describe('detectColumnConfig — Bank of America Checking', () => {
  const csv = fixture('boa-checking.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects the date column', () => {
    expect(result.config.dateColumn).toBe('Date');
  });

  it('detects the description column', () => {
    expect(result.config.descriptionColumn).toBe('Description');
  });

  it('detects signed amount style', () => {
    expect(result.config.amountStyle).toBe('signed');
  });

  it('detects the amount column', () => {
    expect(result.config.signedAmountColumn).toBe('Amount');
  });

  it('detects MM/DD/YYYY date format', () => {
    expect(result.config.dateFormat).toBe('MM/DD/YYYY');
  });

  it('sets headerContains to skip preamble', () => {
    expect(result.config.headerContains).toBeTruthy();
    expect(result.config.headerContains).toContain('Date');
  });

  it('generates sample rows via the detected config', () => {
    expect(result.sampleRows.length).toBeGreaterThan(0);
    expect(result.sampleRows.length).toBeLessThanOrEqual(3);
  });

  it('sample rows have valid ISO dates', () => {
    result.sampleRows.forEach(r => {
      expect(r.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('sample rows have non-zero amounts', () => {
    result.sampleRows.forEach(r => {
      expect(r.amountCents).not.toBe(0);
    });
  });

  it('returns no critical warnings', () => {
    const critical = result.warnings.filter(w =>
      w.includes("amount column") || w.includes("date column")
    );
    expect(critical).toHaveLength(0);
  });

  it('detected config successfully parses the full CSV', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ─── Citi Credit Card (debit/credit split + pending status) ────────────────

describe('detectColumnConfig — Citi Credit Card', () => {
  const csv = fixture('citi-cc.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects the date column', () => {
    expect(result.config.dateColumn).toBe('Date');
  });

  it('detects the description column', () => {
    expect(result.config.descriptionColumn).toBe('Description');
  });

  it('detects debit_credit amount style', () => {
    expect(result.config.amountStyle).toBe('debit_credit');
  });

  it('detects the debit column', () => {
    expect(result.config.debitColumn).toBe('Debit');
  });

  it('detects the credit column', () => {
    expect(result.config.creditColumn).toBe('Credit');
  });

  it('detects MM/DD/YYYY date format', () => {
    expect(result.config.dateFormat).toBe('MM/DD/YYYY');
  });

  it('detects the pending status column', () => {
    expect(result.config.pendingColumn).toBe('Status');
  });

  it('detects the cleared value', () => {
    expect(result.config.clearedValue).toBe('Cleared');
  });

  it('generates up to 3 sample rows', () => {
    expect(result.sampleRows.length).toBeGreaterThan(0);
    expect(result.sampleRows.length).toBeLessThanOrEqual(3);
  });

  it('sample rows have valid ISO dates', () => {
    result.sampleRows.forEach(r => {
      expect(r.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('returns no critical warnings', () => {
    const critical = result.warnings.filter(w =>
      w.includes("amount column") || w.includes("date column")
    );
    expect(critical).toHaveLength(0);
  });

  it('detected config successfully parses the full CSV', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBe(5);
  });
});

// ─── Chase Checking (signed amount, no preamble, "Transaction Date" header) ─

describe('detectColumnConfig — Chase Checking style', () => {
  const csv = fixture('chase-checking.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects a date column (Transaction Date or Post Date)', () => {
    expect(['Transaction Date', 'Post Date']).toContain(result.config.dateColumn);
  });

  it('detects a description column', () => {
    expect(result.config.descriptionColumn.toLowerCase()).toContain('description');
  });

  it('detects signed amount style', () => {
    expect(result.config.amountStyle).toBe('signed');
  });

  it('detects the Amount column', () => {
    expect(result.config.signedAmountColumn).toBe('Amount');
  });

  it('detects MM/DD/YYYY date format', () => {
    expect(result.config.dateFormat).toBe('MM/DD/YYYY');
  });

  it('generates sample rows with correct signs (negative for sales)', () => {
    const rows = parseGeneric(result.config, csv);
    const wholefoods = rows.find(r => r.description.includes('WHOLE FOODS'));
    expect(wholefoods?.amountCents).toBeLessThan(0);
  });

  it('generates sample rows with correct positive amounts for deposits', () => {
    const rows = parseGeneric(result.config, csv);
    const payroll = rows.find(r => r.description.includes('PAYROLL'));
    expect(payroll?.amountCents).toBeGreaterThan(0);
  });

  it('detected config successfully parses all 4 rows', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBe(4);
  });
});

// ─── Wells Fargo style (Deposits / Withdrawals split, no preamble) ──────────

describe('detectColumnConfig — Wells Fargo style (Deposits/Withdrawals)', () => {
  const csv = fixture('wells-fargo-checking.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects the date column', () => {
    expect(result.config.dateColumn).toBe('Date');
  });

  it('detects debit_credit amount style for Deposits/Withdrawals', () => {
    expect(result.config.amountStyle).toBe('debit_credit');
  });

  it('detects a debit column (Withdrawals)', () => {
    expect(result.config.debitColumn).toBeTruthy();
  });

  it('detects a credit column (Deposits)', () => {
    expect(result.config.creditColumn).toBeTruthy();
  });

  it('does not invent a pending column that does not exist', () => {
    expect(result.config.pendingColumn).toBeUndefined();
  });

  it('detected config parses all 4 rows', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBe(4);
  });

  // Note: the current parser's debit_credit mode was designed for Citi's sign convention
  // (credit column holds negative values). For banks that use positive values in both
  // Deposits and Withdrawals columns the user may need to adjust signs via the Edit Account
  // screen — which is a known parser limitation, not a detection issue.
});

// ─── DD/MM/YYYY date format detection ──────────────────────────────────────

describe('detectColumnConfig — DD/MM/YYYY date format', () => {
  const csv = fixture('dd-mm-yyyy-bank.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects DD/MM/YYYY date format', () => {
    expect(result.config.dateFormat).toBe('DD/MM/YYYY');
  });

  it('parses dates correctly with detected format', () => {
    const rows = parseGeneric(result.config, csv);
    // 15/03/2026 should become 2026-03-15
    expect(rows[0].dateIso).toBe('2026-03-15');
  });

  it('detects signed amount style', () => {
    expect(result.config.amountStyle).toBe('signed');
  });
});

// ─── YYYY-MM-DD (ISO) date format detection ────────────────────────────────

describe('detectColumnConfig — YYYY-MM-DD date format', () => {
  const csv = fixture('iso-date-bank.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects YYYY-MM-DD date format', () => {
    expect(result.config.dateFormat).toBe('YYYY-MM-DD');
  });

  it('parses ISO dates correctly', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows[0].dateIso).toBe('2026-03-15');
  });

  it('detects signed amount style', () => {
    expect(result.config.amountStyle).toBe('signed');
  });

  it('parses all 3 rows', () => {
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBe(3);
  });
});

// ─── Pending status detection with non-standard column names ──────────────

describe('detectColumnConfig — pending status detection', () => {
  const csv = fixture('status-pending-bank.csv');
  let result: ReturnType<typeof detectColumnConfig>;

  beforeEach(() => { result = detectColumnConfig(csv); });

  it('detects debit_credit amount style', () => {
    expect(result.config.amountStyle).toBe('debit_credit');
  });

  it('detects Status column for pending detection', () => {
    expect(result.config.pendingColumn).toBe('Status');
  });

  it('detects "Posted" as the cleared value', () => {
    expect(result.config.clearedValue).toBe('Posted');
  });

  it('marks pending rows correctly', () => {
    const rows = parseGeneric(result.config, csv);
    const pending = rows.filter(r => r.isPending);
    expect(pending.length).toBe(1);
    expect(pending[0].description).toContain('COFFEE');
  });

  it('marks cleared rows as not pending', () => {
    const rows = parseGeneric(result.config, csv);
    const cleared = rows.filter(r => !r.isPending);
    expect(cleared.length).toBe(3);
  });
});

// ─── Preamble skipping ─────────────────────────────────────────────────────

describe('detectColumnConfig — preamble skipping', () => {
  it('finds the correct header row when preamble precedes it', () => {
    const csv = fixture('boa-checking.csv');
    const result = detectColumnConfig(csv);
    // headerContains must be set so parseGeneric can re-find the row
    expect(result.config.headerContains).toBeTruthy();
  });

  it('sets no headerContains when CSV starts with the header row', () => {
    const csv = fixture('citi-cc.csv');
    const result = detectColumnConfig(csv);
    // Citi CSV starts with header — no preamble to skip
    expect(result.config.headerContains).toBeUndefined();
  });

  it('parses correctly with a multi-line preamble', () => {
    const csv = `Bank Export v2\nAccount: 123456789\n\nDate,Description,Amount\n04/01/2026,Coffee Shop,-5.00\n04/02/2026,Salary,2000.00`;
    const result = detectColumnConfig(csv);
    const rows = parseGeneric(result.config, csv);
    expect(rows.length).toBe(2);
    expect(rows[0].amountCents).toBe(-500);
  });
});

// ─── Sample row generation ─────────────────────────────────────────────────

describe('detectColumnConfig — sampleRows', () => {
  it('returns at most 3 sample rows', () => {
    const csv = fixture('boa-checking.csv');
    const { sampleRows } = detectColumnConfig(csv);
    expect(sampleRows.length).toBeLessThanOrEqual(3);
  });

  it('returns 0 sample rows for an unparseable CSV', () => {
    const csv = 'not,a,valid,bank,csv\none,two,three,four,five';
    const { sampleRows } = detectColumnConfig(csv);
    expect(sampleRows.length).toBe(0);
  });

  it('sample rows have all required fields', () => {
    const csv = fixture('citi-cc.csv');
    const { sampleRows } = detectColumnConfig(csv);
    sampleRows.forEach(r => {
      expect(r.dateIso).toBeDefined();
      expect(typeof r.amountCents).toBe('number');
      expect(r.description).toBeDefined();
      expect(r.originalDescription).toBeDefined();
      expect(typeof r.isPending).toBe('boolean');
    });
  });
});

// ─── Warning generation ────────────────────────────────────────────────────

describe('detectColumnConfig — warnings', () => {
  it('returns no warnings for a well-formed signed-amount CSV', () => {
    const csv = fixture('chase-checking.csv');
    const { warnings } = detectColumnConfig(csv);
    expect(warnings).toHaveLength(0);
  });

  it('returns no warnings for a well-formed debit/credit CSV', () => {
    const csv = fixture('citi-cc.csv');
    const { warnings } = detectColumnConfig(csv);
    expect(warnings).toHaveLength(0);
  });

  it('includes a warning when no columns can be found', () => {
    const { warnings } = detectColumnConfig('');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('includes a warning when no amount column can be found', () => {
    const csv = `Date,Description,Notes\n04/01/2026,Coffee,good\n04/02/2026,Lunch,meh`;
    const { warnings } = detectColumnConfig(csv);
    const hasAmountWarning = warnings.some(w => w.toLowerCase().includes('amount'));
    expect(hasAmountWarning).toBe(true);
  });
});

// ─── Round-trip: detect → parse produces correct amounts ──────────────────

describe('detectColumnConfig — round-trip correctness', () => {
  it('BoA: detected config produces correct amounts', () => {
    const csv = fixture('boa-checking.csv');
    const { config } = detectColumnConfig(csv);
    const rows = parseGeneric(config, csv);
    const deposit = rows.find(r => r.description.includes('ALICE'));
    const debit   = rows.find(r => r.description.includes('SUPERMARKET'));
    expect(deposit?.amountCents).toBe(50000);
    expect(debit?.amountCents).toBe(-7550);
  });

  it('Citi: detected config produces correct amounts', () => {
    const csv = fixture('citi-cc.csv');
    const { config } = detectColumnConfig(csv);
    const rows = parseGeneric(config, csv);
    const grocery = rows.find(r => r.description.includes('GROCERY'));
    const payment = rows.find(r => r.description.includes('ONLINE PAYMENT'));
    expect(grocery?.amountCents).toBe(-4500);
    expect(payment?.amountCents).toBe(50000);
  });

  it('ISO dates: detected config produces correct ISO date strings', () => {
    const csv = fixture('iso-date-bank.csv');
    const { config } = detectColumnConfig(csv);
    const rows = parseGeneric(config, csv);
    expect(rows[0].dateIso).toBe('2026-03-15');
    expect(rows[1].dateIso).toBe('2026-03-20');
    expect(rows[2].dateIso).toBe('2026-03-25');
  });

  it('DD/MM/YYYY dates: detected config produces correct ISO date strings', () => {
    const csv = fixture('dd-mm-yyyy-bank.csv');
    const { config } = detectColumnConfig(csv);
    const rows = parseGeneric(config, csv);
    expect(rows[0].dateIso).toBe('2026-03-15');
    expect(rows[1].dateIso).toBe('2026-03-20');
    expect(rows[2].dateIso).toBe('2026-03-25');
  });
});
