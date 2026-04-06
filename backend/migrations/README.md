# Migration Strategy (Scalable)

This project now supports a baseline-cutoff migration flow so we do not need to maintain an ever-growing active migration list forever.

## Current Commands

- `npm run migrate:baseline`
  - Apply one full baseline SQL file (good for new databases).
- `npm run migrate:sql`
  - Apply incremental SQL files from `backend/migrations/sql`.
- `npm run migrate:mark-baseline -- --through=<file.sql> --databases=<db1,db2>`
  - Mark all migrations up to a cutoff file as already applied in `schema_migrations`.

## Cutoff Mode (Important)

`runMigrations.js` supports:

- `MIGRATION_BASELINE_CUTOFF=<file.sql>`

Behavior:

1. If cutoff file is **already recorded** in `schema_migrations`, then all files `<= cutoff` are skipped.
2. If cutoff file is **not recorded**, normal migration execution continues.

This lets us "freeze" old migrations and keep only recent incremental files active.

## Recommended Future Process

1. Keep one stable baseline file for fresh setup.
2. Create incremental migrations normally.
3. Every 1-3 months:
   - Create a new baseline snapshot.
   - Mark old migrations as applied (`migrate:mark-baseline`).
   - Set `MIGRATION_BASELINE_CUTOFF` in environment.
   - Optionally move old migration files to archive.

## Example

```bash
# 1) Mark all old migrations through this file
npm run migrate:mark-baseline -- --through=20260407_update_expenses_client_and_categories.sql --databases=axiscmsdb,demo

# 2) Enable cutoff
set MIGRATION_BASELINE_CUTOFF=20260407_update_expenses_client_and_categories.sql

# 3) Run normal incremental migration command
npm run migrate:sql
```

