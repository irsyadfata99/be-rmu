// ============================================
// src/routes/member.routes.js - SECURED VERSION
// Routes untuk member management dengan rate limiting
// ============================================
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const MemberController = require("../controllers/MemberController");
const { authenticate, authorize } = require("../middlewares/auth");

// ============================================
// ✅ RATE LIMITERS FOR PUBLIC MEMBER ENDPOINTS
// ============================================

/**
 * Rate limiter untuk registrasi member baru
 * LENIENT - karena 1 orang = 1 IP = sekali daftar
 * Tapi tetap ada limit untuk prevent accidental spam/bot
 */
const memberRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5, // Max 5 registrasi per jam per IP (normal user cuma 1x, ini buffer untuk retry)
  message: {
    success: false,
    message: "Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // ✅ IMPORTANT: Hanya hitung yang sukses (gagal validasi tidak dihitung)
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Anda sudah terlalu banyak mencoba mendaftar. Silakan tunggu 1 jam atau hubungi admin jika ada masalah.",
      retryAfter: 3600, // seconds
    });
  },
});

/**
 * Rate limiter untuk pencarian member
 * MODERATE - karena endpoint ini bisa dipanggil berkali-kali
 * saat kasir cek member sebelum transaksi
 */
const memberSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // 100 pencarian per 15 menit (cukup untuk kasir yang sibuk)
  message: {
    success: false,
    message: "Terlalu banyak pencarian member. Silakan tunggu sebentar.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Hitung semua request (sukses atau gagal)
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Terlalu banyak pencarian. Tunggu 15 menit atau hubungi admin.",
      retryAfter: 900, // seconds
    });
  },
});

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/members/register
 * @desc    Register new member (PUBLIC)
 * @access  Public
 * @ratelimit 5 registrations per hour per IP
 */
router.post("/register", memberRegisterLimiter, MemberController.register);

/**
 * @route   GET /api/members/search/:uniqueId
 * @desc    Search member by uniqueId (PUBLIC)
 * @access  Public
 * @ratelimit 100 searches per 15 minutes per IP
 * @note    Digunakan saat kasir mau cek member sebelum transaksi
 */
router.get("/search/:uniqueId", memberSearchLimiter, MemberController.searchByUniqueId);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/members/stats
 * @desc    Get member statistics (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 * @note    MUST be before /:id route to avoid conflict
 */
router.get("/stats", authenticate, authorize(["ADMIN", "KASIR"]), MemberController.getStats);

/**
 * @route   GET /api/members
 * @desc    Get all members with pagination (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/", authenticate, authorize(["ADMIN", "KASIR"]), MemberController.getAll);

/**
 * @route   GET /api/members/:id
 * @desc    Get member by ID (ADMIN/KASIR)
 * @access  Private (ADMIN, KASIR)
 */
router.get("/:id", authenticate, authorize(["ADMIN", "KASIR"]), MemberController.getById);

/**
 * @route   PUT /api/members/:id
 * @desc    Update member (ADMIN only)
 * @access  Private (ADMIN)
 */
router.put("/:id", authenticate, authorize(["ADMIN"]), MemberController.update);

/**
 * @route   DELETE /api/members/:id
 * @desc    Soft delete member (ADMIN only)
 * @access  Private (ADMIN)
 */
router.delete("/:id", authenticate, authorize(["ADMIN"]), MemberController.delete);

/**
 * @route   PATCH /api/members/:id/toggle
 * @desc    Toggle member active status (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch("/:id/toggle", authenticate, authorize(["ADMIN"]), MemberController.toggleActive);

module.exports = router;
