// ============================================
// src/middlewares/errorHandler.js
// Global error handler middleware
// ============================================

const ApiResponse = require("../utils/response");

/**
 * Global error handler
 * Harus dipasang paling akhir setelah semua routes
 */
const errorHandler = (err, req, res, next) => {
  console.error("Error occurred:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Sequelize Validation Error
  if (err.name === "SequelizeValidationError") {
    const errors = {};
    err.errors.forEach((error) => {
      if (!errors[error.path]) {
        errors[error.path] = [];
      }
      errors[error.path].push(error.message);
    });

    return ApiResponse.validationError(res, errors, "Validation Error");
  }

  // Sequelize Unique Constraint Error
  if (err.name === "SequelizeUniqueConstraintError") {
    const errors = {};
    err.errors.forEach((error) => {
      if (!errors[error.path]) {
        errors[error.path] = [];
      }
      errors[error.path].push(error.message);
    });

    return ApiResponse.validationError(res, errors, "Data sudah ada");
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return ApiResponse.error(res, "Operasi gagal: Data terkait dengan data lain", 400);
  }

  // JWT Error
  if (err.name === "JsonWebTokenError") {
    return ApiResponse.unauthorized(res, "Token tidak valid");
  }

  if (err.name === "TokenExpiredError") {
    return ApiResponse.unauthorized(res, "Token sudah kadaluarsa");
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
