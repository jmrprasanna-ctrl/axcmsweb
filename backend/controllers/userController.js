const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const db = require("../config/database");
const User = require("../models/User");
const UserAccess = require("../models/UserAccess");
const UserLoginLog = require("../models/UserLoginLog");
const { QueryTypes } = require("sequelize");

const PROFILE_STORAGE_ROOT = path.resolve(__dirname, "../storage/profiles");
const PROFILE_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function normalizeText(value, maxLen = 255) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized.slice(0, maxLen);
}

function normalizeEmail(value) {
  return normalizeText(value, 200).toLowerCase();
}

function toActionKey(path, action) {
  return `${String(path || "").trim().toLowerCase()}::${String(action || "").trim().toLowerCase()}`;
}

function safeJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function parseDataUrlImage(raw) {
  const input = String(raw || "").trim();
  const m = input.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  const mime = String(m[1] || "").toLowerCase();
  const payload = m[2] || "";
  const ext =
    mime === "image/jpeg" ? ".jpg" :
    mime === "image/png" ? ".png" :
    mime === "image/webp" ? ".webp" :
    "";
  if (!ext || !PROFILE_IMAGE_EXTENSIONS.has(ext)) return null;
  return { ext, buffer: Buffer.from(payload, "base64") };
}

function safeFileName(name) {
  const raw = normalizeText(name || "profile", 120).toLowerCase();
  const slug = raw.replace(/[^a-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "profile";
}

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
      created_by INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS user_profiles_email_idx
    ON user_profiles (LOWER(email));
  `);
}

function toProfileDto(row) {
  const rel = String(row?.profile_picture_path || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return {
    id: Number(row?.id || 0),
    user_id: Number(row?.user_id || 0) || null,
    profile_name: normalizeText(row?.profile_name, 200),
    email: normalizeEmail(row?.email),
    login_user: normalizeText(row?.login_user, 120),
    company_name: normalizeText(row?.company_name, 200),
    company_code: normalizeText(row?.company_code, 40).toUpperCase(),
    department: normalizeText(row?.department, 120),
    section: normalizeText(row?.section, 120),
    address: normalizeText(row?.address, 5000),
    telephone: normalizeText(row?.telephone, 80),
    mobile: normalizeText(row?.mobile, 80),
    profile_picture_path: rel,
    profile_picture_url: rel ? `/${rel}` : null,
    createdAt: row?.createdAt || row?.created_at || null,
    updatedAt: row?.updatedAt || row?.updated_at || null,
  };
}

async function getUserByEmailRaw(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const rows = await db.withDatabase("axiscmsdb", async () => {
    return db.query(
      `SELECT id, username, email, company, department, telephone
       FROM users
       WHERE LOWER(TRIM(email)) = LOWER($1)
       LIMIT 1`,
      { bind: [normalized], type: QueryTypes.SELECT }
    );
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getUserByIdRaw(userId) {
  const id = Number(userId || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  const rows = await db.withDatabase("axiscmsdb", async () => {
    return db.query(
      `SELECT id, username, email, company, department, telephone, role, is_super_user
       FROM users
       WHERE id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getUserByIdInCurrentDbRaw(userId) {
  const id = Number(userId || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const rows = await db.query(
      `SELECT id, username, email, company, department, telephone, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (_err) {
    return null;
  }
}

async function ensureUserSuperColumn() {
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
}

async function isRequesterSuperAdmin(req) {
  await ensureUserSuperColumn();
  const role = String(req?.user?.role || "").toLowerCase();
  if (role !== "admin") return false;
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  if (!Number.isFinite(requesterId) || requesterId <= 0) return false;
  const me = await User.findByPk(requesterId, { attributes: ["id", "role", "is_super_user"] });
  return Boolean(me && String(me.role || "").toLowerCase() === "admin" && me.is_super_user);
}

function isTargetProtectedSuperAdmin(targetUser, requesterId, requesterIsSuper) {
  const isTargetAdmin = String(targetUser?.role || "").toLowerCase() === "admin";
  const isTargetSuper = Boolean(targetUser?.is_super_user);
  return isTargetAdmin && isTargetSuper && Number(targetUser?.id || 0) !== Number(requesterId || 0) && !requesterIsSuper;
}

function getMainDbClient() {
  return new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: String(process.env.DB_PASSWORD || ""),
    database: process.env.DB_NAME || "axiscmsdb",
  });
}

async function deleteUserLinksIfTableExistsPg(client, tableName, columnName, userId) {
  const table = String(tableName || "").trim().toLowerCase();
  const column = String(columnName || "").trim().toLowerCase();
  if (!table || !column) return;

  const existsRs = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND LOWER(table_name) = LOWER($1)
       AND LOWER(column_name) = LOWER($2)
     LIMIT 1`,
    [table, column]
  );
  if (!existsRs.rowCount) return;

  await client.query(
    `DELETE FROM "${table}" WHERE "${column}" = $1`,
    [userId]
  );
}

async function canRequesterAddUsers(req) {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role === "admin") return true;

  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  if (!Number.isFinite(requesterId) || requesterId <= 0) return false;

  const requesterDb = String(req?.databaseName || "").trim().toLowerCase() || "axiscmsdb";
  const client = getMainDbClient();
  try {
    await client.connect();
    const rs = await client.query(
      `SELECT allowed_actions_json
       FROM user_accesses
       WHERE user_id = $1
         AND LOWER(COALESCE(user_database, 'axiscmsdb')) IN ($2, 'axiscmsdb', 'inventory')
       ORDER BY
         CASE WHEN LOWER(COALESCE(user_database, 'axiscmsdb')) = $2 THEN 0 ELSE 1 END,
         "updatedAt" DESC NULLS LAST,
         "createdAt" DESC NULLS LAST,
         id DESC
       LIMIT 1`,
      [requesterId, requesterDb]
    );
    if (!rs.rowCount) return false;
    const actions = safeJsonArray(rs.rows[0]?.allowed_actions_json)
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);
    const set = new Set(actions);
    return (
      set.has(toActionKey("/users/add-user.html", "add")) ||
      set.has(toActionKey("/users/user-list.html", "add"))
    );
  } catch (_err) {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

exports.getMyMappedCompanies = async (req, res) => {
  const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
  if (!Number.isFinite(requesterId) || requesterId <= 0) {
    return res.status(400).json({ message: "Invalid requester user id." });
  }

  const client = getMainDbClient();
  try {
    await client.connect();
    const mappingRs = await client.query(
      `SELECT cp.company_name, cp.company_code
       FROM user_mappings um
       JOIN company_profiles cp ON cp.id = um.company_profile_id
       WHERE um.user_id = $1
       ORDER BY cp.company_name ASC`,
      [requesterId]
    );

    const options = (mappingRs.rows || [])
      .map((row) => ({
        company_name: normalizeText(row?.company_name, 200),
        company_code: normalizeText(row?.company_code, 40).toUpperCase(),
      }))
      .filter((row) => row.company_name)
      .reduce((acc, row) => {
        const key = `${row.company_name}::${row.company_code}`;
        if (!acc._set.has(key)) {
          acc._set.add(key);
          acc.items.push(row);
        }
        return acc;
      }, { _set: new Set(), items: [] }).items;

    if (options.length) {
      return res.json({ companies: options });
    }

    const userRs = await client.query(
      `SELECT company
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [requesterId]
    );
    const fallback = normalizeText(userRs.rows?.[0]?.company, 200);
    return res.json({
      companies: fallback ? [{ company_name: fallback, company_code: "" }] : [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load mapped companies." });
  } finally {
    await client.end().catch(() => {});
  }
};

async function deleteUserLinksIfTableExists(transaction, tableName, columnName, userId) {
  const table = String(tableName || "").trim().toLowerCase();
  const column = String(columnName || "").trim().toLowerCase();
  if (!table || !column) return;

  const exists = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND LOWER(table_name) = LOWER($1)
       AND LOWER(column_name) = LOWER($2)
     LIMIT 1`,
    {
      bind: [table, column],
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  if (!Array.isArray(exists) || !exists.length) return;

  await db.query(
    `DELETE FROM "${table}" WHERE "${column}" = $1`,
    {
      bind: [userId],
      transaction,
    }
  );
}

exports.getUsers = async (req, res) => {
  try {
    await ensureUserSuperColumn();
    const users = await User.findAll({
      attributes: ["id", "username", "company", "department", "telephone", "email", "role", "is_super_user", "createdAt"],
      order: [["id", "DESC"]],
    });
    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const requesterIsSuper = await isRequesterSuperAdmin(req);
    const filtered = (Array.isArray(users) ? users : []).filter((u) => {
      if (!isTargetProtectedSuperAdmin(u, requesterId, requesterIsSuper)) return true;
      return false;
    });
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    await ensureUserSuperColumn();
    const user = await User.findByPk(id, {
      attributes: ["id", "username", "company", "department", "telephone", "email", "role", "is_super_user"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const requesterIsSuper = await isRequesterSuperAdmin(req);
    if (isTargetProtectedSuperAdmin(user, requesterId, requesterIsSuper)) {
      return res.status(403).json({ message: "Forbidden: Super admin user is protected." });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addUser = async (req, res) => {
  const { username, company, department, telephone, email, password, role } = req.body;

  try {
    const canAddUsers = await canRequesterAddUsers(req);
    if (!canAddUsers) {
      return res.status(403).json({ message: "Forbidden: Missing add-user permission." });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      company,
      department,
      telephone,
      email,
      password: hashedPassword,
      password_plain: String(password || "").trim(),
      role: role || "user",
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, company, department, telephone, email, password, role } = req.body;

  try {
    await ensureUserSuperColumn();
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const requesterIsSuper = await isRequesterSuperAdmin(req);
    if (isTargetProtectedSuperAdmin(user, requesterId, requesterIsSuper)) {
      return res.status(403).json({ message: "Forbidden: Super admin user is protected." });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    user.username = username ?? user.username;
    user.company = company ?? user.company;
    user.department = department ?? user.department;
    user.telephone = telephone ?? user.telephone;
    user.email = email ?? user.email;
    user.role = role ?? user.role;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.password_plain = String(password || "").trim();
    }

    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const userId = Number(id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const client = getMainDbClient();
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE;
    `);
    await client.query(`
      UPDATE users
      SET is_super_user = FALSE
      WHERE is_super_user IS NULL;
    `);

    const userRs = await client.query(
      `SELECT id, role, is_super_user
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    if (!userRs.rowCount) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    let requesterIsSuper = false;
    if (String(req?.user?.role || "").toLowerCase() === "admin" && Number.isFinite(requesterId) && requesterId > 0) {
      const meRs = await client.query(
        `SELECT role, is_super_user
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [requesterId]
      );
      requesterIsSuper = !!(meRs.rowCount && String(meRs.rows[0]?.role || "").toLowerCase() === "admin" && meRs.rows[0]?.is_super_user);
    }

    if (isTargetProtectedSuperAdmin(userRs.rows[0], requesterId, requesterIsSuper)) {
      throw Object.assign(new Error("Forbidden: Super admin user is protected."), { statusCode: 403 });
    }

    await deleteUserLinksIfTableExistsPg(client, "user_mappings", "user_id", userId);
    await deleteUserLinksIfTableExistsPg(client, "user_invoice_mappings", "user_id", userId);
    await deleteUserLinksIfTableExistsPg(client, "user_quotation_render_settings", "user_id", userId);
    await deleteUserLinksIfTableExistsPg(client, "user_profiles", "user_id", userId);
    await deleteUserLinksIfTableExistsPg(client, "user_login_logs", "user_id", userId);
    await deleteUserLinksIfTableExistsPg(client, "user_accesses", "user_id", userId);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");
    res.json({ message: "User deleted with linked access/log records" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_e) {}
    if (err && err.statusCode === 404) {
      return res.status(404).json({ message: "User not found" });
    }
    if (err && err.statusCode === 403) {
      return res.status(403).json({ message: err.message || "Forbidden" });
    }
    console.error(err);
    res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    await client.end().catch(() => {});
  }
};

exports.getProfileUserByEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email || "");
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await getUserByEmailRaw(email);
    if (!user) return res.json({ user: null });
    return res.json({
      user: {
        id: Number(user.id || 0),
        username: normalizeText(user.username, 120),
        email: normalizeEmail(user.email),
        company: normalizeText(user.company, 200),
        department: normalizeText(user.department, 120),
        telephone: normalizeText(user.telephone, 80),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProfileUserOptions = async (req, res) => {
  try {
    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const role = String(req?.user?.role || "").toLowerCase();
    const requesterIsSuper = await isRequesterSuperAdmin(req);

    const rows = await db.withDatabase("axiscmsdb", async () => {
      return User.findAll({
        attributes: ["id", "username", "email", "company", "department", "telephone", "role", "is_super_user"],
        order: [["username", "ASC"], ["id", "ASC"]],
      });
    });
    let list = (Array.isArray(rows) ? rows : []).map((r) => (r && r.toJSON ? r.toJSON() : r));
    if (role !== "admin") {
      list = list.filter((u) => Number(u?.id || 0) === requesterId);
    } else {
      list = list.filter((u) => !isTargetProtectedSuperAdmin(u, requesterId, requesterIsSuper));
    }

    const userIds = list
      .map((u) => Number(u?.id || 0))
      .filter((id) => Number.isFinite(id) && id > 0);

    const companyCodeByUserId = new Map();
    if (userIds.length) {
      const client = getMainDbClient();
      try {
        await client.connect();
        const mapRs = await client.query(
          `SELECT um.user_id, cp.company_code
           FROM user_mappings um
           JOIN company_profiles cp ON cp.id = um.company_profile_id
           WHERE um.user_id = ANY($1::int[])`,
          [userIds]
        );
        (mapRs.rows || []).forEach((row) => {
          const uid = Number(row?.user_id || 0);
          const code = normalizeText(row?.company_code, 40).toUpperCase();
          if (uid > 0 && code && !companyCodeByUserId.has(uid)) {
            companyCodeByUserId.set(uid, code);
          }
        });
      } catch (_err) {
      } finally {
        await client.end().catch(() => {});
      }
    }

    const users = list.map((u) => ({
      id: Number(u?.id || 0),
      username: normalizeText(u?.username, 120),
      email: normalizeEmail(u?.email),
      company: normalizeText(u?.company, 200),
      company_code: companyCodeByUserId.get(Number(u?.id || 0)) || "",
      department: normalizeText(u?.department, 120),
      telephone: normalizeText(u?.telephone, 80),
      role: String(u?.role || "").toLowerCase() || "user",
      label: `${normalizeText(u?.username, 120)} (${normalizeEmail(u?.email)})`,
    }));
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProfiles = async (_req, res) => {
  try {
    await ensureUserProfilesTable();
    const rows = await db.query(
      `SELECT p.*, u.username
       FROM user_profiles p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.id DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json((Array.isArray(rows) ? rows : []).map(toProfileDto).map((x, idx) => ({
      ...x,
      login_user: x.login_user || normalizeText(rows[idx]?.username, 120),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProfileById = async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params?.id || 0);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid profile id." });
    }
    const rows = await db.query(
      `SELECT p.*, u.username
       FROM user_profiles p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ message: "Profile not found." });
    }
    const profile = toProfileDto(rows[0]);
    if (!profile.login_user) {
      profile.login_user = normalizeText(rows[0]?.username, 120);
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addProfile = async (req, res) => {
  try {
    await ensureUserProfilesTable();

    const profileName = normalizeText(req.body?.profile_name, 200);
    const email = normalizeEmail(req.body?.email);
    if (!profileName || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const requesterRole = String(req?.user?.role || "").toLowerCase();
    const selectedUserId = Number(req.body?.user_id || 0) || null;
    if (requesterRole !== "admin" && selectedUserId && selectedUserId !== requesterId) {
      return res.status(403).json({ message: "Forbidden: You can only use your own user account." });
    }
    const effectiveUserId = requesterRole === "admin" ? selectedUserId : requesterId;
    const userFromId = await getUserByIdRaw(effectiveUserId);
    const userFromEmail = await getUserByEmailRaw(email);
    const linkedUser = userFromId || userFromEmail || null;
    const requestedUserId = Number(linkedUser?.id || effectiveUserId || 0) || null;
    const localDbUser = await getUserByIdInCurrentDbRaw(requestedUserId);
    const userId = Number(localDbUser?.id || 0) || null;

    let profilePicturePath = "";
    const parsed = parseDataUrlImage(req.body?.profile_picture_base64);
    if (parsed && parsed.buffer?.length) {
      ensureDir(PROFILE_STORAGE_ROOT);
      const base = safeFileName(req.body?.profile_picture_name || profileName || email.split("@")[0]);
      const fileName = `${Date.now()}_${base}${parsed.ext}`;
      const absPath = path.join(PROFILE_STORAGE_ROOT, fileName);
      fs.writeFileSync(absPath, parsed.buffer);
      profilePicturePath = `storage/profiles/${fileName}`;
    }

    const rows = await db.query(
      `INSERT INTO user_profiles
       (user_id, profile_name, email, login_user, company_name, company_code, department, section, address, telephone, mobile, profile_picture_path, created_by, "createdAt", "updatedAt")
       VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
      {
        bind: [
          userId,
          profileName,
          email,
          normalizeText(req.body?.login_user, 120) || normalizeText(linkedUser?.username, 120),
          normalizeText(req.body?.company_name, 200) || normalizeText(linkedUser?.company, 200),
          normalizeText(req.body?.company_code, 40).toUpperCase(),
          normalizeText(req.body?.department, 120) || normalizeText(linkedUser?.department, 120),
          normalizeText(req.body?.section, 120),
          normalizeText(req.body?.address, 5000),
          normalizeText(req.body?.telephone, 80) || normalizeText(linkedUser?.telephone, 80),
          normalizeText(req.body?.mobile, 80),
          profilePicturePath || null,
          Number(req.user?.id || 0) || null,
        ],
      }
    );
    const inserted = Array.isArray(rows?.[0]) ? rows[0][0] : (Array.isArray(rows) ? rows[0] : null);
    res.status(201).json(toProfileDto(inserted || {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params?.id || 0);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid profile id." });
    }

    const currentRows = await db.query(
      `SELECT * FROM user_profiles WHERE id = $1 LIMIT 1`,
      { bind: [id], type: QueryTypes.SELECT }
    );
    const current = Array.isArray(currentRows) && currentRows.length ? currentRows[0] : null;
    if (!current) {
      return res.status(404).json({ message: "Profile not found." });
    }

    const email = normalizeEmail(req.body?.email || current.email);
    const profileName = normalizeText(req.body?.profile_name || current.profile_name, 200);
    if (!profileName || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
    const requesterRole = String(req?.user?.role || "").toLowerCase();
    const selectedUserId = Number(req.body?.user_id || 0) || null;
    if (requesterRole !== "admin" && selectedUserId && selectedUserId !== requesterId) {
      return res.status(403).json({ message: "Forbidden: You can only use your own user account." });
    }
    const effectiveUserId = requesterRole === "admin"
      ? (selectedUserId || Number(current?.user_id || 0) || null)
      : requesterId;
    const userFromId = await getUserByIdRaw(effectiveUserId);
    const userFromEmail = await getUserByEmailRaw(email);
    const linkedUser = userFromId || userFromEmail || null;
    const requestedUserId = Number(linkedUser?.id || effectiveUserId || current.user_id || 0) || null;
    const localDbUser = await getUserByIdInCurrentDbRaw(requestedUserId);
    const userId = Number(localDbUser?.id || 0) || null;

    let profilePicturePath = normalizeText(current.profile_picture_path, 500);
    const parsed = parseDataUrlImage(req.body?.profile_picture_base64);
    if (parsed && parsed.buffer?.length) {
      ensureDir(PROFILE_STORAGE_ROOT);
      const base = safeFileName(req.body?.profile_picture_name || profileName || email.split("@")[0]);
      const fileName = `${Date.now()}_${base}${parsed.ext}`;
      const absPath = path.join(PROFILE_STORAGE_ROOT, fileName);
      fs.writeFileSync(absPath, parsed.buffer);
      profilePicturePath = `storage/profiles/${fileName}`;
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
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      {
        bind: [
          id,
          userId,
          profileName,
          email,
          normalizeText(req.body?.login_user, 120) || normalizeText(linkedUser?.username, 120),
          normalizeText(req.body?.company_name, 200) || normalizeText(linkedUser?.company, 200),
          normalizeText(req.body?.company_code, 40).toUpperCase(),
          normalizeText(req.body?.department, 120) || normalizeText(linkedUser?.department, 120),
          normalizeText(req.body?.section, 120),
          normalizeText(req.body?.address, 5000),
          normalizeText(req.body?.telephone, 80) || normalizeText(linkedUser?.telephone, 80),
          normalizeText(req.body?.mobile, 80),
          profilePicturePath || null,
        ],
      }
    );
    const updated = Array.isArray(rows?.[0]) ? rows[0][0] : (Array.isArray(rows) ? rows[0] : null);
    res.json(toProfileDto(updated || {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await ensureUserProfilesTable();
    const id = Number(req.params?.id || 0);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid profile id." });
    }
    await db.query(`DELETE FROM user_profiles WHERE id = $1`, { bind: [id] });
    res.json({ message: "Profile deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
