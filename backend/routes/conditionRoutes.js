const express = require("express");
const router = express.Router();
const conditionController = require("../controllers/conditionController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, conditionController.getConditions);
router.post("/", authMiddleware, conditionController.addCondition);
router.put("/:id", authMiddleware, conditionController.updateCondition);
router.delete("/:id", authMiddleware, conditionController.deleteCondition);

module.exports = router;
