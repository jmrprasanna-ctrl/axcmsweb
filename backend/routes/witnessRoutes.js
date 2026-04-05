const express = require("express");
const router = express.Router();
const witnessController = require("../controllers/witnessController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), witnessController.getWitnesses);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager", "user"]), witnessController.getWitnessById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), witnessController.createWitness);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, witnessController.updateWitness);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, witnessController.deleteWitness);

module.exports = router;
