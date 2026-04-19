const CaseModel = require("../models/Case");
const Plaint = require("../models/Plaint");
const Answer = require("../models/Answer");
const Witness = require("../models/Witness");
const Judgment = require("../models/Judgment");
const googleDriveService = require("./googleDriveService");
const fs = require("fs");
const path = require("path");

const SOURCE_DEFS = [
  { model: CaseModel, source: "cases", module: "Case" },
  { model: Plaint, source: "plaints", module: "Plaint" },
  { model: Answer, source: "answers", module: "Answer" },
  { model: Witness, source: "witnesses", module: "Witness" },
  { model: Judgment, source: "judgments", module: "Judgment" },
];
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

function toIsoDate(value) {
  const dt = value ? new Date(value) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

async function readAllUploadEntries() {
  const entries = [];
  for (const def of SOURCE_DEFS) {
    const rows = await def.model.findAll({
      attributes: ["id", "case_no", "uploads_json", "upload_method", "updatedAt", "createdAt"],
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const plain = row.toJSON ? row.toJSON() : row;
      const built = googleDriveService.buildUploadEntry(def.source, plain, def.module);
      entries.push(...built);
    });
  }
  return entries;
}

function parseDataUrl(raw) {
  const value = String(raw || "").trim();
  if (!value.startsWith("data:")) return null;
  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) return null;
  const header = value.slice(5, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const isBase64 = /;base64/i.test(header);
  const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  const mime = header.split(";")[0] || "application/octet-stream";
  return { mime, buffer };
}

function extFromMime(mime) {
  const lower = String(mime || "").toLowerCase();
  if (lower.includes("jpeg")) return "jpg";
  if (lower.includes("png")) return "png";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("bmp")) return "bmp";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("pdf")) return "pdf";
  if (lower.includes("msword") || lower.includes("word")) return "doc";
  if (lower.includes("officedocument.wordprocessingml.document")) return "docx";
  if (lower.includes("spreadsheet") || lower.includes("excel")) return "xls";
  if (lower.includes("csv")) return "csv";
  if (lower.includes("json")) return "json";
  if (lower.includes("plain")) return "txt";
  return "bin";
}

function mimeFromFileName(fileName) {
  const ext = String(path.extname(String(fileName || "")).toLowerCase() || "").replace(".", "");
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "txt") return "text/plain";
  if (ext === "csv") return "text/csv";
  if (ext === "json") return "application/json";
  return "application/octet-stream";
}

function resolveUploadPath(raw) {
  const cleaned = String(raw || "").trim().replace(/^\/+/, "").replace(/^uploads[\\/]+/i, "");
  if (!cleaned) return null;
  const absolute = path.resolve(UPLOADS_DIR, cleaned);
  if (!absolute.startsWith(UPLOADS_DIR)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}

function readUploadBinary(raw) {
  const parsed = parseDataUrl(raw);
  if (parsed && parsed.buffer?.length) {
    return {
      mime: parsed.mime || "application/octet-stream",
      buffer: parsed.buffer,
      file_name: "",
    };
  }
  const absolute = resolveUploadPath(raw);
  if (!absolute) return null;
  const buffer = fs.readFileSync(absolute);
  if (!buffer?.length) return null;
  return {
    mime: mimeFromFileName(absolute),
    buffer,
    file_name: path.basename(absolute),
  };
}

function findSourceDefByKey(key) {
  const normalized = String(key || "").trim().toLowerCase();
  return SOURCE_DEFS.find((item) => {
    return String(item.module || "").trim().toLowerCase() === normalized
      || String(item.source || "").trim().toLowerCase() === normalized;
  }) || null;
}

async function deleteDrawyerFile(moduleName, sourceTable, sourceId, fileIndex) {
  const def = findSourceDefByKey(sourceTable || moduleName);
  if (!def) {
    throw new Error("Invalid source.");
  }
  const id = Number(sourceId || 0);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid source id.");
  }
  const row = await def.model.findByPk(id);
  if (!row) {
    throw new Error("Source record not found.");
  }
  const plain = row.toJSON ? row.toJSON() : row;
  const uploads = Array.isArray(plain.uploads_json) ? [...plain.uploads_json] : [];
  const index = Number(fileIndex || 0);
  if (!Number.isFinite(index) || index < 0 || index >= uploads.length) {
    throw new Error("Invalid file index.");
  }
  uploads.splice(index, 1);
  await def.model.update({ uploads_json: uploads }, { where: { id } });
}

async function getDrawyerFileEntry(caseNo, moduleName, fileIndex) {
  const candidate = String(moduleName || "").trim().toLowerCase();
  const def = SOURCE_DEFS.find((item) => String(item.module || "").trim().toLowerCase() === candidate);
  if (!def) return null;

  const rows = await def.model.findAll({
    where: { case_no: caseNo },
    attributes: ["id", "case_no", "uploads_json", "upload_method", "updatedAt", "createdAt"],
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
  });

  let currentIndex = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const plain = row.toJSON ? row.toJSON() : row;
    const uploads = Array.isArray(plain.uploads_json) ? plain.uploads_json : [];
    for (let idx = 0; idx < uploads.length; idx += 1) {
      const parsed = readUploadBinary(uploads[idx]);
      if (!parsed || !parsed.buffer?.length) continue;
      if (currentIndex === fileIndex) {
        const ext = extFromMime(parsed.mime);
        const autoName = `${def.module}_${String(plain.case_no || "case").replace(/\s+/g, "_")}_${Number(plain.id || 0)}_${idx + 1}.${ext}`;
        const fileName = String(parsed.file_name || "").trim() || autoName;
        return {
          source_table: def.source,
          source_id: Number(plain.id || 0),
          case_no: String(plain.case_no || "").trim(),
          module_name: def.module,
          file_index: idx,
          file_name: fileName,
          mime: parsed.mime || "application/octet-stream",
          buffer: parsed.buffer,
          upload_method: String(plain.upload_method || "").trim() || "local",
          updated_at: plain.updatedAt || plain.updated_at || null,
        };
      }
      currentIndex += 1;
    }
  }
  return null;
}

async function getDrawyerFileEntryBySource(sourceTable, sourceId, fileIndex) {
  const def = findSourceDefByKey(sourceTable || "");
  if (!def) return null;

  const id = Number(sourceId || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  const index = Number(fileIndex || 0);
  if (!Number.isFinite(index) || index < 0) return null;

  const row = await def.model.findByPk(id, {
    attributes: ["id", "case_no", "uploads_json", "upload_method", "updatedAt", "createdAt"],
  });
  if (!row) return null;

  const plain = row.toJSON ? row.toJSON() : row;
  const uploads = Array.isArray(plain.uploads_json) ? plain.uploads_json : [];
  if (index >= uploads.length) return null;

  const parsed = readUploadBinary(uploads[index]);
  if (!parsed || !parsed.buffer?.length) return null;

  const ext = extFromMime(parsed.mime);
  const autoName = `${def.module}_${String(plain.case_no || "case").replace(/\s+/g, "_")}_${Number(plain.id || 0)}_${index + 1}.${ext}`;
  const fileName = String(parsed.file_name || "").trim() || autoName;
  return {
    source_table: def.source,
    source_id: Number(plain.id || 0),
    case_no: String(plain.case_no || "").trim(),
    module_name: def.module,
    file_index: index,
    file_name: fileName,
    mime: parsed.mime || "application/octet-stream",
    buffer: parsed.buffer,
    upload_method: String(plain.upload_method || "").trim() || "local",
    updated_at: plain.updatedAt || plain.updated_at || null,
  };
}

function groupEntries(entries, syncedHashSet, syncMetaByHash) {
  const byCase = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const caseNo = String(entry.case_no || "").trim() || "UNKNOWN_CASE";
    if (!byCase.has(caseNo)) {
      byCase.set(caseNo, {
        case_no: caseNo,
        folders: {},
      });
    }
    const caseBucket = byCase.get(caseNo);
    if (!caseBucket.folders[entry.module_name]) {
      caseBucket.folders[entry.module_name] = [];
    }
    const syncMeta = syncMetaByHash.get(entry.file_hash) || null;
    caseBucket.folders[entry.module_name].push({
      source_table: entry.source_table,
      source_id: entry.source_id,
      file_index: entry.file_index,
      file_name: entry.file_name,
      file_hash: entry.file_hash,
      upload_method: entry.upload_method,
      synced_to_drive: syncedHashSet.has(entry.file_hash),
      drive_file_id: syncMeta ? String(syncMeta.drive_file_id || "") : "",
      drive_web_view_link: syncMeta ? String(syncMeta.drive_web_view_link || "") : "",
      sync_status: syncMeta ? String(syncMeta.status || "") : "",
      updated_at: toIsoDate(entry.updated_at),
    });
  });
  return Array.from(byCase.values()).sort((a, b) => a.case_no.localeCompare(b.case_no));
}

async function getSyncMetaMap(req) {
  await googleDriveService.ensureTables();
  const userId = googleDriveService.getUserId(req);
  if (!userId) return new Map();
  const rs = await require("../config/database").query(
    `SELECT file_hash, drive_file_id, drive_web_view_link, status
     FROM ${googleDriveService.SYNC_TABLE}
     WHERE user_id = $1`,
    { bind: [userId] }
  );
  const rows = Array.isArray(rs?.[0]) ? rs[0] : [];
  const map = new Map();
  rows.forEach((row) => {
    const key = String(row.file_hash || "").trim();
    if (!key) return;
    map.set(key, row);
  });
  return map;
}

async function syncPending(req, entries, force = false) {
  const setting = await googleDriveService.getSettings(req);
  if (!setting || !setting.enabled) {
    return { synced: 0, failed: 0 };
  }
  if (!force && setting.auto_sync === false) {
    return { synced: 0, failed: 0 };
  }
  const syncedHashes = await googleDriveService.getSyncedHashes(req);
  const pending = entries.filter((entry) => !syncedHashes.has(entry.file_hash));
  if (!pending.length) return { synced: 0, failed: 0 };
  return googleDriveService.syncEntriesToDrive(req, pending);
}

async function listDrawyer(req, options = {}) {
  const forceSync = !!options.forceSync;
  const entries = await readAllUploadEntries();
  const syncResult = await syncPending(req, entries, forceSync);
  const syncedHashes = await googleDriveService.getSyncedHashes(req);
  const syncMeta = await getSyncMetaMap(req);
  const grouped = groupEntries(entries, syncedHashes, syncMeta);
  return {
    sync: syncResult,
    cases: grouped,
  };
}

module.exports = {
  listDrawyer,
  getDrawyerFileEntry,
  getDrawyerFileEntryBySource,
  deleteDrawyerFile,
};
