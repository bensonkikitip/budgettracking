import { createTestDb, TestDb } from '../helpers/db';

async function setup(): Promise<TestDb> {
  const t = await createTestDb();
  await t.queries.insertAccount({
    id: 'acc', name: 'Test', type: 'checking',
    csv_format: 'boa_checking_v1', column_config: '{}', suggest_rules: 1,
  });
  await t.queries.insertImportBatch({
    id: 'batch-1', account_id: 'acc', filename: 'jan.csv',
    imported_at: Date.now(),
    rows_total: 0, rows_inserted: 0, rows_skipped_duplicate: 0,
    rows_cleared: 0, rows_dropped: 0,
  });
  return t;
}

function row(id: string, date: string, amount: number, desc: string, pending = false) {
  return {
    id, date, amount_cents: amount, description: desc, original_description: desc.toUpperCase(),
    is_pending: pending,
  };
}

describe('importTransactions', () => {
  it('inserts every brand-new row', async () => {
    const t = await setup();
    const rows = Array.from({ length: 200 }, (_, i) =>
      row(`tx-${i}`, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, -100 - i, `merchant ${i}`),
    );
    const result = await t.queries.importTransactions('acc', 'batch-1', rows);
    expect(result).toEqual({ inserted: 200, cleared: 0, dropped: 0, skipped: 0, total: 200 });
    expect((await t.queries.getTransactions('acc')).length).toBe(200);
  });

  it('is idempotent — re-importing the same rows skips all of them', async () => {
    const t = await setup();
    const rows = Array.from({ length: 50 }, (_, i) =>
      row(`tx-${i}`, '2026-01-15', -100 - i, `m ${i}`),
    );
    await t.queries.importTransactions('acc', 'batch-1', rows);
    const second = await t.queries.importTransactions('acc', 'batch-1', rows);
    expect(second).toEqual({ inserted: 0, cleared: 0, dropped: 0, skipped: 50, total: 50 });
  });

  it('promotes existing pendings to cleared on re-import', async () => {
    const t = await setup();
    // 5 pendings on distinct dates
    const pendings = [1, 2, 3, 4, 5].map(i =>
      row(`p${i}`, `2026-01-0${i}`, -100 * i, `pend ${i}`, true),
    );
    await t.queries.importTransactions('acc', 'batch-1', pendings);

    // Re-import 3 of them as cleared
    const cleared = [1, 3, 5].map(i =>
      row(`p${i}`, `2026-01-0${i}`, -100 * i, `pend ${i}`, false),
    );
    const r = await t.queries.importTransactions('acc', 'batch-1', cleared);
    // 3 cleared. Pendings 2 and 4 fall within the date range [01..05] but are
    // missing from the new import — they get dropped.
    expect(r).toEqual({ inserted: 0, cleared: 3, dropped: 2, skipped: 0, total: 3 });

    const all = await t.queries.getTransactions('acc');
    const byId = Object.fromEntries(all.map(t => [t.id, t]));
    expect(byId['p1'].is_pending).toBe(0);
    expect(byId['p3'].is_pending).toBe(0);
    expect(byId['p5'].is_pending).toBe(0);
    expect(byId['p2'].dropped_at).not.toBeNull();
    expect(byId['p4'].dropped_at).not.toBeNull();
  });

  it('leaves pendings outside the new import date range alone', async () => {
    const t = await setup();
    // 4 pendings in January; 2 in February
    const pendings = [
      row('jan-1', '2026-01-05', -100, 'jan a', true),
      row('jan-2', '2026-01-15', -200, 'jan b', true),
      row('feb-1', '2026-02-01', -300, 'feb a', true),
      row('feb-2', '2026-02-10', -400, 'feb b', true),
    ];
    await t.queries.importTransactions('acc', 'batch-1', pendings);

    // Re-import only February data (and clear it)
    const febCleared = [
      row('feb-1', '2026-02-01', -300, 'feb a', false),
      row('feb-2', '2026-02-10', -400, 'feb b', false),
    ];
    const r = await t.queries.importTransactions('acc', 'batch-1', febCleared);
    expect(r).toEqual({ inserted: 0, cleared: 2, dropped: 0, skipped: 0, total: 2 });

    // January pendings should still be pending and not dropped
    const all = await t.queries.getTransactions('acc');
    const jan1 = all.find(t => t.id === 'jan-1');
    const jan2 = all.find(t => t.id === 'jan-2');
    expect(jan1?.is_pending).toBe(1);
    expect(jan1?.dropped_at).toBeNull();
    expect(jan2?.is_pending).toBe(1);
    expect(jan2?.dropped_at).toBeNull();
  });

  it('handles a chunked import (300 rows, 4 chunks under the bind-param limit)', async () => {
    const t = await setup();
    const rows = Array.from({ length: 300 }, (_, i) =>
      row(`tx-${i}`, `2026-${i % 2 === 0 ? '01' : '02'}-15`, -100 - i, `m ${i}`),
    );
    const r = await t.queries.importTransactions('acc', 'batch-1', rows);
    expect(r.inserted).toBe(300);
    expect((await t.queries.getTransactions('acc')).length).toBe(300);
  });

  it('summary queries exclude dropped rows', async () => {
    const t = await setup();
    // Both pendings on the same date so the next import's range covers both.
    const pendings = [
      row('p1', '2026-01-15', -1000, 'a', true),
      row('p2', '2026-01-15', -2000, 'b', true),
    ];
    await t.queries.importTransactions('acc', 'batch-1', pendings);
    // Re-import only p1 (cleared). p2 is in the new date range but missing
    // from the import, so it gets dropped.
    await t.queries.importTransactions('acc', 'batch-1', [
      row('p1', '2026-01-15', -1000, 'a', false),
    ]);

    const summary = await t.queries.getAccountSummary('acc');
    // Only p1 (-1000) counts; p2 was dropped.
    expect(summary.expense_cents).toBe(-1000);
    expect(summary.transaction_count).toBe(1);
  });
});
