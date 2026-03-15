const express = require("express");
const { getUsers, getUserById, addUser, updateUser, deleteUser } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/assignable", roleMiddleware(["admin","manager"]), getUsers);

router.use(roleMiddleware(["admin"]));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", addUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
