const express = require("express");
const { login, register, forgotPassword, getCompanyBranding } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.get("/company-branding", getCompanyBranding);

module.exports = router;
