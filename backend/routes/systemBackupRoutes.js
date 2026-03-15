const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getBackupStatus, downloadBackup, restoreBackup } = require("../controllers/systemBackupController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["admin"]));
router.get("/status", getBackupStatus);
router.get("/download", downloadBackup);
router.post("/restore", restoreBackup);

module.exports = router;
