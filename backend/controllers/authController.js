const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const db = require("../config/database");
const User = require("../models/User");
const { Op } = require("sequelize");
const { sendEmail } = require("../services/emailService");

const isBcryptHash = (value = "") => /^\$2[aby]\$\d{2}\$/.test(value);
const AUTH_DB_NAME = String(process.env.DB_NAME || "axiscmsdb").trim() || "axiscmsdb";

function getAuthDbClient() {
  return new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: AUTH_DB_NAME,
  });
}

function buildAuthEmailFrom(setupRow = {}) {
  const fromName = String(setupRow.from_name || "PULMO TECHNOLOGIES").trim() || "PULMO TECHNOLOGIES";
  const fromEmail = String(setupRow.from_email || setupRow.smtp_user || "").trim();
  if (!fromEmail) {
    return process.env.SMTP_FROM || '"PULMO TECHNOLOGIES" <noreply@company.com>';
  }
  return `"${fromName}" <${fromEmail}>`;
}

function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "PT-";
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function buildProfilePictureUrl(profileRow = {}) {
  const rawPath = String(profileRow.profile_picture_path || "").trim();
  if (!rawPath) return null;
  const clean = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const ts = profileRow.profile_picture_updated_at
    ? Number(new Date(profileRow.profile_picture_updated_at).getTime() || 0)
    : 0;
  return `/${clean}${ts > 0 ? `?v=${encodeURIComponent(String(ts))}` : ""}`;
}

function normalizeMappedLogoPath(logoPathRaw, folderNameRaw = "", logoFileNameRaw = "") {
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

function resolveBrandingLogoUrl(logoPathRaw, logoDataUrlRaw) {
  let logoDataUrl = String(logoDataUrlRaw || "").trim();
  if (/^data:image\//i.test(logoDataUrl)) {
    const dataMatch = logoDataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
    if (dataMatch) {
      const declaredMime = String(dataMatch[1] || "").toLowerCase();
      const base64Body = String(dataMatch[2] || "");
      const head = base64Body.slice(0, 16);
      const looksLikeJpeg = head.startsWith("/9j/");
      const looksLikePng = head.startsWith("iVBOR");
      if (looksLikeJpeg && declaredMime !== "jpeg" && declaredMime !== "jpg") {
        logoDataUrl = `data:image/jpeg;base64,${base64Body}`;
      } else if (looksLikePng && declaredMime !== "png") {
        logoDataUrl = `data:image/png;base64,${base64Body}`;
      }
    }
    return logoDataUrl;
  }
  const normalizedPath = normalizeMappedLogoPath(logoPathRaw);
  if (!normalizedPath) return null;
  if (/^https?:\/\//i.test(normalizedPath) || /^data:image\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  const clean = String(normalizedPath).replace(/^\/+/, "");
  const abs = path.resolve(__dirname, "..", clean);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return `/${clean}`;
  }
  return null;
}

function normalizeCompanyCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "")
    .slice(0, 40);
}

function normalizeUserKey(value) {
  return String(value || "").trim().toLowerCase().slice(0, 200);
}

async function ensureLoginCompanyCodeMemoryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_login_company_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      user_key VARCHAR(200) NOT NULL UNIQUE,
      company_code VARCHAR(40) NOT NULL,
      last_used_at TIMESTAMP DEFAULT NOW(),
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function rememberLoginCompanyCode(client, userId, keys = [], companyCodeRaw = "") {
  const companyCode = normalizeCompanyCode(companyCodeRaw);
  if (!companyCode) return;
  const normalizedKeys = Array.from(
    new Set((Array.isArray(keys) ? keys : []).map(normalizeUserKey).filter(Boolean))
  );
  if (!normalizedKeys.length) return;
  await ensureLoginCompanyCodeMemoryTable(client);
  for (const key of normalizedKeys) {
    await client.query(
      `INSERT INTO user_login_company_codes (user_id, user_key, company_code, last_used_at, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       ON CONFLICT (user_key)
       DO UPDATE SET
         user_id = COALESCE(EXCLUDED.user_id, user_login_company_codes.user_id),
         company_code = EXCLUDED.company_code,
         last_used_at = NOW(),
         "updatedAt" = NOW()`,
      [Number(userId || 0) || null, key, companyCode]
    );
  }
}

async function resolveRememberedCompanyCode(client, userKeyRaw = "") {
  const userKey = normalizeUserKey(userKeyRaw);
  if (!userKey) return "";
  await ensureLoginCompanyCodeMemoryTable(client);
  const directRs = await client.query(
    `SELECT company_code
     FROM user_login_company_codes
     WHERE user_key = $1
     ORDER BY "updatedAt" DESC NULLS LAST, id DESC
     LIMIT 1`,
    [userKey]
  );
  const directCode = normalizeCompanyCode(directRs.rows?.[0]?.company_code || "");
  if (directCode) return directCode;

  // Fallback: resolve by account identity (email/username), then use latest code by user_id.
  const userRs = await client.query(
    `SELECT id
     FROM users
     WHERE LOWER(TRIM(email)) = $1 OR LOWER(TRIM(username)) = $1
     ORDER BY id DESC
     LIMIT 1`,
    [userKey]
  );
  const userId = Number(userRs.rows?.[0]?.id || 0);
  if (!userId) return "";

  const byUserRs = await client.query(
    `SELECT company_code
     FROM user_login_company_codes
     WHERE user_id = $1
     ORDER BY last_used_at DESC NULLS LAST, "updatedAt" DESC NULLS LAST, id DESC
     LIMIT 1`,
    [userId]
  );
  return normalizeCompanyCode(byUserRs.rows?.[0]?.company_code || "");
}

async function fetchBrandingByCode(client, companyCodeRaw = "") {
  const companyCode = normalizeCompanyCode(companyCodeRaw);
  if (!companyCode) {
    return { company_code: null, company_name: null, logo_url: null };
  }
  const rs = await client.query(
    `SELECT company_name, company_code, logo_path, logo_data_url, folder_name, logo_file_name
     FROM company_profiles
     WHERE UPPER(TRIM(company_code)) = $1
     ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
     LIMIT 1`,
    [companyCode]
  );
  if (!rs.rowCount) {
    return { company_code: companyCode, company_name: null, logo_url: null };
  }

  const row = rs.rows[0] || {};
  const logoPath = normalizeMappedLogoPath(row.logo_path, row.folder_name, row.logo_file_name);
  const logoUrl = resolveBrandingLogoUrl(logoPath, row.logo_data_url);
  return {
    company_code: normalizeCompanyCode(row.company_code),
    company_name: String(row.company_name || "").trim() || null,
    logo_url: logoUrl,
  };
}

async function resolveUserProfilePicture(client, userId) {
  const uid = Number(userId || 0);
  if (!uid) {
    return { url: null, dataUrl: null };
  }
  try {
    const tableCheck = await client.query(
      `SELECT to_regclass('public.user_profiles') AS table_name`
    );
    if (!String(tableCheck.rows?.[0]?.table_name || "").trim()) {
      return { url: null, dataUrl: null };
    }
    const profileRs = await client.query(
      `SELECT profile_picture_path, profile_picture_data_url, profile_picture_updated_at
       FROM user_profiles
       WHERE user_id = $1
       ORDER BY "updatedAt" DESC NULLS LAST, id DESC
       LIMIT 1`,
      [uid]
    );
    if (!profileRs.rowCount) {
      return { url: null, dataUrl: null };
    }
    const row = profileRs.rows[0] || {};
    return {
      url: buildProfilePictureUrl(row),
      dataUrl: String(row.profile_picture_data_url || "").trim() || null,
    };
  } catch (_err) {
    return { url: null, dataUrl: null };
  }
}

async function resolvePreferredDatabaseFromAccess(client, userId) {
  const uid = Number(userId || 0);
  if (!uid) return "";
  try {
    const rs = await client.query(
      `SELECT database_name
       FROM user_accesses
       WHERE user_id = $1
       ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
       LIMIT 1`,
      [uid]
    );
    return db.normalizeDatabaseName(rs.rows?.[0]?.database_name || "") || "";
  } catch (_err) {
    return "";
  }
}

exports.login = async (req, res) => {
  const { email, password, company_code } = req.body;

  const client = getAuthDbClient();
  try {
    await client.connect();
    const userRs = await client.query(
      `SELECT id, username, email, role, password, password_plain, company
       FROM users
       WHERE email = $1 OR username = $1
       LIMIT 1`,
      [String(email || "").trim()]
    );
    const user = userRs.rows[0];
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    let isMatch = false;

    if (isBcryptHash(user.password)) {
      isMatch = await bcrypt.compare(password, user.password);
      if (isMatch && String(user.password_plain || "").trim() !== String(password || "").trim()) {
        await client.query("UPDATE users SET password_plain = $1, \"updatedAt\" = NOW() WHERE id = $2", [password, user.id]);
      }
    } else {
                                                                         
      isMatch = password === user.password;
      if (isMatch) {
        const hashed = await bcrypt.hash(password, 10);
        await client.query("UPDATE users SET password = $1, password_plain = $2, \"updatedAt\" = NOW() WHERE id = $3", [hashed, password, user.id]);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    let databaseName = null;
    let mappedCompanyName = null;
    let mappedCompanyCode = null;
    let mappedCompanyEmail = null;
    let mappedCompanyLogoUrl = null;
    let userProfilePictureUrl = null;
    let userProfilePictureDataUrl = null;

    const preferredDatabaseName = await resolvePreferredDatabaseFromAccess(client, user.id);
    const mappingRs = await client.query(
      `SELECT um.database_name, cp.company_name, cp.company_code, COALESCE(NULLIF(TRIM(um.mapped_email), ''), cp.email) AS mapped_email, cp.logo_path, cp.logo_data_url, cp.folder_name, cp.logo_file_name
       FROM user_mappings um
       JOIN company_profiles cp ON cp.id = um.company_profile_id
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
      [user.id, preferredDatabaseName || ""]
    );
    if (mappingRs.rowCount) {
      const mappedDb = db.normalizeDatabaseName(mappingRs.rows[0]?.database_name || "");
      if (mappedDb) {
        await db.registerDatabase(mappedDb).catch(() => {});
        databaseName = mappedDb;
      }
      mappedCompanyName = String(mappingRs.rows[0]?.company_name || "").trim() || null;
      mappedCompanyCode = String(mappingRs.rows[0]?.company_code || "").trim().toUpperCase() || null;
      mappedCompanyEmail = String(mappingRs.rows[0]?.mapped_email || "").trim().toLowerCase() || null;
      const mappedLogoDataUrl = String(mappingRs.rows[0]?.logo_data_url || "").trim();
      const logoPath = normalizeMappedLogoPath(
        mappingRs.rows[0]?.logo_path,
        mappingRs.rows[0]?.folder_name,
        mappingRs.rows[0]?.logo_file_name
      );
      if (/^data:image\//i.test(mappedLogoDataUrl)) {
        mappedCompanyLogoUrl = mappedLogoDataUrl;
      } else if (logoPath) {
        if (/^https?:\/\//i.test(logoPath) || /^data:image\//i.test(logoPath)) {
          mappedCompanyLogoUrl = logoPath;
        } else {
          const clean = String(logoPath).replace(/^\/+/, "");
          mappedCompanyLogoUrl = `/${clean}`;
        }
      }
    }

    if (!databaseName && String(user.role || "").toLowerCase() === "user") {
      const accessRs = await client.query(
        `SELECT database_name
         FROM user_accesses
         WHERE user_id = $1
           AND LOWER(COALESCE(user_database, $2)) = $2
         ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
         LIMIT 1`,
        [user.id, String(AUTH_DB_NAME || "").trim().toLowerCase()]
      );
      const normalized = db.normalizeDatabaseName(accessRs.rows[0]?.database_name || "");
      if (normalized) {
        await db.registerDatabase(normalized).catch(() => {});
        databaseName = normalized;
      }
    }

    const avatar = await resolveUserProfilePicture(client, user.id);
    userProfilePictureUrl = avatar.url;
    userProfilePictureDataUrl = avatar.dataUrl;

    const token = jwt.sign(
      { id: user.id, role: user.role, database_name: databaseName },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ipAddress = forwarded || req.socket?.remoteAddress || req.ip || null;
    const userAgent = String(req.headers["user-agent"] || "").trim() || null;
    await client.query(
      `INSERT INTO user_login_logs (user_id, username, role, login_time, ip_address, user_agent, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), $4, $5, NOW(), NOW())`,
      [user.id, user.username, user.role, ipAddress, userAgent]
    );

    await rememberLoginCompanyCode(
      client,
      user.id,
      [email, user.email, user.username],
      company_code || mappedCompanyCode || ""
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        company: user.company || "",
        database_name: databaseName,
        mapped_company_name: mappedCompanyName,
        mapped_company_code: mappedCompanyCode,
        mapped_company_email: mappedCompanyEmail,
        mapped_company_logo_url: mappedCompanyLogoUrl,
        user_profile_picture_url: userProfilePictureUrl,
        user_profile_picture_data_url: userProfilePictureDataUrl,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    await client.end().catch(() => {});
  }
};

exports.register = async (req, res) => {
  const { username, email, password, role, company, department, telephone } = req.body;

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      password_plain: String(password || "").trim(),
      role: role || "user",
      company,
      department,
      telephone,
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

exports.forgotPassword = async (req, res) => {
  const emailInput = String(req.body?.email || "").trim().toLowerCase();
  if (!emailInput) {
    return res.status(400).json({ message: "Email is required." });
  }

  const client = getAuthDbClient();
  try {
    await client.connect();
    const userRs = await client.query(
      `SELECT id, username, email, password, password_plain
       FROM users
       WHERE LOWER(TRIM(email)) = LOWER($1)
       LIMIT 1`,
      [emailInput]
    );
    if (!userRs.rowCount) {
      return res.status(404).json({ message: "No user found with this email address." });
    }

    const user = userRs.rows[0];
    let plainPassword = String(user.password_plain || "").trim();
    let generatedTemporary = false;

    if (!plainPassword && !isBcryptHash(user.password)) {
      plainPassword = String(user.password || "").trim();
    }

    if (!plainPassword) {
      generatedTemporary = true;
      plainPassword = generateTemporaryPassword();
      const hashed = await bcrypt.hash(plainPassword, 10);
      await client.query(
        `UPDATE users
         SET password = $1, password_plain = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [hashed, plainPassword, user.id]
      );
    }

    const setupRs = await client.query(
      `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name, from_email
       FROM email_setups
       ORDER BY id ASC
       LIMIT 1`
    );
    const setup = setupRs.rowCount ? setupRs.rows[0] : {};

    const smtpConfig = {
      host: String(setup.smtp_host || "").trim() || undefined,
      port: Number(setup.smtp_port || 0) || undefined,
      secure: setup.smtp_secure === true,
      user: String(setup.smtp_user || "").trim() || undefined,
      pass: String(setup.smtp_pass || "").trim() || undefined,
    };
    const subject = "Password Recovery - PULMO TECHNOLOGIES";
    const textBody = generatedTemporary
      ? `Dear ${user.username || "User"},\n\nYour email was matched successfully. A temporary password has been generated for your account.\n\nEmail: ${user.email}\nPassword: ${plainPassword}\n\nPlease login and update your password.\n\nPULMO TECHNOLOGIES`
      : `Dear ${user.username || "User"},\n\nYour email was matched successfully.\n\nEmail: ${user.email}\nPassword: ${plainPassword}\n\nPULMO TECHNOLOGIES`;
    const htmlBody = textBody.split("\n").map((line) => line.trim()).join("<br>");

    await sendEmail({
      to: String(user.email || "").trim(),
      subject,
      text: textBody,
      html: htmlBody,
      smtpConfig,
      from: buildAuthEmailFrom(setup),
    });

    return res.json({
      message: generatedTemporary
        ? "Email matched. Temporary password sent to your email."
        : "Email matched. Your saved password has been sent to your email.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Failed to send password email." });
  } finally {
    await client.end().catch(() => {});
  }
};

exports.getCompanyBranding = async (req, res) => {
  const companyCode = normalizeCompanyCode(req.query?.company_code || "");
  if (!companyCode) {
    return res.json({ company_code: null, company_name: null, logo_url: null });
  }

  const client = getAuthDbClient();
  try {
    await client.connect();
    const branding = await fetchBrandingByCode(client, companyCode);
    return res.json(branding);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load company branding." });
  } finally {
    await client.end().catch(() => {});
  }
};

exports.getRememberedCompanyCode = async (req, res) => {
  const userKeyInput = String(req.query?.user || "").trim();
  if (!userKeyInput) {
    return res.json({ user: null, company_code: null, company_name: null, logo_url: null });
  }
  const client = getAuthDbClient();
  try {
    await client.connect();
    const rememberedCode = await resolveRememberedCompanyCode(client, userKeyInput);
    if (!rememberedCode) {
      return res.json({ user: normalizeUserKey(userKeyInput), company_code: null, company_name: null, logo_url: null });
    }
    const branding = await fetchBrandingByCode(client, rememberedCode);
    return res.json({
      user: normalizeUserKey(userKeyInput),
      company_code: branding.company_code || rememberedCode,
      company_name: branding.company_name || null,
      logo_url: branding.logo_url || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load remembered company code." });
  } finally {
    await client.end().catch(() => {});
  }
};
