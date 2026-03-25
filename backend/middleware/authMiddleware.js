const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { Client } = require("pg");

const DEFAULT_DB = db.normalizeDatabaseName(process.env.DB_NAME || "inventory") || "inventory";

function getAuthDbClient() {
  return new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: String(process.env.DB_PASSWORD || ""),
    database: DEFAULT_DB,
  });
}

async function resolveUserAssignedDatabase(userId) {
  const client = getAuthDbClient();
  try {
    await client.connect();
    const mappingRs = await client.query(
      `SELECT database_name
       FROM user_mappings
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    const mapped = db.normalizeDatabaseName(mappingRs.rows[0]?.database_name || "");
    if (mapped) {
      return mapped;
    }

    const rs = await client.query(
      `SELECT database_name
       FROM user_accesses
       WHERE user_id = $1
         AND LOWER(COALESCE(user_database, 'inventory')) = 'inventory'
       ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST, id DESC
       LIMIT 1`,
      [userId]
    );
    const selected = db.normalizeDatabaseName(rs.rows[0]?.database_name || "");
    if (selected) {
      return selected;
    }
    return DEFAULT_DB;
  } catch (_err) {
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

const authMiddleware = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretjwtkey");
    let targetDb = DEFAULT_DB;
    const role = String(decoded?.role || "").toLowerCase();

    const tokenDb = db.normalizeDatabaseName(decoded?.database_name || "");
    if (tokenDb) {
      try {
        await db.registerDatabase(tokenDb);
        targetDb = tokenDb;
      } catch (_err) {
      }
    }

    if (role === "user") {
      const assignedDb = await resolveUserAssignedDatabase(Number(decoded?.id || 0));
      if (!assignedDb) {
        return res.status(503).json({ message: "Unable to resolve user database assignment." });
      }
      try {
        await db.registerDatabase(assignedDb);
      } catch (_err) {
        return res.status(403).json({ message: "Invalid assigned database access." });
      }
      targetDb = assignedDb;
    }

    req.user = decoded;
    req.databaseName = targetDb;
    return db.runWithDatabase(targetDb, () => next());
  } catch (err) {
    return res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = authMiddleware;
