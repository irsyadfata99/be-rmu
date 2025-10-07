// ============================================
// 4. src/routes/authRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const { authenticate, authorize } = require("../middlewares/auth");

// Public routes
router.post("/login", AuthController.login);

// Protected routes
router.get("/me", authenticate, AuthController.me);
router.post("/change-password", authenticate, AuthController.changePassword);

// Admin only - register new user
router.post("/register", authenticate, authorize(["ADMIN"]), AuthController.register);

module.exports = router;
