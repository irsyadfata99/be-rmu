// ============================================
// src/routes/index.js
// Main router - menggabungkan semua routes
// ============================================
const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const memberRoutes = require("./memberRoutes");

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

/**
 * @route   /api/members/*
 * @desc    Member management routes
 */
router.use("/members", memberRoutes);

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
    },
    documentation: "See README.md for API documentation",
  });
});

module.exports = router;
