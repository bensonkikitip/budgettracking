CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('checking', 'credit_card')),
  csv_format TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS import_batches (
  id                     TEXT PRIMARY KEY,
  account_id             TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename               TEXT,
  imported_at            INTEGER NOT NULL,
  rows_total             INTEGER NOT NULL,
  rows_inserted          INTEGER NOT NULL,
  rows_skipped_duplicate INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id                   TEXT PRIMARY KEY,
  account_id           TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date                 TEXT NOT NULL,
  amount_cents         INTEGER NOT NULL,
  description          TEXT NOT NULL,
  original_description TEXT NOT NULL,
  is_pending           INTEGER NOT NULL DEFAULT 0,
  import_batch_id      TEXT NOT NULL REFERENCES import_batches(id),
  created_at           INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions (account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_date         ON transactions (date DESC);
