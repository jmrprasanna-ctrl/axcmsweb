const express = require("express");
const router = express.Router();
const plaintController = require("../controllers/plaintController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), plaintController.getPlaints);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), plaintController.getPlaintById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), plaintController.createPlaint);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, plaintController.updatePlaint);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, plaintController.deletePlaint);

module.exports = router;
