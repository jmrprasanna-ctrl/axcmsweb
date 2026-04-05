const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const todoController = require("../controllers/todoController");

router.use(authMiddleware);
router.get("/", roleMiddleware(["admin", "manager", "user"]), todoController.getTodos);
router.post("/", roleMiddleware(["admin", "manager", "user"]), todoController.createTodo);
router.put("/:id", roleMiddleware(["admin", "manager", "user"]), todoController.updateTodo);
router.delete("/:id", roleMiddleware(["admin", "manager"]), todoController.deleteTodo);

module.exports = router;
