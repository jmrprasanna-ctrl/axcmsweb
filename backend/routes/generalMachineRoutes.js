const express = require("express");
const router = express.Router();
const generalMachineController = require("../controllers/generalMachineController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.getGeneralMachines);
router.get("/last-id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.getLastMachineId);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, generalMachineController.getGeneralMachineById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), generalMachineController.createGeneralMachine);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, generalMachineController.updateGeneralMachine);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, generalMachineController.deleteGeneralMachine);

module.exports = router;
