// ============================================
// src/routes/saleRoutes.js (COMPLETE - FIXED ORDER)
// ✅ FIX: Proper route order - specific routes BEFORE parameterized routes
// ✅ FIX: Print routes tidak perlu authentication
// ============================================
const express = require("express");
const router = express.Router();
const SaleController = require("../controllers/SaleController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// IMPORTANT: Route Order Matters!
// Specific routes (like /stats, /search/:id) MUST come BEFORE generic /:id
// ============================================

/**
 * @route   GET /api/sales/stats
 * @desc    Get sales statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  SaleController.getStats
);

/**
 * @route   GET /api/sales/search/:invoiceNumber
 * @desc    Search sale by invoice number
 * @access  Private (ADMIN, KASIR)
 * @note    MUST be before /:id route to avoid conflict
 */
router.get(
  "/search/:invoiceNumber",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  SaleController.searchByInvoice
);

/**
 * @route   GET /api/sales/:id/print/invoice
 * @desc    Print DOT MATRIX invoice (untuk KREDIT)
 * @access  Public (no auth needed for print)
 * @note    Browser window.open() tidak bisa kirim Authorization header
 */
router.get("/:id/print/invoice", SaleController.printInvoice);

/**
 * @route   GET /api/sales/:id/print/thermal
 * @desc    Print THERMAL receipt (untuk TUNAI)
 * @access  Public (no auth needed for print)
 */
router.get("/:id/print/thermal", SaleController.printThermal);

/**
 * @route   GET /api/sales
 * @desc    Get all sales with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  SaleController.getAll
);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale detail by ID
 * @access  Private (ADMIN, KASIR)
 * @note    This MUST be after all specific routes like /stats, /search, /:id/print
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  SaleController.getById
);

/**
 * @route   POST /api/sales
 * @desc    Create new sale transaction (TUNAI/KREDIT)
 * @access  Private (ADMIN, KASIR)
 */
router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  SaleController.create
);

module.exports = router;
