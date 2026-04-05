const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), caseController.getCases);
router.get("/calendar-feed", authMiddleware, roleMiddleware(["admin", "manager", "user"]), caseController.getCalendarCases);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), caseController.getCaseById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), caseController.createCase);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, caseController.updateCase);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, caseController.deleteCase);

module.exports = router;
