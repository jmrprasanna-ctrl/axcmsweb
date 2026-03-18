const jwt = require("jsonwebtoken");
const db = require("../config/database");

const DEFAULT_DB = db.normalizeDatabaseName(process.env.DB_NAME || "inventory") || "inventory";
const ALLOWED_USER_DBS = new Set(["inventory", "demo"]);

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
    const headerDb = db.normalizeDatabaseName(req.headers["x-database-name"] || "");

    if (role === "user") {
      const selected = tokenDb || headerDb || DEFAULT_DB;
      if (!ALLOWED_USER_DBS.has(selected)) {
        return res.status(403).json({ message: "Invalid database access." });
      }
      targetDb = selected;
    }

    await db.switchDatabase(targetDb);
    req.user = decoded;
    req.databaseName = targetDb;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = authMiddleware;
