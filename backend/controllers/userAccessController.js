const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { spawn } = require("child_process");
const db = require("../config/database");
const User = require("../models/User");
const UserAccess = require("../models/UserAccess");
const UiSetting = require("../models/UiSetting");
const EmailSetup = require("../models/EmailSetup");
const Category = require("../models/Category");
const CategoryModelOption = require("../models/CategoryModelOption");
const DEMO_DB_NAME = "demo";
const INVENTORY_DB_NAME = db.normalizeDatabaseName(process.env.DB_NAME || "axiscmsdb") || "axiscmsdb";
const RESERVED_DATABASES = new Set(["postgres", "template0", "template1"]);
const DATABASE_REGISTRY_TABLE = "company_databases";
const DATABASE_STORAGE_ROOT = path.resolve(__dirname, "../storage/databases");
const COMPANY_REGISTRY_TABLE = "company_profiles";
const COMPANY_STORAGE_ROOT = path.resolve(__dirname, "../storage/companies");
const COMPANY_LOGO_EXTENSIONS = new Set([".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".tif", ".png"]);
const USER_INVOICE_MAPPING_TABLE = "user_invoice_mappings";
const USER_QUOTATION_RENDER_TABLE = "user_quotation_render_settings";
const INV_MAP_PATH = "/users/inv-map.html";
const QUOTATION2_RENDER_KEYS = new Set([
  "customerName",
  "customerAddress",
  "customerTel",
  "count",
  "serialNo",
  "date",
  "invoiceNo",
  "machineTitle",
  "supportTechnician",
  "paymentMethod",
  "amountWords",
  "totalAmount",
  "important",
  "itemNo",
  "description",
  "qty",
  "rate",
  "vat",
  "grossAmount",
  "signC",
  "sealC",
]);
const QUOTATION3_RENDER_KEYS = new Set([
  "customerName",
  "customerAddress",
  "customerTel",
  "count",
  "serialNo",
  "date",
  "invoiceNo",
  "machineTitle",
  "supportTechnician",
  "paymentMethod",
  "amountWords",
  "totalAmount",
  "important",
  "itemNo",
  "description",
  "qty",
  "rate",
  "vat",
  "grossAmount",
  "logoWithName",
  "addressColombo",
  "addressV",
  "signC",
  "signV",
  "sealC",
  "sealV",
]);
const ensuredUiSettingsDbSet = new Set();
const DEFAULT_CATEGORIES = [
  "Photocopier",
  "Printer",
  "Plotter",
  "Computer",
  "Laptop",
  "Accessory",
  "Consumable",
  "Machine",
  "CCTV",
  "Duplo",
  "Other",
  "Service",
];
const DEFAULT_CATEGORY_MODELS = {
  Accessory: ["CANON", "TOSHIBA", "RECOH", "SHARP", "KYOCERA", "SEROX", "SAMSUNG", "HP", "DELL"],
  Consumable: ["CANON", "TOSHIBA", "RECOH", "SHARP", "KYOCERA", "SEROX", "SAMSUNG", "HP", "DELL"],
  Machine: ["CANON", "TOSHIBA", "RECOH", "SHARP", "KYOCERA", "SEROX", "SAMSUNG", "HP", "DELL"],
  Photocopier: ["CANON", "TOSHIBA", "RECOH", "SHARP", "KYOCERA", "SEROX", "SAMSUNG", "HP", "DELL"],
  Printer: ["CANON", "HP", "EPSON", "BROTHER", "LEXMARK", "OTHER", "SEROX", "SAMSUNG"],
  Computer: ["HP", "DELL", "ASUS", "SONY", "SINGER", "SAMSUNG", "SPARE PARTS", "OTHER"],
  Laptop: ["HP", "DELL", "ASUS", "SONY", "SINGER", "SAMSUNG", "SPARE PARTS", "OTHER"],
  Plotter: ["CANON", "HP", "EPSON", "OTHER"],
  CCTV: ["HICKVISION", "DAHUA", "OTHER"],
  Duplo: ["RONGDA", "RISO", "RECOH", "DUPLO"],
  Other: ["OTHER"],
  Service: ["OTHER"],
};

const MANUAL_ACCESS_MODULE_OPTIONS = [
  {
    module: "Core",
    items: [
      { path: "/dashboard.html", label: "Dashboard", actions: ["view"] },
      { path: "/calendar.html", label: "Calendar", actions: ["view"] },
    ],
  },
  {
    module: "Customers",
    items: [
      { path: "/clients/client-list.html", label: "Client List", actions: ["view", "add", "edit", "delete"] },
      { path: "/clients/Add-Client.html", label: "Add Client", actions: ["view", "add"] },
      { path: "/clients/edit-customer.html", label: "Edit Client", actions: ["view", "edit"] },
    ],
  },
  {
    module: "Cases",
    items: [
      { path: "/cases/case-list.html", label: "Case List", actions: ["view", "add", "edit", "delete"] },
      { path: "/cases/new-case.html", label: "New Case", actions: ["view", "add"] },
      { path: "/cases/plaint.html", label: "Plaint", actions: ["view", "add", "edit", "delete"] },
      { path: "/cases/answer.html", label: "Answer", actions: ["view", "add", "edit", "delete"] },
      { path: "/cases/witness-list.html", label: "List of Witnesses", actions: ["view", "add", "edit", "delete"] },
      { path: "/cases/judgment-list.html", label: "Judgment", actions: ["view", "add", "edit", "delete"] },
      { path: "/cases/finished.html", label: "Finished", actions: ["view"] },
    ],
  },
  {
    module: "Invoices",
    items: [
      { path: "/invoices/create-invoice.html", label: "Create Invoice", actions: ["view", "add", "edit"] },
      { path: "/invoices/view-invoice.html", label: "View Invoice", actions: ["view"] },
    ],
  },
  {
    module: "Expenses",
    items: [
      { path: "/expenses/expense-list.html", label: "Expense List", actions: ["view", "add", "edit", "delete"] },
      { path: "/expenses/add-expense.html", label: "Add Expense", actions: ["view", "add"] },
      { path: "/expenses/edit-expense.html", label: "Edit Expense", actions: ["view", "edit"] },
    ],
  },
  {
    module: "Finance",
    items: [
      { path: "/finance/finance.html", label: "Finance", actions: ["view"] },
    ],
  },
  {
    module: "Support",
    items: [
      { path: "/support/lawyer-list.html", label: "Lawyer List", actions: ["view", "add", "edit", "delete"] },
      { path: "/support/court-list.html", label: "Court List", actions: ["view", "add", "edit", "delete"] },
      { path: "/support/add-lawyer.html", label: "Add Lawyer", actions: ["view", "add"] },
      { path: "/support/add-court.html", label: "Add Court", actions: ["view", "add"] },
      { path: "/support/email-setup.html", label: "Email Setup", actions: ["view", "edit"] },
      { path: "/support/support.html", label: "Support (Legacy)", actions: ["view", "add", "edit", "delete"] },
    ],
  },
  {
    module: "Users",
    items: [
      { path: "/users/user-list.html", label: "User List", actions: ["view", "add", "edit", "delete"] },
      { path: "/users/add-user.html", label: "Add User", actions: ["view", "add"] },
      { path: "/users/edit-user.html", label: "Edit User", actions: ["view", "edit"] },
      { path: "/users/profile-list.html", label: "Profile List", actions: ["view"] },
      { path: "/users/profile-view.html", label: "Profile View", actions: ["view"] },
      { path: "/users/add-profile.html", label: "Add Profile", actions: ["view", "add"] },
      { path: "/users/user-access.html", label: "User Access", actions: ["view", "edit"] },
      { path: "/users/backup.html", label: "Backup", actions: ["view", "add", "edit"] },
      { path: "/users/preference.html", label: "Preference", actions: ["view", "edit"] },
      { path: "/users/user-logged.html", label: "User Logged", actions: ["view"] },
    ],
  },
  {
    module: "Admin",
    items: [
      { path: "/users/db-create.html", label: "DB Create", actions: ["view", "add", "delete"] },
      { path: "/users/company-create.html", label: "Company Create", actions: ["view", "add", "edit", "delete"] },
      { path: "/users/company-edit.html", label: "Company Edit", actions: ["view", "edit"] },
      { path: "/users/mapped.html", label: "Mapped", actions: ["view", "add", "delete"] },
      { path: "/users/inv-map.html", label: "Inv Map", actions: ["view", "add", "delete"] },
    ],
  },
];

const FRONTEND_PAGES_ROOT = path.resolve(__dirname, "../../frontend/pages");
const AUTO_ACCESS_EXCLUDED_PATHS = new Set([
  "/login.html",
  "/loading.html",
]);
const AUTO_ACCESS_EXCLUDED_PREFIXES = [
  "/products/",
  "/vendors/",
  "/messages/",
  "/notifications/",
  "/reports/",
  "/analytics/",
  "/sales/",
];

const LEGACY_PATH_ALIASES = new Map([
  ["/customers/customer-list.html", ["/clients/client-list.html"]],
  ["/customers/add-customer.html", ["/clients/Add-Client.html"]],
  ["/customers/client-list.html", ["/clients/client-list.html"]],
  ["/customers/Add-Client.html", ["/clients/Add-Client.html"]],
  ["/customers/edit-customer.html", ["/clients/edit-customer.html"]],
  ["/invoices/invoice-list.html", ["/invoices/create-invoice.html"]],
  ["/invoices/payments-list.html", ["/invoices/create-invoice.html"]],
  ["/support/support.html", ["/support/lawyer-list.html", "/support/court-list.html"]],
  ["/tools/check-backup.html", ["/users/backup.html"]],
  ["/tools/backup-download.html", ["/users/backup.html"]],
  ["/tools/upload-db.html", ["/users/backup.html"]],
]);

function normalizeAccessPath(pathValue) {
  return String(pathValue || "").trim().replace(/\\/g, "/").toLowerCase();
}

function formatAccessLabelFromPath(pathValue) {
  const cleanPath = String(pathValue || "").trim().replace(/\\/g, "/");
  const filename = cleanPath.split("/").pop() || "";
  const withoutExt = filename.replace(/\.html$/i, "");
  const words = withoutExt
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1));
  return words.join(" ") || cleanPath;
}

function discoverUnmappedHtmlAccessItems(existingPathSet) {
  const discovered = [];
  const seen = new Set();
  if (!fs.existsSync(FRONTEND_PAGES_ROOT)) {
    return discovered;
  }

  const walk = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const nextPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath);
        return;
      }
      if (!entry.isFile() || !/\.html$/i.test(entry.name)) {
        return;
      }
      const relPath = path.relative(FRONTEND_PAGES_ROOT, nextPath).replace(/\\/g, "/");
      const webPath = `/${relPath}`;
      const normalized = normalizeAccessPath(webPath);
      const isExcludedPrefix = AUTO_ACCESS_EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
      if (
        !normalized ||
        seen.has(normalized) ||
        AUTO_ACCESS_EXCLUDED_PATHS.has(normalized) ||
        isExcludedPrefix ||
        existingPathSet.has(normalized)
      ) {
        return;
      }
      seen.add(normalized);
      discovered.push({
        path: webPath,
        label: formatAccessLabelFromPath(webPath),
        actions: ["view"],
      });
    });
  };

  walk(FRONTEND_PAGES_ROOT);
  discovered.sort((a, b) => String(a.path || "").localeCompare(String(b.path || "")));
  return discovered;
}

function buildAccessModuleOptions() {
  const modules = MANUAL_ACCESS_MODULE_OPTIONS.map((group) => ({
    module: group.module,
    items: Array.isArray(group.items) ? group.items.slice() : [],
  }));
  const existingPathSet = new Set(
    modules.flatMap((group) => (group.items || []).map((item) => normalizeAccessPath(item.path)))
  );
  const autoItems = discoverUnmappedHtmlAccessItems(existingPathSet);
  if (autoItems.length) {
    modules.push({
      module: "Other Pages (Auto)",
      items: autoItems,
    });
  }
  return modules;
}

const ACCESS_MODULE_OPTIONS = buildAccessModuleOptions();

const EXCLUDED_PAGES = new Set([]);

function toActionKey(path, action) {
  return `${String(path || "").trim().toLowerCase()}::${String(action || "").trim().toLowerCase()}`;
}

function expandCanonicalPagePaths(pathValue) {
  const raw = String(pathValue || "").trim().replace(/\\/g, "/");
  if (!raw) return [];
  const normalized = normalizeAccessPath(raw);
  const aliases = LEGACY_PATH_ALIASES.get(normalized);
  if (Array.isArray(aliases) && aliases.length) {
    return aliases.slice();
  }
  return [raw];
}

function expandCanonicalActionKeys(actionKeyValue) {
  const normalized = String(actionKeyValue || "").trim().toLowerCase();
  const idx = normalized.lastIndexOf("::");
  if (idx === -1) return [];
  const action = normalized.slice(idx + 2);
  const pathPart = normalized.slice(0, idx);
  const canonicalPaths = expandCanonicalPagePaths(pathPart);
  return canonicalPaths.map((canonicalPath) => toActionKey(canonicalPath, action));
}

const ACCESS_PAGE_OPTIONS = ACCESS_MODULE_OPTIONS
  .flatMap((group) => group.items || [])
  .filter((item) => !EXCLUDED_PAGES.has(String(item.path || "").toLowerCase()));

const ACCESS_PATH_SET = new Set(ACCESS_PAGE_OPTIONS.map((x) => String(x.path || "").trim().toLowerCase()));

const ACCESS_ACTION_SET = new Set(
  ACCESS_PAGE_OPTIONS.flatMap((item) =>
    (Array.isArray(item.actions) ? item.actions : [])
      .map((action) => toActionKey(item.path, action))
  )
);

function normalizePages(rawPages) {
  const list = Array.isArray(rawPages) ? rawPages : [];
  return Array.from(
    new Set(
      list
        .flatMap((p) => expandCanonicalPagePaths(p))
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .filter((p) => !EXCLUDED_PAGES.has(p.toLowerCase()))
        .filter((p) => ACCESS_PATH_SET.has(p.toLowerCase()))
    )
  );
}

function normalizeActions(rawActions) {
  const list = Array.isArray(rawActions) ? rawActions : [];
  return Array.from(
    new Set(
      list
        .flatMap((x) => expandCanonicalActionKeys(x))
        .filter(Boolean)
        .filter((x) => ACCESS_ACTION_SET.has(x))
    )
  );
}

function expandImplicitActionDependencies(actionKeys) {
  const set = new Set((Array.isArray(actionKeys) ? actionKeys : []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
  const add = (path, action) => set.add(toActionKey(path, action));

  if (
    set.has(toActionKey("/clients/client-list.html", "edit")) ||
    set.has(toActionKey("/customers/client-list.html", "edit")) ||
    set.has(toActionKey("/customers/customer-list.html", "edit"))
  ) {
    add("/clients/edit-customer.html", "view");
    add("/clients/edit-customer.html", "edit");
  }
  if (set.has(toActionKey("/expenses/expense-list.html", "edit"))) {
    add("/expenses/edit-expense.html", "view");
    add("/expenses/edit-expense.html", "edit");
  }
  if (set.has(toActionKey("/users/user-list.html", "add"))) {
    add("/users/add-user.html", "view");
    add("/users/add-user.html", "add");
  }
  if (set.has(toActionKey("/users/user-list.html", "edit"))) {
    add("/users/edit-user.html", "view");
    add("/users/edit-user.html", "edit");
  }
  return normalizeActions(Array.from(set));
}

function parseAllowedPages(row) {
  try {
    const parsed = JSON.parse(String(row?.allowed_pages_json || "[]"));
    return normalizePages(parsed);
  } catch (_err) {
    return [];
  }
}

function parseAllowedActions(row) {
  try {
    const parsed = JSON.parse(String(row?.allowed_actions_json || "[]"));
    return normalizeActions(parsed);
  } catch (_err) {
    return [];
  }
}

function derivePagesFromActions(actionKeys, fallbackPages) {
  const fromActions = (Array.isArray(actionKeys) ? actionKeys : [])
    .map((key) => String(key || "").trim().toLowerCase())
    .filter((key) => key.includes("::view"))
    .map((key) => {
      const idx = key.lastIndexOf("::");
      return idx === -1 ? "" : key.slice(0, idx);
    })
    .filter(Boolean);

  return normalizePages([...(Array.isArray(fallbackPages) ? fallbackPages : []), ...fromActions]);
}

function normalizeDatabaseName(value) {
  const normalized = db.normalizeDatabaseName(value);
  if (!normalized) return null;
  if (RESERVED_DATABASES.has(normalized)) return null;
  return normalized;
}

function normalizeUserDatabase(value) {
  const normalized = normalizeDatabaseName(value);
  if (!normalized) return INVENTORY_DB_NAME;
  return normalized;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier || "").replace(/"/g, "\"\"")}"`;
}

function normalizeCompanyName(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 200) : "";
}

function normalizeCompanyCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "");
  return normalized ? normalized.slice(0, 40) : "";
}

function normalizeEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "";
  return normalized.slice(0, 200);
}

function normalizeCompanyLogoPath(logoPathRaw, folderNameRaw = "", logoFileNameRaw = "") {
  const folderName = String(folderNameRaw || "").trim();
  const logoFileName = String(logoFileNameRaw || "").trim();
  let raw = String(logoPathRaw || "").trim();

  if (!raw && folderName && logoFileName) {
    raw = `storage/companies/${folderName}/${logoFileName}`;
  }
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^data:image\//i.test(raw)) return raw;

  raw = raw
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/|\.\/)+/g, "")
    .replace(/^backend\//i, "");

  if (/^companies\//i.test(raw)) {
    raw = `storage/${raw}`;
  }
  return raw.replace(/^\/+/, "");
}

function resolveCompanyLogoPathForResponse(row) {
  const folderName = String(row?.folder_name || "").trim();
  const logoFileName = String(row?.logo_file_name || "").trim();
  const normalized = normalizeCompanyLogoPath(row?.logo_path, folderName, logoFileName);
  const toAbs = (relPath) => path.resolve(__dirname, "..", String(relPath || "").replace(/^\/+/, ""));

  if (normalized) {
    if (/^https?:\/\//i.test(normalized) || /^data:image\//i.test(normalized)) {
      return normalized;
    }
    if (fs.existsSync(toAbs(normalized))) {
      return normalized;
    }
  }

  const candidateFolders = [];
  const addFolder = (name) => {
    const clean = String(name || "").trim();
    if (!clean || candidateFolders.includes(clean)) return;
    candidateFolders.push(clean);
  };
  addFolder(folderName);
  addFolder(folderName.replace(/_\d+$/i, ""));

  const logoPathRaw = String(row?.logo_path || "").trim().replace(/\\/g, "/");
  if (logoPathRaw) {
    const parts = logoPathRaw.split("/").filter(Boolean);
    if (parts.length >= 3) addFolder(parts[parts.length - 2]);
  }
  addFolder(safeNamePart(row?.company_name));

  let storageFolderNames = [];
  try {
    storageFolderNames = fs.readdirSync(COMPANY_STORAGE_ROOT).filter((entry) => {
      const abs = path.join(COMPANY_STORAGE_ROOT, entry);
      return fs.existsSync(abs) && fs.statSync(abs).isDirectory();
    });
  } catch (_err) {
    storageFolderNames = [];
  }
  for (const known of storageFolderNames) {
    const lower = known.toLowerCase();
    for (const guess of [...candidateFolders]) {
      const g = String(guess || "").toLowerCase();
      if (!g) continue;
      if (lower === g || lower === `${g}_1` || g === `${lower}_1`) {
        addFolder(known);
      }
    }
  }

  const preferredNames = [];
  if (logoFileName) preferredNames.push(logoFileName);
  preferredNames.push("logo.png", "logo.jpg", "logo.jpeg", "logo.bmp", "logo.gif", "logo.tif", "logo.tiff");

  for (const folder of candidateFolders) {
    const folderAbs = path.resolve(COMPANY_STORAGE_ROOT, folder);
    if (!folderAbs.startsWith(COMPANY_STORAGE_ROOT) || !fs.existsSync(folderAbs)) continue;

    for (const fileName of preferredNames) {
      const abs = path.join(folderAbs, fileName);
      if (!abs.startsWith(folderAbs)) continue;
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        return `storage/companies/${folder}/${fileName}`;
      }
    }

    try {
      const files = fs.readdirSync(folderAbs);
      for (const fileName of files) {
        const lower = String(fileName || "").toLowerCase();
        if (!/\.(png|jpg|jpeg|bmp|gif|tif|tiff)$/i.test(lower)) continue;
        const abs = path.join(folderAbs, fileName);
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
          return `storage/companies/${folder}/${fileName}`;
        }
      }
    } catch (_err) {
    }
  }

  return normalized;
}

function buildCompanyLogoDataUrl(row) {
  const persisted = String(row?.logo_data_url || "").trim();
  if (/^data:image\//i.test(persisted)) {
    return persisted;
  }
  const resolvedPath = resolveCompanyLogoPathForResponse(row);
  if (!resolvedPath || /^https?:\/\//i.test(resolvedPath) || /^data:image\//i.test(resolvedPath)) {
    return "";
  }
  const clean = String(resolvedPath || "").replace(/^\/+/, "");
  const abs = path.resolve(__dirname, "..", clean);
  const root = path.resolve(__dirname, "..", "storage");
  if (!abs.startsWith(root)) return "";
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return "";
  const ext = path.extname(abs).toLowerCase();
  const mimeByExt = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
  };
  const mime = mimeByExt[ext];
  if (!mime) return "";
  try {
    const buf = fs.readFileSync(abs);
    if (!buf || !buf.length) return "";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (_err) {
    return "";
  }
}

function resolveCompanyLogoAbsolutePath(row) {
  const resolvedPath = resolveCompanyLogoPathForResponse(row);
  if (!resolvedPath || /^https?:\/\//i.test(resolvedPath) || /^data:image\//i.test(resolvedPath)) {
    return "";
  }
  const clean = String(resolvedPath || "").replace(/^\/+/, "");
  const abs = path.resolve(__dirname, "..", clean);
  const root = path.resolve(__dirname, "..", "storage");
  if (!abs.startsWith(root)) return "";
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return "";
  return abs;
}

function parseBase64Payload(fileDataBase64) {
  const raw = String(fileDataBase64 || "").trim();
  if (!raw) {
    throw new Error("Missing file data.");
  }
  const parts = raw.split(",");
  const payload = parts.length > 1 ? parts.slice(1).join(",") : raw;
  return Buffer.from(payload, "base64");
}

function safeNamePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function toRelativeStoragePath(absPath) {
  const rel = path.relative(path.resolve(__dirname, ".."), absPath).replace(/\\/g, "/");
  return rel.startsWith("storage/") ? rel : `storage/${path.basename(absPath)}`;
}

function resolveCompanyFolder(companyName) {
  const base = safeNamePart(companyName) || `company_${Date.now()}`;
  return path.join(COMPANY_STORAGE_ROOT, base);
}

function sanitizeLogoFileName(fileName, ext) {
  const fallbackExt = String(ext || "").toLowerCase();
  const baseRaw = path.basename(String(fileName || ""), path.extname(String(fileName || "")));
  const safeBase = String(baseRaw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "logo";
  return `${safeBase}_${Date.now()}${fallbackExt}`;
}

function deleteCompanyLogoFiles(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return;
  const files = fs.readdirSync(folderPath);
  for (const fileName of files) {
    if (!/\.(png|jpg|jpeg|bmp|gif|tif|tiff)$/i.test(String(fileName || ""))) continue;
    const abs = path.join(folderPath, fileName);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      fs.unlinkSync(abs);
    }
  }
}

async function ensureDatabaseRegistryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${DATABASE_REGISTRY_TABLE} (
      id SERIAL PRIMARY KEY,
      database_name VARCHAR(120) UNIQUE NOT NULL,
      company_name VARCHAR(200) NOT NULL,
      folder_name VARCHAR(120),
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    ALTER TABLE ${DATABASE_REGISTRY_TABLE}
    ADD COLUMN IF NOT EXISTS folder_name VARCHAR(120);
  `);
}

async function ensureCompanyRegistryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${COMPANY_REGISTRY_TABLE} (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(200) UNIQUE NOT NULL,
      company_code VARCHAR(40),
      email VARCHAR(200),
      folder_name VARCHAR(120) NOT NULL,
      logo_path VARCHAR(500) NOT NULL,
      logo_file_name VARCHAR(255) NOT NULL,
      logo_data_url TEXT,
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    ALTER TABLE ${COMPANY_REGISTRY_TABLE}
    ADD COLUMN IF NOT EXISTS company_code VARCHAR(40);
  `);
  await client.query(`
    ALTER TABLE ${COMPANY_REGISTRY_TABLE}
    ADD COLUMN IF NOT EXISTS email VARCHAR(200);
  `);
  await client.query(`
    ALTER TABLE ${COMPANY_REGISTRY_TABLE}
    ADD COLUMN IF NOT EXISTS logo_data_url TEXT;
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_company_code_unique_idx
    ON ${COMPANY_REGISTRY_TABLE} (UPPER(company_code))
    WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';
  `);
}

async function ensureUserMappingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_mappings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      company_profile_id INTEGER NOT NULL REFERENCES ${COMPANY_REGISTRY_TABLE}(id) ON DELETE CASCADE,
      database_name VARCHAR(120) NOT NULL,
      mapped_email VARCHAR(200),
      is_verified BOOLEAN DEFAULT FALSE,
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  await client.query(`
    ALTER TABLE user_mappings
    ADD COLUMN IF NOT EXISTS mapped_email VARCHAR(200);
  `);
}

async function ensureUserInvoiceMappingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${USER_INVOICE_MAPPING_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      database_name VARCHAR(120) NOT NULL,
      logo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      invoice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      sign_c_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      seal_c_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      theme_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, database_name)
    );
  `);
}

async function ensureUserQuotationRenderTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${USER_QUOTATION_RENDER_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      database_name VARCHAR(120) NOT NULL,
      quotation_type VARCHAR(32) NOT NULL,
      render_visibility_json TEXT NOT NULL DEFAULT '{}',
      render_overrides_json TEXT NOT NULL DEFAULT '{}',
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, database_name, quotation_type)
    );
  `);
  await client.query(`
    ALTER TABLE ${USER_QUOTATION_RENDER_TABLE}
    ADD COLUMN IF NOT EXISTS render_overrides_json TEXT NOT NULL DEFAULT '{}';
  `);
}

function normalizeQuotationRenderVisibility(raw, allowedKeys) {
  const source = raw && typeof raw === "object" ? raw : {};
  const out = {};
  allowedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = Boolean(source[key]);
    }
  });
  return out;
}

function normalizeQuotation2RenderVisibility(raw) {
  return normalizeQuotationRenderVisibility(raw, QUOTATION2_RENDER_KEYS);
}

function normalizeQuotation3RenderVisibility(raw) {
  return normalizeQuotationRenderVisibility(raw, QUOTATION3_RENDER_KEYS);
}

function parseQuotationRenderVisibility(row, allowedKeys) {
  try {
    const parsed = JSON.parse(String(row?.render_visibility_json || "{}"));
    return normalizeQuotationRenderVisibility(parsed, allowedKeys);
  } catch (_err) {
    return {};
  }
}

function normalizeQuotation2RenderOverrides(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const itemNamesByInvoiceRaw = source.item_names_by_invoice && typeof source.item_names_by_invoice === "object"
    ? source.item_names_by_invoice
    : {};
  const itemRatesByInvoiceRaw = source.item_rates_by_invoice && typeof source.item_rates_by_invoice === "object"
    ? source.item_rates_by_invoice
    : {};
  const layoutStateRaw = source.layout_state && typeof source.layout_state === "object"
    ? source.layout_state
    : {};
  const itemNamesByInvoice = {};
  const itemRatesByInvoice = {};
  const layoutState = {};
  Object.entries(itemNamesByInvoiceRaw).forEach(([invoiceKey, itemMapRaw]) => {
    const safeInvoiceKey = String(invoiceKey || "").trim();
    if (!/^\d+$/.test(safeInvoiceKey)) return;
    if (!itemMapRaw || typeof itemMapRaw !== "object") return;
    const normalizedItemMap = {};
    Object.entries(itemMapRaw).forEach(([itemIndex, value]) => {
      const safeItemIndex = String(itemIndex || "").trim();
      if (!/^\d+$/.test(safeItemIndex)) return;
      const safeName = String(value || "").trim().slice(0, 300);
      if (!safeName) return;
      normalizedItemMap[safeItemIndex] = safeName;
    });
    if (Object.keys(normalizedItemMap).length) {
      itemNamesByInvoice[safeInvoiceKey] = normalizedItemMap;
    }
  });
  Object.entries(itemRatesByInvoiceRaw).forEach(([invoiceKey, itemMapRaw]) => {
    const safeInvoiceKey = String(invoiceKey || "").trim();
    if (!/^\d+$/.test(safeInvoiceKey)) return;
    if (!itemMapRaw || typeof itemMapRaw !== "object") return;
    const normalizedItemMap = {};
    Object.entries(itemMapRaw).forEach(([itemIndex, value]) => {
      const safeItemIndex = String(itemIndex || "").trim();
      if (!/^\d+$/.test(safeItemIndex)) return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      normalizedItemMap[safeItemIndex] = numeric;
    });
    if (Object.keys(normalizedItemMap).length) {
      itemRatesByInvoice[safeInvoiceKey] = normalizedItemMap;
    }
  });
  Object.entries(layoutStateRaw).forEach(([layoutKey, rawConfig]) => {
    const safeLayoutKey = String(layoutKey || "").trim();
    if (!safeLayoutKey || safeLayoutKey.length > 80) return;
    if (!rawConfig || typeof rawConfig !== "object") return;
    const next = {};
    const x = Number(rawConfig.x);
    const y = Number(rawConfig.y);
    const font = Number(rawConfig.font);
    const fontFamily = String(rawConfig.fontFamily || "").trim().slice(0, 80);
    const fontWeight = String(rawConfig.fontWeight || "").trim().toLowerCase() === "bold" ? "bold" : "normal";
    const visible = rawConfig.visible;
    if (Number.isFinite(x)) next.x = x;
    if (Number.isFinite(y)) next.y = y;
    if (Number.isFinite(font) && font > 0) next.font = font;
    if (fontFamily) next.fontFamily = fontFamily;
    next.fontWeight = fontWeight;
    if (typeof visible === "boolean") next.visible = visible;
    if (Object.keys(next).length) {
      layoutState[safeLayoutKey] = next;
    }
  });
  return {
    item_names_by_invoice: itemNamesByInvoice,
    item_rates_by_invoice: itemRatesByInvoice,
    layout_state: layoutState,
  };
}

function parseQuotationRenderOverrides(row) {
  try {
    const parsed = JSON.parse(String(row?.render_overrides_json || "{}"));
    return normalizeQuotation2RenderOverrides(parsed);
  } catch (_err) {
    return { item_names_by_invoice: {}, item_rates_by_invoice: {}, layout_state: {} };
  }
}

function normalizeNameCompare(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function parseUserReference(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  const composite = value.match(/^([a-z0-9_]+):(\d+)$/i);
  if (composite) {
    const userDatabase = normalizeUserDatabase(composite[1]);
    const userId = Number(composite[2]);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return { user_id: userId, user_database: userDatabase };
  }

  const userId = Number(value);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return { user_id: userId, user_database: INVENTORY_DB_NAME };
}

async function findAccessFromMainDb(userId, userDatabase = INVENTORY_DB_NAME) {
  const cfg = getDbConfig();
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await client.connect();
    const rs = await client.query(
      `SELECT id, allowed_pages_json, allowed_actions_json, database_name, user_database, "updatedAt", "createdAt"
       FROM user_accesses
       WHERE user_id = $1 AND (LOWER(COALESCE(user_database, '${INVENTORY_DB_NAME}')) = $2)
       ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
       LIMIT 1`,
      [userId, normalizeUserDatabase(userDatabase)]
    );
    if (!rs.rowCount) return null;
    return rs.rows[0];
  } catch (_err) {
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

async function findMappedUserProfile(userId, preferredDatabaseName = "") {
  const cfg = getDbConfig();
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await client.connect();
    const preferredDb = normalizeDatabaseName(preferredDatabaseName);
    const rs = await client.query(
      `SELECT um.database_name, cp.company_name, cp.company_code, cp.email, cp.logo_path, cp.logo_data_url, cp.folder_name, cp.logo_file_name
       FROM user_mappings um
       JOIN ${COMPANY_REGISTRY_TABLE} cp ON cp.id = um.company_profile_id
       WHERE um.user_id = $1
       ORDER BY
         CASE
           WHEN LOWER(COALESCE(um.database_name, '')) = LOWER(COALESCE($2, '')) THEN 0
           ELSE 1
         END ASC,
         um."updatedAt" DESC NULLS LAST,
         um."createdAt" DESC NULLS LAST,
         um.id DESC
       LIMIT 1`,
      [userId, preferredDb || ""]
    );
    if (!rs.rowCount) return null;
    return {
      database_name: normalizeDatabaseName(rs.rows[0]?.database_name),
      company_name: normalizeCompanyName(rs.rows[0]?.company_name),
      company_code: normalizeCompanyCode(rs.rows[0]?.company_code),
      email: normalizeEmail(rs.rows[0]?.email),
      logo_data_url: String(rs.rows[0]?.logo_data_url || "").trim(),
      logo_path: normalizeCompanyLogoPath(rs.rows[0]?.logo_path, rs.rows[0]?.folder_name, rs.rows[0]?.logo_file_name),
    };
  } catch (_err) {
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || INVENTORY_DB_NAME,
  };
}

function getDbAdminConfig() {
  const base = getDbConfig();
  return {
    host: process.env.DB_ADMIN_HOST || base.host,
    port: Number(process.env.DB_ADMIN_PORT || base.port || 5432),
    user: process.env.DB_ADMIN_USER || base.user,
    password: process.env.DB_ADMIN_PASSWORD || base.password,
    database: process.env.DB_ADMIN_DATABASE || "postgres",
  };
}

async function seedDefaultCategoryData(databaseName) {
  await db.withDatabase(databaseName, async () => {
    for (const name of DEFAULT_CATEGORIES) {
      const exists = await Category.findOne({ where: { name } });
      if (!exists) {
        await Category.create({ name });
      }
    }

    for (const [categoryName, models] of Object.entries(DEFAULT_CATEGORY_MODELS)) {
      for (const modelName of models) {
        const exists = await CategoryModelOption.findOne({
          where: { category_name: categoryName, model_name: modelName },
        });
        if (!exists) {
          await CategoryModelOption.create({
            category_name: categoryName,
            model_name: modelName,
          });
        }
      }
    }
  });
}

function runBash(command, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-lc", command], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += String(d || ""); });
    child.stderr.on("data", (d) => { stderr += String(d || ""); });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || stdout || `Command failed with code ${code}`));
    });
  });
}

async function ensureDemoDatabaseSchema() {
  const cfg = getDbConfig();
  const admin = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: "postgres",
  });

  await admin.connect();
  let demoExists = false;
  try {
    const check = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1 LIMIT 1",
      [DEMO_DB_NAME]
    );
    demoExists = check.rowCount > 0;
    if (!demoExists) {
      await admin.query(`CREATE DATABASE "${DEMO_DB_NAME}"`);
    }
  } finally {
    await admin.end();
  }

  if (demoExists) {
    return { demoExists: true, schemaCloned: false };
  }

  const pgDumpPath = (process.env.PG_DUMP_PATH || "pg_dump").trim();
  const psqlPath = (process.env.PSQL_PATH || "psql").trim();
  const sourceDb = String(cfg.database || "").trim();
  if (!sourceDb || sourceDb.toLowerCase() === DEMO_DB_NAME) return { demoExists: true, schemaCloned: false };

  const escapedSource = `'${sourceDb.replace(/'/g, "'\\''")}'`;
  const escapedDemo = `'${DEMO_DB_NAME}'`;
  const escapedHost = `'${String(cfg.host).replace(/'/g, "'\\''")}'`;
  const escapedPort = `'${String(cfg.port).replace(/'/g, "'\\''")}'`;
  const escapedUser = `'${String(cfg.user).replace(/'/g, "'\\''")}'`;
  const escapedDump = `'${pgDumpPath.replace(/'/g, "'\\''")}'`;
  const escapedPsql = `'${psqlPath.replace(/'/g, "'\\''")}'`;

  const cmd = [
    `${escapedDump} --schema-only`,
    `-h ${escapedHost}`,
    `-p ${escapedPort}`,
    `-U ${escapedUser}`,
    `-d ${escapedSource}`,
    `|`,
    `${escapedPsql}`,
    `-h ${escapedHost}`,
    `-p ${escapedPort}`,
    `-U ${escapedUser}`,
    `-d ${escapedDemo}`
  ].join(" ");

  await runBash(cmd, { PGPASSWORD: cfg.password || "" });
  return { demoExists: true, schemaCloned: true };
}

async function cloneSchemaToDatabase(targetDatabaseName) {
  const cfg = getDbConfig();
  const pgDumpPath = (process.env.PG_DUMP_PATH || "pg_dump").trim();
  const psqlPath = (process.env.PSQL_PATH || "psql").trim();
  const sourceDb = String(cfg.database || "").trim();
  const targetDb = String(targetDatabaseName || "").trim();
  if (!sourceDb || !targetDb) {
    throw new Error("Invalid source or target database.");
  }
  if (sourceDb.toLowerCase() === targetDb.toLowerCase()) {
    return;
  }

  const escapedSource = `'${sourceDb.replace(/'/g, "'\\''")}'`;
  const escapedTarget = `'${targetDb.replace(/'/g, "'\\''")}'`;
  const escapedHost = `'${String(cfg.host).replace(/'/g, "'\\''")}'`;
  const escapedPort = `'${String(cfg.port).replace(/'/g, "'\\''")}'`;
  const escapedUser = `'${String(cfg.user).replace(/'/g, "'\\''")}'`;
  const escapedDump = `'${pgDumpPath.replace(/'/g, "'\\''")}'`;
  const escapedPsql = `'${psqlPath.replace(/'/g, "'\\''")}'`;

  const cmd = [
    `${escapedDump} --schema-only`,
    `-h ${escapedHost}`,
    `-p ${escapedPort}`,
    `-U ${escapedUser}`,
    `-d ${escapedSource}`,
    `|`,
    `${escapedPsql}`,
    `-h ${escapedHost}`,
    `-p ${escapedPort}`,
    `-U ${escapedUser}`,
    `-d ${escapedTarget}`,
  ].join(" ");

  await runBash(cmd, { PGPASSWORD: cfg.password || "" });
}

async function fetchCompanyDatabaseMap(mainDbClient) {
  await ensureDatabaseRegistryTable(mainDbClient);
  const rs = await mainDbClient.query(
    `SELECT database_name, company_name
     FROM ${DATABASE_REGISTRY_TABLE}
     ORDER BY LOWER(company_name) ASC, LOWER(database_name) ASC`
  );
  const map = new Map();
  (rs.rows || []).forEach((row) => {
    const dbName = normalizeDatabaseName(row?.database_name);
    if (!dbName) return;
    map.set(dbName, normalizeCompanyName(row?.company_name));
  });
  return map;
}

async function fetchCreatedDatabases(mainDbClient) {
  await ensureDatabaseRegistryTable(mainDbClient);
  const rs = await mainDbClient.query(
    `SELECT database_name, company_name, created_by, "createdAt", "updatedAt"
     FROM ${DATABASE_REGISTRY_TABLE}
     WHERE LOWER(database_name) <> $1
     ORDER BY "createdAt" DESC NULLS LAST, id DESC`,
    [INVENTORY_DB_NAME]
  );
  return (rs.rows || [])
    .map((row) => {
      const name = normalizeDatabaseName(row?.database_name);
      if (!name || name === INVENTORY_DB_NAME) return null;
      return {
        name,
        company_name: normalizeCompanyName(row?.company_name),
        created_by: Number(row?.created_by || 0) || null,
        created_at: row?.createdAt || null,
        updated_at: row?.updatedAt || null,
      };
    })
    .filter(Boolean);
}

async function getUserFromDatabase(databaseName, userId) {
  return db.withDatabase(databaseName, async () => {
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE;
      `);
      await db.query(`
        UPDATE users
        SET is_super_user = FALSE
        WHERE is_super_user IS NULL;
      `);
    } catch (_err) {
    }
    return User.findByPk(userId, {
      attributes: ["id", "username", "email", "role", "is_super_user", "company"],
    });
  });
}

async function isRequesterSuperAdmin(req) {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  if (!Number.isFinite(requesterId) || requesterId <= 0) return false;
  const me = await getUserFromDatabase(INVENTORY_DB_NAME, requesterId).catch(() => null);
  return Boolean(me && String(me.role || "").toLowerCase() === "admin" && me.is_super_user);
}

function isProtectedSuperAdminTarget(userLike, requesterId, requesterIsSuper) {
  const isTargetAdmin = String(userLike?.role || "").toLowerCase() === "admin";
  const isTargetSuper = Boolean(userLike?.is_super_user);
  return isTargetAdmin && isTargetSuper && Number(userLike?.id || 0) !== Number(requesterId || 0) && !requesterIsSuper;
}

async function hasAnySuperAdminInInventory() {
  try {
    const rows = await db.withDatabase(INVENTORY_DB_NAME, async () => {
      return User.findAll({
        where: { role: "admin", is_super_user: true },
        attributes: ["id"],
        limit: 1,
      });
    });
    return Array.isArray(rows) && rows.length > 0;
  } catch (_err) {
    return false;
  }
}

async function canRequesterEditSuperFlag(req, targetUser) {
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  const requesterRole = String(req?.user?.role || "").toLowerCase();
  if (requesterRole !== "admin") return false;

  const requesterIsSuper = await isRequesterSuperAdmin(req);
  if (requesterIsSuper) return true;

  const targetId = Number(targetUser?.id || 0);
  if (requesterId > 0 && targetId > 0 && requesterId === targetId) {
    return true;
  }

  const anySuper = await hasAnySuperAdminInInventory();
  return !anySuper;
}

async function hasDbCreateActionPermission(req, action) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const userDatabase = normalizeUserDatabase(req.databaseName || req.user?.database_name || INVENTORY_DB_NAME);
  const actionKey = toActionKey("/users/db-create.html", action);

  let row = await findAccessFromMainDb(userId, userDatabase);
  if (!row && userDatabase !== INVENTORY_DB_NAME) {
    row = await findAccessFromMainDb(userId, INVENTORY_DB_NAME);
  }

                                                                      
  if (!row) return true;
  const allowedActions = parseAllowedActions(row);
  if (allowedActions.includes(actionKey)) return true;
  if (String(action || "").toLowerCase() === "edit") {
    return allowedActions.includes(toActionKey("/users/company-create.html", "add"));
  }
  return false;
}

async function hasCompanyCreateActionPermission(req, action) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const userDatabase = normalizeUserDatabase(req.databaseName || req.user?.database_name || INVENTORY_DB_NAME);
  const actionKey = toActionKey("/users/company-create.html", action);

  let row = await findAccessFromMainDb(userId, userDatabase);
  if (!row && userDatabase !== INVENTORY_DB_NAME) {
    row = await findAccessFromMainDb(userId, INVENTORY_DB_NAME);
  }

                                                                      
  if (!row) return true;
  const allowedActions = parseAllowedActions(row);
  return allowedActions.includes(actionKey);
}

async function hasMappedActionPermission(req, action) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const userDatabase = normalizeUserDatabase(req.databaseName || req.user?.database_name || INVENTORY_DB_NAME);
  const actionKey = toActionKey("/users/mapped.html", action);

  let row = await findAccessFromMainDb(userId, userDatabase);
  if (!row && userDatabase !== INVENTORY_DB_NAME) {
    row = await findAccessFromMainDb(userId, INVENTORY_DB_NAME);
  }

  if (!row) return true;
  const allowedActions = parseAllowedActions(row);
  if (allowedActions.includes(actionKey)) return true;
  if (String(action || "").toLowerCase() === "delete") {
    const addActionKey = toActionKey("/users/mapped.html", "add");
    if (allowedActions.includes(addActionKey)) return true;
  }
  return false;
}

async function hasInvMapActionPermission(req, action) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const userDatabase = normalizeUserDatabase(req.databaseName || req.user?.database_name || INVENTORY_DB_NAME);
  const actionKey = toActionKey(INV_MAP_PATH, action);

  let row = await findAccessFromMainDb(userId, userDatabase);
  if (!row && userDatabase !== INVENTORY_DB_NAME) {
    row = await findAccessFromMainDb(userId, INVENTORY_DB_NAME);
  }

  if (!row) return true;
  const allowedActions = parseAllowedActions(row);
  if (allowedActions.includes(actionKey) || allowedActions.includes(legacyActionKey)) return true;
  if (String(action || "").toLowerCase() === "delete") {
                                                                                                      
    const addActionKey = toActionKey(INV_MAP_PATH, "add");
    if (allowedActions.includes(addActionKey)) return true;
  }
  return false;
}

function normalizeInvMapFlags(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    logo: Boolean(source.logo),
    invoice: Boolean(source.invoice),
    sign_c: Boolean(source.sign_c),
    seal_c: Boolean(source.seal_c),
    theme: Boolean(source.theme),
  };
}

function hasAnyInvMapFlag(flags) {
  return Object.values(flags || {}).some((v) => Boolean(v));
}

async function getPreferenceAvailability(databaseName, userId) {
  const targetDb = normalizeDatabaseName(databaseName) || INVENTORY_DB_NAME;
  await db.registerDatabase(targetDb).catch(() => {});
  if (!ensuredUiSettingsDbSet.has(targetDb)) {
    await db.withDatabase(targetDb, async () => {
      await db.query(`ALTER TABLE ui_settings ADD COLUMN IF NOT EXISTS invoice_template_pdf_path VARCHAR(500);`);
      await db.query(`ALTER TABLE ui_settings ADD COLUMN IF NOT EXISTS sign_c_path VARCHAR(500);`);
      await db.query(`ALTER TABLE ui_settings ADD COLUMN IF NOT EXISTS seal_c_path VARCHAR(500);`);
    });
    ensuredUiSettingsDbSet.add(targetDb);
  }
  const prefData = await db.withDatabase(targetDb, async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_preference_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        logo_path VARCHAR(500),
        invoice_template_pdf_path VARCHAR(500),
        sign_c_path VARCHAR(500),
        seal_c_path VARCHAR(500),
        primary_color VARCHAR(24),
        background_color VARCHAR(24),
        button_color VARCHAR(24),
        mode_theme VARCHAR(16),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    const normalizedUserId = Number(userId || 0);
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;
    const rs = await db.query(
      `SELECT *
       FROM user_preference_settings
       WHERE user_id = $1
       LIMIT 1`,
      { bind: [normalizedUserId] }
    );
    const userRows = Array.isArray(rs?.[0]) ? rs[0] : [];
    let globalRow = await UiSetting.findOne({ order: [["id", "ASC"]] });
    if (!globalRow) {
      globalRow = await UiSetting.create({});
    }
    return {
      userRow: userRows[0] || null,
      globalRow: globalRow ? (globalRow.toJSON ? globalRow.toJSON() : globalRow) : null,
    };
  });
  const row = prefData?.userRow || null;
  const globalRow = prefData?.globalRow || null;

  const resolveFile = (...candidatesRaw) => {
    const candidates = candidatesRaw.map((v) => String(v || "").trim()).filter(Boolean);
    for (const rawPath of candidates) {
      const resolved = path.resolve(rawPath);
      if (fs.existsSync(resolved)) return resolved;
    }
    return "";
  };

  const defaultLogoPath = path.resolve(__dirname, "../../frontend/assets/images/logo.png");
  const logoPath = resolveFile(row?.logo_path, globalRow?.logo_path, defaultLogoPath);
  const invoicePath = resolveFile(row?.invoice_template_pdf_path, globalRow?.invoice_template_pdf_path);
  const signCPath = resolveFile(row?.sign_c_path, globalRow?.sign_c_path);
  const sealCPath = resolveFile(row?.seal_c_path, globalRow?.seal_c_path);
  const themeMode = String(row?.mode_theme || globalRow?.mode_theme || "").trim();

  return {
    logo: Boolean(logoPath),
    invoice: Boolean(invoicePath),
    sign_c: Boolean(signCPath),
    seal_c: Boolean(sealCPath),
    theme: Boolean(themeMode),
  };
}

function getInvMapMissing(flags, availability) {
  const selected = normalizeInvMapFlags(flags);
  const available = availability && typeof availability === "object" ? availability : {};
  return Object.keys(selected).filter((key) => Boolean(selected[key]) && !Boolean(available[key]));
}

exports.getAccessUsers = async (_req, res) => {
  try {
    try{
      await ensureDemoDatabaseSchema();
    }catch(_err){
    }

    const rows = [];
    const cfg = getDbConfig();
    const mainDbClient = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database || INVENTORY_DB_NAME,
    });

    const linkedByUserDbKey = new Map();
    const mappedByUserId = new Map();
    try {
      await mainDbClient.connect();
      await ensureUserMappingTable(mainDbClient);

      const accessRs = await mainDbClient.query(
        `SELECT DISTINCT ON (user_id, LOWER(COALESCE(user_database, '${INVENTORY_DB_NAME}')))
            user_id, user_database, database_name
         FROM user_accesses
         ORDER BY user_id, LOWER(COALESCE(user_database, '${INVENTORY_DB_NAME}')), "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC`
      );
      (accessRs.rows || []).forEach((row) => {
        const userId = Number(row?.user_id || 0);
        const userDb = normalizeUserDatabase(row?.user_database);
        const linkedDb = normalizeDatabaseName(row?.database_name);
        if (!userId || !linkedDb) return;
        linkedByUserDbKey.set(`${userDb}:${userId}`, linkedDb);
      });

      const mappingRs = await mainDbClient.query(
        `SELECT user_id, database_name
         FROM user_mappings`
      );
      (mappingRs.rows || []).forEach((row) => {
        const userId = Number(row?.user_id || 0);
        const linkedDb = normalizeDatabaseName(row?.database_name);
        if (!userId || !linkedDb) return;
        mappedByUserId.set(userId, linkedDb);
      });
    } catch (_err) {
    } finally {
      await mainDbClient.end().catch(() => {});
    }

    const includeDemo = String(_req?.query?.include_demo || "").trim().toLowerCase() === "true";
    const sourceDbSet = new Set([INVENTORY_DB_NAME]);
    const registryClient = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database || INVENTORY_DB_NAME,
    });
    try {
      await registryClient.connect();
      const dbRs = await registryClient.query(
        `SELECT LOWER(database_name) AS database_name
         FROM ${DATABASE_REGISTRY_TABLE}
         WHERE database_name IS NOT NULL`
      );
      (dbRs.rows || []).forEach((row) => {
        const dbName = normalizeDatabaseName(row?.database_name);
        if (dbName) sourceDbSet.add(dbName);
      });
    } catch (_err) {
    } finally {
      await registryClient.end().catch(() => {});
    }
    for (const linkedDb of mappedByUserId.values()) {
      const dbName = normalizeDatabaseName(linkedDb);
      if (dbName) sourceDbSet.add(dbName);
    }
    if (includeDemo) {
      sourceDbSet.add(DEMO_DB_NAME);
    }
    const requesterId = Number(_req?.user?.id || _req?.user?.userId || 0);
    const requesterIsSuper = await isRequesterSuperAdmin(_req);
    const requesterMappedDb = normalizeDatabaseName(_req?.databaseName || _req?.requestedDatabaseName || _req?.headers?.["x-database-name"]) || INVENTORY_DB_NAME;

    if (!requesterIsSuper) {
      sourceDbSet.clear();
      sourceDbSet.add(requesterMappedDb);
    }
    const sourceDbs = Array.from(sourceDbSet).sort((a, b) => String(a || "").localeCompare(String(b || "")));

    for (const databaseName of sourceDbs) {
      let users = [];
      try{
        users = await db.withDatabase(databaseName, async () => {
          return User.findAll({
            attributes: ["id", "username", "email", "role"],
            order: [["role", "ASC"], ["username", "ASC"], ["id", "ASC"]],
          });
        });
      }catch(_err){
        users = [];
      }

      (Array.isArray(users) ? users : []).forEach((user) => {
        const plain = user.toJSON ? user.toJSON() : user;
        const role = String(plain.role || "").toLowerCase() || "user";
        if (isProtectedSuperAdminTarget(plain, requesterId, requesterIsSuper)) {
          return;
        }
        const sourceDb = normalizeUserDatabase(databaseName);
        const accessLinkedDb =
          linkedByUserDbKey.get(`${sourceDb}:${plain.id}`) ||
          linkedByUserDbKey.get(`${INVENTORY_DB_NAME}:${plain.id}`) ||
          null;
        const mappedLinkedDb = mappedByUserId.get(Number(plain.id || 0)) || null;
        const normalizedMappedDb = normalizeDatabaseName(mappedLinkedDb) || null;
        const normalizedAccessDb = normalizeDatabaseName(accessLinkedDb) || null;
        const linkedDb = normalizeDatabaseName(normalizedMappedDb || normalizedAccessDb) || sourceDb;

        rows.push({
          selection_key: `${sourceDb}:${plain.id}`,
          id: plain.id,
          username: plain.username || "",
          email: plain.email || "",
          role,
          user_database: sourceDb,
          mapped_database_name: normalizedMappedDb,
          access_database_name: normalizedAccessDb,
          default_database_name: linkedDb,
          database_name: linkedDb,
          label: `${plain.username || plain.email || `User ${plain.id}`} [${role}] (${linkedDb})`,
        });
      });
    }

    const dedupedMap = new Map();
    rows.forEach((row) => {
      const dbKey = String(row.database_name || row.user_database || "").trim().toLowerCase();
      const identity = String(row.email || row.username || "").trim().toLowerCase();
      const roleKey = String(row.role || "").trim().toLowerCase();
      if (!dbKey || !identity) return;
      const key = `${dbKey}::${identity}::${roleKey}`;
      const prev = dedupedMap.get(key);
      if (!prev) {
        dedupedMap.set(key, row);
        return;
      }
      const prevId = Number(prev.id || 0);
      const nextId = Number(row.id || 0);
      if (nextId > prevId) {
        dedupedMap.set(key, row);
      }
    });

    const finalRows = Array.from(dedupedMap.values()).map((row) => ({
      ...row,
      label: `${row.username || row.email || `User ${row.id}`} [${row.role}] (${row.database_name})`,
    }));

    finalRows.sort((a, b) => {
      const dbCmp = String(a.database_name || "").localeCompare(String(b.database_name || ""));
      if (dbCmp !== 0) return dbCmp;
      const roleCmp = String(a.role || "").localeCompare(String(b.role || ""));
      if (roleCmp !== 0) return roleCmp;
      return String(a.username || a.email || "").localeCompare(String(b.username || b.email || ""));
    });

    res.json({ users: finalRows });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load access users." });
  }
};

exports.getAccessPages = async (_req, res) => {
  const modules = ACCESS_MODULE_OPTIONS
    .map((group) => ({
      module: group.module,
      items: (group.items || [])
        .filter((x) => !EXCLUDED_PAGES.has(String(x.path || "").toLowerCase()))
        .map((item) => ({
          ...item,
          actions: Array.isArray(item.actions) ? item.actions : [],
          action_keys: (Array.isArray(item.actions) ? item.actions : []).map((action) => toActionKey(item.path, action)),
        })),
    }))
    .filter((group) => group.items.length > 0);

  res.json({
    modules,
    pages: modules.flatMap((g) => g.items.map((x) => ({ path: x.path, label: x.label }))),
  });
};

exports.getDatabases = async (_req, res) => {
  const cfg = getDbConfig();
  const adminCfg = getDbAdminConfig();
  const adminClient = new Client({
    host: adminCfg.host,
    port: adminCfg.port,
    user: adminCfg.user,
    password: adminCfg.password,
    database: adminCfg.database,
  });
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await ensureDemoDatabaseSchema();
  } catch (_err) {
  }

  try {
    await adminClient.connect();
    await mainDbClient.connect();

    const rows = await adminClient.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname ASC"
    );
    const companyMap = await fetchCompanyDatabaseMap(mainDbClient);
    const seen = new Set();
    const databases = [];

    (rows.rows || []).forEach((row) => {
      const dbName = normalizeDatabaseName(row?.datname);
      if (!dbName || RESERVED_DATABASES.has(dbName) || seen.has(dbName)) return;
      seen.add(dbName);
      const companyName = companyMap.get(dbName) || "";
      const label = companyName ? `${companyName} (${dbName})` : dbName;
      databases.push({
        name: dbName,
        company_name: companyName,
        label,
      });
    });

    res.json({
      current: normalizeDatabaseName(cfg.database) || INVENTORY_DB_NAME,
      databases: databases.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to list databases." });
  } finally {
    await adminClient.end().catch(() => {});
    await mainDbClient.end().catch(() => {});
  }
};

exports.createDatabase = async (req, res) => {
  const canAdd = await hasDbCreateActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing DB Create add permission." });
  }

  const databaseName = normalizeDatabaseName(req.body?.database_name);
  const companyName = normalizeCompanyName(req.body?.company_name);
  if (!databaseName) {
    return res.status(400).json({ message: "Valid database name is required." });
  }
  if (!companyName) {
    return res.status(400).json({ message: "Company name is required." });
  }

  const cfg = getDbConfig();
  const adminCfg = getDbAdminConfig();
  const adminClient = new Client({
    host: adminCfg.host,
    port: adminCfg.port,
    user: adminCfg.user,
    password: adminCfg.password,
    database: adminCfg.database,
  });
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await adminClient.connect();
    const existsRs = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1 LIMIT 1",
      [databaseName]
    );
    if (existsRs.rowCount > 0) {
      return res.status(409).json({ message: "Database already exists." });
    }

    await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    await cloneSchemaToDatabase(databaseName);
    await db.registerDatabase(databaseName);

    const connection = db.getConnection(databaseName);
    await connection.sync({ alter: true });
    await seedDefaultCategoryData(databaseName);

    await mainDbClient.connect();
    await ensureDatabaseRegistryTable(mainDbClient);
    ensureDir(DATABASE_STORAGE_ROOT);
    let dbFolderPath = path.join(DATABASE_STORAGE_ROOT, safeNamePart(companyName) || `db_${Date.now()}`);
    let suffix = 1;
    while (fs.existsSync(dbFolderPath)) {
      dbFolderPath = path.join(DATABASE_STORAGE_ROOT, `${safeNamePart(companyName) || "db"}_${suffix++}`);
    }
    ensureDir(dbFolderPath);
    const folderName = path.basename(dbFolderPath);
    await mainDbClient.query(
      `INSERT INTO ${DATABASE_REGISTRY_TABLE} (database_name, company_name, folder_name, created_by, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (database_name)
       DO UPDATE SET company_name = EXCLUDED.company_name, folder_name = EXCLUDED.folder_name, "updatedAt" = NOW()`,
      [databaseName, companyName, folderName, Number(req.user?.id || 0) || null]
    );

    res.status(201).json({
      message: "Database created successfully.",
      database: {
        name: databaseName,
        company_name: companyName,
        label: `${companyName} (${databaseName})`,
      },
    });
  } catch (err) {
    const code = String(err?.code || "").trim();
    if (code === "42501" || /permission denied/i.test(String(err?.message || ""))) {
      const adminUser = String(adminCfg.user || cfg.user || "postgres").trim() || "postgres";
      return res.status(403).json({
        message: `Permission denied to create database. Run: ALTER ROLE ${adminUser} CREATEDB;`,
        hint_sql: `ALTER ROLE ${adminUser} CREATEDB;`,
      });
    }
    res.status(500).json({ message: err.message || "Failed to create database." });
  } finally {
    await adminClient.end().catch(() => {});
    await mainDbClient.end().catch(() => {});
  }
};

exports.getCreatedDatabases = async (_req, res) => {
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    const databases = await fetchCreatedDatabases(mainDbClient);
    res.json({ databases });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load created databases." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.deleteDatabase = async (req, res) => {
  const canDelete = await hasDbCreateActionPermission(req, "delete");
  if (!canDelete) {
    return res.status(403).json({ message: "Forbidden: Missing DB Create delete permission." });
  }

  const databaseName = normalizeDatabaseName(req.params.databaseName);
  if (!databaseName || databaseName === INVENTORY_DB_NAME) {
    return res.status(400).json({ message: "Invalid database name." });
  }

  const cfg = getDbConfig();
  const adminCfg = getDbAdminConfig();
  const adminClient = new Client({
    host: adminCfg.host,
    port: adminCfg.port,
    user: adminCfg.user,
    password: adminCfg.password,
    database: adminCfg.database,
  });
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureDatabaseRegistryTable(mainDbClient);
    const exists = await mainDbClient.query(
      `SELECT folder_name FROM ${DATABASE_REGISTRY_TABLE} WHERE LOWER(database_name) = $1 LIMIT 1`,
      [databaseName]
    );
    if (!exists.rowCount) {
      return res.status(404).json({ message: "Database not found in created list." });
    }
    const folderName = String(exists.rows[0]?.folder_name || "").trim();

    await adminClient.connect();
    await adminClient.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1
         AND pid <> pg_backend_pid()`,
      [databaseName]
    );
    await adminClient.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);

    await mainDbClient.query(
      `DELETE FROM ${DATABASE_REGISTRY_TABLE}
       WHERE LOWER(database_name) = $1`,
      [databaseName]
    );
    await mainDbClient.query(
      `UPDATE user_accesses
       SET database_name = NULL
       WHERE LOWER(COALESCE(database_name, '')) = $1`,
      [databaseName]
    );

    if (folderName) {
      const dbFolderPath = path.resolve(DATABASE_STORAGE_ROOT, folderName);
      const withinRoot = dbFolderPath.startsWith(DATABASE_STORAGE_ROOT);
      if (withinRoot && fs.existsSync(dbFolderPath)) {
        fs.rmSync(dbFolderPath, { recursive: true, force: true });
      }
    }

    res.json({ message: "Database deleted successfully." });
  } catch (err) {
    const code = String(err?.code || "").trim();
    if (code === "42501" || /permission denied/i.test(String(err?.message || ""))) {
      const adminUser = String(adminCfg.user || cfg.user || "postgres").trim() || "postgres";
      return res.status(403).json({
        message: `Permission denied to drop database. Run: ALTER ROLE ${adminUser} CREATEDB;`,
        hint_sql: `ALTER ROLE ${adminUser} CREATEDB;`,
      });
    }
    res.status(500).json({ message: err.message || "Failed to delete database." });
  } finally {
    await adminClient.end().catch(() => {});
    await mainDbClient.end().catch(() => {});
  }
};

exports.getCompanies = async (_req, res) => {
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT cp.id,
              cp.company_name,
              cp.company_code,
              cp.email,
              cp.folder_name,
              cp.logo_path,
              cp.logo_file_name,
              cp.logo_data_url,
              cp."createdAt",
              cp."updatedAt",
              COUNT(um.user_id)::int AS mapped_users_count
       FROM ${COMPANY_REGISTRY_TABLE} cp
       LEFT JOIN user_mappings um ON um.company_profile_id = cp.id
       GROUP BY cp.id, cp.company_name, cp.company_code, cp.email, cp.folder_name, cp.logo_path, cp.logo_file_name, cp.logo_data_url, cp."createdAt", cp."updatedAt"
       ORDER BY LOWER(cp.company_name) ASC, cp.id ASC`
    );
    const rows = (rs.rows || []).map((row) => {
      const logoPath = resolveCompanyLogoPathForResponse(row);
      const logoDataUrl = buildCompanyLogoDataUrl(row);
      return {
        id: Number(row.id || 0),
        company_name: normalizeCompanyName(row.company_name),
        company_code: normalizeCompanyCode(row.company_code),
        email: normalizeEmail(row.email),
        folder_name: String(row.folder_name || "").trim(),
        logo_file_name: String(row.logo_file_name || "").trim(),
        logo_path: logoPath,
        logo_data_url: logoDataUrl || "",
        logo_exists: Boolean(logoDataUrl || logoPath),
        logo_url: logoPath ? `/${String(logoPath).replace(/^\/+/, "")}` : "",
        logo_preview_url: `/api/users/companies/${Number(row.id || 0)}/logo${row.updatedAt ? `?v=${encodeURIComponent(String(new Date(row.updatedAt).getTime() || ""))}` : ""}`,
        created_at: row.createdAt || null,
        updated_at: row.updatedAt || null,
        mapped_users_count: Number(row.mapped_users_count || 0),
        is_mapped: Number(row.mapped_users_count || 0) > 0,
      };
    });
    res.json({ companies: rows });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load companies." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

function toCompanyResponseRow(row = {}) {
  const logoPath = resolveCompanyLogoPathForResponse(row);
  const logoDataUrl = buildCompanyLogoDataUrl(row);
  return {
    id: Number(row.id || 0),
    company_name: normalizeCompanyName(row.company_name),
    company_code: normalizeCompanyCode(row.company_code),
    email: normalizeEmail(row.email),
    folder_name: String(row.folder_name || "").trim(),
    logo_file_name: String(row.logo_file_name || "").trim(),
    logo_path: logoPath,
    logo_data_url: logoDataUrl || "",
    logo_exists: Boolean(logoDataUrl || logoPath),
    logo_url: logoPath ? `/${String(logoPath).replace(/^\/+/, "")}` : "",
    logo_preview_url: `/api/users/companies/${Number(row.id || 0)}/logo${row.updatedAt ? `?v=${encodeURIComponent(String(new Date(row.updatedAt).getTime() || ""))}` : ""}`,
    created_at: row.createdAt || null,
    updated_at: row.updatedAt || null,
    mapped_users_count: Number(row.mapped_users_count || 0),
    is_mapped: Number(row.mapped_users_count || 0) > 0,
  };
}

exports.getCompanyById = async (req, res) => {
  const canView = await hasCompanyCreateActionPermission(req, "view");
  if (!canView) {
    return res.status(403).json({ message: "Forbidden: Missing Company Create view permission." });
  }

  const companyId = Number(req.params.companyId || 0);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return res.status(400).json({ message: "Invalid company id." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT cp.id,
              cp.company_name,
              cp.company_code,
              cp.email,
              cp.folder_name,
              cp.logo_path,
              cp.logo_file_name,
              cp.logo_data_url,
              cp."createdAt",
              cp."updatedAt",
              COUNT(um.user_id)::int AS mapped_users_count
       FROM ${COMPANY_REGISTRY_TABLE} cp
       LEFT JOIN user_mappings um ON um.company_profile_id = cp.id
       WHERE cp.id = $1
       GROUP BY cp.id, cp.company_name, cp.company_code, cp.email, cp.folder_name, cp.logo_path, cp.logo_file_name, cp.logo_data_url, cp."createdAt", cp."updatedAt"
       LIMIT 1`,
      [companyId]
    );
    if (!rs.rowCount) {
      return res.status(404).json({ message: "Company not found." });
    }
    return res.json({ company: toCompanyResponseRow(rs.rows[0] || {}) });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load company." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.createCompany = async (req, res) => {
  const canAdd = await hasCompanyCreateActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing Company Create add permission." });
  }

  const companyName = normalizeCompanyName(req.body?.company_name);
  const companyCode = normalizeCompanyCode(req.body?.company_code);
  const companyEmail = normalizeEmail(req.body?.email);
  const fileName = String(req.body?.logo_file_name || "").trim();
  const ext = path.extname(fileName).toLowerCase();
  if (!companyName) {
    return res.status(400).json({ message: "Company name is required." });
  }
  if (!companyCode) {
    return res.status(400).json({ message: "Company code is required." });
  }
  if (!companyEmail) {
    return res.status(400).json({ message: "Valid company email is required." });
  }
  if (!COMPANY_LOGO_EXTENSIONS.has(ext)) {
    return res.status(400).json({ message: "Invalid logo format. Allowed: .jpg, .jpeg, .bmp, .gif, .tiff, .png" });
  }

    const logoDataUrlInput = String(req.body?.logo_file_data_base64 || "").trim();
    let logoBuffer;
    try {
    logoBuffer = parseBase64Payload(logoDataUrlInput);
    } catch (_err) {
      return res.status(400).json({ message: "Invalid logo data." });
    }
  if (!logoBuffer || !logoBuffer.length) {
    return res.status(400).json({ message: "Uploaded logo is empty." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);

    const normalizedLookupCode = normalizeCompanyCode(companyCode);
    const normalizedLookupName = normalizeCompanyName(companyName);
    const existingRs = await mainDbClient.query(
      `SELECT id, company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url
       FROM ${COMPANY_REGISTRY_TABLE}
       WHERE REGEXP_REPLACE(UPPER(COALESCE(company_code, '')), '[^A-Z0-9_-]+', '', 'g') = $1
          OR UPPER(REGEXP_REPLACE(COALESCE(company_name, ''), '\s+', ' ', 'g')) = UPPER($2)
       ORDER BY
         CASE
           WHEN REGEXP_REPLACE(UPPER(COALESCE(company_code, '')), '[^A-Z0-9_-]+', '', 'g') = $1 THEN 0
           ELSE 1
         END ASC,
         id ASC
       LIMIT 1`,
      [normalizedLookupCode, normalizedLookupName]
    );

    ensureDir(COMPANY_STORAGE_ROOT);
    let folderPath = "";
    let folderName = "";

    if (existingRs.rowCount) {
      folderName = String(existingRs.rows[0]?.folder_name || "").trim();
      if (!folderName) {
        folderPath = resolveCompanyFolder(companyName);
        let suffix = 1;
        while (fs.existsSync(folderPath)) {
          folderPath = path.join(COMPANY_STORAGE_ROOT, `${safeNamePart(companyName)}_${suffix++}`);
        }
        folderName = path.basename(folderPath);
      } else {
        folderPath = path.resolve(COMPANY_STORAGE_ROOT, folderName);
      }
      ensureDir(folderPath);
      deleteCompanyLogoFiles(folderPath);
    } else {
      folderPath = resolveCompanyFolder(companyName);
      let suffix = 1;
      while (fs.existsSync(folderPath)) {
        folderPath = path.join(COMPANY_STORAGE_ROOT, `${safeNamePart(companyName)}_${suffix++}`);
      }
      ensureDir(folderPath);
      folderName = path.basename(folderPath);
    }

    const storedLogoFileName = sanitizeLogoFileName(fileName, ext);
    const logoPath = path.join(folderPath, storedLogoFileName);
    fs.writeFileSync(logoPath, logoBuffer);
    const relativeLogoPath = toRelativeStoragePath(logoPath);
    let rs;
    let message = "Company created successfully.";
    if (existingRs.rowCount) {
      rs = await mainDbClient.query(
        `UPDATE ${COMPANY_REGISTRY_TABLE}
         SET company_name = $1,
             company_code = $2,
             email = $3,
             folder_name = $4,
             logo_path = $5,
             logo_file_name = $6,
             logo_data_url = $7,
             "updatedAt" = NOW()
         WHERE id = $8
         RETURNING id, company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url, "createdAt", "updatedAt"`,
        [
          companyName,
          companyCode,
          companyEmail,
          folderName,
          relativeLogoPath,
          storedLogoFileName,
          logoDataUrlInput || null,
          Number(existingRs.rows[0]?.id || 0),
        ]
      );
      message = "Company updated successfully.";
    } else {
      rs = await mainDbClient.query(
        `INSERT INTO ${COMPANY_REGISTRY_TABLE}
         (company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url, created_by, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url, "createdAt", "updatedAt"`,
        [companyName, companyCode, companyEmail, folderName, relativeLogoPath, storedLogoFileName, logoDataUrlInput || null, Number(req.user?.id || 0) || null]
      );
    }

    const row = rs.rows[0];
    const normalizedLogoPath = normalizeCompanyLogoPath(row.logo_path, row.folder_name, row.logo_file_name);
    const savedLogoDataUrl = /^data:image\//i.test(String(row.logo_data_url || "").trim())
      ? String(row.logo_data_url || "").trim()
      : "";
    res.status(201).json({
      message,
      company: {
        id: Number(row.id || 0),
        company_name: normalizeCompanyName(row.company_name),
        company_code: normalizeCompanyCode(row.company_code),
        email: normalizeEmail(row.email),
        folder_name: String(row.folder_name || "").trim(),
        logo_file_name: String(row.logo_file_name || "").trim(),
        logo_path: normalizedLogoPath,
        logo_data_url: savedLogoDataUrl,
        logo_url: normalizedLogoPath ? `/${String(normalizedLogoPath).replace(/^\/+/, "")}` : "",
        created_at: row.createdAt || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create company." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.updateCompany = async (req, res) => {
  const canEdit = await hasCompanyCreateActionPermission(req, "edit");
  if (!canEdit) {
    return res.status(403).json({ message: "Forbidden: Missing Company Create edit permission." });
  }

  const companyId = Number(req.params.companyId || 0);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return res.status(400).json({ message: "Invalid company id." });
  }

  const companyName = normalizeCompanyName(req.body?.company_name);
  const companyCode = normalizeCompanyCode(req.body?.company_code);
  const companyEmail = normalizeEmail(req.body?.email);
  if (!companyName) {
    return res.status(400).json({ message: "Company name is required." });
  }
  if (!companyCode) {
    return res.status(400).json({ message: "Company code is required." });
  }
  if (!companyEmail) {
    return res.status(400).json({ message: "Valid company email is required." });
  }

  const fileName = String(req.body?.logo_file_name || "").trim();
  const hasLogoPayload = Boolean(fileName) || Boolean(String(req.body?.logo_file_data_base64 || "").trim());
  const ext = path.extname(fileName).toLowerCase();
  if (hasLogoPayload && (!fileName || !COMPANY_LOGO_EXTENSIONS.has(ext))) {
    return res.status(400).json({ message: "Invalid logo format. Allowed: .jpg, .jpeg, .bmp, .gif, .tiff, .png" });
  }

  let logoDataUrlInput = "";
  let logoBuffer = null;
  if (hasLogoPayload) {
    logoDataUrlInput = String(req.body?.logo_file_data_base64 || "").trim();
    try {
      logoBuffer = parseBase64Payload(logoDataUrlInput);
    } catch (_err) {
      return res.status(400).json({ message: "Invalid logo data." });
    }
    if (!logoBuffer || !logoBuffer.length) {
      return res.status(400).json({ message: "Uploaded logo is empty." });
    }
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);

    const currentRs = await mainDbClient.query(
      `SELECT id, company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url
       FROM ${COMPANY_REGISTRY_TABLE}
       WHERE id = $1
       LIMIT 1`,
      [companyId]
    );
    if (!currentRs.rowCount) {
      return res.status(404).json({ message: "Company not found." });
    }
    const current = currentRs.rows[0] || {};

    const conflictRs = await mainDbClient.query(
      `SELECT id
       FROM ${COMPANY_REGISTRY_TABLE}
       WHERE id <> $1
         AND (
           REGEXP_REPLACE(UPPER(COALESCE(company_code, '')), '[^A-Z0-9_-]+', '', 'g') = $2
           OR UPPER(REGEXP_REPLACE(COALESCE(company_name, ''), '\s+', ' ', 'g')) = UPPER($3)
         )
       LIMIT 1`,
      [companyId, normalizeCompanyCode(companyCode), normalizeCompanyName(companyName)]
    );
    if (conflictRs.rowCount) {
      return res.status(409).json({ message: "Company name or code already exists." });
    }

    let folderName = String(current.folder_name || "").trim();
    let logoPath = String(current.logo_path || "").trim();
    let logoFileName = String(current.logo_file_name || "").trim();
    let logoDataUrl = String(current.logo_data_url || "").trim();

    if (hasLogoPayload) {
      ensureDir(COMPANY_STORAGE_ROOT);
      let folderPath = "";
      if (!folderName) {
        folderPath = resolveCompanyFolder(companyName);
        let suffix = 1;
        while (fs.existsSync(folderPath)) {
          folderPath = path.join(COMPANY_STORAGE_ROOT, `${safeNamePart(companyName)}_${suffix++}`);
        }
        folderName = path.basename(folderPath);
      } else {
        folderPath = path.resolve(COMPANY_STORAGE_ROOT, folderName);
      }
      ensureDir(folderPath);
      deleteCompanyLogoFiles(folderPath);

      const storedLogoFileName = sanitizeLogoFileName(fileName, ext);
      const absLogoPath = path.join(folderPath, storedLogoFileName);
      fs.writeFileSync(absLogoPath, logoBuffer);
      logoPath = toRelativeStoragePath(absLogoPath);
      logoFileName = storedLogoFileName;
      logoDataUrl = logoDataUrlInput || null;
    }

    const updateRs = await mainDbClient.query(
      `UPDATE ${COMPANY_REGISTRY_TABLE}
       SET company_name = $2,
           company_code = $3,
           email = $4,
           folder_name = $5,
           logo_path = $6,
           logo_file_name = $7,
           logo_data_url = $8,
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, company_name, company_code, email, folder_name, logo_path, logo_file_name, logo_data_url, "createdAt", "updatedAt"`,
      [
        companyId,
        companyName,
        companyCode,
        companyEmail,
        folderName || null,
        logoPath || null,
        logoFileName || null,
        logoDataUrl || null,
      ]
    );

    const mappedRs = await mainDbClient.query(
      `SELECT COUNT(1)::int AS count
       FROM user_mappings
       WHERE company_profile_id = $1`,
      [companyId]
    );
    const row = updateRs.rows[0] || {};
    row.mapped_users_count = Number(mappedRs.rows?.[0]?.count || 0);

    return res.json({
      message: "Company updated successfully.",
      company: toCompanyResponseRow(row),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update company." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.deleteCompany = async (req, res) => {
  const canDelete = await hasCompanyCreateActionPermission(req, "delete");
  if (!canDelete) {
    return res.status(403).json({ message: "Forbidden: Missing Company Create delete permission." });
  }

  const companyId = Number(req.params.companyId || 0);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return res.status(400).json({ message: "Invalid company id." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT id, folder_name
       FROM ${COMPANY_REGISTRY_TABLE}
       WHERE id = $1
       LIMIT 1`,
      [companyId]
    );
    if (!rs.rowCount) {
      return res.status(404).json({ message: "Company not found." });
    }
    const folderName = String(rs.rows[0].folder_name || "").trim();
    await mainDbClient.query(`DELETE FROM ${COMPANY_REGISTRY_TABLE} WHERE id = $1`, [companyId]);

    if (folderName) {
      const companyFolderPath = path.resolve(COMPANY_STORAGE_ROOT, folderName);
      const withinRoot = companyFolderPath.startsWith(COMPANY_STORAGE_ROOT);
      if (withinRoot && fs.existsSync(companyFolderPath)) {
        fs.rmSync(companyFolderPath, { recursive: true, force: true });
      }
    }

    res.json({ message: "Company deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete company." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

async function getMappingPieces(mainDbClient, userId, databaseName, companyId, mappedEmailRaw) {
  const userRs = await mainDbClient.query(
    `SELECT id, username, company
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  if (!userRs.rowCount) {
    throw new Error("User not found.");
  }

  const dbRs = await mainDbClient.query(
    `SELECT database_name, company_name
     FROM ${DATABASE_REGISTRY_TABLE}
     WHERE LOWER(database_name) = LOWER($1)
     LIMIT 1`,
    [databaseName]
  );
  let dbRow = dbRs.rowCount ? dbRs.rows[0] : null;
  if (!dbRow) {
    const pgDbRs = await mainDbClient.query(
      `SELECT datname
       FROM pg_database
       WHERE datistemplate = FALSE AND LOWER(datname) = LOWER($1)
       LIMIT 1`,
      [databaseName]
    );
    if (!pgDbRs.rowCount) {
      throw new Error("Database not found.");
    }
    dbRow = {
      database_name: normalizeDatabaseName(databaseName),
      company_name: "",
    };
  }

  const companyRs = await mainDbClient.query(
    `SELECT id, company_name, company_code, email, logo_path
     FROM ${COMPANY_REGISTRY_TABLE}
     WHERE id = $1
     LIMIT 1`,
    [companyId]
  );
  if (!companyRs.rowCount) {
    throw new Error("Company not found.");
  }

  const userRow = userRs.rows[0];
  const companyRow = companyRs.rows[0];
  const companyEmail = normalizeEmail(companyRow.email);
  const mappedEmail = normalizeEmail(mappedEmailRaw);
  const emailVerified = !!mappedEmail && !!companyEmail && mappedEmail === companyEmail;
  const userCompany = normalizeNameCompare(userRow.company);
  const dbCompany = normalizeNameCompare(dbRow.company_name);
  const selectedCompany = normalizeNameCompare(companyRow.company_name);
  const verified = userCompany && userCompany === selectedCompany && (!dbCompany || userCompany === dbCompany) && emailVerified;

  return {
    verified: Boolean(verified),
    names: {
      user_company_name: normalizeCompanyName(userRow.company),
      database_company_name: normalizeCompanyName(dbRow.company_name),
      selected_company_name: normalizeCompanyName(companyRow.company_name),
      selected_company_email: companyEmail,
      mapped_email: mappedEmail,
    },
    normalized: {
      user_id: Number(userRow.id || 0),
      database_name: normalizeDatabaseName(dbRow.database_name) || normalizeDatabaseName(databaseName),
      company_profile_id: Number(companyRow.id || 0),
      company_name: normalizeCompanyName(companyRow.company_name),
      company_code: normalizeCompanyCode(companyRow.company_code),
      email: companyEmail,
      mapped_email: mappedEmail,
      logo_path: String(companyRow.logo_path || "").trim(),
    },
  };
}

async function syncMappedEmailSetupForDatabase(normalizedMapping) {
  const databaseName = normalizeDatabaseName(normalizedMapping?.database_name);
  const companyName = normalizeCompanyName(normalizedMapping?.company_name);
  const mappedEmail = normalizeEmail(normalizedMapping?.mapped_email || normalizedMapping?.email);
  if (!databaseName || !companyName) return;

  const subjectTemplate = `Invoice {{invoice_no}} - ${companyName}`;
  const bodyTemplate = `Dear {{customer_name}},\n\nPlease find attached your invoice {{invoice_no}}.\n\nThank you.\n${companyName}`;

  await db.withDatabase(databaseName, async () => {
    let row = await EmailSetup.findOne({ order: [["id", "ASC"]] });
    if (!row) {
      await EmailSetup.create({
        smtp_user: mappedEmail || null,
        from_name: companyName,
        from_email: mappedEmail || null,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
      });
      return;
    }

    const payload = {
      from_name: companyName,
      subject_template: subjectTemplate,
    };
    if (mappedEmail) {
      payload.smtp_user = mappedEmail;
      payload.from_email = mappedEmail;
    }
    await row.update(payload);
  });
}

exports.getMappedMeta = async (_req, res) => {
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureDatabaseRegistryTable(mainDbClient);
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);

    const usersRs = await mainDbClient.query(
      `SELECT id, username, email, company
       FROM users
       ORDER BY username ASC, id ASC`
    );
    const dbRs = await mainDbClient.query(
      `SELECT database_name, company_name
       FROM ${DATABASE_REGISTRY_TABLE}
       ORDER BY LOWER(database_name) ASC`
    );
    let pgDbRs = { rows: [] };
    try {
      pgDbRs = await mainDbClient.query(
        `SELECT datname
         FROM pg_database
         WHERE datistemplate = FALSE
         ORDER BY datname ASC`
      );
    } catch (_err) {
      pgDbRs = { rows: [] };
    }
    const companiesRs = await mainDbClient.query(
      `SELECT id, company_name, company_code, email, logo_path, logo_file_name, logo_data_url, folder_name
       FROM ${COMPANY_REGISTRY_TABLE}
       ORDER BY LOWER(company_name) ASC`
    );

    const databasesByName = new Map();
    (dbRs.rows || []).forEach((row) => {
      const name = normalizeDatabaseName(row.database_name);
      if (!name || RESERVED_DATABASES.has(name)) return;
      databasesByName.set(name, {
        name,
        company_name: normalizeCompanyName(row.company_name),
      });
    });
    (pgDbRs.rows || []).forEach((row) => {
      const name = normalizeDatabaseName(row.datname);
      if (!name || RESERVED_DATABASES.has(name) || databasesByName.has(name)) return;
      databasesByName.set(name, {
        name,
        company_name: "",
      });
    });
    const databases = Array.from(databasesByName.values())
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map((row) => ({
        name: row.name,
        company_name: row.company_name,
        label: row.company_name ? `${row.company_name} (${row.name})` : row.name,
      }));

    res.json({
      users: (usersRs.rows || []).map((row) => ({
        id: Number(row.id || 0),
        username: String(row.username || "").trim(),
        email: String(row.email || "").trim(),
        company_name: normalizeCompanyName(row.company),
      })),
      databases,
      companies: (companiesRs.rows || []).map((row) => ({
        id: Number(row.id || 0),
        company_name: normalizeCompanyName(row.company_name),
        company_code: normalizeCompanyCode(row.company_code),
        email: normalizeEmail(row.email),
        logo_file_name: String(row.logo_file_name || "").trim(),
        logo_path: normalizeCompanyLogoPath(row.logo_path, row.folder_name, row.logo_file_name),
        logo_data_url: buildCompanyLogoDataUrl(row),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load mapped meta data." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.getMappedByUser = async (req, res) => {
  const userId = Number(req.params.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureUserMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT um.user_id, um.database_name, um.company_profile_id, um.mapped_email, um.is_verified, cp.company_name, cp.company_code, cp.email,
              cp.logo_path, cp.logo_file_name, cp.logo_data_url, cp.folder_name
       FROM user_mappings um
       JOIN ${COMPANY_REGISTRY_TABLE} cp ON cp.id = um.company_profile_id
       WHERE um.user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (!rs.rowCount) {
      return res.json({ mapping: null });
    }
    const row = rs.rows[0];
    res.json({
      mapping: {
        user_id: Number(row.user_id || 0),
        database_name: normalizeDatabaseName(row.database_name),
        company_profile_id: Number(row.company_profile_id || 0),
        company_name: normalizeCompanyName(row.company_name),
        company_code: normalizeCompanyCode(row.company_code),
        email: normalizeEmail(row.email),
        mapped_email: normalizeEmail(row.mapped_email || row.email),
        logo_file_name: String(row.logo_file_name || "").trim(),
        logo_data_url: buildCompanyLogoDataUrl(row),
        logo_path: normalizeCompanyLogoPath(row.logo_path, row.folder_name, row.logo_file_name),
        logo_url: normalizeCompanyLogoPath(row.logo_path, row.folder_name, row.logo_file_name)
          ? `/${normalizeCompanyLogoPath(row.logo_path, row.folder_name, row.logo_file_name).replace(/^\/+/, "")}`
          : "",
        is_verified: Boolean(row.is_verified),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load mapping." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.verifyMapping = async (req, res) => {
  const canAdd = await hasMappedActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing Mapped add permission." });
  }
  const userId = Number(req.body?.user_id || 0);
  const databaseName = normalizeDatabaseName(req.body?.database_name);
  const companyId = Number(req.body?.company_profile_id || 0);
  const mappedEmail = normalizeEmail(req.body?.email || req.body?.mapped_email);
  if (!Number.isFinite(userId) || userId <= 0 || !databaseName || !Number.isFinite(companyId) || companyId <= 0 || !mappedEmail) {
    return res.status(400).json({ message: "User, database, company and email are required." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureDatabaseRegistryTable(mainDbClient);
    await ensureCompanyRegistryTable(mainDbClient);
    const result = await getMappingPieces(mainDbClient, userId, databaseName, companyId, mappedEmail);
    res.json({
      verified: result.verified,
      names: result.names,
      message: result.verified ? "Verified successfully." : "Company/email does not match.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to verify mapping." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.saveMapping = async (req, res) => {
  const canAdd = await hasMappedActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing Mapped add permission." });
  }
  const userId = Number(req.body?.user_id || 0);
  const databaseName = normalizeDatabaseName(req.body?.database_name);
  const companyId = Number(req.body?.company_profile_id || 0);
  const mappedEmail = normalizeEmail(req.body?.email || req.body?.mapped_email);
  if (!Number.isFinite(userId) || userId <= 0 || !databaseName || !Number.isFinite(companyId) || companyId <= 0 || !mappedEmail) {
    return res.status(400).json({ message: "User, database, company and email are required." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureDatabaseRegistryTable(mainDbClient);
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);
    const result = await getMappingPieces(mainDbClient, userId, databaseName, companyId, mappedEmail);
    if (!result.verified) {
      return res.status(400).json({
        message: "Verify failed. User company, database company, selected company and email must match.",
        names: result.names,
      });
    }
    await mainDbClient.query(
      `INSERT INTO ${DATABASE_REGISTRY_TABLE} (database_name, company_name, created_by, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (database_name)
       DO UPDATE SET company_name = EXCLUDED.company_name,
                     "updatedAt" = NOW()`,
      [result.normalized.database_name, result.normalized.company_name, Number(req.user?.id || 0) || null]
    );

    await mainDbClient.query(
      `INSERT INTO user_mappings
       (user_id, company_profile_id, database_name, mapped_email, is_verified, created_by, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, TRUE, $5, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET company_profile_id = EXCLUDED.company_profile_id,
                     database_name = EXCLUDED.database_name,
                     mapped_email = EXCLUDED.mapped_email,
                     is_verified = TRUE,
                     "updatedAt" = NOW()`,
      [result.normalized.user_id, result.normalized.company_profile_id, result.normalized.database_name, result.normalized.mapped_email, Number(req.user?.id || 0) || null]
    );
    await syncMappedEmailSetupForDatabase(result.normalized).catch(() => {});

    res.json({
      message: "User mapped successfully.",
      mapping: {
        user_id: result.normalized.user_id,
        database_name: result.normalized.database_name,
        company_profile_id: result.normalized.company_profile_id,
        company_name: result.normalized.company_name,
        company_code: result.normalized.company_code,
        email: result.normalized.email,
        mapped_email: result.normalized.mapped_email,
        logo_path: result.normalized.logo_path,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to save mapping." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.getCompanyLogo = async (req, res) => {
  const companyId = Number(req.params.companyId || 0);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return res.status(400).json({ message: "Invalid company id." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT id, company_name, folder_name, logo_path, logo_file_name
       FROM ${COMPANY_REGISTRY_TABLE}
       WHERE id = $1
       LIMIT 1`,
      [companyId]
    );
    if (!rs.rowCount) {
      return res.status(404).json({ message: "Company not found." });
    }
    const absPath = resolveCompanyLogoAbsolutePath(rs.rows[0] || {});
    if (!absPath) {
      return res.status(404).json({ message: "Company logo not found." });
    }
    return res.sendFile(absPath);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load company logo." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.getMyCompanies = async (req, res) => {
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  if (!Number.isFinite(requesterId) || requesterId <= 0) {
    return res.status(401).json({ message: "Invalid token user." });
  }

  const requesterRole = String(req?.user?.role || "").trim().toLowerCase();
  const selectedDb = normalizeDatabaseName(req?.databaseName || req?.requestedDatabaseName || req?.headers?.["x-database-name"]);
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  const toJson = (rows) =>
    (Array.isArray(rows) ? rows : []).map((row) => ({
      id: Number(row.id || 0),
      company_name: normalizeCompanyName(row.company_name),
      company_code: normalizeCompanyCode(row.company_code),
      email: normalizeEmail(row.email),
      logo_path: String(row.logo_path || "").trim(),
      database_name: normalizeDatabaseName(row.database_name),
      mapped_users_count: Number(row.mapped_users_count || 0),
      mapped_users_count_in_selected_db: Number(row.mapped_users_count_in_selected_db || 0),
      is_mapped: Number(row.mapped_users_count || 0) > 0,
      label: normalizeCompanyCode(row.company_code)
        ? `${normalizeCompanyName(row.company_name)} [${normalizeCompanyCode(row.company_code)}]`
        : normalizeCompanyName(row.company_name),
    })).filter((row) => row.id > 0 && row.company_name);

  try {
    await mainDbClient.connect();
    await ensureCompanyRegistryTable(mainDbClient);
    await ensureUserMappingTable(mainDbClient);

    let rs;
    const requesterIsSuper = await isRequesterSuperAdmin(req);
    if (requesterRole === "admin" && requesterIsSuper) {
      rs = await mainDbClient.query(
        `SELECT cp.id,
                cp.company_name,
                cp.company_code,
                cp.email,
                cp.logo_path,
                MIN(LOWER(um.database_name)) AS database_name,
                COUNT(DISTINCT um.user_id)::int AS mapped_users_count,
                COUNT(DISTINCT um.user_id) FILTER (
                  WHERE $1::text IS NOT NULL AND LOWER(um.database_name) = LOWER($1)
                )::int AS mapped_users_count_in_selected_db
         FROM ${COMPANY_REGISTRY_TABLE} cp
         LEFT JOIN user_mappings um ON um.company_profile_id = cp.id
         GROUP BY cp.id, cp.company_name, cp.company_code, cp.email, cp.logo_path
         ORDER BY
           COUNT(DISTINCT um.user_id) FILTER (
             WHERE $1::text IS NOT NULL AND LOWER(um.database_name) = LOWER($1)
           ) DESC,
           COUNT(DISTINCT um.user_id) DESC,
           LOWER(cp.company_name) ASC,
           cp.id ASC`,
        [selectedDb || null]
      );
    } else {
      rs = await mainDbClient.query(
        `SELECT cp.id,
                cp.company_name,
                cp.company_code,
                cp.email,
                cp.logo_path,
                LOWER(um.database_name) AS database_name,
                1::int AS mapped_users_count,
                1::int AS mapped_users_count_in_selected_db
         FROM user_mappings um
         JOIN ${COMPANY_REGISTRY_TABLE} cp ON cp.id = um.company_profile_id
         WHERE um.user_id = $1
           AND ($2::text IS NULL OR LOWER(um.database_name) = LOWER($2))
         ORDER BY LOWER(cp.company_name) ASC, cp.id ASC`,
        [requesterId, selectedDb || null]
      );
    }

    return res.json({ companies: toJson(rs.rows) });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load mapped companies." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.listMappedEntries = async (req, res) => {
  const canView = await hasMappedActionPermission(req, "view");
  if (!canView) {
    return res.status(403).json({ message: "Forbidden: Missing Mapped view permission." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureUserMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT um.id,
              um.user_id,
              um.database_name,
              um.company_profile_id,
              um.mapped_email,
              um.is_verified,
              um."updatedAt",
              u.username,
              u.email AS user_email,
              cp.company_name,
              cp.company_code,
              cp.email AS company_email
       FROM user_mappings um
       LEFT JOIN users u ON u.id = um.user_id
       LEFT JOIN ${COMPANY_REGISTRY_TABLE} cp ON cp.id = um.company_profile_id
       ORDER BY LOWER(um.database_name) ASC, um.user_id ASC, um.id ASC`
    );

    const entries = (rs.rows || []).map((row) => ({
      id: Number(row.id || 0),
      user_id: Number(row.user_id || 0),
      username: String(row.username || "").trim(),
      user_email: normalizeEmail(row.user_email),
      database_name: normalizeDatabaseName(row.database_name),
      company_profile_id: Number(row.company_profile_id || 0),
      company_name: normalizeCompanyName(row.company_name),
      company_code: normalizeCompanyCode(row.company_code),
      company_email: normalizeEmail(row.company_email),
      mapped_email: normalizeEmail(row.mapped_email || row.company_email),
      is_verified: Boolean(row.is_verified),
      updated_at: row.updatedAt || null,
    }));

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load mapped entries." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.deleteMappedEntry = async (req, res) => {
  const canDelete = await hasMappedActionPermission(req, "delete");
  if (!canDelete) {
    return res.status(403).json({ message: "Forbidden: Missing Mapped delete permission." });
  }

  const entryId = Number(req.params.entryId || 0);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ message: "Invalid entry id." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureUserMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `DELETE FROM user_mappings
       WHERE id = $1
       RETURNING id`,
      [entryId]
    );
    if (!rs.rowCount) {
      return res.status(404).json({ message: "Mapped entry not found." });
    }
    return res.json({ message: "Mapped entry deleted successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete mapped entry." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.listInvMapEntries = async (req, res) => {
  const canView = await hasInvMapActionPermission(req, "view");
  if (!canView) {
    return res.status(403).json({ message: "Forbidden: Missing Inv Map view permission." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    await mainDbClient.connect();
    await ensureUserInvoiceMappingTable(mainDbClient);
    const filterDatabaseName = normalizeDatabaseName(req.query?.database_name);
    let rs;
    if (filterDatabaseName) {
      rs = await mainDbClient.query(
        `SELECT uim.*, u.username, u.email
         FROM ${USER_INVOICE_MAPPING_TABLE} uim
         LEFT JOIN users u ON u.id = uim.user_id
         WHERE LOWER(uim.database_name) = LOWER($1)
         ORDER BY uim.user_id ASC, uim.id ASC`,
        [filterDatabaseName]
      );
    } else {
      rs = await mainDbClient.query(
        `SELECT uim.*, u.username, u.email
         FROM ${USER_INVOICE_MAPPING_TABLE} uim
         LEFT JOIN users u ON u.id = uim.user_id
         ORDER BY LOWER(uim.database_name) ASC, uim.user_id ASC, uim.id ASC`
      );
    }

    const rows = (rs.rows || []).map((row) => ({
      id: Number(row.id || 0),
      user_id: Number(row.user_id || 0),
      username: String(row.username || "").trim(),
      email: String(row.email || "").trim(),
      database_name: normalizeDatabaseName(row.database_name),
      feature_flags: {
        logo: Boolean(row.logo_enabled),
        invoice: Boolean(row.invoice_enabled),
        sign_c: Boolean(row.sign_c_enabled),
        seal_c: Boolean(row.seal_c_enabled),
        theme: Boolean(row.theme_enabled),
      },
      is_verified: Boolean(row.is_verified),
      updated_at: row.updatedAt || null,
    }));

    res.json({ entries: rows });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load Inv Map entries." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.deleteInvMapEntry = async (req, res) => {
  const canDelete = await hasInvMapActionPermission(req, "delete");
  if (!canDelete) {
    return res.status(403).json({ message: "Forbidden: Missing Inv Map delete permission." });
  }

  const entryId = Number(req.params.entryId || 0);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ message: "Invalid entry id." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    await mainDbClient.connect();
    await ensureUserInvoiceMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `DELETE FROM ${USER_INVOICE_MAPPING_TABLE}
       WHERE id = $1
       RETURNING id`,
      [entryId]
    );
    if (!rs.rowCount) {
      return res.status(404).json({ message: "Inv Map entry not found." });
    }
    res.json({ message: "Inv Map entry deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete Inv Map entry." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

async function resolveCanonicalInvMapUserId(userRef, userModel) {
  const fallbackId = Number(userRef?.user_id || 0);
  if (String(userRef?.user_database || "").toLowerCase() === INVENTORY_DB_NAME) {
    return fallbackId;
  }

  const plain = userModel && typeof userModel.toJSON === "function" ? userModel.toJSON() : (userModel || {});
  const email = String(plain?.email || "").trim().toLowerCase();
  const username = String(plain?.username || "").trim().toLowerCase();

  const found = await db.withDatabase(INVENTORY_DB_NAME, async () => {
    if (email) {
      const byEmailRs = await db.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        { bind: [email] }
      );
      const byEmailRows = Array.isArray(byEmailRs?.[0]) ? byEmailRs[0] : [];
      if (Number(byEmailRows[0]?.id || 0) > 0) return Number(byEmailRows[0].id);
    }
    if (username) {
      const byUserRs = await db.query(
        `SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
        { bind: [username] }
      );
      const byUserRows = Array.isArray(byUserRs?.[0]) ? byUserRs[0] : [];
      if (Number(byUserRows[0]?.id || 0) > 0) return Number(byUserRows[0].id);
    }
    return fallbackId;
  });

  return Number(found || fallbackId || 0);
}

exports.getInvMapByUser = async (req, res) => {
  const canView = await hasInvMapActionPermission(req, "view");
  if (!canView) {
    return res.status(403).json({ message: "Forbidden: Missing Inv Map view permission." });
  }

  const userRef = parseUserReference(req.params.userId);
  if (!userRef) {
    return res.status(400).json({ message: "Invalid user reference." });
  }

  const databaseName = normalizeDatabaseName(req.query?.database_name);
  if (!databaseName) {
    return res.status(400).json({ message: "Database is required." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    const user = await getUserFromDatabase(userRef.user_database, userRef.user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const canonicalUserId = await resolveCanonicalInvMapUserId(userRef, user);

    await mainDbClient.connect();
    await ensureUserInvoiceMappingTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT *
       FROM ${USER_INVOICE_MAPPING_TABLE}
       WHERE user_id = $1 AND LOWER(database_name) = LOWER($2)
       LIMIT 1`,
      [canonicalUserId, databaseName]
    );

    if (!rs.rowCount) {
      return res.json({ mapping: null });
    }

    const row = rs.rows[0];
    res.json({
      mapping: {
        user_id: Number(row.user_id || 0),
        database_name: normalizeDatabaseName(row.database_name),
        feature_flags: {
          logo: Boolean(row.logo_enabled),
          invoice: Boolean(row.invoice_enabled),
          sign_c: Boolean(row.sign_c_enabled),
          seal_c: Boolean(row.seal_c_enabled),
          theme: Boolean(row.theme_enabled),
        },
        is_verified: Boolean(row.is_verified),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load Inv Map data." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.verifyInvMap = async (req, res) => {
  const canAdd = await hasInvMapActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing Inv Map add permission." });
  }

  const userRef = parseUserReference(req.body?.user_ref);
  const databaseName = normalizeDatabaseName(req.body?.database_name);
  const featureFlags = normalizeInvMapFlags(req.body?.feature_flags);

  if (!userRef) {
    return res.status(400).json({ message: "User is required." });
  }
  if (!databaseName) {
    return res.status(400).json({ message: "Database is required." });
  }
  if (!hasAnyInvMapFlag(featureFlags)) {
    return res.status(400).json({ message: "Select at least one function checkbox." });
  }

  try {
    const user = await getUserFromDatabase(userRef.user_database, userRef.user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const canonicalUserId = await resolveCanonicalInvMapUserId(userRef, user);

    const availability = await getPreferenceAvailability(databaseName, canonicalUserId);
    const missing = getInvMapMissing(featureFlags, availability);
    const verified = true;

    res.json({
      verified,
      missing,
      availability,
      message: missing.length
        ? `Verified with warning. Missing Preference uploads: ${missing.join(", ")}`
        : "Verified successfully.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to verify Inv Map." });
  }
};

exports.saveInvMap = async (req, res) => {
  const canAdd = await hasInvMapActionPermission(req, "add");
  if (!canAdd) {
    return res.status(403).json({ message: "Forbidden: Missing Inv Map add permission." });
  }

  const userRef = parseUserReference(req.body?.user_ref);
  const databaseName = normalizeDatabaseName(req.body?.database_name);
  const featureFlags = normalizeInvMapFlags(req.body?.feature_flags);

  if (!userRef) {
    return res.status(400).json({ message: "User is required." });
  }
  if (!databaseName) {
    return res.status(400).json({ message: "Database is required." });
  }
  if (!hasAnyInvMapFlag(featureFlags)) {
    return res.status(400).json({ message: "Select at least one function checkbox." });
  }

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    const user = await getUserFromDatabase(userRef.user_database, userRef.user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const canonicalUserId = await resolveCanonicalInvMapUserId(userRef, user);

    const availability = await getPreferenceAvailability(databaseName, canonicalUserId);
    const missing = getInvMapMissing(featureFlags, availability);

    await mainDbClient.connect();
    await ensureUserInvoiceMappingTable(mainDbClient);
    await mainDbClient.query(
      `INSERT INTO ${USER_INVOICE_MAPPING_TABLE}
       (user_id, database_name, logo_enabled, invoice_enabled, sign_c_enabled, seal_c_enabled, theme_enabled, is_verified, created_by, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, NOW(), NOW())
       ON CONFLICT (user_id, database_name)
       DO UPDATE SET logo_enabled = EXCLUDED.logo_enabled,
                     invoice_enabled = EXCLUDED.invoice_enabled,
                     sign_c_enabled = EXCLUDED.sign_c_enabled,
                     seal_c_enabled = EXCLUDED.seal_c_enabled,
                     theme_enabled = EXCLUDED.theme_enabled,
                     is_verified = TRUE,
                     "updatedAt" = NOW()`,
      [
        canonicalUserId,
        databaseName,
        featureFlags.logo,
        featureFlags.invoice,
        featureFlags.sign_c,
        featureFlags.seal_c,
        featureFlags.theme,
        Number(req.user?.id || 0) || null,
      ]
    );

    res.json({
      message: missing.length
        ? `Inv Map saved. Missing uploads: ${missing.join(", ")}`
        : "Inv Map saved successfully.",
      mapping: {
        user_ref: `${userRef.user_database}:${userRef.user_id}`,
        user_id: canonicalUserId,
        database_name: databaseName,
        feature_flags: featureFlags,
        is_verified: true,
      },
      missing,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to save Inv Map." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

exports.getMyInvMap = async (req, res) => {
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ message: "Invalid token user." });
  }

  const requesterDatabase = normalizeDatabaseName(req.databaseName || req.user?.database_name || req.headers["x-database-name"]) || INVENTORY_DB_NAME;
  const databaseName = requesterDatabase;
  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });
  try {
    const requesterUser = await getUserFromDatabase(requesterDatabase, userId);
    const canonicalUserId = await resolveCanonicalInvMapUserId(
      { user_database: requesterDatabase, user_id: userId },
      requesterUser
    );

    await mainDbClient.connect();
    await ensureUserInvoiceMappingTable(mainDbClient);
    await ensureUserQuotationRenderTable(mainDbClient);
    const rs = await mainDbClient.query(
      `SELECT *
       FROM ${USER_INVOICE_MAPPING_TABLE}
       WHERE user_id = $1 AND LOWER(database_name) = LOWER($2)
       LIMIT 1`,
      [canonicalUserId, databaseName]
    );
    if (!rs.rowCount) {
      return res.json({
        mapping: null,
        feature_flags: null,
      });
    }
    const row = rs.rows[0];
    const visibilityRs = await mainDbClient.query(
      `SELECT render_visibility_json, render_overrides_json
       FROM ${USER_QUOTATION_RENDER_TABLE}
       WHERE user_id = $1 AND LOWER(database_name) = LOWER($2) AND quotation_type = 'quotation2'
       LIMIT 1`,
      [Number(canonicalUserId || row.user_id || 0), databaseName]
    );
    const quotation2RenderVisibility = visibilityRs.rowCount
      ? parseQuotationRenderVisibility(visibilityRs.rows[0], QUOTATION2_RENDER_KEYS)
      : {};
    const quotation2RenderOverrides = visibilityRs.rowCount
      ? parseQuotationRenderOverrides(visibilityRs.rows[0])
      : { item_names_by_invoice: {}, item_rates_by_invoice: {}, layout_state: {} };
    const quotation3Rs = await mainDbClient.query(
      `SELECT render_visibility_json, render_overrides_json
       FROM ${USER_QUOTATION_RENDER_TABLE}
       WHERE user_id = $1 AND LOWER(database_name) = LOWER($2) AND quotation_type = 'quotation3'
       LIMIT 1`,
      [Number(canonicalUserId || row.user_id || 0), databaseName]
    );
    const quotation3RenderVisibility = quotation3Rs.rowCount
      ? parseQuotationRenderVisibility(quotation3Rs.rows[0], QUOTATION3_RENDER_KEYS)
      : {};
    const quotation3RenderOverrides = quotation3Rs.rowCount
      ? parseQuotationRenderOverrides(quotation3Rs.rows[0])
      : { item_names_by_invoice: {}, item_rates_by_invoice: {}, layout_state: {} };
    res.json({
      mapping: {
        user_id: Number(canonicalUserId || row.user_id || 0),
        database_name: normalizeDatabaseName(row.database_name),
        is_verified: Boolean(row.is_verified),
      },
      feature_flags: {
        logo: Boolean(row.logo_enabled),
        invoice: Boolean(row.invoice_enabled),
        sign_c: Boolean(row.sign_c_enabled),
        seal_c: Boolean(row.seal_c_enabled),
        theme: Boolean(row.theme_enabled),
      },
      quotation2_render_visibility: quotation2RenderVisibility,
      quotation2_render_overrides: quotation2RenderOverrides,
      quotation3_render_visibility: quotation3RenderVisibility,
      quotation3_render_overrides: quotation3RenderOverrides,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load your Inv Map." });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
};

async function saveMyQuotationRenderSettings(req, res, options) {
  const quotationType = options?.quotationType === "quotation3" ? "quotation3" : "quotation2";
  const allowedKeys = quotationType === "quotation3" ? QUOTATION3_RENDER_KEYS : QUOTATION2_RENDER_KEYS;
  const label = quotationType === "quotation3" ? "Quotation 3" : "Quotation 2";
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ message: "Invalid token user." });
  }

  const requesterDatabase = normalizeDatabaseName(req.databaseName || req.user?.database_name || req.headers["x-database-name"]) || INVENTORY_DB_NAME;
  const databaseName = normalizeDatabaseName(req.body?.database_name) || requesterDatabase;
  const rawVisibility = req.body?.render_visibility;
  const rawOverrides = req.body?.render_overrides;
  const hasVisibilityPayload = rawVisibility && typeof rawVisibility === "object";
  const hasOverridesPayload = rawOverrides && typeof rawOverrides === "object";
  if (!hasVisibilityPayload && !hasOverridesPayload) {
    return res.status(400).json({ message: "At least one render input payload is required." });
  }
  const normalizedVisibility = hasVisibilityPayload ? normalizeQuotationRenderVisibility(rawVisibility, allowedKeys) : null;
  if (hasVisibilityPayload && !Object.keys(normalizedVisibility).length) {
    return res.status(400).json({ message: "At least one render visibility value is required." });
  }
  const normalizedOverrides = hasOverridesPayload
    ? normalizeQuotation2RenderOverrides(rawOverrides)
    : null;

  const cfg = getDbConfig();
  const mainDbClient = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database || INVENTORY_DB_NAME,
  });

  try {
    const requesterUser = await getUserFromDatabase(requesterDatabase, userId);
    const canonicalUserId = await resolveCanonicalInvMapUserId(
      { user_database: requesterDatabase, user_id: userId },
      requesterUser
    );

    await mainDbClient.connect();
    await ensureUserQuotationRenderTable(mainDbClient);
    const existingRs = await mainDbClient.query(
      `SELECT render_visibility_json, render_overrides_json
       FROM ${USER_QUOTATION_RENDER_TABLE}
       WHERE user_id = $1 AND LOWER(database_name) = LOWER($2) AND quotation_type = $3
       LIMIT 1`,
      [Number(canonicalUserId || userId), databaseName, quotationType]
    );
    const existingRow = existingRs.rowCount ? existingRs.rows[0] : null;
    const finalVisibility = normalizedVisibility || parseQuotationRenderVisibility(existingRow, allowedKeys);
    const finalOverrides = normalizedOverrides || parseQuotationRenderOverrides(existingRow);
    await mainDbClient.query(
      `INSERT INTO ${USER_QUOTATION_RENDER_TABLE}
       (user_id, database_name, quotation_type, render_visibility_json, render_overrides_json, created_by, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id, database_name, quotation_type)
       DO UPDATE SET render_visibility_json = EXCLUDED.render_visibility_json,
                     render_overrides_json = EXCLUDED.render_overrides_json,
                     "updatedAt" = NOW()`,
      [
        Number(canonicalUserId || userId),
        databaseName,
        quotationType,
        JSON.stringify(finalVisibility),
        JSON.stringify(finalOverrides),
        Number(req.user?.id || 0) || null,
      ]
    );

    res.json({
      message: `${label} render inputs saved.`,
      database_name: databaseName,
      render_visibility: finalVisibility,
      render_overrides: finalOverrides,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || `Failed to save ${label.toLowerCase()} render inputs.` });
  } finally {
    await mainDbClient.end().catch(() => {});
  }
}

exports.saveMyQuotation2RenderVisibility = async (req, res) => {
  return saveMyQuotationRenderSettings(req, res, { quotationType: "quotation2" });
};

exports.saveMyQuotation3RenderVisibility = async (req, res) => {
  return saveMyQuotationRenderSettings(req, res, { quotationType: "quotation3" });
};

exports.getUserAccess = async (req, res) => {
  const ref = parseUserReference(req.params.userId);
  if (!ref) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await getUserFromDatabase(ref.user_database, ref.user_id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  const requesterIsSuper = await isRequesterSuperAdmin(req);
  const userPlain = user.toJSON ? user.toJSON() : user;
  if (isProtectedSuperAdminTarget(userPlain, requesterId, requesterIsSuper)) {
    return res.status(403).json({ message: "Forbidden: Super admin user is protected." });
  }
  const canEditSuperUser = await canRequesterEditSuperFlag(req, userPlain);

  const row = await UserAccess.findOne({
    where: { user_id: ref.user_id, user_database: ref.user_database },
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
  });
  const mappedProfile = await findMappedUserProfile(ref.user_id);
  const mappedDatabaseName = normalizeDatabaseName(mappedProfile?.database_name);
  const accessDatabaseName = normalizeDatabaseName(row?.database_name);
  const defaultDatabaseName = mappedDatabaseName || accessDatabaseName || normalizeUserDatabase(ref.user_database);
  res.json({
    user: {
      ...(user.toJSON ? user.toJSON() : user),
      database_name: ref.user_database,
      selection_key: `${ref.user_database}:${ref.user_id}`,
    },
    allowed_pages: parseAllowedPages(row),
    allowed_actions: parseAllowedActions(row),
    database_name: accessDatabaseName,
    mapped_database_name: mappedDatabaseName,
    access_database_name: accessDatabaseName,
    default_database_name: defaultDatabaseName,
    user_database: ref.user_database,
    super_user: Boolean(userPlain.is_super_user),
    can_edit_super_user: canEditSuperUser,
  });
};

exports.saveUserAccess = async (req, res) => {
  const ref = parseUserReference(req.params.userId);
  if (!ref) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await getUserFromDatabase(ref.user_database, ref.user_id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  const requesterIsSuper = await isRequesterSuperAdmin(req);
  if (isProtectedSuperAdminTarget(user, requesterId, requesterIsSuper)) {
    return res.status(403).json({ message: "Forbidden: Super admin user is protected." });
  }

  const allowedActions = expandImplicitActionDependencies(normalizeActions(req.body.allowed_actions));
  const requestedPages = normalizePages(req.body.allowed_pages);
  const allowedPages = derivePagesFromActions(allowedActions, requestedPages);
  const databaseName = normalizeDatabaseName(req.body.database_name);

  let row = await UserAccess.findOne({
    where: { user_id: ref.user_id, user_database: ref.user_database },
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
  });
  if (!row) {
    row = await UserAccess.create({
      user_id: ref.user_id,
      user_database: ref.user_database,
      allowed_pages_json: JSON.stringify(allowedPages),
      allowed_actions_json: JSON.stringify(allowedActions),
      database_name: databaseName,
    });
  } else {
    row.user_database = ref.user_database;
    row.allowed_pages_json = JSON.stringify(allowedPages);
    row.allowed_actions_json = JSON.stringify(allowedActions);
    row.database_name = databaseName;
    await row.save();
  }

  const canEditSuperUser = await canRequesterEditSuperFlag(req, user);
  if (canEditSuperUser && req.body && Object.prototype.hasOwnProperty.call(req.body, "super_user")) {
    user.is_super_user = Boolean(req.body.super_user);
    await user.save();
  }

  res.json({
    message: "Access settings saved",
    user_id: ref.user_id,
    user_database: ref.user_database,
    allowed_pages: allowedPages,
    allowed_actions: allowedActions,
    database_name: databaseName,
    super_user: Boolean(user.is_super_user),
  });
};

exports.getMyAccess = async (req, res) => {
  const userId = Number(req.user?.id || req.user?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ message: "Invalid token user" });
  }

  const userDatabase = normalizeUserDatabase(req.databaseName || req.user?.database_name || INVENTORY_DB_NAME);

                                                                              
                                                                                        
  let row = await findAccessFromMainDb(userId, userDatabase);
  if (!row) {
    row = await UserAccess.findOne({
      where: { user_id: userId, user_database: userDatabase },
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });
  }
  if (!row && userDatabase !== INVENTORY_DB_NAME) {
    row = await findAccessFromMainDb(userId, INVENTORY_DB_NAME);
    if (!row) {
      row = await UserAccess.findOne({
        where: { user_id: userId, user_database: INVENTORY_DB_NAME },
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
      });
    }
  }
  const allowedActions = parseAllowedActions(row);
  const allowedPages = derivePagesFromActions(allowedActions, parseAllowedPages(row));
  const hasAccessConfig = Boolean(row) || allowedPages.length > 0 || allowedActions.length > 0;
  const preferredMappedDb = normalizeDatabaseName(row?.database_name) || userDatabase;
  const mappedProfile = await findMappedUserProfile(userId, preferredMappedDb);
  const mappedLogoDataUrl = String(mappedProfile?.logo_data_url || "").trim();
  const mappedLogoPath = String(mappedProfile?.logo_path || "").trim();
  const mappedLogoUrl = /^data:image\//i.test(mappedLogoDataUrl)
    ? mappedLogoDataUrl
    : (mappedLogoPath
      ? (/^https?:\/\//i.test(mappedLogoPath) || /^data:image\//i.test(mappedLogoPath)
        ? mappedLogoPath
        : `/${mappedLogoPath.replace(/^\/+/, "")}`)
      : null);

  res.json({
    allowed_pages: allowedPages,
    allowed_actions: allowedActions,
    database_name: normalizeDatabaseName(mappedProfile?.database_name) || normalizeDatabaseName(row?.database_name),
    mapped_company_name: normalizeCompanyName(mappedProfile?.company_name),
    mapped_company_code: normalizeCompanyCode(mappedProfile?.company_code),
    mapped_company_email: normalizeEmail(mappedProfile?.email),
    mapped_company_logo_url: mappedLogoUrl,
    user_database: userDatabase,
    has_access_config: hasAccessConfig,
  });
};
