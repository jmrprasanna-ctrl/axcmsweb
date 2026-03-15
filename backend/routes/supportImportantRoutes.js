const express = require("express");
const router = express.Router();
const supportImportantController = require("../controllers/supportImportantController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), supportImportantController.getSupportImportants);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager"]), supportImportantController.createSupportImportant);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), supportImportantController.updateSupportImportant);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), supportImportantController.deleteSupportImportant);

module.exports = router;
