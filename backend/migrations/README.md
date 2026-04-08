# Migration Strategy (Single SQL)

This project now uses one canonical SQL file:

- `database/axiscmsdb.sql`

## Runtime Behavior

- `npm run migrate` runs `backend/migrations/runMigrations.js`.
- The runner applies only `database/axiscmsdb.sql`.
- Applied state is tracked in `schema_migrations` with key `axiscmsdb.sql`.
- If a database already has legacy migration records, the runner safely marks `axiscmsdb.sql` as applied and skips re-running SQL.
- If a database has existing AXIS tables but no migration history, the runner also marks `axiscmsdb.sql` as applied to avoid destructive reinitialization.

## Related Scripts

- `node backend/scripts/runBaselineMigration.js`
  - Applies `database/axiscmsdb.sql` directly (default DBs: `axiscmsdb,demo`).
- `node backend/migrations/markBaselineApplied.js --databases=axiscmsdb,demo`
  - Marks `axiscmsdb.sql` as applied without executing SQL.
