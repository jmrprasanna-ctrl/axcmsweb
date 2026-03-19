const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), stockController.getProductStocks);
router.post("/adjust", authMiddleware, roleMiddleware(["admin", "manager", "user"]), stockController.adjustProductStock);
router.post("/clear-vendor", authMiddleware, roleMiddleware(["admin", "manager", "user"]), stockController.clearVendorStocks);

module.exports = router;
