// ============================================
// src/middlewares/auth.js - FIXED VERSION
// Authentication & Authorization with Rate Limiting
// ============================================
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const ApiResponse = require("../utils/response");
const User = require("../models/User");

// ============================================
// ✅ FIX: Added Rate Limiting for Authentication Routes
// ============================================

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per 15 minutes per IP
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
    statusCode: 429,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    return ApiResponse.error(res, "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.", 429);
  },
});

/**
 * Rate limiter for general API requests
 * Prevents API abuse
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per 15 minutes per IP
  message: {
    success: false,
    message: "Terlalu banyak request. Silakan coba lagi nanti.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, "Terlalu banyak request. Silakan coba lagi nanti.", 429);
  },
});

/**
 * Rate limiter for sensitive operations (create, update, delete)
 * More restrictive than general API
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 requests per 15 minutes per IP
  message: {
    success: false,
    message: "Terlalu banyak operasi. Silakan coba lagi nanti.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, "Terlalu banyak operasi. Silakan coba lagi nanti.", 429);
  },
});

/**
 * Rate limiter for password reset requests
 * Very restrictive to prevent abuse
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 reset attempts per hour per IP
  message: {
    success: false,
    message: "Terlalu banyak permintaan reset password. Silakan coba lagi dalam 1 jam.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, "Terlalu banyak permintaan reset password. Silakan coba lagi dalam 1 jam.", 429);
  },
});

// ============================================
// Authentication Middleware
// ============================================

/**
 * Middleware to authenticate user via JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(res, "Token tidak ditemukan", 401);
    }

    const token = authHeader.split(" ")[1];

    // ✅ FIX: Added token validation before verification
    if (!token || token === "null" || token === "undefined") {
      return ApiResponse.error(res, "Token tidak valid", 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "JsonWebTokenError") {
        return ApiResponse.error(res, "Token tidak valid", 401);
      }
      if (jwtError.name === "TokenExpiredError") {
        return ApiResponse.error(res, "Token sudah expired", 401);
      }
      throw jwtError;
    }

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return ApiResponse.error(res, "User tidak ditemukan", 401);
    }

    // ✅ FIX: Check if user is active
    if (!user.isActive) {
      return ApiResponse.error(res, "Akun Anda tidak aktif. Hubungi administrator.", 403);
    }

    // ✅ FIX: Check if account is locked
    if (user.isAccountLocked()) {
      const lockDuration = Math.ceil((user.accountLockedUntil - new Date()) / (1000 * 60));
      return ApiResponse.error(res, `Akun Anda terkunci karena terlalu banyak percobaan login gagal. Coba lagi dalam ${lockDuration} menit.`, 403);
    }

    // ✅ FIX: Check if password needs to be changed
    if (user.needsPasswordChange()) {
      // Allow access but add warning header
      res.setHeader("X-Password-Expired", "true");
      res.setHeader("X-Password-Warning", "Password Anda sudah lebih dari 90 hari. Segera ganti password untuk keamanan akun.");
    }

    // ✅ FIX: Add user IP and timestamp to request for audit logging
    req.userIp = req.ip || req.connection.remoteAddress;
    req.authTimestamp = new Date();

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    next(error);
  }
};

// ============================================
// Authorization Middleware
// ============================================

/**
 * Middleware to authorize by role
 * @param {Array<string>} roles - Allowed roles (e.g., ['ADMIN', 'KASIR'])
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, "Unauthorized", 401);
    }

    // If roles array is empty, allow all authenticated users
    if (roles.length === 0) {
      return next();
    }

    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      // ✅ FIX: More descriptive error message
      return ApiResponse.error(res, `Akses ditolak. Fitur ini hanya untuk: ${roles.join(", ")}. Role Anda: ${req.user.role}`, 403);
    }

    next();
  };
};

/**
 * ✅ FIX: Added middleware to check if user can access specific resource
 * Ensures users can only access their own data (unless they're admin)
 * @param {string} paramName - Name of the parameter to check (e.g., 'userId')
 */
const authorizeResourceAccess = (paramName = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, "Unauthorized", 401);
    }

    // Admins can access everything
    if (req.user.role === "ADMIN") {
      return next();
    }

    // Get resource ID from params
    const resourceId = req.params[paramName];

    // Check if user is trying to access their own resource
    if (resourceId && resourceId !== req.user.id) {
      return ApiResponse.error(res, "Anda tidak memiliki akses ke resource ini", 403);
    }

    next();
  };
};

/**
 * ✅ FIX: Added optional authentication middleware
 * Allows both authenticated and unauthenticated access
 * Useful for public endpoints that have different behavior for logged-in users
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token, continue as unauthenticated
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "null" || token === "undefined") {
      return next(); // Invalid token, continue as unauthenticated
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (user && user.isActive && !user.isAccountLocked()) {
        req.user = user;
      }
    } catch (error) {
      // Token verification failed, continue as unauthenticated
      // Don't throw error, just continue
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// Exports
// ============================================

module.exports = {
  authenticate,
  authorize,
  authorizeResourceAccess,
  optionalAuthenticate,
  // Rate limiters
  loginLimiter,
  apiLimiter,
  strictLimiter,
  passwordResetLimiter,
};
