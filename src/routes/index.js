// ============================================
// src/routes/index.js (UPDATED - WITH POINT ROUTES)
// ============================================
const express = require("express");
const router = express.Router();

// ============================================
// IMPORT ALL ROUTE MODULES
// ============================================
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const memberRoutes = require("./memberRoutes");
const productRoutes = require("./productRoutes");
const supplierRoutes = require("./supplierRoutes");
const saleRoutes = require("./saleRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const paymentRoutes = require("./paymentRoutes");
const stockRoutes = require("./stockRoutes");
const returnRoutes = require("./returnRoutes");
const pointRoutes = require("./pointRoutes"); // NEW!

// ============================================
// HEALTH CHECK
// ============================================
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// API ROUTES
// ============================================

/**
 * @route   /api/auth/*
 * @desc    Authentication routes (login, register, etc)
 */
router.use("/auth", authRoutes);

/**
 * @route   /api/categories/*
 * @desc    Category management routes
 */
router.use("/categories", categoryRoutes);
router.use("/products/categories", categoryRoutes);

/**
 * @route   /api/members/*
 * @desc    Member management routes
 */
router.use("/members", memberRoutes);

/**
 * @route   /api/products/*
 * @desc    Product management routes
 */
router.use("/products", productRoutes);

/**
 * @route   /api/suppliers/*
 * @desc    Supplier management routes
 */
router.use("/suppliers", supplierRoutes);

/**
 * @route   /api/sales/*
 * @desc    Sales transaction routes (POS)
 */
router.use("/sales", saleRoutes);

/**
 * @route   /api/purchases/*
 * @desc    Purchase transaction routes
 */
router.use("/purchases", purchaseRoutes);

/**
 * @route   /api/payments/*
 * @desc    Payment & debt management routes
 */
router.use("/payments", paymentRoutes);

/**
 * @route   /api/stock/*
 * @desc    Stock movement & adjustment routes
 */
router.use("/stock", stockRoutes);

/**
 * @route   /api/returns/*
 * @desc    Purchase & Sales return routes
 */
router.use("/returns", returnRoutes);

/**
 * @route   /api/points/*
 * @desc    Point management routes (NEW!)
 */
router.use("/points", pointRoutes);

// ============================================
// API INFO (Root endpoint)
// ============================================
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Koperasi POS API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      categories: "/api/categories",
      members: "/api/members",
      products: "/api/products",
      suppliers: "/api/suppliers",
      sales: "/api/sales",
      purchases: "/api/purchases",
      payments: "/api/payments",
      stock: "/api/stock",
      returns: "/api/returns",
      points: "/api/points", // NEW!
    },
    documentation: "See README.md for API documentation",
  });
});

module.exports = router;
