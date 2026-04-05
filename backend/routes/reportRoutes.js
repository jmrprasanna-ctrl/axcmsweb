const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/sales", roleMiddleware(["admin","manager","user"]), reportController.salesReport);
router.get("/expenses", roleMiddleware(["admin","manager"]), reportController.expenseReport);
router.get("/profit-loss", roleMiddleware(["admin","manager"]), reportController.profitLossReport);
router.get("/technician-invoices-monthly", roleMiddleware(["admin","manager"]), reportController.technicianInvoicesMonthlyReport);
router.get("/finance-overview", roleMiddleware(["admin","manager","user"]), reportController.financeOverview);

module.exports = router;

