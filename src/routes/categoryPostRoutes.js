// ============================================
// src/routes/tag post.routes.js
// Category management routes
// ============================================
const express = require("express");
const router = express.Router();
const CategoryPostController = require("../controllers/CategoryPostController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/categoryPost
 * @desc    Get all categoryPost with pagination
 * @access  Private ADMIN
 */
router.get(
  "/",
  CategoryPostController.getAll
);

router.get(
  "/options",
  authenticate,
  authorize(["ADMIN"]),
  CategoryPostController.getAllOptions
);


/**
 * @route   GET /api/categoryPost/:id
 * @desc    Get tag post by ID
 * @access  Private ADMIN
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  CategoryPostController.getById
);

/**
 * @route   POST /api/categoryPost
 * @desc    Create new tag post
 * @access  Private ADMIN
 */
router.post("/", authenticate, authorize(["ADMIN"]), CategoryPostController.create);

/**
 * @route   PUT /api/categoryPost/:id
 * @desc    Update tag post
 * @access  Private (ADMIN)
 */
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  CategoryPostController.update
);

/**
 * @route   DELETE /api/categoryPost/:id
 * @desc    Delete tag post (soft delete)
 * @access  Private (ADMIN)
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  CategoryPostController.delete
);

/**
 * @route   PATCH /api/categoryPost/:id/toggle
 * @desc    Toggle tag post active status
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/toggle",
  authenticate,
  authorize(["ADMIN"]),
  CategoryPostController.toggleActive
);

module.exports = router;
