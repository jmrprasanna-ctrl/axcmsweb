const express = require("express");
const router = express.Router();
const judgmentController = require("../controllers/judgmentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), judgmentController.getJudgments);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), judgmentController.getJudgmentById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), judgmentController.createJudgment);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, judgmentController.updateJudgment);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, judgmentController.deleteJudgment);

module.exports = router;
