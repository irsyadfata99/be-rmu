// ============================================
// src/utils/pointCalculator.js (NEW)
// Utility untuk menghitung point berdasarkan transaksi
// ============================================

const Setting = require("../models/Setting");
const Product = require("../models/Product");
const Category = require("../models/Category");

/**
 * Calculate points untuk satu item produk
 * @param {object} item - Item object dengan structure: { productId, subtotal, quantity }
 * @param {string} mode - Mode perhitungan: 'GLOBAL' | 'PER_PRODUCT' | 'PER_CATEGORY'
 * @param {number} globalRate - Rate global (Rp per 1 point, default: 1000)
 * @param {string} rounding - Rounding method: 'UP' | 'DOWN' | 'NEAREST'
 * @returns {Promise<number>} - Points earned
 */
async function calculateItemPoints(item, mode, globalRate, rounding) {
  let points = 0;

  switch (mode) {
    case "GLOBAL":
      // Simple: subtotal / globalRate
      points = item.subtotal / globalRate;
      break;

    case "PER_PRODUCT":
      // Get product to check pointsPerUnit
      const product = await Product.findByPk(item.productId, {
        attributes: ["id", "pointsPerUnit"],
      });

      if (product && product.pointsPerUnit > 0) {
        // Points = quantity * pointsPerUnit
        points = item.quantity * parseFloat(product.pointsPerUnit);
      } else {
        // Fallback to global if product doesn't have pointsPerUnit
        points = item.subtotal / globalRate;
      }
      break;

    case "PER_CATEGORY":
      // Get product with category to check multiplier
      const productWithCat = await Product.findByPk(item.productId, {
        attributes: ["id", "categoryId"],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "pointsMultiplier"],
          },
        ],
      });

      if (productWithCat && productWithCat.category) {
        const basePoints = item.subtotal / globalRate;
        const multiplier = parseFloat(productWithCat.category.pointsMultiplier) || 1.0;
        points = basePoints * multiplier;
      } else {
        // Fallback to global
        points = item.subtotal / globalRate;
      }
      break;

    default:
      // Default to GLOBAL
      points = item.subtotal / globalRate;
  }

  // Apply rounding
  return applyRounding(points, rounding);
}

/**
 * Apply rounding method to points
 * @param {number} points - Raw points (decimal)
 * @param {string} rounding - 'UP' | 'DOWN' | 'NEAREST'
 * @returns {number} - Rounded points
 */
function applyRounding(points, rounding) {
  switch (rounding.toUpperCase()) {
    case "UP":
      return Math.ceil(points);
    case "DOWN":
      return Math.floor(points);
    case "NEAREST":
      return Math.round(points);
    default:
      return Math.floor(points); // Default to DOWN
  }
}

/**
 * Calculate total points untuk seluruh transaksi
 * @param {array} items - Array of items dengan structure: [{ productId, quantity, sellingPrice, subtotal }]
 * @returns {Promise<object>} - { totalPoints, itemsWithPoints: [...] }
 */
async function calculateTransactionPoints(items) {
  // Get point settings
  const pointEnabled = await Setting.get("point_enabled", true);

  // If point system disabled, return 0
  if (!pointEnabled) {
    return {
      totalPoints: 0,
      itemsWithPoints: items.map((item) => ({
        ...item,
        pointsEarned: 0,
      })),
    };
  }

  const mode = (await Setting.get("point_system_mode", "GLOBAL")).toUpperCase();
  const globalRate = parseFloat(await Setting.get("point_per_amount", 1000));
  const rounding = (await Setting.get("point_decimal_rounding", "DOWN")).toUpperCase();
  const minTransaction = parseFloat(await Setting.get("min_transaction_for_points", 0));

  // Calculate total transaction amount
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

  // Check minimum transaction
  if (totalAmount < minTransaction) {
    return {
      totalPoints: 0,
      itemsWithPoints: items.map((item) => ({
        ...item,
        pointsEarned: 0,
      })),
      reason: `Minimum transaksi untuk dapat point: Rp ${minTransaction.toLocaleString("id-ID")}`,
    };
  }

  // Calculate points for each item
  const itemsWithPoints = [];
  let totalPoints = 0;

  for (const item of items) {
    const itemPoints = await calculateItemPoints(item, mode, globalRate, rounding);

    itemsWithPoints.push({
      ...item,
      pointsEarned: itemPoints,
    });

    totalPoints += itemPoints;
  }

  return {
    totalPoints,
    itemsWithPoints,
    calculationMode: mode,
    globalRate,
    rounding,
  };
}

/**
 * Calculate points yang bisa ditukar dengan uang
 * Biasanya 1 point = Rp tertentu untuk discount
 * @param {number} points - Jumlah point yang akan ditukar
 * @param {number} exchangeRate - Rate penukaran (default: 1 point = Rp 1000)
 * @returns {number} - Nilai rupiah
 */
function calculatePointValue(points, exchangeRate = 1000) {
  return points * exchangeRate;
}

/**
 * Calculate berapa point yang dibutuhkan untuk mendapat discount tertentu
 * @param {number} discountAmount - Jumlah discount yang diinginkan (Rp)
 * @param {number} exchangeRate - Rate penukaran (default: 1 point = Rp 1000)
 * @returns {number} - Jumlah point yang dibutuhkan
 */
function calculatePointsNeeded(discountAmount, exchangeRate = 1000) {
  return Math.ceil(discountAmount / exchangeRate);
}

/**
 * Validate point redemption (penukaran point)
 * @param {number} memberPoints - Total point member saat ini
 * @param {number} pointsToRedeem - Point yang ingin ditukar
 * @param {number} transactionAmount - Total transaksi (Rp)
 * @returns {object} - { valid, message, discountAmount }
 */
function validatePointRedemption(memberPoints, pointsToRedeem, transactionAmount) {
  // Check if member has enough points
  if (pointsToRedeem > memberPoints) {
    return {
      valid: false,
      message: `Point tidak cukup. Tersedia: ${memberPoints}, Diminta: ${pointsToRedeem}`,
      discountAmount: 0,
    };
  }

  // Calculate discount amount
  const discountAmount = calculatePointValue(pointsToRedeem);

  // Check if discount doesn't exceed transaction amount
  if (discountAmount > transactionAmount) {
    return {
      valid: false,
      message: `Discount melebihi total transaksi. Max point: ${calculatePointsNeeded(transactionAmount)}`,
      discountAmount: 0,
    };
  }

  return {
    valid: true,
    message: "Point redemption valid",
    discountAmount,
  };
}

/**
 * Get point calculation preview (untuk ditampilkan ke kasir sebelum checkout)
 * @param {array} items - Cart items
 * @returns {Promise<object>} - Preview calculation
 */
async function getPointPreview(items) {
  const result = await calculateTransactionPoints(items);

  return {
    totalPoints: result.totalPoints,
    mode: result.calculationMode,
    breakdown: result.itemsWithPoints.map((item) => ({
      productId: item.productId,
      productName: item.productName || "Unknown",
      quantity: item.quantity,
      subtotal: item.subtotal,
      pointsEarned: item.pointsEarned,
    })),
    settings: {
      mode: result.calculationMode,
      globalRate: result.globalRate,
      rounding: result.rounding,
    },
  };
}

module.exports = {
  calculateTransactionPoints,
  calculateItemPoints,
  calculatePointValue,
  calculatePointsNeeded,
  validatePointRedemption,
  getPointPreview,
  applyRounding,
};
