const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const uiSettingsController = require("../controllers/uiSettingsController");

router.get("/public", uiSettingsController.getPublicSettings);
router.put("/", authMiddleware, roleMiddleware(["admin"]), uiSettingsController.updateSettings);

module.exports = router;

