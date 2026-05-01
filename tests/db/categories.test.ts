import { createTestDb, TestDb } from '../helpers/db';

describe('categories', () => {
  let t: TestDb;
  beforeEach(async () => { t = await createTestDb(); });

  it('getAllCategories returns categories sorted by name', async () => {
    await t.queries.insertCategory({ id: 'c1', name: 'Utilities', color: '#111', emoji: null, description: null });
    await t.queries.insertCategory({ id: 'c2', name: 'Groceries', color: '#222', emoji: '🛒', description: 'food' });
    await t.queries.insertCategory({ id: 'c3', name: 'Amazon', color: '#333', emoji: null, description: null });
    const cats = await t.queries.getAllCategories();
    expect(cats.map(c => c.name)).toEqual(['Amazon', 'Groceries', 'Utilities']);
  });

  it('updateCategory persists only the fields provided; others stay intact', async () => {
    await t.queries.insertCategory({ id: 'c', name: 'Old', color: '#aaa', emoji: '🎯', description: 'old desc' });
    await t.queries.updateCategory('c', { name: 'New' });
    const [cat] = await t.queries.getAllCategories();
    expect(cat.name).toBe('New');
    expect(cat.emoji).toBe('🎯');        // unchanged
    expect(cat.description).toBe('old desc'); // unchanged
  });

  it('updateCategory stores null (not the string "null") when emoji is explicitly set to null', async () => {
    await t.queries.insertCategory({ id: 'c', name: 'A', color: '#aaa', emoji: '🎯', description: null });
    await t.queries.updateCategory('c', { emoji: null });
    const [cat] = await t.queries.getAllCategories();
    expect(cat.emoji).toBeNull();
  });

  it('deleteCategory sets transactions.category_id to NULL and does not delete the transaction', async () => {
    await t.queries.insertCategory({ id: 'cat', name: 'Food', color: '#aaa', emoji: null, description: null });
    await t.queries.insertAccount({
      id: 'acc', name: 'A', type: 'checking', csv_format: 'boa_checking_v1', column_config: '{}', suggest_rules: 0,
    });
    await t.queries.insertImportBatch({
      id: 'b', account_id: 'acc', filename: null, imported_at: 1000,
      rows_total: 1, rows_inserted: 1, rows_skipped_duplicate: 0, rows_cleared: 0, rows_dropped: 0,
    });
    await t.db.runAsync(
      `INSERT INTO transactions
         (id, account_id, date, amount_cents, description, original_description,
          is_pending, dropped_at, import_batch_id, created_at, category_id, category_set_manually, applied_rule_id)
       VALUES ('tx', 'acc', '2026-01-01', -500, 'test', 'TEST', 0, NULL, 'b', 1000, 'cat', 1, NULL)`,
    );

    await t.queries.deleteCategory('cat');

    const tx = await t.db.getFirstAsync<{ id: string; category_id: string | null }>(
      `SELECT id, category_id FROM transactions WHERE id = 'tx'`,
    );
    expect(tx).not.toBeNull();
    expect(tx?.category_id).toBeNull();
    expect(await t.queries.getAllCategories()).toHaveLength(0);
  });

  it('bulkInsertCategories is idempotent — re-running with the same IDs does not throw or duplicate', async () => {
    const rows = [
      { id: 'c1', name: 'Food', color: '#aaa', emoji: '🍕' as const, description: 'meals' },
      { id: 'c2', name: 'Transit', color: '#bbb', emoji: null, description: null },
    ];
    await t.queries.bulkInsertCategories(rows);
    await t.queries.bulkInsertCategories(rows);
    expect(await t.queries.getAllCategories()).toHaveLength(2);
  });
});

// ─── mergeCategory ────────────────────────────────────────────────────────────

async function setupMergeFixture(t: TestDb) {
  // Two categories: source and target
  await t.queries.insertCategory({ id: 'src',  name: 'Old Food',  color: '#aaa', emoji: null, description: null });
  await t.queries.insertCategory({ id: 'tgt',  name: 'Groceries', color: '#bbb', emoji: '🛒', description: null });
  // Account + import batch for transactions
  await t.queries.insertAccount({
    id: 'acc', name: 'Checking', type: 'checking',
    csv_format: 'boa_checking_v1', column_config: '{}', suggest_rules: 0,
  });
  await t.queries.insertImportBatch({
    id: 'b', account_id: 'acc', filename: null, imported_at: 1000,
    rows_total: 2, rows_inserted: 2, rows_skipped_duplicate: 0, rows_cleared: 0, rows_dropped: 0,
  });
}

async function insertTx(t: TestDb, id: string, categoryId: string) {
  await t.db.runAsync(
    `INSERT INTO transactions
       (id, account_id, date, amount_cents, description, original_description,
        is_pending, dropped_at, import_batch_id, created_at, category_id, category_set_manually, applied_rule_id)
     VALUES (?, 'acc', '2026-01-15', -1000, 'test', 'TEST', 0, NULL, 'b', 1000, ?, 0, NULL)`,
    id, categoryId,
  );
}

describe('mergeCategory', () => {
  let t: TestDb;
  beforeEach(async () => {
    t = await createTestDb();
    await setupMergeFixture(t);
  });

  it('reassigns all source transactions to target', async () => {
    await insertTx(t, 'tx1', 'src');
    await insertTx(t, 'tx2', 'src');
    await t.queries.mergeCategory('src', 'tgt');
    const rows = await t.db.getAllAsync<{ category_id: string }>(
      `SELECT category_id FROM transactions`,
    );
    expect(rows.every(r => r.category_id === 'tgt')).toBe(true);
  });

  it('leaves target transactions untouched', async () => {
    await insertTx(t, 'tx-tgt', 'tgt');
    await insertTx(t, 'tx-src', 'src');
    await t.queries.mergeCategory('src', 'tgt');
    const count = await t.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM transactions WHERE category_id = 'tgt'`,
    );
    expect(count?.n).toBe(2); // both reassigned/existing
  });

  it('deletes the source category', async () => {
    await t.queries.mergeCategory('src', 'tgt');
    const cats = await t.queries.getAllCategories();
    expect(cats.map(c => c.id)).not.toContain('src');
  });

  it('target category survives after merge', async () => {
    await t.queries.mergeCategory('src', 'tgt');
    const cats = await t.queries.getAllCategories();
    expect(cats.map(c => c.id)).toContain('tgt');
  });

  it('reassigns rules pointing to source → target', async () => {
    await t.queries.insertRule({
      id: 'r1', account_id: 'acc', category_id: 'src',
      match_type: 'contains', match_text: 'safeway',
      logic: 'AND', conditions: [{ match_type: 'contains', match_text: 'safeway' }],
      priority: 100,
    });
    await t.queries.mergeCategory('src', 'tgt');
    const rules = await t.db.getAllAsync<{ category_id: string }>(
      `SELECT category_id FROM rules WHERE id = 'r1'`,
    );
    expect(rules[0].category_id).toBe('tgt');
  });

  it('reassigns foundational_rule_settings pointing to source → target', async () => {
    await t.queries.upsertFoundationalRuleSetting('acc', 'food-dining', 'src', 1);
    await t.queries.mergeCategory('src', 'tgt');
    const setting = await t.db.getFirstAsync<{ category_id: string }>(
      `SELECT category_id FROM foundational_rule_settings WHERE account_id = 'acc' AND rule_id = 'food-dining'`,
    );
    expect(setting?.category_id).toBe('tgt');
  });

  it('moves source spending goal when target has none for that month', async () => {
    await t.queries.setBudget('acc', 'src', '2026-01', -50000);
    await t.queries.mergeCategory('src', 'tgt');
    const budgets = await t.queries.getBudgetsForAccountYear('acc', '2026');
    const tgtBudget = budgets.find(b => b.category_id === 'tgt' && b.month === '2026-01');
    expect(tgtBudget?.amount_cents).toBe(-50000);
  });

  it('sums spending goals when both source and target have one for the same month', async () => {
    await t.queries.setBudget('acc', 'src', '2026-01', -30000); // source: -$300
    await t.queries.setBudget('acc', 'tgt', '2026-01', -20000); // target: -$200
    await t.queries.mergeCategory('src', 'tgt');
    const budgets = await t.queries.getBudgetsForAccountYear('acc', '2026');
    const tgtBudget = budgets.find(b => b.category_id === 'tgt' && b.month === '2026-01');
    expect(tgtBudget?.amount_cents).toBe(-50000); // −$300 + −$200 = −$500
  });

  it('leaves no orphan budget rows for source after merge', async () => {
    await t.queries.setBudget('acc', 'src', '2026-01', -30000);
    await t.queries.setBudget('acc', 'src', '2026-02', -25000);
    await t.queries.mergeCategory('src', 'tgt');
    const budgets = await t.queries.getBudgetsForAccountYear('acc', '2026');
    expect(budgets.filter(b => b.category_id === 'src')).toHaveLength(0);
  });

  it('works cleanly when source has no transactions, rules, or goals', async () => {
    // source exists but is completely empty — merge should not throw
    await expect(t.queries.mergeCategory('src', 'tgt')).resolves.toBeUndefined();
    const cats = await t.queries.getAllCategories();
    expect(cats.map(c => c.id)).not.toContain('src');
    expect(cats.map(c => c.id)).toContain('tgt');
  });
});
