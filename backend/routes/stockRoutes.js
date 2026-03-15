const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager"]), stockController.getProductStocks);
router.post("/adjust", authMiddleware, roleMiddleware(["admin", "manager"]), stockController.adjustProductStock);

module.exports = router;
