require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_TABLE = "schema_migrations";
const MIGRATIONS_DIR = path.resolve(__dirname, "sql");

function parseArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => String(arg || "").startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

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

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function getTargetDatabases() {
  const fromArg = parseArg("databases");
  const fromEnv = String(process.env.DB_MIGRATION_DATABASES || "").trim();
  const source = fromArg || fromEnv || process.env.DB_NAME || "axiscmsdb";
  const list = String(source)
    .split(",")
    .map((v) => normalizeDatabaseName(v))
    .filter(Boolean);
  return [...new Set(list)];
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

async function markForDatabase(databaseName, filesToMark) {
  const client = new Client(getDbConfig(databaseName));
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    for (const fileName of filesToMark) {
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (file_name)
         VALUES ($1)
         ON CONFLICT (file_name) DO NOTHING`,
        [fileName]
      );
    }
    console.log(`[migrate] ${databaseName}: marked ${filesToMark.length} migration(s) as applied`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const allFiles = getMigrationFiles();
  if (!allFiles.length) {
    throw new Error("No sql migration files found.");
  }

  const through = parseArg("through") || String(process.env.MIGRATION_BASELINE_CUTOFF || "").trim();
  if (!through) {
    throw new Error("Missing cutoff migration. Use --through=<file.sql>.");
  }
  if (!allFiles.includes(through)) {
    throw new Error(`Cutoff migration not found in sql folder: ${through}`);
  }

  const filesToMark = allFiles.filter((name) => name.localeCompare(through) <= 0);
  if (!filesToMark.length) {
    throw new Error("No migration files matched cutoff.");
  }

  const databases = getTargetDatabases();
  if (!databases.length) {
    throw new Error("No target databases found. Use --databases=db1,db2");
  }

  console.log(`[migrate] marking baseline through ${through}`);
  console.log(`[migrate] databases: ${databases.join(", ")}`);
  for (const dbName of databases) {
    await markForDatabase(dbName, filesToMark);
  }
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message || err);
  process.exit(1);
});
