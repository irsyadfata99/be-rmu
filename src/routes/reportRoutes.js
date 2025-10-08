// ============================================
// src/routes/reportRoutes.js (COMPLETE & FIXED)
// Routes untuk semua laporan
// ============================================
const express = require("express");
const router = express.Router();
const ReportController = require("../controllers/ReportController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

/**
 * @route   GET /api/reports/returns
 * @desc    Laporan Barang Return (Purchase & Sales)
 * @access  Private (ADMIN, KASIR)
 * @query   ?type=purchase/sales&status=PENDING/APPROVED/REJECTED&startDate&endDate&export=true
 */
router.get(
  "/returns",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getReturns
);

/**
 * @route   GET /api/reports/best-selling
 * @desc    Laporan Barang Paling Laku
 * @access  Private (ADMIN, KASIR)
 * @query   ?startDate&endDate&categoryId&limit=50&export=true
 */
router.get(
  "/best-selling",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getBestSelling
);

/**
 * @route   GET /api/reports/daily-transactions
 * @desc    Laporan Transaksi Harian
 * @access  Private (ADMIN, KASIR)
 * @query   ?startDate&endDate&export=true
 */
router.get(
  "/daily-transactions",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getDailyTransactions
);

/**
 * @route   GET /api/reports/monthly-transactions
 * @desc    Laporan Transaksi Bulanan
 * @access  Private (ADMIN, KASIR)
 * @query   ?year=2025&export=true
 */
router.get(
  "/monthly-transactions",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getMonthlyTransactions
);

/**
 * @route   GET /api/reports/member-transactions
 * @desc    Laporan Transaksi per Member (per Unique-ID)
 * @access  Private (ADMIN, KASIR)
 * @query   ?page&limit&regionCode&startDate&endDate&sortBy=totalSpending&sortOrder=DESC&export=true
 */
router.get(
  "/member-transactions",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getMemberTransactions
);

/**
 * @route   GET /api/reports/purchases
 * @desc    Laporan Jenis Pembelian
 * @access  Private (ADMIN, KASIR)
 * @query   ?page&limit&startDate&endDate&purchaseType=TUNAI/KREDIT/KONSINYASI&supplierId&export=true
 */
router.get(
  "/purchases",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getPurchaseReport
);

/**
 * @route   GET /api/reports/debts
 * @desc    Laporan Hutang (Hutang Koperasi ke Supplier)
 * @access  Private (ADMIN, KASIR)
 * @query   ?page&limit&status=PENDING/PARTIAL/PAID&overdue=true&supplierId&export=true
 */
router.get(
  "/debts",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getDebtReport
);

/**
 * @route   GET /api/reports/receivables
 * @desc    Laporan Piutang (Piutang Koperasi dari Member)
 * @access  Private (ADMIN, KASIR)
 * @query   ?page&limit&status=PENDING/PARTIAL/PAID&overdue=true&memberId&regionCode&export=true
 */
router.get(
  "/receivables",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getReceivableReport
);

/**
 * @route   GET /api/reports/points
 * @desc    Laporan Bonus Point per Anggota
 * @access  Private (ADMIN, KASIR)
 * @query   ?page&limit&memberId&regionCode&type=EARN/REDEEM/EXPIRED&startDate&endDate&export=true
 */
router.get(
  "/points",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getPointReport
);

/**
 * @route   GET /api/reports/summary
 * @desc    Summary semua laporan (Dashboard)
 * @access  Private (ADMIN, KASIR)
 * @query   ?startDate&endDate
 */
router.get(
  "/summary",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReportController.getSummary
);

module.exports = router;
