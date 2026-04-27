import { assignTransactionIds } from '../../src/domain/transaction-id';

const ACCOUNT = 'acct-abc';

const row = (description: string, amountCents: number) => ({
  accountId: ACCOUNT,
  dateIso: '2026-04-01',
  amountCents,
  description,
});

describe('assignTransactionIds', () => {
  it('produces the same ID for the same row when called twice (idempotent)', () => {
    const rows = [row('STARBUCKS STORE 123 SANTA BARBARA CA', -675)];
    const [id1] = assignTransactionIds(rows);
    const [id2] = assignTransactionIds(rows);
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different amounts', () => {
    const [a, b] = assignTransactionIds([
      row('STARBUCKS STORE 123', -675),
      row('STARBUCKS STORE 123', -500),
    ]);
    expect(a).not.toBe(b);
  });

  it('disambiguates two identical rows on the same day with different sequence', () => {
    const [a, b] = assignTransactionIds([
      row('STARBUCKS STORE 123', -500),
      row('STARBUCKS STORE 123', -500),
    ]);
    expect(a).not.toBe(b);
    expect(a).toHaveLength(32);
    expect(b).toHaveLength(32);
  });

  it('normalizes description casing for stable IDs', () => {
    const [lower] = assignTransactionIds([{ ...row('starbucks store 123', -675) }]);
    const [upper] = assignTransactionIds([{ ...row('STARBUCKS STORE 123', -675) }]);
    expect(lower).toBe(upper);
  });

  it('different accounts produce different IDs for same transaction data', () => {
    const r = row('TRADER JOES', -5356);
    const [a] = assignTransactionIds([r]);
    const [b] = assignTransactionIds([{ ...r, accountId: 'acct-xyz' }]);
    expect(a).not.toBe(b);
  });
});
