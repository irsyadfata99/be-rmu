// ============================================
// src/routes/purchaseRoutes.js (FIXED - Added search route)
// Routes untuk transaksi pembelian (barang masuk)
// ============================================
const express = require("express");
const router = express.Router();
const PurchaseController = require("../controllers/PurchaseController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/purchases/stats
 * @desc    Get purchase statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.getStats
);

/**
 * @route   GET /api/purchases/search/:invoiceNumber
 * @desc    Search purchase by invoice number (for returns)
 * @access  Private (ADMIN, KASIR)
 * ✅ NEW ROUTE - Must be before /:id route!
 */
router.get(
  "/search/:invoiceNumber",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.searchByInvoice
);

/**
 * @route   GET /api/purchases
 * @desc    Get all purchases with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.getAll
);

/**
 * @route   GET /api/purchases/:id
 * @desc    Get purchase detail by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.getById
);

/**
 * @route   POST /api/purchases
 * @desc    Create new purchase (input barang masuk)
 * @access  Private (ADMIN, KASIR)
 */
router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.create
);

/**
 * @route   PATCH /api/purchases/:id/pay
 * @desc    Update payment for KREDIT purchase
 * @access  Private (ADMIN, KASIR)
 */
router.patch(
  "/:id/pay",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  PurchaseController.updatePayment
);

module.exports = router;
