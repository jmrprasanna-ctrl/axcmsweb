const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/googleDriveController");

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "manager", "user"]));

router.get("/settings", controller.getSettings);
router.put("/settings", controller.saveSettings);
router.post("/test", controller.testConnection);
router.post("/sync-now", controller.syncNow);

module.exports = router;
