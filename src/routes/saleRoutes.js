// ============================================
// src/routes/saleRoutes.js (UPDATED)
// ✅ FIX: Print routes tidak perlu authentication
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
 * ✅ FIX: Print routes TANPA authenticate (moved BEFORE other routes)
 * Browser window.open() tidak bisa kirim Authorization header
 */

/**
 * @route   GET /api/sales/:id/print/invoice
 * @desc    Print DOT MATRIX invoice (untuk KREDIT)
 * @access  Public (no auth needed for print)
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

module.exports = router;
