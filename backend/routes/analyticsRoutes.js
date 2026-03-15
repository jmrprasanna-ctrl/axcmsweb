const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/sales", roleMiddleware(["admin","manager"]), analyticsController.salesChart);
router.get("/profit", roleMiddleware(["admin","manager"]), analyticsController.profitChart);

module.exports = router;
