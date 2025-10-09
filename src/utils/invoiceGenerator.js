// src/utils/invoiceGenerator.js (FIXED - Complete)
const { Op } = require("sequelize");

/**
 * ✅ FIXED: Generate nomor invoice dengan transaction lock
 * Format: MMYY-XXX K/T
 */
async function generateInvoiceNumber(saleType = "TUNAI", date = new Date(), transaction) {
  const Sale = require("../models/Sale");

  // ✅ CRITICAL: Transaction is REQUIRED
  if (!transaction) {
    throw new Error("Transaction parameter is REQUIRED for generateInvoiceNumber to prevent race condition");
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const prefix = `${month}${year}`;
  const suffix = saleType === "KREDIT" ? "K" : "T";

  // ✅ CRITICAL: Use FOR UPDATE lock
  const lastSale = await Sale.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}-%`,
      },
      saleType: saleType,
    },
    order: [["invoiceNumber", "DESC"]],
    lock: transaction.LOCK.UPDATE,
    transaction: transaction,
  });

  let nextNumber = 1;

  if (lastSale) {
    const parts = lastSale.invoiceNumber.split(" ");
    const numberPart = parts[0].split("-")[1];
    const lastNumber = parseInt(numberPart) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${prefix}-${paddedNumber} ${suffix}`;
}

/**
 * ✅ FIXED: Generate nomor pembelian dengan transaction lock
 */
async function generatePurchaseNumber(transaction) {
  const Purchase = require("../models/Purchase");

  if (!transaction) {
    throw new Error("Transaction parameter is REQUIRED for generatePurchaseNumber");
  }

  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

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
 * ✅ FIXED: Generate nomor pembayaran dengan transaction lock
 */
async function generatePaymentNumber(transaction) {
  const { DebtPayment } = require("../models/MemberDebt");

  if (!transaction) {
    throw new Error("Transaction parameter is REQUIRED for generatePaymentNumber");
  }

  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

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
 * Parse invoice number
 */
function parseInvoiceNumber(invoiceNumber) {
  const parts = invoiceNumber.split(" ");
  const numberPart = parts[0];
  const typePart = parts[1];

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
  generatePurchaseNumber,
  generatePaymentNumber,
  parseInvoiceNumber,
};
