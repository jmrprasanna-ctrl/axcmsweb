const express = require("express");
const { login, register, forgotPassword, getCompanyBranding, getRememberedCompanyCode } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.get("/company-branding", getCompanyBranding);
router.get("/company-code-memory", getRememberedCompanyCode);

module.exports = router;
