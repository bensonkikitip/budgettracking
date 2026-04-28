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

Run before every release. Pre-flight steps are non-negotiable.

### Pre-flight (must pass before anything else)
1. `npm test` — must pass.
2. `npm run typecheck` — must pass.
3. Smoke-test on Expo Go or Simulator: launch the app and navigate to anything you changed.
4. Confirm `slo-n-ready-backup.json` is NOT staged (`git status` should not list it).

### Update docs (mandatory when applicable)
5. **Update `docs/SCHEMA.md`** if any DB change was made:
   - new table / column / index / constraint
   - new `if (version < N)` block in `src/db/client.ts` (`LATEST_DB_VERSION` bumped)
   - new field on a TypeScript interface in `src/db/queries.ts`
   - change to `BackupData` shape in `src/db/backup.ts`
6. **Update `docs/ARCHITECTURE.md`** if any code-organization change was made:
   - new screen under `app/`
   - new component under `src/components/`
   - new domain module under `src/domain/`
   - new key flow or significant change to import / categorization / budget / backup

### If you added a DB migration
7. Confirm the migration is idempotent (`IF NOT EXISTS` / `try/catch` on `ALTER`) and `LATEST_DB_VERSION` was bumped.
8. In `src/db/backup.ts`, update **both** `writeBackup` (export) and `restoreFromData` (import) to handle the new table/column. They must always cover the same set of tables — if you touch one, touch the other.
9. Bump `BackupData.version` in `src/db/backup.ts` if the change is non-additive (drops or renames a field).
10. On a device with pre-migration data: open the app, confirm `slo-n-ready-backup.json` was written, confirm the changed screens load.

### Version & commit
11. Pick the version bump (semver):
    - **MAJOR** — incompatible UX rewrite or breaking schema change
    - **MINOR** — new user-visible feature
    - **PATCH** — bug fixes, copy, assets, additive schema with a clean migration
12. Bump `version` in **both** `app.json` and `package.json` — they must stay in sync.
13. Commit: `vX.Y.Z — <one-line summary>`.

### Tag, push, release
14. Tag and push: `git tag vX.Y.Z && git push origin main --tags`
15. Create the GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z — …" --notes "…" --latest` — summarize features, fixes, and any DB migration in plain language. Tags alone don't show up in the Releases tab — always create the release too.

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
