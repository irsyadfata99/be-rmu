// ============================================
// src/server.js (UPDATED - MULTI-ORIGIN CORS)
// ============================================
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
// CORS CONFIGURATION (Multi-Origin Support)
// ============================================
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc)
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
// MIDDLEWARES
// ============================================
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================
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

    // Sync database (create/update tables)
    await sequelize.sync({ alter: true }); // ⚠️ SET TO FALSE IN PRODUCTION!
    console.log("✅ Database synced successfully");
    console.log("⚠️  ALTER mode ON - Database schema updated");

    // Start listening
    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(70));
      console.log("✅ SERVER READY!");
      console.log("=".repeat(70));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 CORS Origins: ${allowedOrigins.join(", ")}`);
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
