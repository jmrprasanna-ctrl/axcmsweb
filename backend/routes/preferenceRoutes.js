const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const preferenceController = require("../controllers/preferenceController");

const router = express.Router();

router.get("/logo-file", preferenceController.getLogoFile);

router.get("/my-ui-settings", authMiddleware, roleMiddleware(["admin","manager","user"]), preferenceController.getMyUiSettings);
router.put("/theme", authMiddleware, roleMiddleware(["admin","manager","user"]), preferenceController.updateMyTheme);

router.use(authMiddleware);
router.use(roleMiddleware(["admin","manager","user"]));

router.get("/", preferenceController.getPreferences);
router.post("/logo", preferenceController.uploadLogo);
router.post("/template", preferenceController.uploadTemplate);
router.post("/brand-image", preferenceController.uploadBrandImage);

module.exports = router;
