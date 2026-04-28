# BudgetApp — Claude Context

A privacy-first iOS budget tracker (Slo & Ready). All data lives on-device in SQLite — no servers, no sync, no telemetry. Built with Expo + Expo Router + expo-sqlite.

## Where to look (read on demand — do NOT preload)

| When the task involves… | Read this |
|---|---|
| **Database tables, columns, types, migrations, backup format** | [docs/SCHEMA.md](docs/SCHEMA.md) |
| **Code layout, screens, components, domain modules, key flows (import, categorization, budget, backup)** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Running, building, testing, dev environment** | [README.md](README.md) |

These docs are the source of truth for schema and architecture. **Do not re-derive by reading dozens of files.** Read the doc, then jump to specific source files only when the doc points you there.

## Ship & release checklist

Run this every time a new version ships. **Steps 1 and 2 are mandatory whenever schema or functionality changes.**

1. **Update `docs/SCHEMA.md`** if any database change was made:
   - new table, column, index, or constraint
   - new migration step in `src/db/client.ts` (bump `LATEST_DB_VERSION`)
   - new field on a TypeScript interface in `src/db/queries.ts`
   - change to `BackupData` shape in `src/db/backup.ts`
2. **Update `docs/ARCHITECTURE.md`** if any code-organization change was made:
   - new screen under `app/`
   - new component under `src/components/`
   - new domain module under `src/domain/`
   - new key flow or significant change to an existing one (import, categorization, budget, backup)
3. Bump `version` in `app.json`.
4. Commit with a message like `vX.Y.Z — <one-line summary>`.
5. Tag and push: `git tag vX.Y.Z && git push origin main --tags`.
6. Create the GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z — …" --notes "…" --latest`. Tags alone don't show up in the Releases tab — always create the release too.

## Critical conventions (don't violate without asking)

- **Money is always `INTEGER` cents.** Never store dollars as floats. Negative = expense / debit, positive = income / credit. Use `centsToDollars` / `parseDollarsToCents` in `src/domain/money.ts`.
- **Dates are ISO `YYYY-MM-DD` strings.** Months are `YYYY-MM`. Timestamps (`created_at`, `imported_at`, `dropped_at`) are ms since epoch as `INTEGER`.
- **Transaction IDs are deterministic** — SHA256 over `account_id|date|amount|normalized_description` (with a sequence counter for exact dupes). Re-importing the same CSV is safe; never generate random IDs for transactions.
- **Foreign keys are enforced** (`PRAGMA foreign_keys = ON` in `getDb()`). Cascading deletes are intentional — deleting an account wipes its transactions, batches, rules, and budgets.
- **Migrations are forward-only and idempotent.** Each migration block in `src/db/client.ts` is guarded so it's safe to re-run. Bump `LATEST_DB_VERSION` and add a new `if (version < N)` block; do NOT edit historical migrations.
- **Pre-migration auto-backup** runs before any schema change (see `writePreMigrationBackup` in `client.ts`). Don't bypass it.
- **Dropped transactions stay in the DB** with `dropped_at` set — they're filtered out of summaries via `dropped_at IS NULL`, not deleted. This preserves audit trail and lets pendings be un-dropped.
- **`category_set_manually = 1`** means the user picked the category by hand; rule auto-application must skip these rows (`bulkSetTransactionCategories` enforces this in its `WHERE` clause).
- **No new dependencies without asking.** The app is intentionally lean (Expo, expo-sqlite, expo-file-system, papaparse, js-sha256, Nunito font). Adding a new package is a decision, not a default.
- **No network calls, no analytics, no telemetry.** Privacy is a product promise, not a preference.

## User profile

The owner is new to coding ("vibe coding" with Claude). Explain non-obvious decisions, prefer simple readable solutions, and ask before making large or hard-to-reverse changes.
