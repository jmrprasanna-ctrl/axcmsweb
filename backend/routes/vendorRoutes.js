const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), vendorController.getVendors);
router.get("/:id", authMiddleware, roleMiddleware(["admin","manager"]), vendorController.getVendorById);
router.get("/:id/products", authMiddleware, roleMiddleware(["admin","manager"]), vendorController.getVendorProducts);
router.post("/", authMiddleware, roleMiddleware(["admin","manager"]), vendorController.createVendor);
router.put("/:id", authMiddleware, roleMiddleware(["admin","manager"]), vendorController.updateVendor);
router.delete("/:id", authMiddleware, roleMiddleware(["admin","manager"]), vendorController.deleteVendor);

module.exports = router;
