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
  getCompanyById,
  getCompanyLogo,
  createCompany,
  updateCompany,
  deleteCompany,
  getMappedMeta,
  getMyCompanies,
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
const bcrypt = require("bcrypt");
const db = require("../config/database");
const { QueryTypes } = require("sequelize");
const MAIN_DB_NAME = db.normalizeDatabaseName(process.env.DB_NAME || "axiscmsdb") || "axiscmsdb";
const PROFILE_STORAGE_ROOT = path.resolve(__dirname, "../storage/profiles");

const router = express.Router();

router.use(authMiddleware);

router.get("/assignable", roleMiddleware(["admin","manager","user"]), getUsers);
router.get("/access/me", getMyAccess);
router.get("/my-companies", roleMiddleware(["admin","manager","user"]), getMyCompanies);
router.get("/inv-map/me", roleMiddleware(["admin","manager","user"]), getMyInvMap);
router.put("/inv-map/me/quotation2-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation2RenderVisibility);
router.put("/inv-map/me/quotation3-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation3RenderVisibility);
router.get("/profiles/me", roleMiddleware(["admin","manager","user"]), withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const userId = Number(req.user?.id || 0);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const targetDb = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;

    const userRows = await db.query(
      `SELECT id, username, email, company, department, telephone
       FROM users
       WHERE id = $1
       LIMIT 1`,
      { bind: [userId], type: QueryTypes.SELECT }
    );
    const userRow = userRows[0] || {};
    const loginUser = norm(userRow.username);
    const linkedEmail = normEmail(userRow.email);

    const rows = await db.query(
      `SELECT up.*,
              u.username AS linked_username,
              u.email AS linked_user_email_live
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.user_id
       WHERE LOWER(COALESCE(up.linked_database_name, $1)) = LOWER($1)
         AND (
           up.user_id = $2
           OR ($3 <> '' AND LOWER(COALESCE(up.linked_user_email, '')) = LOWER($3))
           OR ($3 <> '' AND LOWER(COALESCE(up.email, '')) = LOWER($3))
           OR ($4 <> '' AND LOWER(COALESCE(up.login_user, '')) = LOWER($4))
         )
       ORDER BY
         CASE
           WHEN up.user_id = $2 THEN 0
           WHEN ($3 <> '' AND LOWER(COALESCE(up.linked_user_email, '')) = LOWER($3)) THEN 1
           WHEN ($3 <> '' AND LOWER(COALESCE(up.email, '')) = LOWER($3)) THEN 2
           WHEN ($4 <> '' AND LOWER(COALESCE(up.login_user, '')) = LOWER($4)) THEN 3
           ELSE 9
         END,
         up."updatedAt" DESC NULLS LAST,
         up.id DESC
       LIMIT 1`,
      {
        bind: [targetDb, userId, linkedEmail || "", String(loginUser || "").toLowerCase()],
        type: QueryTypes.SELECT,
      }
    );

    if (rows.length) {
      return res.json(toProfileJson(rows[0]));
    }

    const fallbackName = norm(userRow.username || req.user?.role || "User");
    return res.json({
      id: null,
      user_id: userId,
      profile_name: fallbackName || "User",
      email: "",
      login_user: loginUser,
      linked_user_email: linkedEmail,
      company_name: norm(userRow.company),
      company_code: "",
      department: norm(userRow.department),
      section: "",
      address: "",
      telephone: norm(userRow.telephone),
      mobile: "",
      profile_picture_url: "",
      profile_picture_data_url: "",
      profile_picture_api_url: "",
      linked_database_name: targetDb,
      user_sync_at: null,
      created_by: null,
      createdAt: null,
      updatedAt: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}));

router.use(roleMiddleware(["admin"]));

router.get("/access-users", getAccessUsers);
router.get("/access-pages", getAccessPages);
router.get("/databases", getDatabases);
router.post("/databases/create", createDatabase);
router.get("/databases/created", getCreatedDatabases);
router.delete("/databases/:databaseName", deleteDatabase);
router.get("/companies", getCompanies);
router.get("/companies/:companyId", getCompanyById);
router.get("/companies/:companyId/logo", getCompanyLogo);
router.post("/companies/create", createCompany);
router.put("/companies/:companyId", updateCompany);
router.delete("/companies/:companyId", deleteCompany);
router.get("/user-mapped/meta", getMappedMeta);
router.get("/user-mapped/entries", listMappedEntries);
router.get("/user-mapped/:userId", getMappedByUser);
router.post("/user-mapped/verify", verifyMapping);
router.post("/user-mapped/save", saveMapping);
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
      linked_user_email VARCHAR(200),
      company_name VARCHAR(200),
      company_code VARCHAR(40),
      department VARCHAR(120),
      section VARCHAR(120),
      address TEXT,
      telephone VARCHAR(80),
      mobile VARCHAR(80),
      profile_picture_path VARCHAR(500),
      profile_picture_data_url TEXT,
      profile_picture_updated_at TIMESTAMP NULL,
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
    ALTER COLUMN email DROP NOT NULL;
  `);
  await db.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS linked_user_email VARCHAR(200);
  `);
  await db.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS profile_picture_data_url TEXT;
  `);
  await db.query(`
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMP NULL;
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
  const dbName = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
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

function resolveProfilePictureAbsolutePath(relPath) {
  const clean = String(relPath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || !clean.startsWith("storage/profiles/")) return "";
  const abs = path.resolve(path.resolve(__dirname, ".."), clean);
  const root = PROFILE_STORAGE_ROOT.replace(/\\/g, "/");
  const target = abs.replace(/\\/g, "/");
  if (!target.startsWith(root)) return "";
  if (!fs.existsSync(abs)) return "";
  return abs;
}

function toProfileJson(row) {
  const pic = norm(row.profile_picture_path || "");
  const profileId = Number(row.id || 0);
  const pictureUpdatedAt = row.profile_picture_updated_at || null;
  const pictureApiUrl = profileId && pic
    ? `/api/users/profiles/${profileId}/picture${pictureUpdatedAt ? `?v=${encodeURIComponent(String(new Date(pictureUpdatedAt).getTime() || ""))}` : ""}`
    : null;
  return {
    id: profileId,
    user_id: Number(row.user_id || 0) || null,
    profile_name: norm(row.profile_name),
    email: normEmail(row.email),
    login_user: norm(row.login_user || row.linked_username),
    linked_user_email: normEmail(row.linked_user_email || row.linked_user_email_live),
    company_name: norm(row.company_name),
    company_code: normCode(row.company_code),
    department: norm(row.department),
    section: norm(row.section),
    address: norm(row.address),
    mobile: norm(row.mobile),
    telephone: norm(row.telephone),
    profile_picture_data_url: String(row.profile_picture_data_url || "").trim() || null,
    profile_picture_updated_at: pictureUpdatedAt,
    profile_picture_api_url: pictureApiUrl,
    linked_database_name: norm(row.linked_database_name),
    user_sync_at: row.user_sync_at || null,
    profile_picture_url: pic ? `/${pic.replace(/^\/+/, "")}` : null,
  };
}

function withMainDb(handler) {
  return async (req, res, next) => {
    try {
      return await db.runWithDatabase(MAIN_DB_NAME, () => handler(req, res, next));
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        return res.status(500).json({ message: err.message || "Server error" });
      }
      return undefined;
    }
  };
}

async function resolveMappedDatabaseForUserId(userId) {
  const id = Number(userId || 0);
  if (!id) return "";
  try {
    return await db.withDatabase(MAIN_DB_NAME, async () => {
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
    const loginUser = norm(payload.login_user);
    if (loginUser) {
      const byName = await User.findOne({ where: { username: loginUser } });
      if (byName) return { user: byName, database_name: dbName };
    }
    const accountEmail = normEmail(payload.linked_user_email || "");
    if (accountEmail) {
      const byAccountEmail = await User.findOne({ where: { email: accountEmail } });
      if (byAccountEmail) return { user: byAccountEmail, database_name: dbName };
    }
    return null;
  });
}

async function resolveLinkedUser(payload = {}, req = null) {
  const candidates = buildCandidateDatabases(payload, req);
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

    const nextEmail = normEmail(payload.linked_user_email || payload.email);
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
  const primaryDb = db.normalizeDatabaseName(
    linked?.database_name || payload?.linked_database_name || req?.databaseName || MAIN_DB_NAME
  ) || MAIN_DB_NAME;
  const accountEmail = normEmail(payload.linked_user_email || linked?.user?.email || payload.email);
  const loginUser = norm(payload.login_user || linked?.user?.username || payload.profile_name);
  const companyName = norm(payload.company_name);
  const department = norm(payload.department);
  const telephone = norm(payload.telephone || payload.mobile);

  if (!accountEmail || !loginUser || !primaryDb) {
    return {
      synced: false,
      primary_db: primaryDb,
      user_id: Number(linked?.user?.id || payload.user_id || 0) || null,
      account_email: accountEmail || null,
      login_user: loginUser || null,
    };
  }

  const result = await db.withDatabase(primaryDb, async () => {
    let user = null;
    const pickedId = Number(linked?.user?.id || payload.user_id || 0);
    if (pickedId > 0) {
      user = await User.findByPk(pickedId);
    }
    if (!user) {
      user = await User.findOne({ where: { email: accountEmail } });
    }
    if (!user && loginUser) {
      user = await User.findOne({ where: { username: loginUser } });
    }

    if (user) {
      if (String(user.email || "").toLowerCase() !== accountEmail) {
        const exists = await User.findOne({ where: { email: accountEmail } });
        if (exists && Number(exists.id || 0) !== Number(user.id || 0)) {
          throw new Error(`Email already in use in ${primaryDb}.`);
        }
        user.email = accountEmail;
      }
      if (loginUser) user.username = loginUser;
      if (companyName) user.company = companyName;
      if (department) user.department = department;
      if (telephone) user.telephone = telephone;
      await user.save();
      return { user, created: false };
    }

    const tempPassword = String(process.env.DEFAULT_PROFILE_USER_PASSWORD || "ChangeMe@123").trim() || "ChangeMe@123";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const createdUser = await User.create({
      username: loginUser,
      email: accountEmail,
      company: companyName || null,
      department: department || null,
      telephone: telephone || null,
      role: "user",
      password: hashedPassword,
      password_plain: tempPassword,
    });
    return { user: createdUser, created: true };
  });

  return {
    synced: true,
    primary_db: primaryDb,
    user_id: Number(result?.user?.id || 0) || null,
    account_email: accountEmail,
    login_user: loginUser,
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
  const targetDb = db.normalizeDatabaseName(req?.databaseName || req?.requestedDatabaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
  return listUsersFromDatabase(targetDb).catch(() => []);
}

async function resolveRequesterUserAndMapping(req) {
  const userId = Number(req?.user?.id || req?.user?.userId || 0);
  const targetDb = db.normalizeDatabaseName(req?.databaseName || req?.requestedDatabaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
  if (!userId || !targetDb) {
    return {
      user_id: 0,
      username: "",
      email: "",
      mapped_email: "",
      database_name: targetDb,
    };
  }
  try {
    const rows = await db.withDatabase(MAIN_DB_NAME, async () => {
      return db.query(
        `SELECT u.id AS user_id,
                u.username,
                u.email,
                um.mapped_email,
                um.database_name
         FROM users u
         LEFT JOIN user_mappings um
           ON um.user_id = u.id
          AND LOWER(COALESCE(um.database_name, '')) = LOWER($2)
         WHERE u.id = $1
         ORDER BY um.id DESC NULLS LAST
         LIMIT 1`,
        { bind: [userId, targetDb], type: QueryTypes.SELECT }
      );
    });
    const row = rows?.[0] || {};
    return {
      user_id: Number(row.user_id || 0),
      username: String(row.username || "").trim(),
      email: normEmail(row.email),
      mapped_email: normEmail(row.mapped_email),
      database_name: db.normalizeDatabaseName(row.database_name || targetDb) || targetDb,
    };
  } catch (_err) {
    return {
      user_id: userId,
      username: "",
      email: "",
      mapped_email: "",
      database_name: targetDb,
    };
  }
}

async function resolveRequesterMappedCompany(req) {
  const userId = Number(req?.user?.id || req?.user?.userId || 0);
  const targetDb = db.normalizeDatabaseName(req?.databaseName || req?.requestedDatabaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
  if (!userId || !targetDb || targetDb === MAIN_DB_NAME) {
    return { company_name: "", company_code: "" };
  }
  try {
    const rows = await db.withDatabase(MAIN_DB_NAME, async () => {
      return db.query(
        `SELECT cp.company_name, cp.company_code
         FROM user_mappings um
         JOIN company_profiles cp ON cp.id = um.company_profile_id
         WHERE um.user_id = $1
           AND LOWER(COALESCE(um.database_name, '')) = LOWER($2)
         ORDER BY um.id DESC
         LIMIT 1`,
        { bind: [userId, targetDb], type: QueryTypes.SELECT }
      );
    });
    return {
      company_name: norm(rows?.[0]?.company_name),
      company_code: normCode(rows?.[0]?.company_code),
    };
  } catch (_err) {
    return { company_name: "", company_code: "" };
  }
}

async function filterProfileLoginUsersForRequester(req, users) {
  const list = Array.isArray(users) ? users : [];
  const targetDb = db.normalizeDatabaseName(req?.databaseName || req?.requestedDatabaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
  if (!targetDb || targetDb === MAIN_DB_NAME) return list;

  const requester = await resolveRequesterUserAndMapping(req);
  const candidateEmails = new Set(
    [requester.mapped_email, requester.email]
      .map((v) => normEmail(v))
      .filter(Boolean)
  );
  const candidateUsernames = new Set(
    [requester.username]
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)
  );

  if (list.length) {
    const matched = list.filter((u) => {
      const email = normEmail(u?.email);
      const username = String(u?.username || "").trim().toLowerCase();
      if (email && candidateEmails.has(email)) return true;
      if (username && candidateUsernames.has(username)) return true;
      return false;
    });
    if (matched.length) return matched;
  }

  if (requester.user_id || requester.username || requester.mapped_email || requester.email) {
    return [{
      id: Number(requester.user_id || 0),
      username: String(requester.username || "").trim(),
      email: normEmail(requester.mapped_email || requester.email),
      company: "",
      department: "",
      telephone: "",
      source_database: targetDb,
    }];
  }
  return list;
}

// Profile endpoints (stored in user_profiles and synced to linked users account).
router.get("/profiles/:id/picture", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const rows = await db.query(
      `SELECT profile_picture_path
       FROM user_profiles
       WHERE id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ message: "Profile not found" });
    const absPath = resolveProfilePictureAbsolutePath(rows[0]?.profile_picture_path || "");
    if (!absPath) return res.status(404).json({ message: "Profile picture not found" });
    return res.sendFile(absPath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}));

router.put("/profiles/:id/picture", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const payload = req.body || {};
    const oldRows = await db.query(
      `SELECT *
       FROM user_profiles
       WHERE id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    if (!oldRows.length) return res.status(404).json({ message: "Profile not found" });
    const old = oldRows[0];
    const nextPath = saveProfilePicture(req, payload.profile_picture_base64, payload.profile_picture_name);
    if (!nextPath) {
      return res.status(400).json({ message: "Valid profile picture is required." });
    }
    const nextDataUrl = String(payload.profile_picture_base64 || "").trim();
    const oldPath = norm(old.profile_picture_path);
    if (oldPath && oldPath !== nextPath) {
      removeProfilePictureIfOwned(oldPath);
    }
    const rows = await db.query(
      `UPDATE user_profiles
       SET profile_picture_path = $2,
           profile_picture_data_url = $3,
           profile_picture_updated_at = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      { bind: [id, nextPath, nextDataUrl || null], type: QueryTypes.SELECT }
    );
    return res.json(toProfileJson(rows[0] || old));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Failed to update profile picture." });
  }
}));

router.get("/profiles", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const targetDb = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
    const rows = await db.query(
      `SELECT up.*,
              u.username AS linked_username,
              u.email AS linked_user_email_live
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.user_id
       WHERE LOWER(COALESCE(up.linked_database_name, $1)) = LOWER($1)
       ORDER BY up."updatedAt" DESC NULLS LAST, up.id DESC`,
      { bind: [targetDb], type: QueryTypes.SELECT }
    );
    res.json((rows || []).map(toProfileJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}));

router.get("/profiles/user-options", withMainDb(async (req, res) => {
  try {
    const users = await listUsersAcrossDatabases(req);
    const scopedUsers = await filterProfileLoginUsersForRequester(req, users);
    const rows = (Array.isArray(scopedUsers) ? scopedUsers : []).map((u) => ({
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
}));

router.get("/profiles/user-by-email", withMainDb(async (req, res) => {
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
}));

router.get("/profiles/:id", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const targetDb = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
    const rows = await db.query(
      `SELECT up.*,
              u.username AS linked_username,
              u.email AS linked_user_email_live
       FROM user_profiles up
       LEFT JOIN users u ON u.id = up.user_id
       WHERE up.id = $1
         AND LOWER(COALESCE(up.linked_database_name, $2)) = LOWER($2)
       LIMIT 1`,
      { bind: [id, targetDb], type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ message: "Profile not found" });
    res.json(toProfileJson(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}));

router.post("/profiles", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const payload = req.body || {};
    const profileName = norm(payload.profile_name);
    const email = normEmail(payload.email);
    if (!profileName) {
      return res.status(400).json({ message: "profile_name is required" });
    }
    const mappedCompany = await resolveRequesterMappedCompany(req);
    const linkedUser = await resolveLinkedUser(payload, req);
    const linkedUserEmail = normEmail(payload.linked_user_email || linkedUser?.user?.email || "");
    if (email && linkedUserEmail && email === linkedUserEmail) {
      return res.status(400).json({ message: "Profile email must be different from account email." });
    }
    const syncResult = await syncLinkedUserFromProfile(linkedUser, payload, req);
    const profilePicturePath = saveProfilePicture(req, payload.profile_picture_base64, payload.profile_picture_name);
    const profilePictureDataUrl = profilePicturePath ? String(payload.profile_picture_base64 || "").trim() : "";
    const rows = await db.query(
      `INSERT INTO user_profiles
       (user_id, profile_name, email, login_user, linked_user_email, company_name, company_code, department, section, address, telephone, mobile, profile_picture_path, profile_picture_data_url, profile_picture_updated_at, linked_database_name, user_sync_at, created_by, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())
       RETURNING *`,
      {
        bind: [
          Number(syncResult.user_id || linkedUser?.user?.id || payload.user_id || 0) || null,
          profileName,
          email || null,
          norm(syncResult.login_user || payload.login_user),
          normEmail(syncResult.account_email || linkedUserEmail),
          mappedCompany.company_name || norm(payload.company_name),
          mappedCompany.company_code || normCode(payload.company_code),
          norm(payload.department),
          norm(payload.section),
          norm(payload.address),
          norm(payload.telephone),
          norm(payload.mobile),
          profilePicturePath || null,
          profilePictureDataUrl || null,
          profilePicturePath ? new Date() : null,
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
}));

router.put("/profiles/:id", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const payload = req.body || {};
    const targetDb = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
    const oldRows = await db.query(
      `SELECT *
       FROM user_profiles
       WHERE id = $1
         AND LOWER(COALESCE(linked_database_name, $2)) = LOWER($2)
       LIMIT 1`,
      { bind: [id, targetDb], type: QueryTypes.SELECT }
    );
    if (!oldRows.length) return res.status(404).json({ message: "Profile not found" });
    const old = oldRows[0];
    const mappedCompany = await resolveRequesterMappedCompany(req);
    const hasEmailField = Object.prototype.hasOwnProperty.call(payload, "email");
    const nextEmail = hasEmailField ? normEmail(payload.email) : normEmail(old.email);
    const merged = {
      ...old,
      ...payload,
      profile_name: norm(payload.profile_name || old.profile_name),
      email: nextEmail,
      login_user: norm(payload.login_user || old.login_user),
      company_name: mappedCompany.company_name || norm(payload.company_name || old.company_name),
      company_code: mappedCompany.company_code || normCode(payload.company_code || old.company_code),
      department: norm(payload.department || old.department),
      section: norm(payload.section || old.section),
      address: norm(payload.address || old.address),
      telephone: norm(payload.telephone || old.telephone),
      mobile: norm(payload.mobile || old.mobile),
      user_id: Number(payload.user_id || old.user_id || 0) || null,
      linked_database_name: db.normalizeDatabaseName(payload.linked_database_name || old.linked_database_name || req.databaseName || ""),
    };
    if (!merged.profile_name) {
      return res.status(400).json({ message: "profile_name is required" });
    }
    const linkedUser = await resolveLinkedUser(merged, req);
    const linkedUserEmail = normEmail(merged.linked_user_email || linkedUser?.user?.email || "");
    if (merged.email && linkedUserEmail && merged.email === linkedUserEmail) {
      return res.status(400).json({ message: "Profile email must be different from account email." });
    }
    const syncResult = await syncLinkedUserFromProfile(linkedUser, merged, req);
    let nextProfilePicturePath = norm(old.profile_picture_path);
    let nextProfilePictureDataUrl = String(old.profile_picture_data_url || "").trim() || null;
    const uploadedProfilePicturePath = saveProfilePicture(req, payload.profile_picture_base64, payload.profile_picture_name);
    if (uploadedProfilePicturePath) {
      removeProfilePictureIfOwned(nextProfilePicturePath);
      nextProfilePicturePath = uploadedProfilePicturePath;
      nextProfilePictureDataUrl = String(payload.profile_picture_base64 || "").trim() || null;
    }

    const rows = await db.query(
      `UPDATE user_profiles
       SET user_id = $2,
           profile_name = $3,
           email = $4,
           login_user = $5,
           linked_user_email = $6,
           company_name = $7,
           company_code = $8,
           department = $9,
           section = $10,
           address = $11,
           telephone = $12,
           mobile = $13,
           profile_picture_path = $14,
           profile_picture_data_url = $15,
           profile_picture_updated_at = $16,
           linked_database_name = $17,
           user_sync_at = $18,
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      {
        bind: [
          id,
          Number(syncResult.user_id || linkedUser?.user?.id || merged.user_id || 0) || null,
          merged.profile_name,
          merged.email || null,
          norm(syncResult.login_user || merged.login_user),
          normEmail(syncResult.account_email || linkedUserEmail),
          merged.company_name,
          merged.company_code,
          merged.department,
          merged.section,
          merged.address,
          merged.telephone,
          merged.mobile,
          nextProfilePicturePath || null,
          nextProfilePictureDataUrl || null,
          uploadedProfilePicturePath ? new Date() : (old.profile_picture_updated_at || null),
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
}));

router.delete("/profiles/:id", withMainDb(async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ message: "Invalid profile id" });
    const targetDb = db.normalizeDatabaseName(req?.databaseName || MAIN_DB_NAME) || MAIN_DB_NAME;
    await db.query(
      `DELETE FROM user_profiles
       WHERE id = $1
         AND LOWER(COALESCE(linked_database_name, $2)) = LOWER($2)`,
      { bind: [id, targetDb] }
    );
    res.json({ message: "Profile deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}));

router.get("/", getUsers);
router.get("/:id([0-9]+)", getUserById);
router.post("/", addUser);
router.put("/:id([0-9]+)", updateUser);
router.delete("/:id([0-9]+)", deleteUser);

module.exports = router;
