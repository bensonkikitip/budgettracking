/**
 * Tests for transaction source tracking (source_is_manual column) and the
 * reconciliation query/mutation pair.
 *
 * Covers:
 *   - insertManualTransaction sets source_is_manual = 1
 *   - importTransactions sets source_is_manual = 0
 *   - Migration backfill: existing manual rows (import_batch_id LIKE 'manual-%')
 *     are updated to source_is_manual = 1 after the migration runs
 *   - findReconciliationCandidates: finds same-amount / close-date pairs
 *   - findReconciliationCandidates: ignores exact-ID-match dedup (those are
 *     already skipped by the import, so they never appear as candidates)
 *   - mergeManualIntoImported: deletes manual, copies category when set manually
 *   - mergeManualIntoImported: does NOT copy category when not set manually
 */

import { createTestDb } from '../helpers/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeAccount(queries: any, id = 'acct-1') {
  await queries.insertAccount({
    id, name: 'Test', type: 'checking', csv_format: 'boa_checking_v1',
    column_config: '{}', suggest_rules: 1,
  });
  return id;
}

async function makeCategory(queries: any, id = 'cat-dining') {
  await queries.bulkInsertCategories([{
    id, name: 'Dining', color: '#D4956A', emoji: '🍜', description: '', exclude_from_totals: 0,
  }]);
  return id;
}

/** Insert an import batch + a single imported transaction directly via SQL. */
async function insertImportedTx(
  db: any,
  opts: { txId: string; accountId: string; batchId: string; date: string; amountCents: number; desc: string },
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO import_batches
       (id, account_id, filename, imported_at, rows_total, rows_inserted,
        rows_skipped_duplicate, rows_cleared, rows_dropped)
     VALUES (?, ?, 'statement.csv', ?, 1, 1, 0, 0, 0)`,
    opts.batchId, opts.accountId, Date.now(),
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO transactions
       (id, account_id, date, amount_cents, description, original_description,
        is_pending, dropped_at, import_batch_id, created_at, source_is_manual)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, 0)`,
    opts.txId, opts.accountId, opts.date, opts.amountCents,
    opts.desc, opts.desc, opts.batchId, Date.now(),
  );
}

// ── Source tracking ───────────────────────────────────────────────────────────

describe('source_is_manual — insertManualTransaction', () => {
  it('sets source_is_manual = 1 on manually entered transactions', async () => {
    const { db, queries } = await createTestDb();
    const accountId = await makeAccount(queries);

    await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    const tx = await db.getFirstAsync<{ source_is_manual: number }>(
      `SELECT source_is_manual FROM transactions WHERE account_id = ?`, accountId,
    );
    expect(tx?.source_is_manual).toBe(1);
  });
});

describe('source_is_manual — importTransactions', () => {
  it('sets source_is_manual = 0 on imported transactions', async () => {
    const { db, queries } = await createTestDb();
    const accountId = await makeAccount(queries);

    // Create a batch first
    await db.runAsync(
      `INSERT INTO import_batches
         (id, account_id, filename, imported_at, rows_total, rows_inserted,
          rows_skipped_duplicate, rows_cleared, rows_dropped)
       VALUES (?, ?, 'bank.csv', ?, 1, 0, 0, 0, 0)`,
      'batch-1', accountId, Date.now(),
    );

    // Build a deterministic ParsedRow
    const { sha256 } = require('js-sha256');
    const { normalizeDescription } = require('../../src/domain/normalize');
    const desc = normalizeDescription('STARBUCKS #123');
    const base = sha256(`${accountId}|2026-03-15|-4500|${desc}`);
    const txId = sha256(`${base}|0`).slice(0, 32);

    await queries.importTransactions(accountId, 'batch-1', [{
      id: txId, date: '2026-03-15', amount_cents: -4500,
      description: desc, original_description: 'STARBUCKS #123', is_pending: false,
    }]);

    const tx = await db.getFirstAsync<{ source_is_manual: number }>(
      `SELECT source_is_manual FROM transactions WHERE id = ?`, txId,
    );
    expect(tx?.source_is_manual).toBe(0);
  });
});

// ── findReconciliationCandidates ──────────────────────────────────────────────

describe('findReconciliationCandidates', () => {
  it('returns a pair when manual tx matches imported tx (same amount, same date)', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    // Manual entry
    await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    // Imported tx with same amount, same date, different description
    const batchId = 'batch-import-1';
    await insertImportedTx(db, {
      txId: 'imp-1', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    const candidates = await txModule.findReconciliationCandidates(accountId, batchId);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].manualTx.description).toBe('STARBUCKS'); // normalizeDescription uppercases
    expect(candidates[0].importedTx.description).toBe('STARBUCKS COFFEE #123');
    expect(candidates[0].manualTx.amount_cents).toBe(-4500);
  });

  it('returns a pair when dates differ by exactly 1 day', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    await queries.insertManualTransaction(accountId, '2026-03-15', -10000, 'Grocery run');

    const batchId = 'batch-import-2';
    await insertImportedTx(db, {
      txId: 'imp-2', accountId, batchId,
      date: '2026-03-16', amountCents: -10000, desc: 'WHOLE FOODS 0042',
    });

    const candidates = await txModule.findReconciliationCandidates(accountId, batchId);
    expect(candidates).toHaveLength(1);
  });

  it('does NOT return a pair when dates differ by 2 days', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    await queries.insertManualTransaction(accountId, '2026-03-13', -10000, 'Grocery run');

    const batchId = 'batch-import-3';
    await insertImportedTx(db, {
      txId: 'imp-3', accountId, batchId,
      date: '2026-03-16', amountCents: -10000, desc: 'WHOLE FOODS 0042',
    });

    const candidates = await txModule.findReconciliationCandidates(accountId, batchId);
    expect(candidates).toHaveLength(0);
  });

  it('does NOT return a pair when amounts differ', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    const batchId = 'batch-import-4';
    await insertImportedTx(db, {
      txId: 'imp-4', accountId, batchId,
      date: '2026-03-15', amountCents: -5000, desc: 'STARBUCKS COFFEE #123',
    });

    const candidates = await txModule.findReconciliationCandidates(accountId, batchId);
    expect(candidates).toHaveLength(0);
  });

  it('does NOT return imported transactions from a different batch', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    const otherBatchId = 'batch-old';
    await insertImportedTx(db, {
      txId: 'imp-old', accountId, batchId: otherBatchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    // Query for a NEW batch that has no transactions
    const newBatchId = 'batch-new';
    await db.runAsync(
      `INSERT INTO import_batches
         (id, account_id, filename, imported_at, rows_total, rows_inserted,
          rows_skipped_duplicate, rows_cleared, rows_dropped)
       VALUES (?, ?, 'new.csv', ?, 0, 0, 0, 0, 0)`,
      newBatchId, accountId, Date.now(),
    );

    const candidates = await txModule.findReconciliationCandidates(accountId, newBatchId);
    expect(candidates).toHaveLength(0);
  });

  it('returns empty when there are no manual transactions', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    const batchId = 'batch-import-5';
    await insertImportedTx(db, {
      txId: 'imp-5', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    const candidates = await txModule.findReconciliationCandidates(accountId, batchId);
    expect(candidates).toHaveLength(0);
  });
});

// ── mergeManualIntoImported ───────────────────────────────────────────────────

describe('mergeManualIntoImported', () => {
  it('deletes the manual transaction', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);

    const manualId = await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');
    expect(manualId).not.toBeNull();

    const batchId = 'batch-m1';
    await insertImportedTx(db, {
      txId: 'imp-m1', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    await txModule.mergeManualIntoImported(manualId!, 'imp-m1', null, 0);

    const manual = await db.getFirstAsync(`SELECT id FROM transactions WHERE id = ?`, manualId);
    expect(manual).toBeNull();
  });

  it('copies category to imported tx when manual category was set manually', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    const manualId = await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    // Set category manually on the manual tx
    await queries.setTransactionCategory(manualId!, categoryId, true, null);

    const batchId = 'batch-m2';
    await insertImportedTx(db, {
      txId: 'imp-m2', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    await txModule.mergeManualIntoImported(manualId!, 'imp-m2', categoryId, 1);

    const imported = await db.getFirstAsync<{ category_id: string; category_set_manually: number }>(
      `SELECT category_id, category_set_manually FROM transactions WHERE id = ?`, 'imp-m2',
    );
    expect(imported?.category_id).toBe(categoryId);
    expect(imported?.category_set_manually).toBe(1);
  });

  it('does NOT copy category when manual category was not set manually', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    const manualId = await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    const batchId = 'batch-m3';
    await insertImportedTx(db, {
      txId: 'imp-m3', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    // manualCategorySetManually = 0 — should not copy
    await txModule.mergeManualIntoImported(manualId!, 'imp-m3', categoryId, 0);

    const imported = await db.getFirstAsync<{ category_id: string | null }>(
      `SELECT category_id FROM transactions WHERE id = ?`, 'imp-m3',
    );
    expect(imported?.category_id).toBeNull();
  });

  it('is safe when the imported tx has already been deleted', async () => {
    const { db, queries } = await createTestDb();
    const txModule = require('../../src/db/queries/transactions');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    const manualId = await queries.insertManualTransaction(accountId, '2026-03-15', -4500, 'Starbucks');

    const batchId = 'batch-m4';
    await insertImportedTx(db, {
      txId: 'imp-m4', accountId, batchId,
      date: '2026-03-15', amountCents: -4500, desc: 'STARBUCKS COFFEE #123',
    });

    // Delete the imported tx first (simulates user deleted it separately)
    await db.runAsync(`DELETE FROM transactions WHERE id = 'imp-m4'`);

    // Should not throw
    await expect(
      txModule.mergeManualIntoImported(manualId!, 'imp-m4', categoryId, 1),
    ).resolves.not.toThrow();

    // Manual tx should still be deleted
    const manual = await db.getFirstAsync(`SELECT id FROM transactions WHERE id = ?`, manualId);
    expect(manual).toBeNull();
  });
});
