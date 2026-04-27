import { getDb } from './client';

export type AccountType = 'checking' | 'credit_card';
export type CsvFormat = 'boa_checking_v1' | 'citi_cc_v1';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  csv_format: CsvFormat;
  created_at: number;
}

export interface ImportBatch {
  id: string;
  account_id: string;
  filename: string | null;
  imported_at: number;
  rows_total: number;
  rows_inserted: number;
  rows_skipped_duplicate: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  amount_cents: number;
  description: string;
  original_description: string;
  is_pending: number;
  import_batch_id: string;
  created_at: number;
}

export interface AccountSummary {
  income_cents: number;
  expense_cents: number;
  net_cents: number;
  transaction_count: number;
  last_imported_at: number | null;
}

// --- Accounts ---

export async function insertAccount(account: Omit<Account, 'created_at'> & { created_at?: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, csv_format, created_at) VALUES (?, ?, ?, ?, ?)`,
    account.id,
    account.name,
    account.type,
    account.csv_format,
    account.created_at ?? Date.now(),
  );
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDb();
  return db.getAllAsync<Account>(`SELECT * FROM accounts ORDER BY created_at ASC`);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM accounts WHERE id = ?`, id);
}

// --- Import batches ---

export async function insertImportBatch(batch: ImportBatch): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO import_batches (id, account_id, filename, imported_at, rows_total, rows_inserted, rows_skipped_duplicate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    batch.id,
    batch.account_id,
    batch.filename ?? null,
    batch.imported_at,
    batch.rows_total,
    batch.rows_inserted,
    batch.rows_skipped_duplicate,
  );
}

// --- Transactions ---

export interface ParsedRow {
  id: string;
  date: string;
  amount_cents: number;
  description: string;
  original_description: string;
  is_pending: boolean;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  total: number;
}

export async function importTransactions(
  accountId: string,
  batchId: string,
  rows: ParsedRow[],
): Promise<ImportResult> {
  const db = await getDb();
  let inserted = 0;
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO transactions
           (id, account_id, date, amount_cents, description, original_description, is_pending, import_batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.id,
        accountId,
        row.date,
        row.amount_cents,
        row.description,
        row.original_description,
        row.is_pending ? 1 : 0,
        batchId,
        now,
      );
      if (result.changes > 0) inserted++;
    }
  });

  return { inserted, skipped: rows.length - inserted, total: rows.length };
}

export async function getTransactions(accountId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, created_at DESC`,
    accountId,
  );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ORDER BY date DESC, created_at DESC`,
  );
}

export async function getAccountSummary(accountId: string): Promise<AccountSummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    income_cents: number;
    expense_cents: number;
    net_cents: number;
    transaction_count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END), 0) AS expense_cents,
       COALESCE(SUM(amount_cents), 0) AS net_cents,
       COUNT(*) AS transaction_count
     FROM transactions WHERE account_id = ?`,
    accountId,
  );
  const lastBatch = await db.getFirstAsync<{ imported_at: number }>(
    `SELECT imported_at FROM import_batches WHERE account_id = ? ORDER BY imported_at DESC LIMIT 1`,
    accountId,
  );
  return {
    income_cents: row?.income_cents ?? 0,
    expense_cents: row?.expense_cents ?? 0,
    net_cents: row?.net_cents ?? 0,
    transaction_count: row?.transaction_count ?? 0,
    last_imported_at: lastBatch?.imported_at ?? null,
  };
}

export async function getAllAccountsSummary(): Promise<AccountSummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    income_cents: number;
    expense_cents: number;
    net_cents: number;
    transaction_count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END), 0) AS expense_cents,
       COALESCE(SUM(amount_cents), 0) AS net_cents,
       COUNT(*) AS transaction_count
     FROM transactions`,
  );
  const lastBatch = await db.getFirstAsync<{ imported_at: number }>(
    `SELECT imported_at FROM import_batches ORDER BY imported_at DESC LIMIT 1`,
  );
  return {
    income_cents: row?.income_cents ?? 0,
    expense_cents: row?.expense_cents ?? 0,
    net_cents: row?.net_cents ?? 0,
    transaction_count: row?.transaction_count ?? 0,
    last_imported_at: lastBatch?.imported_at ?? null,
  };
}
