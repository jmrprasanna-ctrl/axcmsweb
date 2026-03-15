const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function getTemplatePaths() {
  const invoiceTemplate = (process.env.INVOICE_TEMPLATE_PDF || "D:\\26XX001 PUL1V INVOICE V.pdf").trim();
  const quotationTemplate = (process.env.QUOTATION_TEMPLATE_PDF || "D:\\26XX001 PUL1V QUATATION.pdf").trim();
  const quotation2Template = (process.env.QUOTATION2_TEMPLATE_PDF || "D:\\26XX001 PUL1V QUATATION 2.pdf").trim();
  return { invoiceTemplate, quotationTemplate, quotation2Template };
}

function checkFile(filePath) {
  const resolved = path.resolve(filePath);
  return {
    path: resolved,
    exists: fs.existsSync(resolved),
  };
}

function normalizeCommandPath(command) {
  const value = String(command || "").trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function checkCommand(command, args = ["--version"]) {
  return new Promise((resolve) => {
    const normalized = normalizeCommandPath(command);
    if (
      (normalized.includes("\\") || normalized.includes("/")) &&
      fs.existsSync(path.resolve(normalized))
    ) {
      resolve(true);
      return;
    }
    try {
      const child = spawn(normalized, args, { shell: false });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    } catch (_err) {
      resolve(false);
    }
  });
}

async function getRuntimeChecks() {
  const pgDumpPath = (process.env.PG_DUMP_PATH || (process.platform === "win32" ? "pg_dump.exe" : "pg_dump")).trim();
  const psqlPath = (process.env.PSQL_PATH || (process.platform === "win32" ? "psql.exe" : "psql")).trim();

  const templatePaths = getTemplatePaths();
  const templateFiles = {
    invoice: checkFile(templatePaths.invoiceTemplate),
    quotation: checkFile(templatePaths.quotationTemplate),
    quotation2: checkFile(templatePaths.quotation2Template),
  };

  const tools = {
    pg_dump: {
      command: pgDumpPath,
      available: await checkCommand(pgDumpPath),
    },
    psql: {
      command: psqlPath,
      available: await checkCommand(psqlPath),
    },
  };

  const env = {
    JWT_SECRET: !!String(process.env.JWT_SECRET || "").trim(),
    DB_HOST: !!String(process.env.DB_HOST || "").trim(),
    DB_NAME: !!String(process.env.DB_NAME || "").trim(),
    DB_USER: !!String(process.env.DB_USER || "").trim(),
  };

  return {
    env,
    tools,
    templateFiles,
  };
}

function summarizeStatus(checks, dbConnected) {
  const toolOk = checks.tools.pg_dump.available && checks.tools.psql.available;
  const templatesOk =
    checks.templateFiles.invoice.exists &&
    checks.templateFiles.quotation.exists &&
    checks.templateFiles.quotation2.exists;

  return {
    ok: Boolean(dbConnected) && toolOk && templatesOk,
    dbConnected: Boolean(dbConnected),
    checks,
  };
}

module.exports = {
  getRuntimeChecks,
  summarizeStatus,
};
