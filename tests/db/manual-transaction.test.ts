import { createTestDb, TestDb } from '../helpers/db';

async function setup(): Promise<TestDb> {
  const t = await createTestDb();
  await t.queries.insertAccount({
    id: 'acc', name: 'Test', type: 'checking',
    csv_format: 'boa_checking_v1', column_config: '{}', suggest_rules: 1,
  });
  return t;
}

describe('insertManualTransaction', () => {
  it('inserts a transaction and returns its ID', async () => {
    const t = await setup();
    const id = await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id!.length).toBeGreaterThan(0);
  });

  it('transaction appears in getTransactions', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    const txns = await t.queries.getTransactions('acc');
    expect(txns).toHaveLength(1);
    expect(txns[0].date).toBe('2026-03-15');
    expect(txns[0].amount_cents).toBe(-5000);
    expect(txns[0].is_pending).toBe(0);
    expect(txns[0].dropped_at).toBeNull();
  });

  it('transaction has the singleton manual batch ID', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    const txns = await t.queries.getTransactions('acc');
    expect(txns[0].import_batch_id).toBe('manual-acc');
  });

  it('idempotent — re-inserting the same transaction is silently ignored', async () => {
    const t = await setup();
    const id1 = await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    const id2 = await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    expect(id1).toBeTruthy();
    expect(id2).toBeNull(); // duplicate — no insert
    const txns = await t.queries.getTransactions('acc');
    expect(txns).toHaveLength(1);
  });

  it('different amounts or descriptions produce separate transactions', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Coffee shop');
    await t.queries.insertManualTransaction('acc', '2026-03-15', -3000, 'Coffee shop'); // different amount
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Bakery');      // different desc
    const txns = await t.queries.getTransactions('acc');
    expect(txns).toHaveLength(3);
  });

  it('auto-creates the singleton manual batch (no insertImportBatch required)', async () => {
    const t = await setup();
    // No explicit insertImportBatch call — manual transaction creates the batch
    await expect(
      t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Test')
    ).resolves.not.toThrow();
    const txns = await t.queries.getTransactions('acc');
    expect(txns).toHaveLength(1);
  });

  it('multiple calls share the same singleton batch (no FK error)', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'Tx 1');
    await t.queries.insertManualTransaction('acc', '2026-03-16', -1000, 'Tx 2');
    await t.queries.insertManualTransaction('acc', '2026-03-17', 200_00, 'Salary');
    const txns = await t.queries.getTransactions('acc');
    expect(txns).toHaveLength(3);
    // All in the same batch
    const batchIds = new Set(txns.map(tx => tx.import_batch_id));
    expect(batchIds.size).toBe(1);
    expect(batchIds.has('manual-acc')).toBe(true);
  });

  it('positive amounts (income) are stored correctly', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', 200_000, 'Paycheck');
    const txns = await t.queries.getTransactions('acc');
    expect(txns[0].amount_cents).toBe(200_000);
  });

  it('normalised description is stored', async () => {
    const t = await setup();
    await t.queries.insertManualTransaction('acc', '2026-03-15', -5000, 'whole foods market #123');
    const txns = await t.queries.getTransactions('acc');
    // normalizeDescription uppercases
    expect(txns[0].description).toBe('WHOLE FOODS MARKET #123');
    // originalDescription keeps original casing
    expect(txns[0].original_description).toBe('whole foods market #123');
  });
});
