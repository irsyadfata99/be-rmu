// ============================================
// src/routes/supplierRoutes.js
// Routes untuk manajemen supplier
// ============================================
const express = require("express");
const router = express.Router();
const SupplierController = require("../controllers/SupplierController");
const { authenticate, authorize } = require("../middlewares/auth");

/**
 * @route   GET /api/suppliers/stats
 * @desc    Get supplier statistics
 * @access  Private (ADMIN, KASIR)
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), SupplierController.getStats);

/**
 * @route   GET /api/suppliers/autocomplete
 * @desc    Autocomplete search for suppliers
 * @access  Private (ADMIN, KASIR)
 */
router.get("/autocomplete", authenticate, authorize(["ADMIN", "KASIR"]), SupplierController.autocomplete);

/**
 * @route   GET /api/suppliers/code/:code
 * @desc    Get supplier by code
 * @access  Private (ADMIN, KASIR)
 */
router.get("/code/:code", authenticate, authorize(["ADMIN", "KASIR"]), SupplierController.getByCode);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with pagination
 * @access  Private (ADMIN, KASIR)
 */
router.get("/", authenticate, authorize(["ADMIN", "KASIR"]), SupplierController.getAll);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id", authenticate, authorize(["ADMIN", "KASIR"]), SupplierController.getById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (ADMIN)
 */
router.post("/", authenticate, authorize(["ADMIN"]), SupplierController.create);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (ADMIN)
 */
router.put("/:id", authenticate, authorize(["ADMIN"]), SupplierController.update);

/**
 * @route   PATCH /api/suppliers/:id/toggle
 * @desc    Toggle supplier active status
 * @access  Private (ADMIN)
 */
router.patch("/:id/toggle", authenticate, authorize(["ADMIN"]), SupplierController.toggleActive);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete)
 * @access  Private (ADMIN)
 */
router.delete("/:id", authenticate, authorize(["ADMIN"]), SupplierController.delete);

module.exports = router;
