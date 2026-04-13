const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/drawyerController");

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "manager", "user"]));

router.get("/files", controller.getDrawyerFiles);
router.get("/download", controller.downloadDrawyerFile);
router.delete("/delete-file", controller.deleteDrawyerFile);

module.exports = router;
