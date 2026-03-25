const bcrypt = require("bcrypt");
const db = require("../config/database");
const User = require("../models/User");
const UserAccess = require("../models/UserAccess");
const UserLoginLog = require("../models/UserLoginLog");

async function isRequesterSuperAdmin(req) {
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

exports.getUsers = async (req, res) => {
  try {
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

  try {
    await db.transaction(async (t) => {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) {
        throw Object.assign(new Error("User not found"), { statusCode: 404 });
      }
      const requesterId = Number(req?.user?.id || req?.user?.userId || 0);
      const requesterIsSuper = await isRequesterSuperAdmin(req);
      if (isTargetProtectedSuperAdmin(user, requesterId, requesterIsSuper)) {
        throw Object.assign(new Error("Forbidden: Super admin user is protected."), { statusCode: 403 });
      }

      await UserLoginLog.destroy({ where: { user_id: userId }, transaction: t });
      await UserAccess.destroy({ where: { user_id: userId }, transaction: t });
      await User.destroy({ where: { id: userId }, transaction: t });
    });

    res.json({ message: "User deleted with linked access/log records" });
  } catch (err) {
    if (err && err.statusCode === 404) {
      return res.status(404).json({ message: "User not found" });
    }
    if (err && err.statusCode === 403) {
      return res.status(403).json({ message: err.message || "Forbidden" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
