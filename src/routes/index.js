// ============================================
// src/routes/index.js (UPDATED - ADD REPORT ROUTES)
// ============================================
const express = require("express");
const router = express.Router();

// ============================================
// IMPORT ALL ROUTE MODULES
// ============================================
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const memberRoutes = require("./memberRoutes");
const productRoutes = require("./productRoutes");
const supplierRoutes = require("./supplierRoutes");
const saleRoutes = require("./saleRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const paymentRoutes = require("./paymentRoutes");
const stockRoutes = require("./stockRoutes");
const returnRoutes = require("./returnRoutes");
const pointRoutes = require("./pointRoutes");
const reportRoutes = require("./reportRoutes"); // ✨ NEW!
const tagPostRoutes = require("./tagPostRoutes"); // ✨ NEW!
const categoryPostRoutes = require("./categoryPostRoutes"); // ✨ NEW!
const articleRoutes = require("./articleRoutes"); // ✨ NEW!

const uploadArticle = require("../middlewares/uploadArticleImage");
const MediaController = require("../controllers/MediaController");
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

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products/categories", categoryRoutes);
router.use("/members", memberRoutes);
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/sales", saleRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/payments", paymentRoutes);
router.use("/stock", stockRoutes);
router.use("/returns", returnRoutes);
router.use("/points", pointRoutes);
router.use("/reports", reportRoutes); // ✨ NEW!
router.use("/tagPost", tagPostRoutes); // ✨ NEW!
router.use("/categoryPost", categoryPostRoutes); // ✨ NEW!
router.use("/article", articleRoutes); // ✨ NEW!

  router.post(
    "/media/upload",
    uploadArticle.single("file"),   
    MediaController.upload
  );

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
      products: "/api/products",
      suppliers: "/api/suppliers",
      sales: "/api/sales",
      purchases: "/api/purchases",
      payments: "/api/payments",
      stock: "/api/stock",
      returns: "/api/returns",
      points: "/api/points",
      reports: "/api/reports", // ✨ NEW!
    },
    documentation: "See README.md for API documentation",
  });
});

module.exports = router;
