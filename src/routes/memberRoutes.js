// ============================================
// src/routes/member.routes.js
// Routes untuk member management
// ============================================
const express = require("express");
const router = express.Router();
const MemberController = require("../controllers/MemberController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/members/register
 * @desc    Register new member (PUBLIC)
 * @access  Public
 */
router.post("/register", MemberController.register);

/**
 * @route   GET /api/members/search/:uniqueId
 * @desc    Search member by uniqueId (PUBLIC)
 * @access  Public
 */
router.get("/search/:uniqueId", MemberController.searchByUniqueId);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/members
 * @desc    Get all members with pagination (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  MemberController.getAll
);

/**
 * @route   GET /api/members/stats
 * @desc    Get member statistics (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  MemberController.getStats
);

/**
 * @route   GET /api/members/:id
 * @desc    Get member by ID (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  MemberController.getById
);

/**
 * @route   PUT /api/members/:id
 * @desc    Update member (ADMIN only)
 * @access  Private (ADMIN)
 */
router.put("/:id", authenticate, authorize(["ADMIN"]), MemberController.update);

/**
 * @route   DELETE /api/members/:id
 * @desc    Soft delete member (ADMIN only)
 * @access  Private (ADMIN)
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  MemberController.delete
);

/**
 * @route   PATCH /api/members/:id/toggle
 * @desc    Toggle member active status (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/toggle",
  authenticate,
  authorize(["ADMIN"]),
  MemberController.toggleActive
);

module.exports = router;
