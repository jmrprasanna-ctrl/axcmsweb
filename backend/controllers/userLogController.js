const { Op } = require("sequelize");
const UserLoginLog = require("../models/UserLoginLog");
const User = require("../models/User");

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
        user_agent: r.user_agent || ""
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load login logs." });
  }
};
