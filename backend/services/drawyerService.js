const CaseModel = require("../models/Case");
const Plaint = require("../models/Plaint");
const Answer = require("../models/Answer");
const Witness = require("../models/Witness");
const Judgment = require("../models/Judgment");
const googleDriveService = require("./googleDriveService");

const SOURCE_DEFS = [
  { model: CaseModel, source: "cases", module: "Case" },
  { model: Plaint, source: "plaints", module: "Plaint" },
  { model: Answer, source: "answers", module: "Answer" },
  { model: Witness, source: "witnesses", module: "Witness" },
  { model: Judgment, source: "judgments", module: "Judgment" },
];

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
};
