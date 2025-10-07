// ============================================
// 5. Update src/routes/index.js
// ============================================
const express = require("express");
const router = express.Router();

// Import routes
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");

// Use routes
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
