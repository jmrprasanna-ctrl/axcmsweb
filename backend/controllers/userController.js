const bcrypt = require("bcrypt");
const db = require("../config/database");
const User = require("../models/User");
const UserAccess = require("../models/UserAccess");
const UserLoginLog = require("../models/UserLoginLog");

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "company", "department", "telephone", "email", "role", "createdAt"],
      order: [["id", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      attributes: ["id", "username", "company", "department", "telephone", "email", "role"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

      await UserLoginLog.destroy({ where: { user_id: userId }, transaction: t });
      await UserAccess.destroy({ where: { user_id: userId }, transaction: t });
      await User.destroy({ where: { id: userId }, transaction: t });
    });

    res.json({ message: "User deleted with linked access/log records" });
  } catch (err) {
    if (err && err.statusCode === 404) {
      return res.status(404).json({ message: "User not found" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
