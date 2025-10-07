// ============================================
// src/routes/category.routes.js
// Category management routes
// ============================================
const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/categories
 * @desc    Get all categories with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  CategoryController.getAll
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  CategoryController.getById
);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (ADMIN)
 */
router.post("/", authenticate, authorize(["ADMIN"]), CategoryController.create);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (ADMIN)
 */
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  CategoryController.update
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (ADMIN)
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  CategoryController.delete
);

/**
 * @route   PATCH /api/categories/:id/toggle
 * @desc    Toggle category active status
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/toggle",
  authenticate,
  authorize(["ADMIN"]),
  CategoryController.toggleActive
);

module.exports = router;
