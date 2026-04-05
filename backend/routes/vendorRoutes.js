const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), vendorController.getVendors);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, vendorController.getVendorById);
router.get("/:id/products", authMiddleware, manageOrDemoUserMiddleware, vendorController.getVendorProducts);
router.post("/", authMiddleware, roleMiddleware(["admin","manager","user"]), vendorController.createVendor);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, vendorController.updateVendor);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, vendorController.deleteVendor);

module.exports = router;
