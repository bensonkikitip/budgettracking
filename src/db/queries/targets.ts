import { randomUUID } from 'expo-crypto';
import { getDb } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Target {
  id:           string;
  account_id:   string;
  /** NULL = account-level total-spend target; set = category-level target */
  category_id:  string | null;
  /** 'YYYY-MM' */
  month:        string;
  amount_cents: number;
  /** ms epoch when the month-end review fired; NULL = not yet reviewed */
  reviewed_at:  number | null;
  created_at:   number;
}

// ── Read ─────────────────────────────────────────────────────────────────────

/** All targets for a given account + month (account-level + all categories). */
export async function getTargetsForMonth(
  accountId: string,
  month: string,
): Promise<Target[]> {
  const db = await getDb();
  return db.getAllAsync<Target>(
    `SELECT * FROM targets
     WHERE account_id = ? AND month = ?
     ORDER BY category_id ASC NULLS FIRST`,
    accountId, month,
  );
}

/** All targets across all accounts for a given month. */
export async function getAllTargetsForMonth(month: string): Promise<Target[]> {
  const db = await getDb();
  return db.getAllAsync<Target>(
    `SELECT * FROM targets WHERE month = ? ORDER BY account_id, category_id ASC NULLS FIRST`,
    month,
  );
}

/**
 * Targets for months strictly before `beforeMonth` that have not yet been
 * reviewed. Used after import to find closed target months that need a review.
 *
 * `beforeMonth` is the earliest new transaction month found in an import batch
 * that is later than any existing target month — meaning those earlier target
 * months are now closed.
 */
export async function getUnreviewedClosedTargets(
  beforeMonth: string,
): Promise<Target[]> {
  const db = await getDb();
  return db.getAllAsync<Target>(
    `SELECT * FROM targets
     WHERE month < ? AND reviewed_at IS NULL
     ORDER BY month ASC, account_id, category_id ASC NULLS FIRST`,
    beforeMonth,
  );
}

/**
 * Returns the distinct closed months that have unreviewed targets, given that
 * `newMonth` is the first month after any of those target months.
 * Convenience wrapper used by the import screen to decide whether to show the
 * "review targets" CTA.
 */
export async function getUnreviewedClosedMonths(
  newMonth: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ month: string }>(
    `SELECT DISTINCT month FROM targets
     WHERE month < ? AND reviewed_at IS NULL
     ORDER BY month ASC`,
    newMonth,
  );
  return rows.map(r => r.month);
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Upsert a target. If a target for (account_id, category_id, month) already
 * exists, update its amount. category_id may be null for account-level targets.
 */
export async function upsertTarget(target: Omit<Target, 'id' | 'created_at' | 'reviewed_at'>): Promise<string> {
  const db = await getDb();

  // Check for an existing row to reuse its id.
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM targets
     WHERE account_id = ? AND month = ? AND ${target.category_id == null ? 'category_id IS NULL' : 'category_id = ?'}`,
    ...(target.category_id == null
      ? [target.account_id, target.month]
      : [target.account_id, target.month, target.category_id]),
  );

  if (existing) {
    await db.runAsync(
      `UPDATE targets SET amount_cents = ? WHERE id = ?`,
      target.amount_cents, existing.id,
    );
    return existing.id;
  }

  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO targets (id, account_id, category_id, month, amount_cents, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    id, target.account_id, target.category_id ?? null,
    target.month, target.amount_cents, Date.now(),
  );
  return id;
}

/** Delete a single target by id. */
export async function deleteTarget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM targets WHERE id = ?`, id);
}

/** Delete all targets for an account + month (used when re-doing a month's targets). */
export async function deleteTargetsForMonth(
  accountId: string,
  month: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM targets WHERE account_id = ? AND month = ?`,
    accountId, month,
  );
}

/**
 * Mark a target as reviewed (month-end review flow completed).
 * Sets reviewed_at to now if not already set.
 */
export async function markTargetReviewed(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE targets SET reviewed_at = ? WHERE id = ? AND reviewed_at IS NULL`,
    Date.now(), id,
  );
}

/**
 * Mark all unreviewed targets for a given month as reviewed in one shot.
 * Called when the user dismisses the month-end review without going through
 * each target individually.
 */
export async function markMonthReviewed(month: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE targets SET reviewed_at = ? WHERE month = ? AND reviewed_at IS NULL`,
    Date.now(), month,
  );
}

/**
 * Copy targets from `fromMonth` to `toMonth` for a given account,
 * skipping any that already exist in `toMonth`. Used for the "continue
 * with this target" option at month-end review.
 */
export async function rolloverTargets(
  accountId: string,
  fromMonth: string,
  toMonth: string,
  categoryIds: (string | null)[],  // which targets to roll over (null = account-level)
): Promise<void> {
  const db = await getDb();
  for (const catId of categoryIds) {
    // Skip if a target already exists in the destination month (don't overwrite user's own choice)
    const alreadyExists = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM targets WHERE account_id = ? AND month = ? AND ${catId == null ? 'category_id IS NULL' : 'category_id = ?'}`,
      ...(catId == null ? [accountId, toMonth] : [accountId, toMonth, catId]),
    );
    if (alreadyExists) continue;

    const source = await db.getFirstAsync<Target>(
      `SELECT * FROM targets WHERE account_id = ? AND month = ? AND ${catId == null ? 'category_id IS NULL' : 'category_id = ?'}`,
      ...(catId == null ? [accountId, fromMonth] : [accountId, fromMonth, catId]),
    );
    if (!source) continue;

    await upsertTarget({
      account_id:   accountId,
      category_id:  catId,
      month:        toMonth,
      amount_cents: source.amount_cents,
    });
  }
}
