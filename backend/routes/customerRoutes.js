const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), customerController.getCustomers);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, customerController.getCustomerById);
router.post("/", authMiddleware, roleMiddleware(["admin","manager","user"]), customerController.createCustomer);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, customerController.updateCustomer);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, customerController.deleteCustomer);

module.exports = router;
