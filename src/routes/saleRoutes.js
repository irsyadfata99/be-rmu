// ============================================
// src/routes/saleRoutes.js
// Routes untuk transaksi penjualan (POS)
// ============================================
const express = require("express");
const router = express.Router();
const SaleController = require("../controllers/SaleController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/sales/stats
 * @desc    Get sales statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.getStats);

/**
 * @route   GET /api/sales
 * @desc    Get all sales with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.getAll);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale detail by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.getById);

/**
 * @route   POST /api/sales
 * @desc    Create new sale transaction (TUNAI/KREDIT)
 * @access  Private (ADMIN, KASIR)
 */
router.post("/", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.create);

/**
 * @route   GET /api/sales/:id/print/invoice
 * @desc    Print DOT MATRIX invoice (untuk KREDIT)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id/print/invoice", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.printInvoice);

/**
 * @route   GET /api/sales/:id/print/thermal
 * @desc    Print THERMAL receipt (untuk TUNAI)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id/print/thermal", authenticate, authorize(["ADMIN", "KASIR"]), SaleController.printThermal);

module.exports = router;
