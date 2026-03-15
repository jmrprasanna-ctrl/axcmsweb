const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), expenseController.getExpenses);
router.get("/:id", authMiddleware, roleMiddleware(["admin","manager"]), expenseController.getExpenseById);
router.post("/", authMiddleware, roleMiddleware(["admin","manager"]), expenseController.createExpense);
router.put("/:id", authMiddleware, roleMiddleware(["admin","manager"]), expenseController.updateExpense);
router.delete("/:id", authMiddleware, roleMiddleware(["admin","manager"]), expenseController.deleteExpense);

module.exports = router;
