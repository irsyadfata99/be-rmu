// ============================================
// src/routes/auth.routes.js
// Authentication routes
// ============================================
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const { authenticate } = require("../middlewares/auth");

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", AuthController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (Admin only can create users)
 * @access  Private (ADMIN)
 */
router.post("/register", authenticate, AuthController.register);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get("/me", authenticate, AuthController.me);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post("/change-password", authenticate, AuthController.changePassword);

module.exports = router;
