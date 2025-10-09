const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();
const { testConnection, sequelize } = require("./config/database");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const app = express();
const PORT = process.env.PORT || 8000;
// ============================================
// ✅ FIX 1: CORS CONFIGURATION (Multi-Origin)
// ============================================
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173"];
const corsOptions = {
  origin: function (origin, callback) {
    // ✅ FIXED: Prevent wildcard in production
    if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
      return callback(new Error("Wildcard CORS not allowed in production"));
    }
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
};
// ============================================
// ✅ FIX 2: RATE LIMITING MIDDLEWARE
// ============================================
const rateLimit = require("express-rate-limit");
// Global rate limiter (100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Don't rate limit health check
    return req.path === "/api/health";
  },
});
// Stricter rate limiter for auth endpoints (5 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});
// ============================================
// ✅ FIX 3: REQUEST TIMEOUT MIDDLEWARE
// ============================================
const timeout = require("connect-timeout");
// Set timeout to 30 seconds for all requests
const REQUEST_TIMEOUT = 30000; // 30 seconds
function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}
// ============================================
// MIDDLEWARES
// ============================================
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));
// ✅ FIX 3: Apply timeout middleware
app.use(timeout(REQUEST_TIMEOUT));
// ✅ FIX 2: Apply global rate limiting
app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Check timeout after each middleware
app.use(haltOnTimedout);
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
// ============================================
// ROUTES
// ============================================
// ✅ FIX 2: Apply stricter rate limiting to auth routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", routes);
// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Koperasi POS API is running",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      docs: "/api",
    },
  });
});
// ============================================
// ERROR HANDLERS
// ============================================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});
// ✅ FIX 3: Timeout error handler
app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(503).json({
      success: false,
      message: "Request timeout - server took too long to respond",
      error: "SERVICE_TIMEOUT",
    });
  }
  next(err);
});
// Global error handler (must be last)
app.use(errorHandler);
// ============================================
// START SERVER
// ============================================
const startServer = async () => {
  try {
    console.log("=".repeat(70));
    console.log("🚀 STARTING KOPERASI POS BACKEND");
    console.log("=".repeat(70));
    // Test database connection
    await testConnection();

    // ✅ FIX: Set alter to FALSE in production
    const syncOptions = {
      alter: process.env.NODE_ENV !== "production", // Only alter in dev
    };

    await sequelize.sync(syncOptions);

    if (process.env.NODE_ENV === "production") {
      console.log("✅ Database synced (production mode - no schema changes)");
    } else {
      console.log("✅ Database synced (development mode - schema updated)");
      console.log("⚠️  ALTER mode ON - Database schema updated");
    }

    // Start listening
    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(70));
      console.log("✅ SERVER READY!");
      console.log("=".repeat(70));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 CORS Origins: ${allowedOrigins.join(", ")}`);
      console.log(`⏱️  Request Timeout: ${REQUEST_TIMEOUT / 1000}s`);
      console.log(`🛡️  Rate Limit: 100 req/15min (Global), 5 req/15min (Auth)`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=".repeat(70));
      console.log("\n💡 Ready to accept requests!\n");
    });
  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ FAILED TO START SERVER");
    console.error("=".repeat(70));
    console.error(error);
    console.error("=".repeat(70) + "\n");
    process.exit(1);
  }
};
// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED PROMISE REJECTION:", err);
  console.error("🔄 Shutting down server...");
  process.exit(1);
});
// Handle SIGTERM
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});
startServer();
