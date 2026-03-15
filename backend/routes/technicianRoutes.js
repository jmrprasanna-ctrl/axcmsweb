const express = require("express");
const router = express.Router();
const technicianController = require("../controllers/technicianController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin", "manager", "user"]), technicianController.getTechnicians);
router.get("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), technicianController.getTechnicianById);
router.post("/", authMiddleware, roleMiddleware(["admin", "manager"]), technicianController.createTechnician);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), technicianController.updateTechnician);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "manager"]), technicianController.deleteTechnician);

module.exports = router;
