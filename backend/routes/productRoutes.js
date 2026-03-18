const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const manageOrDemoUserMiddleware = require("../middleware/manageOrDemoUserMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.getProducts);
router.get("/search", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.searchProducts);
router.get("/last/:categoryName", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.getLastProductByCategoryName);
router.get("/:id", authMiddleware, manageOrDemoUserMiddleware, productController.getProductById);
router.post("/", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.createProduct);
router.put("/:id", authMiddleware, manageOrDemoUserMiddleware, productController.updateProduct);
router.delete("/:id", authMiddleware, manageOrDemoUserMiddleware, productController.deleteProduct);

module.exports = router;
