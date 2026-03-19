const { Op } = require("sequelize");
const UserLoginLog = require("../models/UserLoginLog");
const User = require("../models/User");

const ipCityCache = new Map();

function normalizeIp(rawIp) {
  const value = String(rawIp || "").trim();
  if (!value) return "";

  if (value.includes(",")) {
    return normalizeIp(value.split(",")[0]);
  }

  if (value.startsWith("::ffff:")) {
    return value.replace("::ffff:", "");
  }

  if (value === "::1" || value === "127.0.0.1") {
    return "127.0.0.1";
  }

  return value;
}

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

async function getCityFromIp(ip) {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp || isPrivateOrLocalIp(normalizedIp)) {
    ipCityCache.set(normalizedIp, "Local/Private");
    return "Local/Private";
  }

  if (typeof fetch !== "function") {
    ipCityCache.set(normalizedIp, "");
    return "";
  }

  if (ipCityCache.has(normalizedIp)) {
    return ipCityCache.get(normalizedIp);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(normalizedIp)}`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      ipCityCache.set(normalizedIp, "");
      return "";
    }

    const payload = await response.json();
    const city = String(payload?.city || "").trim();
    ipCityCache.set(normalizedIp, city);
    return city;
  } catch (_err) {
    ipCityCache.set(normalizedIp, "");
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function getRange(period, rawDate) {
  const base = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const p = String(period || "week").toLowerCase();

  if (p === "week") {
    const start = new Date(base);
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (p === "month") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (p === "year") {
    const start = new Date(base.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(base.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

exports.getLoginLogs = async (req, res) => {
  try {
    const period = String(req.query.period || "week").toLowerCase();
    const date = req.query.date || "";
    const userId = Number(req.query.user_id || 0);
    const range = getRange(period, date);

    if (!range) {
      return res.status(400).json({ message: "Invalid period/date" });
    }

    const where = {
      login_time: { [Op.between]: [range.start, range.end] }
    };
    if (Number.isFinite(userId) && userId > 0) {
      where.user_id = userId;
    }

    const rows = await UserLoginLog.findAll({
      where,
      include: [{ model: User, attributes: ["id", "username", "email", "role"] }],
      order: [["login_time", "DESC"], ["id", "DESC"]]
    });

    const uniqueIps = [...new Set(rows.map((r) => normalizeIp(r.ip_address)).filter(Boolean))];
    const resolvedCities = await Promise.all(uniqueIps.map((ip) => getCityFromIp(ip)));
    const cityByIp = new Map();
    uniqueIps.forEach((ip, idx) => {
      cityByIp.set(ip, resolvedCities[idx] || ipCityCache.get(ip) || "");
    });

    res.json({
      period,
      start: range.start,
      end: range.end,
      total: rows.length,
      rows: rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        username: r.username || (r.User ? r.User.username : ""),
        role: r.role || (r.User ? r.User.role : ""),
        login_time: r.login_time,
        ip_address: r.ip_address || "",
        city: cityByIp.get(normalizeIp(r.ip_address)) || "",
        user_agent: r.user_agent || ""
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load login logs." });
  }
};

exports.clearLoginLogs = async (_req, res) => {
  try {
    const deletedCount = await UserLoginLog.destroy({ where: {} });
    res.json({ message: "Login log records cleared.", deleted: deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to clear login logs." });
  }
};
