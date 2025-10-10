// ============================================
// src/routes/paymentRoutes.js
// Routes untuk pembayaran hutang (member & supplier)
// FIXED: Route order corrected for export endpoints
// ============================================
const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/PaymentController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// PAYMENT STATISTICS
// ============================================

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics (member & supplier debts)
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getStats
);

// ============================================
// MEMBER DEBT PAYMENT (PIUTANG DARI MEMBER)
// ============================================

/**
 * @route   GET /api/payments/member-debts
 * @desc    Get all member debts with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/member-debts",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getMemberDebts
);

/**
 * ⚠️ CRITICAL: Export route MUST come BEFORE dynamic routes
 * @route   GET /api/payments/member-debts/export
 * @desc    Export member debts to Excel
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/member-debts/export",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.exportMemberDebts
);

/**
 * @route   GET /api/payments/member-debts/member/:memberId
 * @desc    Get all debts by specific member
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/member-debts/member/:memberId",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getMemberDebtsByMember
);

/**
 * @route   GET /api/payments/member-debts/:debtId
 * @desc    Get member debt detail
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/member-debts/:debtId",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getMemberDebtDetail
);

/**
 * @route   POST /api/payments/member-debts/:debtId/pay
 * @desc    Pay member debt (cicilan hutang member)
 * @access  Private (ADMIN, KASIR)
 */
router.post(
  "/member-debts/:debtId/pay",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.payMemberDebt
);

// ============================================
// SUPPLIER DEBT PAYMENT (HUTANG KE SUPPLIER)
// ============================================

/**
 * @route   GET /api/payments/supplier-debts
 * @desc    Get all supplier debts with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/supplier-debts",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getSupplierDebts
);

/**
 * ⚠️ CRITICAL: Export route MUST come BEFORE dynamic routes
 * @route   GET /api/payments/supplier-debts/export
 * @desc    Export supplier debts to Excel
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/supplier-debts/export",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.exportSupplierDebts
);

/**
 * @route   GET /api/payments/supplier-debts/supplier/:supplierId/list
 * @desc    Get all debts to specific supplier
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/supplier-debts/supplier/:supplierId/list",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getSupplierDebtsBySupplier
);

/**
 * @route   GET /api/payments/supplier-debts/:debtId
 * @desc    Get supplier debt detail
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/supplier-debts/:debtId",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.getSupplierDebtDetail
);

/**
 * @route   POST /api/payments/supplier-debts/:debtId/pay
 * @desc    Pay supplier debt (bayar hutang ke supplier)
 * @access  Private (ADMIN, KASIR)
 */
router.post(
  "/supplier-debts/:debtId/pay",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PaymentController.paySupplierDebt
);

module.exports = router;
