const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.getProducts);
router.get("/search", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.searchProducts);
router.get("/last/:categoryName", authMiddleware, roleMiddleware(["admin","manager","user"]), productController.getLastProductByCategoryName);
router.get("/:id", authMiddleware, roleMiddleware(["admin","manager"]), productController.getProductById);
router.post("/", authMiddleware, roleMiddleware(["admin","manager"]), productController.createProduct);
router.put("/:id", authMiddleware, roleMiddleware(["admin","manager"]), productController.updateProduct);
router.delete("/:id", authMiddleware, roleMiddleware(["admin","manager"]), productController.deleteProduct);

module.exports = router;
