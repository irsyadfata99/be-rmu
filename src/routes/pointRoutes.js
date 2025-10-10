// ============================================
// src/routes/pointRoutes.js
// Routes untuk Point Management
// UPDATED: Added export endpoint
// ============================================
const express = require("express");
const router = express.Router();
const PointController = require("../controllers/PointController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// PUBLIC ROUTES (Require Authentication)
// ============================================

/**
 * @route   GET /api/points/settings
 * @desc    Get point system settings
 * @access  Private (All authenticated users)
 */
router.get("/settings", authenticate, PointController.getSettings);

/**
 * @route   GET /api/points/member/:memberId
 * @desc    Get member point summary
 * @access  Private
 */
router.get("/member/:memberId", authenticate, PointController.getMemberSummary);

/**
 * @route   GET /api/points/member/:memberId/history
 * @desc    Get member point transaction history
 * @access  Private
 * @query   page, limit, type (EARN|REDEEM|ADJUSTMENT|EXPIRED)
 */
router.get(
  "/member/:memberId/history",
  authenticate,
  PointController.getMemberHistory
);

/**
 * @route   POST /api/points/preview
 * @desc    Preview point calculation for cart items
 * @access  Private
 * @body    { items: [{ productId, quantity, subtotal }] }
 */
router.post("/preview", authenticate, PointController.previewCalculation);

/**
 * @route   POST /api/points/validate-redemption
 * @desc    Validate if member can redeem points
 * @access  Private
 * @body    { memberId, pointsToRedeem, transactionAmount }
 */
router.post(
  "/validate-redemption",
  authenticate,
  PointController.validateRedemption
);

/**
 * @route   POST /api/points/redeem
 * @desc    Redeem member points (tukar point jadi discount)
 * @access  Private
 * @body    { memberId, points, description?, notes? }
 */
router.post("/redeem", authenticate, PointController.redeemPoints);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * @route   PUT /api/points/settings
 * @desc    Update point system settings
 * @access  Private (ADMIN only)
 * @body    { pointEnabled?, pointSystemMode?, pointPerAmount?, etc }
 */
router.put(
  "/settings",
  authenticate,
  authorize(["ADMIN"]),
  PointController.updateSettings
);

/**
 * @route   POST /api/points/adjust
 * @desc    Manual point adjustment (add/subtract points)
 * @access  Private (ADMIN only)
 * @body    { memberId, points, description, notes? }
 */
router.post(
  "/adjust",
  authenticate,
  authorize(["ADMIN"]),
  PointController.adjustPoints
);

/**
 * @route   POST /api/points/expire
 * @desc    Run point expiration process (expire old points)
 * @access  Private (ADMIN only)
 */
router.post(
  "/expire",
  authenticate,
  authorize(["ADMIN"]),
  PointController.expirePoints
);

/**
 * @route   GET /api/points/transactions
 * @desc    Get all point transactions (for admin monitoring)
 * @access  Private (ADMIN only)
 * @query   page, limit, type, memberId, search, startDate, endDate
 * ✨ ENHANCED: Better search, date range, flexible sorting
 */
router.get(
  "/transactions",
  authenticate,
  authorize(["ADMIN"]),
  PointController.getAllTransactions
);

/**
 * ✨ NEW ROUTE
 * @route   GET /api/points/transactions/export
 * @desc    Export point transactions to Excel
 * @access  Private (ADMIN only)
 * @query   type, memberId, search, startDate, endDate, sortBy, sortOrder
 */
router.get(
  "/transactions/export",
  authenticate,
  authorize(["ADMIN"]),
  PointController.exportTransactions
);

module.exports = router;
