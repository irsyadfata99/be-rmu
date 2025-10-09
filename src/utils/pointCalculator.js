// ============================================
// src/utils/pointCalculator.js - FIXED VERSION
// Point calculator dengan DECIMAL PRECISION fix
// ============================================

const Setting = require("../models/Setting");
const Product = require("../models/Product");
const Category = require("../models/Category");

// ✅ FIX: Added Decimal.js for precise decimal calculations
// This prevents floating point precision errors
const Decimal = require("decimal.js");

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20, // High precision for calculations
  rounding: Decimal.ROUND_HALF_UP,
  toExpPos: 9e15,
  toExpNeg: -9e15,
});

/**
 * ✅ FIX: Helper function to safely convert to Decimal
 * Prevents NaN and handles various input types
 * @param {*} value - Value to convert
 * @param {number} defaultValue - Default value if conversion fails
 * @returns {Decimal}
 */
function toDecimal(value, defaultValue = 0) {
  try {
    if (value === null || value === undefined || value === "") {
      return new Decimal(defaultValue);
    }
    const decimal = new Decimal(value);
    if (decimal.isNaN()) {
      return new Decimal(defaultValue);
    }
    return decimal;
  } catch (error) {
    return new Decimal(defaultValue);
  }
}

/**
 * Calculate points untuk satu item produk
 * @param {object} item - Item object dengan structure: { productId, subtotal, quantity }
 * @param {string} mode - Mode perhitungan: 'GLOBAL' | 'PER_PRODUCT' | 'PER_CATEGORY'
 * @param {number} globalRate - Rate global (Rp per 1 point, default: 1000)
 * @param {string} rounding - Rounding method: 'UP' | 'DOWN' | 'NEAREST'
 * @returns {Promise<number>} - Points earned
 */
async function calculateItemPoints(item, mode, globalRate, rounding) {
  // ✅ FIX: Use Decimal for all calculations
  let points = new Decimal(0);

  // ✅ FIX: Convert all input values to Decimal
  const subtotal = toDecimal(item.subtotal, 0);
  const quantity = toDecimal(item.quantity, 0);
  const rate = toDecimal(globalRate, 1000);

  // Prevent division by zero
  if (rate.equals(0)) {
    return 0;
  }

  switch (mode) {
    case "GLOBAL":
      // ✅ FIX: Use Decimal division for precise calculation
      points = subtotal.dividedBy(rate);
      break;

    case "PER_PRODUCT":
      // Get product to check pointsPerUnit
      const product = await Product.findByPk(item.productId, {
        attributes: ["id", "pointsPerUnit"],
      });

      if (product && product.pointsPerUnit > 0) {
        // ✅ FIX: Use Decimal multiplication
        const pointsPerUnit = toDecimal(product.pointsPerUnit, 0);
        points = quantity.times(pointsPerUnit);
      } else {
        // Fallback to global if product doesn't have pointsPerUnit
        points = subtotal.dividedBy(rate);
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
        // ✅ FIX: Use Decimal for multiplier calculation
        const basePoints = subtotal.dividedBy(rate);
        const multiplier = toDecimal(productWithCat.category.pointsMultiplier, 1.0);
        points = basePoints.times(multiplier);
      } else {
        // Fallback to global
        points = subtotal.dividedBy(rate);
      }
      break;

    default:
      // Default to GLOBAL
      points = subtotal.dividedBy(rate);
  }

  // Apply rounding and convert to number
  return applyRounding(points.toNumber(), rounding);
}

/**
 * Apply rounding method to points
 * @param {number} points - Raw points (decimal)
 * @param {string} rounding - 'UP' | 'DOWN' | 'NEAREST'
 * @returns {number} - Rounded points
 */
function applyRounding(points, rounding) {
  // ✅ FIX: Handle edge cases
  if (isNaN(points) || !isFinite(points)) {
    return 0;
  }

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

  // ✅ FIX: Use Decimal for total amount calculation
  let totalAmount = new Decimal(0);
  for (const item of items) {
    totalAmount = totalAmount.plus(toDecimal(item.subtotal, 0));
  }

  // Convert to number for comparison
  const totalAmountNumber = totalAmount.toNumber();

  // Check minimum transaction
  if (totalAmountNumber < minTransaction) {
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
  // ✅ FIX: Use Decimal for precise multiplication
  const pointsDecimal = toDecimal(points, 0);
  const rateDecimal = toDecimal(exchangeRate, 1000);

  const value = pointsDecimal.times(rateDecimal);

  // ✅ FIX: Round to 2 decimal places for currency
  return Math.round(value.toNumber() * 100) / 100;
}

/**
 * Calculate berapa point yang dibutuhkan untuk mendapat discount tertentu
 * @param {number} discountAmount - Jumlah discount yang diinginkan (Rp)
 * @param {number} exchangeRate - Rate penukaran (default: 1 point = Rp 1000)
 * @returns {number} - Jumlah point yang dibutuhkan
 */
function calculatePointsNeeded(discountAmount, exchangeRate = 1000) {
  // ✅ FIX: Use Decimal for precise division
  const amountDecimal = toDecimal(discountAmount, 0);
  const rateDecimal = toDecimal(exchangeRate, 1000);

  // Prevent division by zero
  if (rateDecimal.equals(0)) {
    return 0;
  }

  const points = amountDecimal.dividedBy(rateDecimal);

  // Always round up for points needed (user needs at least this much)
  return Math.ceil(points.toNumber());
}

/**
 * Validate point redemption (penukaran point)
 * @param {number} memberPoints - Total point member saat ini
 * @param {number} pointsToRedeem - Point yang ingin ditukar
 * @param {number} transactionAmount - Total transaksi (Rp)
 * @returns {object} - { valid, message, discountAmount }
 */
function validatePointRedemption(memberPoints, pointsToRedeem, transactionAmount) {
  // ✅ FIX: Use Decimal for all validations
  const memberPts = toDecimal(memberPoints, 0);
  const redeemPts = toDecimal(pointsToRedeem, 0);
  const txAmount = toDecimal(transactionAmount, 0);

  // Check if member has enough points
  if (redeemPts.greaterThan(memberPts)) {
    return {
      valid: false,
      message: `Point tidak cukup. Tersedia: ${memberPts.toNumber()}, Diminta: ${redeemPts.toNumber()}`,
      discountAmount: 0,
    };
  }

  // Calculate discount amount
  const discountAmount = calculatePointValue(redeemPts.toNumber());
  const discountDecimal = toDecimal(discountAmount, 0);

  // Check if discount doesn't exceed transaction amount
  if (discountDecimal.greaterThan(txAmount)) {
    const maxPoints = calculatePointsNeeded(txAmount.toNumber());
    return {
      valid: false,
      message: `Discount melebihi total transaksi. Max point: ${maxPoints}`,
      discountAmount: 0,
      maxPointsAllowed: maxPoints,
    };
  }

  // ✅ FIX: Check for negative or zero values
  if (redeemPts.lessThanOrEqualTo(0)) {
    return {
      valid: false,
      message: "Point yang ditukar harus lebih dari 0",
      discountAmount: 0,
    };
  }

  return {
    valid: true,
    message: "Point redemption valid",
    discountAmount,
    remainingPoints: memberPts.minus(redeemPts).toNumber(),
    finalAmount: txAmount.minus(discountDecimal).toNumber(),
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

/**
 * ✅ FIX: Added function to validate point calculation inputs
 * @param {array} items - Items to validate
 * @returns {object} - { valid, errors }
 */
function validatePointCalculationInputs(items) {
  const errors = [];

  if (!Array.isArray(items)) {
    errors.push("Items harus berupa array");
    return { valid: false, errors };
  }

  if (items.length === 0) {
    errors.push("Items tidak boleh kosong");
    return { valid: false, errors };
  }

  items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item ${index + 1}: productId harus diisi`);
    }

    if (!item.subtotal || item.subtotal < 0) {
      errors.push(`Item ${index + 1}: subtotal tidak valid`);
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: quantity harus lebih dari 0`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ✅ FIX: Added function to calculate point statistics
 * @param {array} transactions - Array of transactions with points
 * @returns {object} - Statistics
 */
function calculatePointStatistics(transactions) {
  let totalPointsEarned = new Decimal(0);
  let totalPointsRedeemed = new Decimal(0);
  let totalPointsExpired = new Decimal(0);

  for (const tx of transactions) {
    const points = toDecimal(tx.points, 0);

    switch (tx.type) {
      case "EARN":
        totalPointsEarned = totalPointsEarned.plus(points);
        break;
      case "REDEEM":
        totalPointsRedeemed = totalPointsRedeemed.plus(points.abs());
        break;
      case "EXPIRED":
        totalPointsExpired = totalPointsExpired.plus(points.abs());
        break;
    }
  }

  return {
    totalPointsEarned: totalPointsEarned.toNumber(),
    totalPointsRedeemed: totalPointsRedeemed.toNumber(),
    totalPointsExpired: totalPointsExpired.toNumber(),
    netPoints: totalPointsEarned.minus(totalPointsRedeemed).minus(totalPointsExpired).toNumber(),
  };
}

/**
 * ✅ FIX: Added function to format points for display
 * @param {number} points - Points to format
 * @param {boolean} showDecimals - Whether to show decimal places
 * @returns {string} - Formatted string
 */
function formatPoints(points, showDecimals = false) {
  const pointsDecimal = toDecimal(points, 0);

  if (showDecimals) {
    return pointsDecimal.toFixed(2);
  }

  return Math.floor(pointsDecimal.toNumber()).toLocaleString("id-ID");
}

module.exports = {
  calculateTransactionPoints,
  calculateItemPoints,
  calculatePointValue,
  calculatePointsNeeded,
  validatePointRedemption,
  getPointPreview,
  applyRounding,
  validatePointCalculationInputs,
  calculatePointStatistics,
  formatPoints,
  toDecimal, // Export for testing purposes
};
