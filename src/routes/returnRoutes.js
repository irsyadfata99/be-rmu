// ============================================
// src/routes/returnRoutes.js
// Routes untuk Purchase Return & Sales Return
// ============================================
const express = require("express");
const router = express.Router();
const ReturnController = require("../controllers/ReturnController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// STATISTICS
// ============================================

/**
 * @route   GET /api/returns/stats
 * @desc    Get return statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.getStats);

// ============================================
// PURCHASE RETURNS (RETUR KE SUPPLIER)
// ============================================

/**
 * @route   GET /api/returns/purchases
 * @desc    Get all purchase returns with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/purchases", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.getPurchaseReturns);

/**
 * @route   GET /api/returns/purchases/:id
 * @desc    Get purchase return detail by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/purchases/:id", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.getPurchaseReturnById);

/**
 * @route   POST /api/returns/purchases
 * @desc    Create new purchase return (retur ke supplier)
 * @access  Private (ADMIN, KASIR)
 */
router.post("/purchases", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.createPurchaseReturn);

/**
 * @route   PATCH /api/returns/purchases/:id/approve
 * @desc    Approve purchase return (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/purchases/:id/approve", authenticate, authorize(["ADMIN"]), ReturnController.approvePurchaseReturn);

/**
 * @route   PATCH /api/returns/purchases/:id/reject
 * @desc    Reject purchase return (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/purchases/:id/reject", authenticate, authorize(["ADMIN"]), ReturnController.rejectPurchaseReturn);

// ============================================
// SALES RETURNS (RETUR DARI MEMBER)
// ============================================

/**
 * @route   GET /api/returns/sales
 * @desc    Get all sales returns with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/sales", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.getSalesReturns);

/**
 * @route   GET /api/returns/sales/:id
 * @desc    Get sales return detail by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/sales/:id", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.getSalesReturnById);

/**
 * @route   POST /api/returns/sales
 * @desc    Create new sales return (retur dari member)
 * @access  Private (ADMIN, KASIR)
 */
router.post("/sales", authenticate, authorize(["ADMIN", "KASIR"]), ReturnController.createSalesReturn);

/**
 * @route   PATCH /api/returns/sales/:id/approve
 * @desc    Approve sales return (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/sales/:id/approve", authenticate, authorize(["ADMIN"]), ReturnController.approveSalesReturn);

/**
 * @route   PATCH /api/returns/sales/:id/reject
 * @desc    Reject sales return (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/sales/:id/reject", authenticate, authorize(["ADMIN"]), ReturnController.rejectSalesReturn);

module.exports = router;
