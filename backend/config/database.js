const { Sequelize } = require("sequelize");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const db = new Sequelize(
  process.env.DB_NAME || "inventory",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  }
);

let currentDatabase = String(process.env.DB_NAME || "inventory").trim() || "inventory";
let switchChain = Promise.resolve();

function normalizeDatabaseName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "";
  return normalized;
}

async function doSwitchDatabase(nextNameRaw) {
  const nextName = normalizeDatabaseName(nextNameRaw);
  if (!nextName || nextName === currentDatabase) {
    return currentDatabase;
  }
  // Do not close the shared Sequelize instance per-request; this causes
  // transient disconnects and server instability under concurrent traffic.
  db.config.database = nextName;
  db.options.database = nextName;
  if (db.connectionManager && db.connectionManager.config) {
    db.connectionManager.config.database = nextName;
  }
  // Clear pooled connections so next queries reconnect using the new DB.
  if (db.connectionManager && db.connectionManager.pool && typeof db.connectionManager.pool.destroyAllNow === "function") {
    await db.connectionManager.pool.destroyAllNow();
  }
  currentDatabase = nextName;
  return currentDatabase;
}

db.normalizeDatabaseName = normalizeDatabaseName;
db.getCurrentDatabase = () => currentDatabase;
db.switchDatabase = (nextNameRaw) => {
  switchChain = switchChain.then(() => doSwitchDatabase(nextNameRaw));
  return switchChain;
};

module.exports = db;
