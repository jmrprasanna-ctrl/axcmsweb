const express = require("express");
const router = express.Router();
const rentalMachineController = require("../controllers/rentalMachineController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.getRentalMachines);
router.get("/last-id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.getLastMachineId);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), rentalMachineController.getRentalMachineById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.createRentalMachine);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), rentalMachineController.updateRentalMachine);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), rentalMachineController.deleteRentalMachine);

module.exports = router;
