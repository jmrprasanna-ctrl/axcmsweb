const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_FILE = path.resolve(__dirname, "..", "migrations", "sql", "20260401_baseline_full.sql");

function parseArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

function normalizeDbName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "";
  return normalized;
}

function getDatabases() {
  const fromArg = parseArg("databases");
  const fromEnv = String(process.env.DB_MIGRATION_DATABASES || "").trim();
  const source = fromArg || fromEnv || "inventory,demo";
  const dbs = source
    .split(",")
    .map((x) => normalizeDbName(x))
    .filter(Boolean);
  return [...new Set(dbs)];
}

function runPsql({ filePath, database }) {
  return new Promise((resolve, reject) => {
    const psql = String(process.env.PSQL_PATH || (process.platform === "win32" ? "psql.exe" : "psql")).trim();
    const host = String(process.env.DB_HOST || "127.0.0.1").trim();
    const port = String(process.env.DB_PORT || "5432").trim();
    const user = String(process.env.DB_USER || "postgres").trim();
    const args = [
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      host,
      "-p",
      port,
      "-U",
      user,
      "-d",
      database,
      "-f",
      filePath,
    ];

    const child = spawn(psql, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        PGPASSWORD: String(process.env.DB_PASSWORD || ""),
      },
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code} for database '${database}'`));
      }
    });
  });
}

async function main() {
  const inputFile = parseArg("file");
  const filePath = path.resolve(inputFile || DEFAULT_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Baseline SQL file not found: ${filePath}`);
  }

  const databases = getDatabases();
  if (!databases.length) {
    throw new Error("No valid databases provided. Use --databases=inventory,demo");
  }

  console.log("==> Running baseline migration");
  console.log(`    file: ${filePath}`);
  console.log(`    databases: ${databases.join(", ")}`);

  for (const database of databases) {
    console.log(`==> Applying baseline on '${database}'...`);
    await runPsql({ filePath, database });
    console.log(`    done: ${database}`);
  }

  console.log("==> Baseline migration completed successfully");
}

main().catch((err) => {
  console.error("Baseline migration failed:", err.message || err);
  process.exit(1);
});

