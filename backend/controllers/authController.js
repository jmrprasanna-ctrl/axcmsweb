const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Client } = require("pg");
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
  const fromName = String(setupRow.from_name || "AXIS_CMS_WEB").trim() || "AXIS_CMS_WEB";
  const fromEmail = String(setupRow.from_email || setupRow.smtp_user || "").trim();
  if (!fromEmail) {
    return process.env.SMTP_FROM || '"AXIS_CMS_WEB" <noreply@company.com>';
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

function normalizeCompanyCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "")
    .slice(0, 40);
}

function normalizeLooseCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function normalizeNameCompare(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]+/g, "");
}

exports.getCompanyBranding = async (req, res) => {
  const companyCode = normalizeCompanyCode(req.query?.company_code);
  if (!companyCode) {
    return res.json({ company_code: null, company_name: null, logo_url: null });
  }

  const client = getAuthDbClient();
  try {
    await client.connect();
    const rs = await client.query(
      `SELECT company_code, company_name, logo_path
       FROM company_profiles
       WHERE UPPER(TRIM(COALESCE(company_code, ''))) = $1
       LIMIT 1`,
      [companyCode]
    );
    if (!rs.rowCount) {
      return res.json({ company_code: companyCode, company_name: null, logo_url: null });
    }

    const row = rs.rows[0] || {};
    const logoPath = String(row.logo_path || "").trim();
    const logoUrl = logoPath
      ? `/${logoPath.replace(/\\/g, "/").replace(/^\/+/, "")}`
      : null;
    return res.json({
      company_code: String(row.company_code || companyCode).trim().toUpperCase(),
      company_name: String(row.company_name || "").trim() || null,
      logo_url: logoUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    await client.end().catch(() => {});
  }
};

exports.login = async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  let companyCode = normalizeCompanyCode(req.body?.company_code);

  if (!email || !password) {
    return res.status(400).json({ message: "Username/email and password are required." });
  }

  const client = getAuthDbClient();
  try {
    await client.connect();
    const userRs = await client.query(
      `SELECT id, username, email, role, password, password_plain, company
       FROM users
       WHERE email = $1 OR username = $1
       LIMIT 1`,
      [email]
    );
    const user = userRs.rows[0];
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!companyCode) {
      const inferredCodeRs = await client.query(
        `SELECT cp.company_code
         FROM user_mappings um
         JOIN company_profiles cp ON cp.id = um.company_profile_id
         WHERE um.user_id = $1
           AND cp.company_code IS NOT NULL
           AND TRIM(cp.company_code) <> ''
         LIMIT 1`,
        [user.id]
      );
      if (inferredCodeRs.rowCount) {
        companyCode = normalizeCompanyCode(inferredCodeRs.rows[0]?.company_code);
      }
    }

    if (!companyCode) {
      return res.status(400).json({ message: "Company code is required for first-time login on this device." });
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

    const mappingRs = await client.query(
      `SELECT um.database_name, cp.company_name, cp.company_code, COALESCE(NULLIF(TRIM(um.mapped_email), ''), cp.email) AS mapped_email, cp.logo_path
       FROM user_mappings um
       JOIN company_profiles cp ON cp.id = um.company_profile_id
       WHERE um.user_id = $1
         AND UPPER(TRIM(COALESCE(cp.company_code, ''))) = $2
       LIMIT 1`,
      [user.id, companyCode]
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
      const logoPath = String(mappingRs.rows[0]?.logo_path || "").trim();
      if (logoPath) {
        const clean = logoPath.replace(/\\/g, "/").replace(/^\/+/, "");
        mappedCompanyLogoUrl = `/${clean}`;
      }
    } else {
      const fallbackCompanyRs = await client.query(
        `SELECT id, company_name, company_code, email, logo_path
         FROM company_profiles
         WHERE UPPER(TRIM(COALESCE(company_code, ''))) = $1
         LIMIT 1`,
        [companyCode]
      );

      if (!fallbackCompanyRs.rowCount) {
        const looseInputCode = normalizeLooseCode(companyCode);
        const looseUserCompany = normalizeLooseCode(user.company || "");
        if (!looseInputCode || !looseUserCompany || looseInputCode !== looseUserCompany) {
          return res.status(400).json({ message: "Invalid company code" });
        }
      } else {
        const c = fallbackCompanyRs.rows[0];
        const sameCompanyName = normalizeNameCompare(c.company_name) === normalizeNameCompare(user.company);
        const sameEmail = String(c.email || "").trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
        if (!sameCompanyName && !sameEmail) {
          return res.status(400).json({ message: "Invalid company code" });
        }
        mappedCompanyName = String(c.company_name || "").trim() || null;
        mappedCompanyCode = String(c.company_code || "").trim().toUpperCase() || companyCode;
        mappedCompanyEmail = String(c.email || "").trim().toLowerCase() || null;
        const logoPath = String(c.logo_path || "").trim();
        if (logoPath) {
          const clean = logoPath.replace(/\\/g, "/").replace(/^\/+/, "");
          mappedCompanyLogoUrl = `/${clean}`;
        }
      }
    }

    if (!databaseName && String(user.role || "").toLowerCase() === "user") {
      const accessRs = await client.query(
        `SELECT database_name
         FROM user_accesses
       WHERE user_id = $1
         AND LOWER(COALESCE(user_database, 'axiscmsdb')) IN ('axiscmsdb', 'inventory')
         ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
         LIMIT 1`,
        [user.id]
      );
      const normalized = db.normalizeDatabaseName(accessRs.rows[0]?.database_name || "");
      if (normalized) {
        await db.registerDatabase(normalized).catch(() => {});
        databaseName = normalized;
      }
    }

    const profileImageRs = await client.query(
      `SELECT profile_picture_path
       FROM user_profiles
       WHERE (
          user_id = $1
          OR LOWER(TRIM(email)) = LOWER($2)
          OR LOWER(TRIM(login_user)) = LOWER($3)
          OR LOWER(TRIM(login_user)) = LOWER($2)
       )
         AND profile_picture_path IS NOT NULL
         AND TRIM(profile_picture_path) <> ''
       ORDER BY
         CASE
           WHEN user_id = $1 THEN 1
           WHEN LOWER(TRIM(email)) = LOWER($2) THEN 2
           WHEN LOWER(TRIM(login_user)) = LOWER($3) THEN 3
           WHEN LOWER(TRIM(login_user)) = LOWER($2) THEN 4
           ELSE 9
         END ASC,
         "updatedAt" DESC NULLS LAST,
         id DESC
       LIMIT 1`,
      [user.id, String(user.email || "").trim(), String(user.username || "").trim()]
    );
    if (profileImageRs.rowCount) {
      const rawPath = String(profileImageRs.rows[0]?.profile_picture_path || "").trim();
      if (rawPath) {
        const clean = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
        userProfilePictureUrl = `/${clean}`;
      }
    }

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
    const subject = "Password Recovery - AXIS_CMS_WEB";
    const textBody = generatedTemporary
      ? `Dear ${user.username || "User"},\n\nYour email was matched successfully. A temporary password has been generated for your account.\n\nEmail: ${user.email}\nPassword: ${plainPassword}\n\nPlease login and update your password.\n\nAXIS_CMS_WEB`
      : `Dear ${user.username || "User"},\n\nYour email was matched successfully.\n\nEmail: ${user.email}\nPassword: ${plainPassword}\n\nAXIS_CMS_WEB`;
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
