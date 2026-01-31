// ============================================
// src/routes/tag post.routes.js
// Category management routes
// ============================================
const express = require("express");
const router = express.Router();
const TagPostController = require("../controllers/TagPostController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/tagPost
 * @desc    Get all tagPost with pagination
 * @access  Private ADMIN
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.getAll
);

router.get(
  "/options",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.getAllOptions
);

/**
 * @route   GET /api/tagPost/:id
 * @desc    Get tag post by ID
 * @access  Private ADMIN
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.getById
);

/**
 * @route   POST /api/tagPost
 * @desc    Create new tag post
 * @access  Private ADMIN
 */
router.post("/", authenticate, authorize(["ADMIN"]), TagPostController.create);

/**
 * @route   PUT /api/tagPost/:id
 * @desc    Update tag post
 * @access  Private (ADMIN)
 */
router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.update
);

/**
 * @route   DELETE /api/tagPost/:id
 * @desc    Delete tag post (soft delete)
 * @access  Private (ADMIN)
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.delete
);

/**
 * @route   PATCH /api/tagPost/:id/toggle
 * @desc    Toggle tag post active status
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/toggle",
  authenticate,
  authorize(["ADMIN"]),
  TagPostController.toggleActive
);

module.exports = router;
