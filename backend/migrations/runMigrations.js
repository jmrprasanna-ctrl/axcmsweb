require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_TABLE = "schema_migrations";
const CANONICAL_MIGRATION_FILE = path.resolve(__dirname, "..", "..", "database", "axiscmsdb.sql");
const CANONICAL_MIGRATION_KEY = "axiscmsdb.sql";

function getDbConfig(database) {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database,
  };
}

function normalizeDatabaseName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "";
  return normalized;
}

async function listTargetDatabases() {
  const admin = new Client(getDbConfig("postgres"));
  await admin.connect();
  try {
    const rs = await admin.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    const existing = new Set((rs.rows || []).map((r) => normalizeDatabaseName(r.datname)).filter(Boolean));
    const requested = new Set(
      ["axiscmsdb", "demo", normalizeDatabaseName(process.env.DB_NAME || "axiscmsdb"), "inventory"].filter(Boolean)
    );

    const discoveryDb = existing.has("axiscmsdb") ? "axiscmsdb" : (existing.has("inventory") ? "inventory" : "");
    if (discoveryDb) {
      const discoveryClient = new Client(getDbConfig(discoveryDb));
      try {
        await discoveryClient.connect();

        const profileTableRs = await discoveryClient.query("SELECT to_regclass('public.company_profiles') AS name");
        if (profileTableRs.rows?.[0]?.name) {
          const profileDbRs = await discoveryClient.query(
            `SELECT DISTINCT LOWER(TRIM(database_name)) AS database_name
             FROM company_profiles
             WHERE database_name IS NOT NULL AND TRIM(database_name) <> ''`
          );
          for (const row of profileDbRs.rows || []) {
            const name = normalizeDatabaseName(row.database_name);
            if (name) requested.add(name);
          }
        }

        const userMappingsTableRs = await discoveryClient.query("SELECT to_regclass('public.user_mappings') AS name");
        if (userMappingsTableRs.rows?.[0]?.name) {
          const mapDbRs = await discoveryClient.query(
            `SELECT DISTINCT LOWER(TRIM(database_name)) AS database_name
             FROM user_mappings
             WHERE database_name IS NOT NULL AND TRIM(database_name) <> ''`
          );
          for (const row of mapDbRs.rows || []) {
            const name = normalizeDatabaseName(row.database_name);
            if (name) requested.add(name);
          }
        }

        const createdDbTableRs = await discoveryClient.query("SELECT to_regclass('public.company_databases') AS name");
        if (createdDbTableRs.rows?.[0]?.name) {
          const createdDbRs = await discoveryClient.query(
            `SELECT DISTINCT LOWER(TRIM(database_name)) AS database_name
             FROM company_databases
             WHERE database_name IS NOT NULL AND TRIM(database_name) <> ''`
          );
          for (const row of createdDbRs.rows || []) {
            const name = normalizeDatabaseName(row.database_name);
            if (name) requested.add(name);
          }
        }
      } catch (_err) {
        // Ignore discovery failures and continue with known defaults.
      } finally {
        await discoveryClient.end().catch(() => {});
      }
    }

    return [...requested].filter((db) => existing.has(db)).sort((a, b) => a.localeCompare(b));
  } finally {
    await admin.end().catch(() => {});
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      file_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function hasExistingBusinessSchema(client) {
  const rs = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users',
          'customers',
          'invoices',
          'expenses',
          'cases',
          'plaints',
          'answers',
          'witnesses',
          'judgments'
        )
    ) AS has_schema
  `);
  return Boolean(rs.rows?.[0]?.has_schema);
}

async function runForDatabase(databaseName, sqlText) {
  const client = new Client(getDbConfig(databaseName));
  await client.connect();
  try {
    await ensureMigrationsTable(client);

    const appliedRs = await client.query(`SELECT file_name FROM ${MIGRATIONS_TABLE}`);
    const appliedFiles = (appliedRs.rows || []).map((r) => String(r.file_name || "").trim()).filter(Boolean);
    const applied = new Set(appliedFiles);

    if (applied.has(CANONICAL_MIGRATION_KEY)) {
      console.log(`[migrate] ${databaseName}: canonical migration already applied`);
      return;
    }

    if (appliedFiles.length > 0) {
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (file_name)
         VALUES ($1)
         ON CONFLICT (file_name) DO NOTHING`,
        [CANONICAL_MIGRATION_KEY]
      );
      console.log(`[migrate] ${databaseName}: legacy migrations detected, marked ${CANONICAL_MIGRATION_KEY} as applied`);
      return;
    }

    const hasSchema = await hasExistingBusinessSchema(client);
    if (hasSchema) {
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (file_name)
         VALUES ($1)
         ON CONFLICT (file_name) DO NOTHING`,
        [CANONICAL_MIGRATION_KEY]
      );
      console.log(
        `[migrate] ${databaseName}: existing schema detected with no migration history, marked ${CANONICAL_MIGRATION_KEY} as applied`
      );
      return;
    }

    await client.query(sqlText);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (file_name)
       VALUES ($1)
       ON CONFLICT (file_name) DO NOTHING`,
      [CANONICAL_MIGRATION_KEY]
    );
    console.log(`[migrate] ${databaseName}: applied ${CANONICAL_MIGRATION_KEY}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  if (!fs.existsSync(CANONICAL_MIGRATION_FILE)) {
    throw new Error(`Canonical SQL file not found: ${CANONICAL_MIGRATION_FILE}`);
  }

  const sqlText = fs.readFileSync(CANONICAL_MIGRATION_FILE, "utf8");
  const dbs = await listTargetDatabases();
  if (!dbs.length) {
    console.log("[migrate] no target databases found");
    return;
  }

  for (const dbName of dbs) {
    await runForDatabase(dbName, sqlText);
  }
  console.log("[migrate] complete");
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message || err);
  process.exit(1);
});
