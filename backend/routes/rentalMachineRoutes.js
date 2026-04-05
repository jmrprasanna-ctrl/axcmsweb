const express = require("express");
const router = express.Router();
const rentalMachineController = require("../controllers/rentalMachineController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.getRentalMachines);
router.get("/last-id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.getLastMachineId);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, rentalMachineController.getRentalMachineById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), rentalMachineController.createRentalMachine);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, rentalMachineController.updateRentalMachine);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, rentalMachineController.deleteRentalMachine);

module.exports = router;
