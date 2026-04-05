const express = require("express");
const fs = require("fs");
const path = require("path");
const { getUsers, getUserById, addUser, updateUser, deleteUser } = require("../controllers/userController");
const {
  getAccessUsers,
  getAccessPages,
  getDatabases,
  createDatabase,
  getCreatedDatabases,
  deleteDatabase,
  getCompanies,
  createCompany,
  deleteCompany,
  getMappedMeta,
  getMappedByUser,
  verifyMapping,
  saveMapping,
  listMappedEntries,
  getInvMapByUser,
  listInvMapEntries,
  deleteInvMapEntry,
  verifyInvMap,
  saveInvMap,
  getMyInvMap,
  saveMyQuotation2RenderVisibility,
  saveMyQuotation3RenderVisibility,
  getUserAccess,
  saveUserAccess,
  getMyAccess
} = require("../controllers/userAccessController");
const { getLoginLogs, clearLoginLogs } = require("../controllers/userLogController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");
const db = require("../config/database");
const { QueryTypes } = require("sequelize");
const INVENTORY_DB_NAME = db.normalizeDatabaseName(process.env.DB_NAME || "inventory") || "inventory";
const PROFILE_STORAGE_ROOT = path.resolve(__dirname, "../storage/profiles");

const router = express.Router();

router.use(authMiddleware);

router.get("/assignable", roleMiddleware(["admin","manager","user"]), getUsers);
router.get("/access/me", getMyAccess);
router.get("/inv-map/me", roleMiddleware(["admin","manager","user"]), getMyInvMap);
router.put("/inv-map/me/quotation2-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation2RenderVisibility);
router.put("/inv-map/me/quotation3-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation3RenderVisibility);

router.use(roleMiddleware(["admin"]));

router.get("/access-users", getAccessUsers);
router.get("/access-pages", getAccessPages);
router.get("/databases", getDatabases);
router.post("/databases/create", createDatabase);
router.get("/databases/created", getCreatedDatabases);
router.delete("/databases/:databaseName", deleteDatabase);
router.get("/companies", getCompanies);
router.post("/companies/create", createCompany);
router.delete("/companies/:companyId", deleteCompany);
router.get("/mapped/meta", getMappedMeta);
router.get("/mapped/entries", listMappedEntries);
router.get("/mapped/:userId", getMappedByUser);
router.post("/mapped/verify", verifyMapping);
router.post("/mapped/save", saveMapping);
router.get("/inv-map/entries", listInvMapEntries);
router.delete("/inv-map/entries/:entryId", deleteInvMapEntry);
router.get("/inv-map/:userId", getInvMapByUser);
router.post("/inv-map/verify", verifyInvMap);
router.post("/inv-map/save", saveInvMap);
router.get("/logs", getLoginLogs);
router.delete("/logs", clearLoginLogs);
router.get("/access/:userId", getUserAccess);
router.put("/access/:userId", saveUserAccess);

async function ensureUserProfilesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      profile_name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      login_user VARCHAR(120),
      company_name VARCHAR(200),
      company_code VARCHAR(40),
      department VARCHAR(120),
      section VARCHAR(120),
      address TEXT,
      telephone VARCHAR(80),
      mobile VARCHAR(80),
      profile_picture_path VARCHAR(500),
      linked_database_name VARCHAR(120),
      user_sync_at TIMESTAMP NULL,
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS user_profiles_email_idx
    ON user_profiles (LOWER(email));
  `);
  await db.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS linked_database_name VARCHAR(120);
  `);
  await db.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS user_sync_at TIMESTAMP NULL;
  `);
}

function norm(v) {
  return String(v || "").trim();
}

function normEmail(v) {
  return norm(v).toLowerCase();
}

function normCode(v) {
  return norm(v).toUpperCase();
}

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function safeNamePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function decodeProfilePictureInput(raw) {
  const input = String(raw || "").trim();
  if (!input) return null;
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = String(match[1] || "").toLowerCase();
  const payload = String(match[2] || "");
  const extByMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extByMime[mime];
  if (!ext) return null;
  let buffer;
  try {
    buffer = Buffer.from(payload, "base64");
  } catch (_err) {
    return null;
  }
  if (!buffer || !buffer.length) return null;
  return { buffer, ext };
}

function saveProfilePicture(req, base64Input, fileNameHint) {
  const decoded = decodeProfilePictureInput(base64Input);
  if (!decoded) return "";
  const dbName = db.normalizeDatabaseName(req?.databaseName || INVENTORY_DB_NAME) || INVENTORY_DB_NAME;
  const dbDir = path.join(PROFILE_STORAGE_ROOT, safeNamePart(dbName) || "default");
  ensureDir(dbDir);
  const hint = safeNamePart(fileNameHint || "profile");
  const fileName = `${hint || "profile"}_${Date.now()}.${decoded.ext}`;
  const absPath = path.join(dbDir, fileName);
  fs.writeFileSync(absPath, decoded.buffer);
  const rel = path.relative(path.resolve(__dirname, ".."), absPath).replace(/\\/g, "/");
  return rel.startsWith("storage/") ? rel : `storage/profiles/${fileName}`;
}

function removeProfilePictureIfOwned(relPath) {
  const clean = String(relPath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || !clean.startsWith("storage/profiles/")) return;
  const abs = path.resolve(path.resolve(__dirname, ".."), clean);
  const root = PROFILE_STORAGE_ROOT.replace(/\\/g, "/");
  const target = abs.replace(/\\/g, "/");
  if (!target.startsWith(root)) return;
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

function toProfileJson(row) {
  const pic = norm(row.profile_picture_path || "");
  return {
    id: Number(row.id || 0),
    user_id: Number(row.user_id || 0) || null,
    profile_name: norm(row.profile_name),
    email: normEmail(row.email),
    login_user: norm(row.login_user || row.linked_username),
    company_name: norm(row.company_name),
    company_code: normCode(row.company_code),
    department: norm(row.department),
    section: norm(row.section),
    address: norm(row.address),
    mobile: norm(row.mobile),
    telephone: norm(row.telephone),
    linked_database_name: norm(row.linked_database_name),
    user_sync_at: row.user_sync_at || null,
    profile_picture_url: pic ? `/${pic.replace(/^\/+/, "")}` : null,
  };
}

async function resolveMappedDatabaseForUserId(userId) {
  const id = Number(userId || 0);
  if (!id) return "";
  try {
    return await db.withDatabase(INVENTORY_DB_NAME, async () => {
      const rows = await db.query(
        `SELECT database_name
         FROM user_mappings
         WHERE user_id = $1
         LIMIT 1`,
        { bind: [id], type: QueryTypes.SELECT }
      );
      return db.normalizeDatabaseName(rows?.[0]?.database_name || "");
    });
  } catch (_err) {
    return "";
  }
}

function buildCandidateDatabases(payload = {}, req = null) {
  const out = [];
  const push = (name) => {
    const n = db.normalizeDatabaseName(name || "");
    if (!n || out.includes(n)) return;
    out.push(n);
  };
  push(req?.databaseName);
  push(payload.linked_database_name);
  push(INVENTORY_DB_NAME);
  return out;
}

async function findLinkedUserInDatabase(databaseName, payload = {}) {
  const dbName = db.normalizeDatabaseName(databaseName || "");
  if (!dbName) return null;
  return db.withDatabase(dbName, async () => {
    const pickedId = Number(payload.user_id || 0);
    if (pickedId > 0) {
      const byId = await User.findByPk(pickedId);
      if (byId) return { user: byId, database_name: dbName };
    }
    const email = normEmail(payload.email);
    if (email) {
      const byEmail = await User.findOne({ where: { email } });
      if (byEmail) return { user: byEmail, database_name: dbName };
    }
    const loginUser = norm(payload.login_user);
    if (loginUser) {
      const byName = await User.findOne({ where: { username: loginUser } });
      if (byName) return { user: byName, database_name: dbName };
    }
    return null;
  });
}

async function resolveLinkedUser(payload = {}, req = null) {
  const candidates = buildCandidateDatabases(payload, req);
  const mappedDb = await resolveMappedDatabaseForUserId(payload.user_id);
  if (mappedDb && !candidates.includes(mappedDb)) candidates.push(mappedDb);
  for (const dbName of candidates) {
    const found = await findLinkedUserInDatabase(dbName, payload).catch(() => null);
    if (found && found.user) return found;
  }
  return null;
}

async function syncUserInDatabase(databaseName, userId, payload = {}) {
  const dbName = db.normalizeDatabaseName(databaseName || "");
  if (!dbName) return false;
  return db.withDatabase(dbName, async () => {
    const user = await User.findByPk(Number(userId || 0));
    if (!user) return false;

    const nextEmail = normEmail(payload.email);
    if (nextEmail && nextEmail !== String(user.email || "").toLowerCase()) {
      const exists = await User.findOne({ where: { email: nextEmail } });
      if (exists && Number(exists.id || 0) !== Number(user.id || 0)) {
        throw new Error(`Email already in use in ${dbName}.`);
      }
      user.email = nextEmail;
    }
    const nextUsername = norm(payload.login_user);
    if (nextUsername) user.username = nextUsername;
    const nextCompany = norm(payload.company_name);
    if (nextCompany) user.company = nextCompany;
    const nextDepartment = norm(payload.department);
    if (nextDepartment) user.department = nextDepartment;
    const nextTelephone = norm(payload.telephone || payload.mobile);
    if (nextTelephone) user.telephone = nextTelephone;
    await user.save();
    return true;
  });
}

async function syncLinkedUserFromProfile(linked, payload = {}, req = null) {
  if (!linked || !linked.user) return { synced: false, primary_db: "" };
  const dbSet = new Set();
  const addDb = (name) => {
    const n = db.normalizeDatabaseName(name || "");
    if (n) dbSet.add(n);
  };
  addDb(linked.database_name);
  addDb(req?.databaseName);
  addDb(INVENTORY_DB_NAME);
  const mappedDb = await resolveMappedDatabaseForUserId(linked.user.id);
  addDb(mappedDb);

  let syncedAny = false;
  for (const dbName of dbSet) {
    const ok = await syncUserInDatabase(dbName, linked.user.id, payload).catch(() => false);
    if (ok) syncedAny = true;
  }
  return {
    synced: syncedAny,
    primary_db: db.normalizeDatabaseName(linked.database_name || ""),
  };
}

async function listUsersFromDatabase(databaseName) {
  const dbName = db.normalizeDatabaseName(databaseName || "");
  if (!dbName) return [];
  return db.withDatabase(dbName, async () => {
    const users = await User.findAll({
      attributes: ["id", "username", "email", "company", "department", "telephone"],
      order: [["id", "DESC"]],
    });
    return (Array.isArray(users) ? users : []).map((u) => ({
      id: Number(u.id || 0),
      username: String(u.username || "").trim(),
      email: normEmail(u.email),
      company: String(u.company || "").trim(),
      department: String(u.department || "").trim(),
      telephone: String(u.telephone || "").trim(),
      source_database: dbName,
    }));
  });
}

async function listUsersAcrossDatabases(req) {
  const candidates = [];
  const push = (name) => {
    const n = db.normalizeDatabaseName(name || "");
    if (!n || candidates.includes(n)) return;
    candidates.push(n);
  };
  push(req?.databaseName);
  push(INVENTORY_DB_NAME);

  const merged = [];
  for (const dbName of candidates) {
    const rows = await listUsersFromDatabase(dbName).catch(() => []);
    merged.push(...rows);
  }
  const byEmailOrUser = new Map();
  merged.forEach((row) => {
    const key = `${String(row.email || "").toLowerCase()}|${String(row.username || "").toLowerCase()}`;
    if (!key || key === "|") return;
    if (!byEmailOrUser.has(key)) {
      byEmailOrUser.set(key, row);
    } else {
      const existing = byEmailOrUser.get(key);
      if (existing && existing.source_database !== INVENTORY_DB_NAME && row.source_database === INVENTORY_DB_NAME) {
        byEmailOrUser.set(key, row);
      }
    }
  });
  return Array.from(byEmailOrUser.values());
}

// Profile endpoints (stored in user_profiles and synced to linked users account).
router.get("/profiles", async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const rows = await db.query(
      `SELECT up.*,
              u.username AS linked_username
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.user_id
       ORDER BY up."updatedAt" DESC NULLS LAST, up.id DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json((rows || []).map(toProfileJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/user-options", async (req, res) => {
  try {
    const users = await listUsersAcrossDatabases(req);
    const rows = (Array.isArray(users) ? users : []).map((u) => ({
      id: Number(u.id || 0),
      username: String(u.username || "").trim(),
      email: normEmail(u.email),
      company: String(u.company || "").trim(),
      department: String(u.department || "").trim(),
      telephone: String(u.telephone || "").trim(),
      source_database: db.normalizeDatabaseName(u.source_database || ""),
    }));
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/user-by-email", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();
    if (!email) return res.status(400).json({ message: "email is required" });
    const users = await listUsersAcrossDatabases(req);
    const user = users.find((u) => normEmail(u.email) === normEmail(email));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      user: {
        id: Number(user.id || 0),
        username: String(user.username || "").trim(),
        email: normEmail(user.email),
        company: String(user.company || "").trim(),
        department: String(user.department || "").trim(),
        telephone: String(user.telephone || "").trim(),
        source_database: db.normalizeDatabaseName(user.source_database || ""),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/:id", async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const rows = await db.query(
      `SELECT up.*,
              u.username AS linked_username
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.user_id
       WHERE up.id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ message: "Profile not found" });
    res.json(toProfileJson(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const payload = req.body || {};
    const profileName = norm(payload.profile_name);
    const email = normEmail(payload.email);
    if (!profileName || !email) {
      return res.status(400).json({ message: "profile_name and email are required" });
    }
    const linkedUser = await resolveLinkedUser(payload, req);
    const syncResult = await syncLinkedUserFromProfile(linkedUser, payload, req);
    const profilePicturePath = saveProfilePicture(req, payload.profile_picture_base64, payload.profile_picture_name);
    const rows = await db.query(
      `INSERT INTO user_profiles
       (user_id, profile_name, email, login_user, company_name, company_code, department, section, address, telephone, mobile, profile_picture_path, linked_database_name, user_sync_at, created_by, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())
       RETURNING *`,
      {
        bind: [
          linkedUser && linkedUser.user ? Number(linkedUser.user.id || 0) : (Number(payload.user_id || 0) || null),
          profileName,
          email,
          norm(payload.login_user),
          norm(payload.company_name),
          normCode(payload.company_code),
          norm(payload.department),
          norm(payload.section),
          norm(payload.address),
          norm(payload.telephone),
          norm(payload.mobile),
          profilePicturePath || null,
          syncResult.primary_db || db.normalizeDatabaseName(req.databaseName || ""),
          syncResult.synced ? new Date() : null,
          Number(req.user?.id || 0) || null,
        ],
        type: QueryTypes.SELECT,
      }
    );
    res.status(201).json(toProfileJson(rows[0] || {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

router.put("/profiles/:id", async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const payload = req.body || {};
    const oldRows = await db.query(
      `SELECT * FROM user_profiles WHERE id = $1 LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    if (!oldRows.length) return res.status(404).json({ message: "Profile not found" });
    const old = oldRows[0];
    const merged = {
      ...old,
      ...payload,
      profile_name: norm(payload.profile_name || old.profile_name),
      email: normEmail(payload.email || old.email),
      login_user: norm(payload.login_user || old.login_user),
      company_name: norm(payload.company_name || old.company_name),
      company_code: normCode(payload.company_code || old.company_code),
      department: norm(payload.department || old.department),
      section: norm(payload.section || old.section),
      address: norm(payload.address || old.address),
      telephone: norm(payload.telephone || old.telephone),
      mobile: norm(payload.mobile || old.mobile),
      user_id: Number(payload.user_id || old.user_id || 0) || null,
      linked_database_name: db.normalizeDatabaseName(payload.linked_database_name || old.linked_database_name || req.databaseName || ""),
    };
    if (!merged.profile_name || !merged.email) {
      return res.status(400).json({ message: "profile_name and email are required" });
    }
    const linkedUser = await resolveLinkedUser(merged, req);
    const syncResult = await syncLinkedUserFromProfile(linkedUser, merged, req);
    let nextProfilePicturePath = norm(old.profile_picture_path);
    const uploadedProfilePicturePath = saveProfilePicture(req, payload.profile_picture_base64, payload.profile_picture_name);
    if (uploadedProfilePicturePath) {
      removeProfilePictureIfOwned(nextProfilePicturePath);
      nextProfilePicturePath = uploadedProfilePicturePath;
    }

    const rows = await db.query(
      `UPDATE user_profiles
       SET user_id = $2,
           profile_name = $3,
           email = $4,
           login_user = $5,
           company_name = $6,
           company_code = $7,
           department = $8,
           section = $9,
           address = $10,
           telephone = $11,
           mobile = $12,
           profile_picture_path = $13,
           linked_database_name = $14,
           user_sync_at = $15,
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      {
        bind: [
          id,
          linkedUser && linkedUser.user ? Number(linkedUser.user.id || 0) : merged.user_id,
          merged.profile_name,
          merged.email,
          merged.login_user,
          merged.company_name,
          merged.company_code,
          merged.department,
          merged.section,
          merged.address,
          merged.telephone,
          merged.mobile,
          nextProfilePicturePath || null,
          syncResult.primary_db || merged.linked_database_name || db.normalizeDatabaseName(req.databaseName || ""),
          syncResult.synced ? new Date() : null,
        ],
        type: QueryTypes.SELECT,
      }
    );
    res.json(toProfileJson(rows[0] || {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

router.delete("/profiles/:id", async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    await db.query(`DELETE FROM user_profiles WHERE id = $1`, { bind: [id] });
    res.json({ message: "Profile deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", getUsers);
router.get("/:id([0-9]+)", getUserById);
router.post("/", addUser);
router.put("/:id([0-9]+)", updateUser);
router.delete("/:id([0-9]+)", deleteUser);

module.exports = router;
