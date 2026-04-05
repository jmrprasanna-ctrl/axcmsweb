const express = require("express");
const router = express.Router();
const answerController = require("../controllers/answerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), answerController.getAnswers);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), answerController.getAnswerById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), answerController.createAnswer);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, answerController.updateAnswer);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, answerController.deleteAnswer);

module.exports = router;
