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
const path = require("path");

// ============================================
// ✅ CORS CONFIGURATION (Multi-Origin)
// ============================================
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
      return callback(new Error("Wildcard CORS not allowed in production"));
    }
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
  exposedHeaders: ["Content-Range", "X-Content-Range", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  maxAge: 86400,
};

// ============================================
// ✅ PRODUCTION-READY RATE LIMITING
// ============================================
const rateLimit = require("express-rate-limit");

// Get rate limit config from env or use defaults
const isDevelopment = process.env.NODE_ENV !== "production";
const GLOBAL_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const GLOBAL_MAX_REQUESTS = parseInt(
  isDevelopment
    ? process.env.RATE_LIMIT_MAX_REQUESTS_DEV || 1000 // 1000 for dev
    : process.env.RATE_LIMIT_MAX_REQUESTS || 100 // 100 for prod
);

// Whitelist for development (localhost IPs)
const DEV_WHITELIST = ["::1", "127.0.0.1", "::ffff:127.0.0.1"];

// Skip rate limiting function
const skipRateLimitCheck = (req) => {
  // Always skip health check
  if (req.path === "/api/health") return true;

  // Skip for whitelisted IPs in development
  if (isDevelopment && DEV_WHITELIST.includes(req.ip)) {
    return true;
  }

  return false;
};

// Global rate limiter - applies to all API routes
const globalLimiter = rateLimit({
  windowMs: GLOBAL_WINDOW_MS,
  max: GLOBAL_MAX_REQUESTS,
  message: {
    success: false,
    message: "Terlalu banyak request dari IP ini, silakan coba lagi nanti.",
    retryAfter: Math.ceil(GLOBAL_WINDOW_MS / 1000), // seconds
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skip: skipRateLimitCheck,
  // Custom handler to add retry info
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000;
    res.status(429).json({
      success: false,
      message: "Terlalu banyak request. Silakan tunggu beberapa saat.",
      retryAfter: Math.ceil(retryAfter),
      limit: GLOBAL_MAX_REQUESTS,
      windowMs: GLOBAL_WINDOW_MS,
    });
  },
});

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 15, // More lenient in dev
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
  },
  skipSuccessfulRequests: true,
  skip: skipRateLimitCheck,
});

// Moderate rate limiter for write operations (POST, PUT, DELETE)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 500 : 200, // 200 writes per 15 min in production
  message: {
    success: false,
    message: "Terlalu banyak operasi perubahan data. Silakan tunggu sebentar.",
  },
  skip: skipRateLimitCheck,
});

// Lenient rate limiter for read operations (GET)
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 2000 : 500, // 500 reads per 15 min in production
  message: {
    success: false,
    message: "Terlalu banyak request data. Silakan tunggu sebentar.",
  },
  skip: skipRateLimitCheck,
});

// ============================================
// ✅ REQUEST TIMEOUT MIDDLEWARE
// ============================================
const timeout = require("connect-timeout");
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
app.use(timeout(REQUEST_TIMEOUT));

// Apply global rate limiting
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(haltOnTimedout);
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

 //image
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "../storage/uploads"))
  );

  app.use((req, res, next) => {
    res.setHeader("ngrok-skip-browser-warning", "true");
    next();
  });


// ============================================
// ROUTES WITH GRANULAR RATE LIMITING
// ============================================

// Auth routes - strictest limits
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Write operations - moderate limits
app.use("/api/categories", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/products", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/suppliers", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/members", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/sales", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/purchases", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/payments", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/stock", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/returns", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/points", (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

app.use("/api/reports", readLimiter); // Reports are mostly read-only

// Mount all routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Koperasi POS API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
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

// Timeout error handler
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

    await testConnection();

    // const syncOptions = {
    //   alter: process.env.NODE_ENV !== "production",
    // };

    // await sequelize.sync(syncOptions);
    await sequelize.sync();



    if (process.env.NODE_ENV === "production") {
      console.log("✅ Database synced (production mode - no schema changes)");
    } else {
      console.log("✅ Database synced (development mode - schema updated)");
      console.log("⚠️  ALTER mode ON - Database schema updated");
    }

    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(70));
      console.log("✅ SERVER READY!");
      console.log("=".repeat(70));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔒 CORS Origins: ${allowedOrigins.join(", ")}`);
      console.log(`⏱️  Request Timeout: ${REQUEST_TIMEOUT / 1000}s`);
      console.log(`🛡️  Rate Limits (${isDevelopment ? "DEVELOPMENT" : "PRODUCTION"}):`);
      console.log(`    - Global: ${GLOBAL_MAX_REQUESTS} req/${GLOBAL_WINDOW_MS / 60000} min`);
      console.log(`    - Auth: ${isDevelopment ? 50 : 5} req/15 min`);
      console.log(`    - Write: ${isDevelopment ? 500 : 200} req/15 min`);
      console.log(`    - Read: ${isDevelopment ? 2000 : 500} req/15 min`);
      if (isDevelopment) {
        console.log(`    - Localhost (${DEV_WHITELIST.join(", ")}): UNLIMITED ✨`);
      }
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

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED PROMISE REJECTION:", err);
  console.error("🔄 Shutting down server...");
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

startServer();
