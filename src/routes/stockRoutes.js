// ============================================
// src/routes/stockRoutes.js
// Routes untuk stock movement & adjustment
// ============================================
const express = require("express");
const router = express.Router();
const StockController = require("../controllers/StockController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// STOCK STATISTICS
// ============================================

/**
 * @route   GET /api/stock/stats
 * @desc    Get stock statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), StockController.getStats);

// ============================================
// STOCK MOVEMENTS (HISTORY)
// ============================================

/**
 * @route   GET /api/stock/movements
 * @desc    Get all stock movements with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/movements", authenticate, authorize(["ADMIN", "KASIR"]), StockController.getMovements);

/**
 * @route   GET /api/stock/movements/:productId/history
 * @desc    Get stock movement history by product
 * @access  Private (ADMIN, KASIR)
 */
router.get("/movements/:productId/history", authenticate, authorize(["ADMIN", "KASIR"]), StockController.getMovementsByProduct);

// ============================================
// STOCK ADJUSTMENTS (MANUAL ADJUSTMENT)
// ============================================

/**
 * @route   GET /api/stock/adjustments
 * @desc    Get all stock adjustments with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/adjustments", authenticate, authorize(["ADMIN", "KASIR"]), StockController.getAdjustments);

/**
 * @route   GET /api/stock/adjustments/:id
 * @desc    Get adjustment detail by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/adjustments/:id", authenticate, authorize(["ADMIN", "KASIR"]), StockController.getAdjustmentById);

/**
 * @route   POST /api/stock/adjustments
 * @desc    Create stock adjustment (ADMIN only)
 * @access  Private (ADMIN)
 */
router.post("/adjustments", authenticate, authorize(["ADMIN"]), StockController.createAdjustment);

/**
 * @route   PATCH /api/stock/adjustments/:id/approve
 * @desc    Approve stock adjustment (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/adjustments/:id/approve", authenticate, authorize(["ADMIN"]), StockController.approveAdjustment);

/**
 * @route   PATCH /api/stock/adjustments/:id/reject
 * @desc    Reject stock adjustment (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/adjustments/:id/reject", authenticate, authorize(["ADMIN"]), StockController.rejectAdjustment);

module.exports = router;
