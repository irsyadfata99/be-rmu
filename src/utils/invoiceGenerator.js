// ============================================
// src/utils/invoiceGenerator.js
// Utility untuk generate nomor invoice/faktur
// FIXED: Race condition dengan database transaction lock
// ============================================

/**
 * Generate nomor invoice untuk penjualan
 * Format: MMYY-XXX K/T
 * Contoh: 1024-001 K (Kredit Oktober 2024 nomor 001)
 *         1024-002 T (Tunai Oktober 2024 nomor 002)
 *
 * @param {string} saleType - 'TUNAI' atau 'KREDIT'
 * @param {Date} date - Tanggal transaksi (optional, default: sekarang)
 * @param {object} transaction - Sequelize transaction (REQUIRED for lock)
 * @returns {Promise<string>} - Invoice number
 */
async function generateInvoiceNumber(
  saleType = "TUNAI",
  date = new Date(),
  transaction = null
) {
  const Sale = require("../models/Sale");
  const { sequelize } = require("../config/database");
  const { Op } = require("sequelize");

  // ✅ FIX: Jika tidak ada transaction, throw error
  if (!transaction) {
    throw new Error(
      "Transaction is required for generateInvoiceNumber to prevent race condition"
    );
  }

  // Format: MMYY
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const prefix = `${month}${year}`;

  // Suffix: K untuk Kredit, T untuk Tunai
  const suffix = saleType === "KREDIT" ? "K" : "T";

  // ✅ FIX: Use FOR UPDATE lock untuk prevent race condition
  const lastSale = await Sale.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}-%`,
      },
      saleType: saleType,
    },
    order: [["invoiceNumber", "DESC"]],
    lock: transaction.LOCK.UPDATE, // ✅ CRITICAL: Database lock
    transaction: transaction,
  });

  let nextNumber = 1;

  if (lastSale) {
    // Extract number dari invoice (contoh: 1024-001 K -> 001)
    const parts = lastSale.invoiceNumber.split(" ");
    const numberPart = parts[0].split("-")[1];
    const lastNumber = parseInt(numberPart) || 0;
    nextNumber = lastNumber + 1;
  }

  // Format: MMYY-XXX K/T
  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${prefix}-${paddedNumber} ${suffix}`;
}

/**
 * Generate nomor retur penjualan
 * Format: RTN-YYYYMMDD-XXX
 * Contoh: RTN-20241008-001
 *
 * @param {object} transaction - Sequelize transaction (REQUIRED)
 * @returns {Promise<string>} - Return number
 */
async function generateReturnNumber(transaction = null) {
  const { SalesReturn } = require("../models/SalesReturn");
  const { Op } = require("sequelize");

  // ✅ FIX: Require transaction
  if (!transaction) {
    throw new Error(
      "Transaction is required for generateReturnNumber to prevent race condition"
    );
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // ✅ FIX: Use FOR UPDATE lock
  const lastReturn = await SalesReturn.findOne({
    where: {
      returnNumber: {
        [Op.like]: `RTN-${dateStr}-%`,
      },
    },
    order: [["returnNumber", "DESC"]],
    lock: transaction.LOCK.UPDATE,
    transaction: transaction,
  });

  let nextNumber = 1;

  if (lastReturn) {
    const lastNumber = parseInt(lastReturn.returnNumber.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `RTN-${dateStr}-${paddedNumber}`;
}

/**
 * Generate nomor pembelian
 * Format: PO-YYYYMMDD-XXX
 * Contoh: PO-20241008-001
 *
 * @param {object} transaction - Sequelize transaction (REQUIRED)
 * @returns {Promise<string>} - Purchase order number
 */
async function generatePurchaseNumber(transaction = null) {
  const Purchase = require("../models/Purchase");
  const { Op } = require("sequelize");

  // ✅ FIX: Require transaction
  if (!transaction) {
    throw new Error(
      "Transaction is required for generatePurchaseNumber to prevent race condition"
    );
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // ✅ FIX: Use FOR UPDATE lock
  const lastPurchase = await Purchase.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `PO-${dateStr}-%`,
      },
    },
    order: [["invoiceNumber", "DESC"]],
    lock: transaction.LOCK.UPDATE,
    transaction: transaction,
  });

  let nextNumber = 1;

  if (lastPurchase) {
    const lastNumber = parseInt(lastPurchase.invoiceNumber.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `PO-${dateStr}-${paddedNumber}`;
}

/**
 * Generate nomor pembayaran hutang
 * Format: PAY-YYYYMMDD-XXX
 * Contoh: PAY-20241008-001
 *
 * @param {object} transaction - Sequelize transaction (REQUIRED)
 * @returns {Promise<string>} - Payment number
 */
async function generatePaymentNumber(transaction = null) {
  const { DebtPayment } = require("../models/MemberDebt");
  const { Op } = require("sequelize");

  // ✅ FIX: Require transaction
  if (!transaction) {
    throw new Error(
      "Transaction is required for generatePaymentNumber to prevent race condition"
    );
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // ✅ FIX: Use FOR UPDATE lock
  const lastPayment = await DebtPayment.findOne({
    where: {
      receiptNumber: {
        [Op.like]: `PAY-${dateStr}-%`,
      },
    },
    order: [["receiptNumber", "DESC"]],
    lock: transaction.LOCK.UPDATE,
    transaction: transaction,
  });

  let nextNumber = 1;

  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.receiptNumber.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `PAY-${dateStr}-${paddedNumber}`;
}

/**
 * Parse invoice number untuk extract info
 * @param {string} invoiceNumber - Invoice number to parse
 * @returns {Object} - Parsed info
 */
function parseInvoiceNumber(invoiceNumber) {
  // Format: MMYY-XXX K/T
  const parts = invoiceNumber.split(" ");
  const numberPart = parts[0]; // MMYY-XXX
  const typePart = parts[1]; // K/T

  const [datePrefix, sequence] = numberPart.split("-");
  const month = datePrefix.substring(0, 2);
  const year = "20" + datePrefix.substring(2, 4);

  return {
    month,
    year,
    sequence,
    type: typePart === "K" ? "KREDIT" : "TUNAI",
    fullNumber: invoiceNumber,
  };
}

module.exports = {
  generateInvoiceNumber,
  generateReturnNumber,
  generatePurchaseNumber,
  generatePaymentNumber,
  parseInvoiceNumber,
};
