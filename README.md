# BudgetApp

A privacy-first iOS budget tracker. All financial data lives on your device — no servers, no sync, no telemetry.

## What it does

- Add **Checking** and **Credit Card** accounts
- Import CSVs exported from your bank; the app parses and stores only the date, amount, and description — **no account numbers or card numbers are ever stored**
- Duplicate-safe imports: re-uploading the same CSV never creates duplicate transactions
- View **income / expenses / net** for each account, by month or year, across all accounts combined
- Pending transactions (from Citi CC exports) are flagged separately
- **Categories** — create color-coded categories and assign them to transactions manually or in bulk
- **Rules** — auto-categorize transactions on import using text or amount-based rules with AND / OR logic; drag to set priority
- **Budget grid** — plan monthly budgets per category for the full year; see actual spend alongside your targets
- **Backup & restore** — export a full backup to Files / AirDrop; restore from any previous backup file

## Supported CSV formats

| Format key | Bank |
|---|---|
| `boa_checking_v1` | Bank of America – Checking |
| `citi_cc_v1` | Citi – Credit Card |

Adding a new bank format means adding one parser file under `src/parsers/` and registering it in `src/parsers/index.ts`.

## Tech stack

- [Expo](https://expo.dev) (managed, SDK 54) + [Expo Router](https://expo.github.io/router/docs/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — local SQLite, never leaves the device
- [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/) + [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) — CSV file access
- [papaparse](https://www.papaparse.com/) — CSV parsing
- [js-sha256](https://github.com/emn178/js-sha256) — deterministic transaction IDs

## Running locally

```bash
# Install dependencies
npm install

# Start the dev server (open in Expo Go on your iPhone)
npx expo start

# Run unit tests
npm test
```

You'll need [Expo Go](https://expo.dev/go) on your iPhone, or a connected iOS Simulator.

## Privacy posture

- **No network requests** — the app makes no outbound connections of its own
- **No account/card numbers stored** — stripped at parse time
- **No telemetry or analytics**
- **All data in local SQLite** at `Documents/ExpoGo/budgetapp.db` (or similar, depending on build type)

## Roadmap

- **Budget prediction** — rolling 3-month average spend per category
- **Transaction splitting** — split one transaction across multiple categories
- **iCloud backup** (encrypted)
- **Additional bank CSV formats**
