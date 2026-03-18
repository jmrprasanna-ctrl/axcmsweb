const express = require("express");
const router = express.Router();
const generalMachineController = require("../controllers/generalMachineController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.getGeneralMachines);
router.get("/last-id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.getLastMachineId);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), generalMachineController.getGeneralMachineById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.createGeneralMachine);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), generalMachineController.updateGeneralMachine);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), generalMachineController.deleteGeneralMachine);

module.exports = router;
