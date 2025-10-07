// ============================================
// 2. src/middlewares/auth.js
// ============================================
const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/response");
const User = require("../models/User");

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(res, "Token tidak ditemukan", 401);
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return ApiResponse.error(res, "User tidak ditemukan", 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, "User tidak aktif", 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return ApiResponse.error(res, "Token tidak valid", 401);
    }
    if (error.name === "TokenExpiredError") {
      return ApiResponse.error(res, "Token sudah expired", 401);
    }
    next(error);
  }
};

// Middleware to authorize by role
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
      return ApiResponse.error(res, "Anda tidak memiliki akses ke fitur ini", 403);
    }

    next();
  };
};

module.exports = { authenticate, authorize };
