const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const db = require("../config/database");
const { getRuntimeChecks, summarizeStatus } = require("../utils/startupChecks");

async function run() {
  console.log("Running setup checks...");
  const DB_SYNC_ALTER = String(process.env.DB_SYNC_ALTER || "true").toLowerCase() !== "false";
  const DB_SYNC_FORCE = String(process.env.DB_SYNC_FORCE || "false").toLowerCase() === "true";

  let dbConnected = false;
  try {
    await db.authenticate();
    dbConnected = true;
    console.log("Database connection: OK");
  } catch (err) {
    console.error("Database connection: FAILED");
    console.error(err.message || err);
  }

  const checks = await getRuntimeChecks();
  const status = summarizeStatus(checks, dbConnected);

  console.log("\nTools:");
  console.log(`- pg_dump (${checks.tools.pg_dump.command}): ${checks.tools.pg_dump.available ? "OK" : "MISSING"}`);
  console.log(`- psql    (${checks.tools.psql.command}): ${checks.tools.psql.available ? "OK" : "MISSING"}`);

  console.log("\nTemplates:");
  console.log(`- Invoice template: ${checks.templateFiles.invoice.exists ? "OK" : "MISSING"} -> ${checks.templateFiles.invoice.path}`);
  console.log(`- Quotation template: ${checks.templateFiles.quotation.exists ? "OK" : "MISSING"} -> ${checks.templateFiles.quotation.path}`);
  console.log(`- Quotation 2 template: ${checks.templateFiles.quotation2.exists ? "OK" : "MISSING"} -> ${checks.templateFiles.quotation2.path}`);

  if (dbConnected) {
    const syncOptions = DB_SYNC_FORCE ? { force: true } : { alter: DB_SYNC_ALTER };
    console.log(`\nSyncing database schema (${DB_SYNC_FORCE ? "force=true" : `alter=${DB_SYNC_ALTER}`})...`);
    await db.sync(syncOptions);
    console.log("Database sync: OK");
  }

  console.log(`\nOverall setup status: ${status.ok ? "READY" : "NEEDS ATTENTION"}`);
  process.exit(status.ok ? 0 : 1);
}

run().catch((err) => {
  console.error("Setup failed:", err.message || err);
  process.exit(1);
});
