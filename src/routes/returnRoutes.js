// ============================================
// src/routes/returnRoutes.js (WITH VALIDATIONS)
// ============================================
const express = require("express");
const router = express.Router();
const ReturnController = require("../controllers/ReturnController");
const { authenticate, authorize } = require("../middlewares/auth");
const {
  createPurchaseReturnSchema,
  createSalesReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
  validate,
} = require("../validations/returnValidation");

// ============================================
// STATISTICS
// ============================================
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReturnController.getStats
);

// ============================================
// PURCHASE RETURNS
// ============================================
router.get(
  "/purchases",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReturnController.getPurchaseReturns
);

router.get(
  "/purchases/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReturnController.getPurchaseReturnById
);

// ✅ WITH VALIDATION
router.post(
  "/purchases",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  validate(createPurchaseReturnSchema),
  ReturnController.createPurchaseReturn
);

// ✅ WITH VALIDATION
router.patch(
  "/purchases/:id/approve",
  authenticate,
  authorize(["ADMIN"]),
  validate(approveReturnSchema),
  ReturnController.approvePurchaseReturn
);

// ✅ WITH VALIDATION
router.patch(
  "/purchases/:id/reject",
  authenticate,
  authorize(["ADMIN"]),
  validate(rejectReturnSchema),
  ReturnController.rejectPurchaseReturn
);

// ============================================
// SALES RETURNS
// ============================================
router.get(
  "/sales",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReturnController.getSalesReturns
);

router.get(
  "/sales/:id",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  ReturnController.getSalesReturnById
);

// ✅ WITH VALIDATION
router.post(
  "/sales",
  authenticate,
  authorize(["ADMIN", "KASIR"]),
  validate(createSalesReturnSchema),
  ReturnController.createSalesReturn
);

// ✅ WITH VALIDATION
router.patch(
  "/sales/:id/approve",
  authenticate,
  authorize(["ADMIN"]),
  validate(approveReturnSchema),
  ReturnController.approveSalesReturn
);

// ✅ WITH VALIDATION
router.patch(
  "/sales/:id/reject",
  authenticate,
  authorize(["ADMIN"]),
  validate(rejectReturnSchema),
  ReturnController.rejectSalesReturn
);

module.exports = router;
