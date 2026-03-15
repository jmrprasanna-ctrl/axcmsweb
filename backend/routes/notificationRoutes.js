const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware(["admin","manager","user"]), notificationController.getNotifications);
router.post("/", roleMiddleware(["admin","manager"]), notificationController.createNotification);
router.delete("/:id", roleMiddleware(["admin","manager"]), notificationController.deleteNotification);

module.exports = router;
