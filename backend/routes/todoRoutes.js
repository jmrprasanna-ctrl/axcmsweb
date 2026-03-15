const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware(["admin","manager","user"]), todoController.getTodos);
router.post("/", roleMiddleware(["admin","manager"]), todoController.createTodo);
router.put("/:id", roleMiddleware(["admin","manager","user"]), todoController.updateTodo);
router.delete("/:id", roleMiddleware(["admin","manager"]), todoController.deleteTodo);

module.exports = router;
