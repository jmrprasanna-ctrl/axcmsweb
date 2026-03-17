const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserLoginLog = require("../models/UserLoginLog");
const { Op } = require("sequelize");

const isBcryptHash = (value = "") => /^\$2[aby]\$\d{2}\$/.test(value);

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username: email }
        ]
      }
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    let isMatch = false;

    if (isBcryptHash(user.password)) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Support legacy plain-text seeded passwords and upgrade on login.
      isMatch = password === user.password;
      if (isMatch) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ipAddress = forwarded || req.socket?.remoteAddress || req.ip || null;
    const userAgent = String(req.headers["user-agent"] || "").trim() || null;
    await UserLoginLog.create({
      user_id: user.id,
      username: user.username,
      role: user.role,
      login_time: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
