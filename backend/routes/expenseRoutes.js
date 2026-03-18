const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), expenseController.getExpenses);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, expenseController.getExpenseById);
router.post("/", authMiddleware, manageOrDemoUserMiddleware, expenseController.createExpense);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, expenseController.updateExpense);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, expenseController.deleteExpense);

module.exports = router;
