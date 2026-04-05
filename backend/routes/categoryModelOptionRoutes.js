const express = require("express");
const router = express.Router();
const categoryModelOptionController = require("../controllers/categoryModelOptionController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager", "user"]),
  categoryModelOptionController.getCategoryModelOptions
);

module.exports = router;

