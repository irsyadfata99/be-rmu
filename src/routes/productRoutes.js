// ============================================
// src/routes/productRoutes.js
// ✅ REMOVED toggleActive endpoint (no soft delete)
// ============================================
const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/ProductController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/products/stats
 * @desc    Get product statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.getStats);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get products with low stock
 * @access  Private (ADMIN, KASIR)
 */
router.get("/low-stock", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.getLowStock);

/**
 * @route   GET /api/products/out-of-stock
 * @desc    Get out of stock products
 * @access  Private (ADMIN, KASIR)
 */
router.get("/out-of-stock", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.getOutOfStock);

/**
 * @route   GET /api/products/autocomplete
 * @desc    Autocomplete search for products (untuk transaksi)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/autocomplete", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.autocomplete);

/**
 * @route   GET /api/products/barcode/:barcode
 * @desc    Search product by barcode (PENTING untuk scanning!)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/barcode/:barcode", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.searchByBarcode);

/**
 * @route   GET /api/products/sku/:sku
 * @desc    Search product by SKU
 * @access  Private (ADMIN, KASIR)
 */
router.get("/sku/:sku", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.searchBySKU);

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.getAll);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id", authenticate, authorize(["ADMIN", "KASIR"]), ProductController.getById);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (ADMIN)
 */
router.post("/", authenticate, authorize(["ADMIN"]), ProductController.create);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (ADMIN)
 */
router.put("/:id", authenticate, authorize(["ADMIN"]), ProductController.update);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock manually
 * @access  Private (ADMIN)
 */
router.patch("/:id/stock", authenticate, authorize(["ADMIN"]), ProductController.updateStock);

// ✅ REMOVED: /api/products/:id/toggle endpoint
// No soft delete for products

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product PERMANENTLY (hard delete with safety check)
 * @access  Private (ADMIN)
 * @warning This is PERMANENT deletion. Product will be removed from database.
 */
router.delete("/:id", authenticate, authorize(["ADMIN"]), ProductController.delete);

module.exports = router;
