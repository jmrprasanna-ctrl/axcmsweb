const crypto = require("crypto");
const zlib = require("zlib");
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

const SETTINGS_TABLE = "google_drive_settings";
const SYNC_TABLE = "google_drive_file_syncs";
const DEFAULT_ROOT_FOLDER = "AXIS_CMS_DRAWYER";
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

function sanitizeFolderName(value, fallback = "Folder") {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|#%{}~]+/g, "_")
    .replace(/\s+/g, " ");
  return normalized || fallback;
}

function safeFileName(value, fallback = "file") {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|#%{}~]+/g, "_")
    .replace(/\s+/g, "_");
  return normalized || fallback;
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  if (!raw.startsWith("data:")) return null;
  const idx = raw.indexOf(",");
  if (idx === -1) return null;
  const header = raw.slice(5, idx);
  const payload = raw.slice(idx + 1);
  const mime = header.split(";")[0] || "application/octet-stream";
  const isBase64 = /;base64/i.test(header);
  const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return {
    mime,
    buffer,
  };
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  if (m.includes("bmp")) return "bmp";
  if (m.includes("webp")) return "webp";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("msword") || m.includes("word")) return "doc";
  if (m.includes("officedocument.wordprocessingml.document")) return "docx";
  if (m.includes("spreadsheet") || m.includes("excel")) return "xls";
  if (m.includes("csv")) return "csv";
  if (m.includes("json")) return "json";
  if (m.includes("plain")) return "txt";
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

function parseUploadBinary(raw) {
  const fromDataUrl = parseDataUrl(raw);
  if (fromDataUrl && fromDataUrl.buffer?.length) {
    return {
      mime: fromDataUrl.mime || "application/octet-stream",
      buffer: fromDataUrl.buffer,
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

function hashBuffer(buf) {
  return crypto.createHash("sha1").update(buf || Buffer.alloc(0)).digest("hex");
}

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      client_id VARCHAR(300),
      client_secret VARCHAR(300),
      refresh_token TEXT,
      root_folder_name VARCHAR(200) DEFAULT '${DEFAULT_ROOT_FOLDER}',
      root_folder_id VARCHAR(200),
      auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
      compress_before_upload BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${SYNC_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      source_table VARCHAR(40) NOT NULL,
      source_id INTEGER NOT NULL,
      case_no VARCHAR(120),
      module_name VARCHAR(40) NOT NULL,
      file_index INTEGER NOT NULL DEFAULT 0,
      file_hash VARCHAR(80) NOT NULL,
      drive_file_id VARCHAR(200),
      drive_web_view_link TEXT,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      last_error TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, file_hash)
    );
  `);
}

function getUserId(req) {
  const id = Number(req?.user?.id || req?.user?.userId || 0);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

async function getSettings(req) {
  await ensureTables();
  const userId = getUserId(req);
  if (!userId) return null;
  const rs = await db.query(`SELECT * FROM ${SETTINGS_TABLE} WHERE user_id = $1 LIMIT 1`, {
    bind: [userId],
  });
  const rows = Array.isArray(rs?.[0]) ? rs[0] : [];
  if (rows.length) return rows[0];
  await db.query(
    `INSERT INTO ${SETTINGS_TABLE} (user_id, root_folder_name, "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    { bind: [userId, DEFAULT_ROOT_FOLDER] }
  );
  const rs2 = await db.query(`SELECT * FROM ${SETTINGS_TABLE} WHERE user_id = $1 LIMIT 1`, {
    bind: [userId],
  });
  const rows2 = Array.isArray(rs2?.[0]) ? rs2[0] : [];
  return rows2[0] || null;
}

function toClientSettings(row) {
  const clientSecret = String(row?.client_secret || "");
  const refreshToken = String(row?.refresh_token || "");
  return {
    enabled: !!row?.enabled,
    client_id: String(row?.client_id || ""),
    client_secret_masked: clientSecret ? `${clientSecret.slice(0, 4)}***` : "",
    refresh_token_masked: refreshToken ? `${refreshToken.slice(0, 6)}***` : "",
    root_folder_name: String(row?.root_folder_name || DEFAULT_ROOT_FOLDER),
    root_folder_id: String(row?.root_folder_id || ""),
    auto_sync: row?.auto_sync !== false,
    compress_before_upload: row?.compress_before_upload !== false,
  };
}

async function saveSettings(req, payload) {
  await ensureTables();
  const userId = getUserId(req);
  if (!userId) throw new Error("Invalid user.");

  const current = await getSettings(req);
  const enabled = Object.prototype.hasOwnProperty.call(payload, "enabled")
    ? !!payload.enabled
    : !!current?.enabled;
  const autoSync = Object.prototype.hasOwnProperty.call(payload, "auto_sync")
    ? !!payload.auto_sync
    : (current?.auto_sync !== false);
  const compress = Object.prototype.hasOwnProperty.call(payload, "compress_before_upload")
    ? !!payload.compress_before_upload
    : (current?.compress_before_upload !== false);
  const clientId = String(payload.client_id || current?.client_id || "").trim();
  const clientSecret = String(payload.client_secret || current?.client_secret || "").trim();
  const refreshToken = String(payload.refresh_token || current?.refresh_token || "").trim();
  const rootFolderName = sanitizeFolderName(payload.root_folder_name || current?.root_folder_name || DEFAULT_ROOT_FOLDER, DEFAULT_ROOT_FOLDER);
  let rootFolderId = String(current?.root_folder_id || "").trim();

  if (Object.prototype.hasOwnProperty.call(payload, "root_folder_id")) {
    rootFolderId = String(payload.root_folder_id || "").trim();
  }

  await db.query(
    `UPDATE ${SETTINGS_TABLE}
     SET enabled = $1,
         client_id = $2,
         client_secret = $3,
         refresh_token = $4,
         root_folder_name = $5,
         root_folder_id = $6,
         auto_sync = $7,
         compress_before_upload = $8,
         "updatedAt" = NOW()
     WHERE user_id = $9`,
    {
      bind: [
        enabled,
        clientId || null,
        clientSecret || null,
        refreshToken || null,
        rootFolderName,
        rootFolderId || null,
        autoSync,
        compress,
        userId,
      ],
    }
  );

  const updated = await getSettings(req);
  return toClientSettings(updated);
}

async function refreshAccessToken(settingRow) {
  const clientId = String(settingRow?.client_id || "").trim();
  const clientSecret = String(settingRow?.client_secret || "").trim();
  const refreshToken = String(settingRow?.refresh_token || "").trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive credentials are incomplete.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Failed to refresh Google token.");
  }
  return String(data.access_token);
}

async function findFolderByName(accessToken, folderName, parentId = "") {
  const escapedName = String(folderName || "").replace(/'/g, "\\'");
  const parentFilter = parentId ? ` and '${parentId}' in parents` : "";
  const q = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escapedName}'${parentFilter}`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  const rows = Array.isArray(data?.files) ? data.files : [];
  return rows[0] || null;
}

async function createFolder(accessToken, folderName, parentId = "") {
  const payload = {
    name: sanitizeFolderName(folderName, "Folder"),
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) payload.parents = [parentId];
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || "Failed to create Google Drive folder.");
  }
  return data;
}

async function ensureFolder(accessToken, folderName, parentId = "") {
  const existing = await findFolderByName(accessToken, folderName, parentId);
  if (existing?.id) return existing;
  return createFolder(accessToken, folderName, parentId);
}

function buildMultipartBody(meta, fileBuffer) {
  const boundary = `axiscms_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metaPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(meta)}\r\n`;
  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Type: ${meta.mimeType || "application/octet-stream"}\r\n` +
    `Content-Transfer-Encoding: binary\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;

  return {
    boundary,
    body: Buffer.concat([
      Buffer.from(metaPart, "utf8"),
      Buffer.from(fileHeader, "utf8"),
      fileBuffer,
      Buffer.from(footer, "utf8"),
    ]),
  };
}

async function uploadFileToDrive(accessToken, fileName, mimeType, buffer, parentId = "") {
  const meta = {
    name: safeFileName(fileName, "file.bin"),
    mimeType: mimeType || "application/octet-stream",
  };
  if (parentId) meta.parents = [parentId];

  const mp = buildMultipartBody(meta, buffer);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${mp.boundary}`,
    },
    body: mp.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || "Failed to upload file to Google Drive.");
  }
  return data;
}

function compressForDrive(buffer, mimeType, compressEnabled) {
  if (!compressEnabled) {
    return {
      outBuffer: buffer,
      outMime: mimeType,
      suffix: "",
      compressed: false,
    };
  }
  const zipped = zlib.gzipSync(buffer);
  if (zipped.length >= buffer.length) {
    return {
      outBuffer: buffer,
      outMime: mimeType,
      suffix: "",
      compressed: false,
    };
  }
  return {
    outBuffer: zipped,
    outMime: "application/gzip",
    suffix: ".gz",
    compressed: true,
  };
}

async function getSyncedHashes(req) {
  await ensureTables();
  const userId = getUserId(req);
  if (!userId) return new Set();
  const rs = await db.query(
    `SELECT file_hash FROM ${SYNC_TABLE} WHERE user_id = $1 AND status = 'synced'`,
    { bind: [userId] }
  );
  const rows = Array.isArray(rs?.[0]) ? rs[0] : [];
  return new Set(rows.map((r) => String(r.file_hash || "").trim()).filter(Boolean));
}

async function recordSyncResult(req, entry, payload) {
  await ensureTables();
  const userId = getUserId(req);
  if (!userId) return;
  await db.query(
    `INSERT INTO ${SYNC_TABLE}
      (user_id, source_table, source_id, case_no, module_name, file_index, file_hash, drive_file_id, drive_web_view_link, status, last_error, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     ON CONFLICT (user_id, file_hash)
     DO UPDATE SET
       drive_file_id = EXCLUDED.drive_file_id,
       drive_web_view_link = EXCLUDED.drive_web_view_link,
       status = EXCLUDED.status,
       last_error = EXCLUDED.last_error,
       "updatedAt" = NOW()`,
    {
      bind: [
        userId,
        String(entry.source_table || "").trim(),
        Number(entry.source_id || 0),
        String(entry.case_no || "").trim() || null,
        String(entry.module_name || "").trim(),
        Number(entry.file_index || 0),
        String(entry.file_hash || "").trim(),
        payload.drive_file_id || null,
        payload.drive_web_view_link || null,
        payload.status || "pending",
        payload.last_error || null,
      ],
    }
  );
}

async function syncEntriesToDrive(req, entries) {
  const rows = Array.isArray(entries) ? entries : [];
  if (!rows.length) return { synced: 0, failed: 0 };

  const setting = await getSettings(req);
  if (!setting || !setting.enabled) {
    return { synced: 0, failed: 0 };
  }

  const accessToken = await refreshAccessToken(setting);
  const rootFolderName = sanitizeFolderName(setting.root_folder_name || DEFAULT_ROOT_FOLDER, DEFAULT_ROOT_FOLDER);
  let rootFolderId = String(setting.root_folder_id || "").trim();
  if (!rootFolderId) {
    const root = await ensureFolder(accessToken, rootFolderName, "");
    rootFolderId = String(root.id || "").trim();
    if (rootFolderId) {
      await db.query(
        `UPDATE ${SETTINGS_TABLE} SET root_folder_id = $1, "updatedAt" = NOW() WHERE user_id = $2`,
        { bind: [rootFolderId, getUserId(req)] }
      );
    }
  }

  let synced = 0;
  let failed = 0;
  for (const entry of rows) {
    try {
      const caseFolder = await ensureFolder(accessToken, sanitizeFolderName(entry.case_no || "Unknown-Case", "Unknown-Case"), rootFolderId);
      const moduleFolder = await ensureFolder(accessToken, sanitizeFolderName(entry.module_name || "Files", "Files"), caseFolder.id);
      const compress = compressForDrive(entry.file_buffer, entry.file_mime, setting.compress_before_upload !== false);
      const baseName = safeFileName(entry.file_name || `${entry.module_name}-${entry.source_id}-${entry.file_index}.${extFromMime(entry.file_mime)}`);
      const uploadName = `${baseName}${compress.suffix}`;
      const uploaded = await uploadFileToDrive(accessToken, uploadName, compress.outMime, compress.outBuffer, moduleFolder.id);
      await recordSyncResult(req, entry, {
        drive_file_id: String(uploaded.id || ""),
        drive_web_view_link: String(uploaded.webViewLink || ""),
        status: "synced",
        last_error: null,
      });
      synced += 1;
    } catch (err) {
      await recordSyncResult(req, entry, {
        status: "failed",
        last_error: String(err?.message || err || "Sync failed").slice(0, 2000),
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

function buildUploadEntry(sourceTable, row, moduleName) {
  const uploads = Array.isArray(row?.uploads_json) ? row.uploads_json : [];
  const entries = [];
  uploads.forEach((rawFile, index) => {
    const parsed = parseUploadBinary(rawFile);
    if (!parsed || !parsed.buffer?.length) return;
    const ext = extFromMime(parsed.mime);
    const fileHash = hashBuffer(parsed.buffer);
    const autoName = `${moduleName}_${String(row?.case_no || "case").replace(/\s+/g, "_")}_${Number(row?.id || 0)}_${index + 1}.${ext}`;
    entries.push({
      source_table: sourceTable,
      source_id: Number(row?.id || 0),
      case_no: String(row?.case_no || "").trim() || "UNKNOWN_CASE",
      module_name: moduleName,
      file_index: index,
      file_hash: fileHash,
      file_name: String(parsed.file_name || "").trim() || autoName,
      file_mime: parsed.mime,
      file_buffer: parsed.buffer,
      upload_method: String(row?.upload_method || "").trim() || "local",
      updated_at: row?.updatedAt || row?.updated_at || null,
    });
  });
  return entries;
}

module.exports = {
  SETTINGS_TABLE,
  SYNC_TABLE,
  ensureTables,
  getSettings,
  saveSettings,
  toClientSettings,
  refreshAccessToken,
  getSyncedHashes,
  syncEntriesToDrive,
  buildUploadEntry,
  getUserId,
};
