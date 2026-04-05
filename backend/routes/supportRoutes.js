const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "manager", "user"]));

router.get("/lawyers", supportController.getLawyers);
router.post("/lawyers", supportController.addLawyer);
router.delete("/lawyers/:id", supportController.deleteLawyer);

router.get("/courts", supportController.getCourts);
router.post("/courts", supportController.addCourt);
router.delete("/courts/:id", supportController.deleteCourt);

module.exports = router;
