// ============================================
// 6. Update src/routes/categoryRoutes.js (with auth)
// ============================================
const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/categoryController");
const { authenticate, authorize } = require("../middlewares/auth");

// Protected routes - All need authentication
// KASIR can only view
router.get("/", authenticate, CategoryController.getAll);
router.get("/:id", authenticate, CategoryController.getById);

// ADMIN only - create, update, delete
router.post("/", authenticate, authorize(["ADMIN"]), CategoryController.create);
router.put("/:id", authenticate, authorize(["ADMIN"]), CategoryController.update);
router.delete("/:id", authenticate, authorize(["ADMIN"]), CategoryController.delete);
router.patch("/:id/toggle", authenticate, authorize(["ADMIN"]), CategoryController.toggleActive);

module.exports = router;
