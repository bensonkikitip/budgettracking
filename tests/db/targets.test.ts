import { createTestDb } from '../helpers/db';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeAccount(queries: any, name = 'Chase Freedom') {
  const id = `acct-${Math.random().toString(36).slice(2)}`;
  await queries.insertAccount({
    id, name, type: 'credit_card', csv_format: 'citi_cc_v1',
    column_config: '{}', created_at: Date.now(),
  });
  return id;
}

async function makeCategory(queries: any, name = 'Groceries'): Promise<string> {
  const id = `cat-${name.toLowerCase().replace(/\s+/g, '-')}`;
  await queries.bulkInsertCategories([{
    id, name, color: '#4CAF50', emoji: '🛒', description: '', exclude_from_totals: 0,
  }]);
  return id;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('targets — upsertTarget / getTargetsForMonth', () => {
  it('creates a category-level target and reads it back', async () => {
    const { queries, db } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    await targetsModule.upsertTarget({
      account_id:   accountId,
      category_id:  categoryId,
      month:        '2025-11',
      amount_cents: 30000,
    });

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(targets).toHaveLength(1);
    expect(targets[0].amount_cents).toBe(30000);
    expect(targets[0].category_id).toBe(categoryId);
    expect(targets[0].reviewed_at).toBeNull();
  });

  it('creates an account-level target (category_id null)', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);

    await targetsModule.upsertTarget({
      account_id:   accountId,
      category_id:  null,
      month:        '2025-11',
      amount_cents: 80000,
    });

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(targets).toHaveLength(1);
    expect(targets[0].category_id).toBeNull();
    expect(targets[0].amount_cents).toBe(80000);
  });

  it('upsert updates amount when target already exists', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-11', amount_cents: 20000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-11', amount_cents: 25000 });

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(targets).toHaveLength(1);
    expect(targets[0].amount_cents).toBe(25000);
  });
});

describe('targets — markTargetReviewed / markMonthReviewed', () => {
  it('marks a single target reviewed', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    const id = await targetsModule.upsertTarget({
      account_id: accountId, category_id: categoryId, month: '2025-10', amount_cents: 10000,
    });
    await targetsModule.markTargetReviewed(id);

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-10');
    expect(targets[0].reviewed_at).not.toBeNull();
  });

  it('markMonthReviewed stamps all targets in that month', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const catA = await makeCategory(queries, 'Groceries');
    const catB = await makeCategory(queries, 'Dining');

    await targetsModule.upsertTarget({ account_id: accountId, category_id: catA, month: '2025-10', amount_cents: 30000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: catB, month: '2025-10', amount_cents: 15000 });
    await targetsModule.markMonthReviewed('2025-10');

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-10');
    expect(targets.every((t: any) => t.reviewed_at !== null)).toBe(true);
  });
});

describe('targets — getUnreviewedClosedMonths', () => {
  it('returns months with unreviewed targets before the given month', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-09', amount_cents: 10000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-10', amount_cents: 10000 });
    // 2025-11 is the "new month" from the import — 09 and 10 should be closed
    const months = await targetsModule.getUnreviewedClosedMonths('2025-11');
    expect(months).toEqual(['2025-09', '2025-10']);
  });

  it('excludes already-reviewed months', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-09', amount_cents: 10000 });
    await targetsModule.markMonthReviewed('2025-09');
    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-10', amount_cents: 10000 });

    const months = await targetsModule.getUnreviewedClosedMonths('2025-11');
    expect(months).toEqual(['2025-10']); // 09 already reviewed
  });

  it('returns empty when no unreviewed targets exist before newMonth', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-11', amount_cents: 10000 });
    const months = await targetsModule.getUnreviewedClosedMonths('2025-11');
    expect(months).toHaveLength(0); // same month, not "before"
  });
});

describe('targets — rolloverTargets', () => {
  it('copies selected targets to the next month', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const catA = await makeCategory(queries, 'Groceries');
    const catB = await makeCategory(queries, 'Dining');

    await targetsModule.upsertTarget({ account_id: accountId, category_id: catA, month: '2025-10', amount_cents: 30000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: catB, month: '2025-10', amount_cents: 15000 });

    // Roll over only Groceries
    await targetsModule.rolloverTargets(accountId, '2025-10', '2025-11', [catA]);

    const nov = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(nov).toHaveLength(1);
    expect(nov[0].category_id).toBe(catA);
    expect(nov[0].amount_cents).toBe(30000);
  });

  it('does not duplicate if target already exists in destination month', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const catA = await makeCategory(queries, 'Groceries');

    await targetsModule.upsertTarget({ account_id: accountId, category_id: catA, month: '2025-10', amount_cents: 30000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: catA, month: '2025-11', amount_cents: 25000 });

    await targetsModule.rolloverTargets(accountId, '2025-10', '2025-11', [catA]);

    const nov = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(nov).toHaveLength(1);
    expect(nov[0].amount_cents).toBe(25000); // existing amount preserved
  });
});

describe('targets — deleteTarget / deleteTargetsForMonth', () => {
  it('deletes a single target', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const categoryId = await makeCategory(queries);

    const id = await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-11', amount_cents: 10000 });
    await targetsModule.deleteTarget(id);

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(targets).toHaveLength(0);
  });

  it('deletes all targets for an account+month', async () => {
    const { queries } = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(queries);
    const catA = await makeCategory(queries, 'Groceries');
    const catB = await makeCategory(queries, 'Dining');

    await targetsModule.upsertTarget({ account_id: accountId, category_id: catA, month: '2025-11', amount_cents: 30000 });
    await targetsModule.upsertTarget({ account_id: accountId, category_id: catB, month: '2025-11', amount_cents: 15000 });
    await targetsModule.deleteTargetsForMonth(accountId, '2025-11');

    const targets = await targetsModule.getTargetsForMonth(accountId, '2025-11');
    expect(targets).toHaveLength(0);
  });
});

describe('targets — backup / restore round-trip', () => {
  it('targets survive a backup → restore cycle', async () => {
    const before = await createTestDb();
    const targetsModule = require('../../src/db/queries/targets');
    const accountId = await makeAccount(before.queries);
    const categoryId = await makeCategory(before.queries);

    await targetsModule.upsertTarget({ account_id: accountId, category_id: categoryId, month: '2025-11', amount_cents: 30000 });
    await before.backup.writeBackup();

    // Capture JSON before createTestDb wipes the mock filesystem
    const json = before.fs._peekMockFs().get(before.backup.BACKUP_PATH);
    expect(json).toBeDefined();
    const parsed = JSON.parse(json!);
    expect(parsed.version).toBe(5);

    // Restore into a fresh DB
    const after = await createTestDb();
    const t2 = require('../../src/db/queries/targets');
    await after.backup.restoreFromData(parsed);

    const restored = await t2.getAllTargetsForMonth('2025-11');
    expect(restored).toHaveLength(1);
    expect(restored[0].amount_cents).toBe(30000);
    expect(restored[0].category_id).toBe(categoryId);
  });

  it('backup version is 5', async () => {
    const { backup, fs } = await createTestDb();
    await backup.writeBackup();
    const json = fs._peekMockFs().get(backup.BACKUP_PATH);
    expect(json).toBeDefined();
    expect(JSON.parse(json!).version).toBe(5);
  });
});
