const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), customerController.getCustomers);
router.get("/:id", authMiddleware, roleMiddleware(["admin","manager"]), customerController.getCustomerById);
router.post("/", authMiddleware, roleMiddleware(["admin","manager"]), customerController.createCustomer);
router.put("/:id", authMiddleware, roleMiddleware(["admin","manager"]), customerController.updateCustomer);
router.delete("/:id", authMiddleware, roleMiddleware(["admin","manager"]), customerController.deleteCustomer);

module.exports = router;
