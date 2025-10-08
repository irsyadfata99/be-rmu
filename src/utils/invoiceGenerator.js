// ============================================
// src/utils/invoiceGenerator.js
// Utility untuk generate nomor invoice/faktur
// ============================================

/**
 * Generate nomor invoice untuk penjualan
 * Format: MMYY-XXX K/T
 * Contoh: 1024-001 K (Kredit Oktober 2024 nomor 001)
 *         1024-002 T (Tunai Oktober 2024 nomor 002)
 *
 * @param {string} saleType - 'TUNAI' atau 'KREDIT'
 * @param {Date} date - Tanggal transaksi (optional, default: sekarang)
 * @returns {Promise<string>} - Invoice number
 */
async function generateInvoiceNumber(saleType = "TUNAI", date = new Date()) {
  const Sale = require("../models/Sale");
  const { Op } = require("sequelize");

  // Format: MMYY
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const prefix = `${month}${year}`;

  // Suffix: K untuk Kredit, T untuk Tunai
  const suffix = saleType === "KREDIT" ? "K" : "T";

  // Cari invoice terakhir di bulan ini dengan type yang sama
  const lastSale = await Sale.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}-%`,
      },
      saleType: saleType,
    },
    order: [["invoiceNumber", "DESC"]],
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
 * @returns {Promise<string>} - Return number
 */
async function generateReturnNumber() {
  const SalesReturn = require("../models/SalesReturn");
  const { Op } = require("sequelize");

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const lastReturn = await SalesReturn.findOne({
    where: {
      returnNumber: {
        [Op.like]: `RTN-${dateStr}-%`,
      },
    },
    order: [["returnNumber", "DESC"]],
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
 * @returns {Promise<string>} - Purchase order number
 */
async function generatePurchaseNumber() {
  const Purchase = require("../models/Purchase");
  const { Op } = require("sequelize");

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const lastPurchase = await Purchase.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `PO-${dateStr}-%`,
      },
    },
    order: [["invoiceNumber", "DESC"]],
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
 * @returns {Promise<string>} - Payment number
 */
async function generatePaymentNumber() {
  const DebtPayment = require("../models/MemberDebt").DebtPayment;
  const { Op } = require("sequelize");

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const lastPayment = await DebtPayment.findOne({
    where: {
      receiptNumber: {
        [Op.like]: `PAY-${dateStr}-%`,
      },
    },
    order: [["receiptNumber", "DESC"]],
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
