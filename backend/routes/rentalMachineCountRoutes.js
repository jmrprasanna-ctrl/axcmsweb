const express = require("express");
const router = express.Router();
const controller = require("../controllers/rentalMachineCountController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), controller.getRentalMachineCounts);
router.get("/last-id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), controller.getLastTransactionId);
router.get("/next-count", authMiddleware, roleMiddleware(["admin", "manager", "user"]), controller.getMachineNextCount);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), controller.createRentalMachineCount);

module.exports = router;
