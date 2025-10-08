// ============================================
// src/controllers/SaleController.js (UPDATED WITH POINTS)
// ============================================
const { Sale, SaleItem } = require("../models/Sale");
const Product = require("../models/Product");
const Member = require("../models/Member");
const { MemberDebt } = require("../models/MemberDebt");
const { StockMovement } = require("../models/StockMovement");
const PointTransaction = require("../models/PointTransaction");
const ApiResponse = require("../utils/response");
const { generateInvoiceNumber } = require("../utils/invoiceGenerator");
const { generateDotMatrixInvoice, generateThermalReceipt } = require("../utils/printFormatter");
const { calculateTransactionPoints } = require("../utils/pointCalculator"); // NEW!
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class SaleController {
  // ============================================
  // POST /api/sales - Create Sale Transaction (WITH POINTS!)
  // ============================================
  static async create(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { memberId, saleType = "TUNAI", items, discountPercentage = 0, discountAmount = 0, dpAmount = 0, paymentReceived = 0, dueDate, notes } = req.body;

      const userId = req.user.id;

      // ===== VALIDATION =====
      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item transaksi harus diisi", 422);
      }

      if (saleType === "KREDIT" && !memberId) {
        await t.rollback();
        return ApiResponse.error(res, "Member harus dipilih untuk transaksi kredit", 422);
      }

      // Get member (if exists)
      let member = null;
      if (memberId) {
        member = await Member.findByPk(memberId);
        if (!member) {
          await t.rollback();
          return ApiResponse.error(res, "Member tidak ditemukan", 404);
        }
        if (!member.isActive) {
          await t.rollback();
          return ApiResponse.error(res, "Member tidak aktif", 403);
        }
      }

      // ===== PROCESS ITEMS & CALCULATE TOTALS =====
      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });

        if (!product) {
          await t.rollback();
          return ApiResponse.error(res, `Produk tidak ditemukan: ${item.productId}`, 404);
        }

        if (!product.isActive) {
          await t.rollback();
          return ApiResponse.error(res, `Produk tidak aktif: ${product.name}`, 400);
        }

        if (product.stock < item.quantity) {
          await t.rollback();
          return ApiResponse.error(res, `Stok tidak cukup untuk ${product.name}. Tersedia: ${product.stock}, Diminta: ${item.quantity}`, 400);
        }

        const subtotal = parseFloat(product.sellingPrice) * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          sellingPrice: product.sellingPrice,
          subtotal,
        });
      }

      // ===== CALCULATE POINTS (NEW!) =====
      const pointsResult = member ? await calculateTransactionPoints(processedItems) : { totalPoints: 0, itemsWithPoints: processedItems.map((i) => ({ ...i, pointsEarned: 0 })) };
      const totalPointsEarned = pointsResult.totalPoints;
      const itemsWithPoints = pointsResult.itemsWithPoints;

      // ===== CALCULATE DISCOUNTS & FINAL AMOUNT =====
      let finalDiscountAmount = discountAmount;
      if (discountPercentage > 0) {
        finalDiscountAmount = (totalAmount * discountPercentage) / 100;
      }
      const finalAmount = totalAmount - finalDiscountAmount;

      // ===== VALIDATE PAYMENT =====
      let changeAmount = 0;
      let remainingDebt = 0;

      if (saleType === "TUNAI") {
        if (paymentReceived < finalAmount) {
          await t.rollback();
          return ApiResponse.error(res, `Pembayaran kurang. Total: ${finalAmount}, Diterima: ${paymentReceived}`, 400);
        }
        changeAmount = paymentReceived - finalAmount;
      } else {
        remainingDebt = finalAmount - dpAmount;
        if (dpAmount > finalAmount) {
          await t.rollback();
          return ApiResponse.error(res, "DP tidak boleh lebih besar dari total", 400);
        }
        if (!dueDate) {
          await t.rollback();
          return ApiResponse.error(res, "Jatuh tempo harus diisi untuk transaksi kredit", 422);
        }
      }

      // ===== GENERATE INVOICE NUMBER =====
      const invoiceNumber = await generateInvoiceNumber(saleType);

      // ===== CREATE SALE =====
      const sale = await Sale.create(
        {
          memberId: memberId || null,
          userId,
          invoiceNumber,
          saleDate: new Date(),
          saleType,
          totalAmount,
          discountAmount: finalDiscountAmount,
          discountPercentage,
          finalAmount,
          dpAmount: dpAmount || 0,
          remainingDebt,
          paymentReceived: paymentReceived || 0,
          changeAmount,
          dueDate: dueDate || null,
          status: saleType === "TUNAI" ? "PAID" : dpAmount >= finalAmount ? "PAID" : dpAmount > 0 ? "PARTIAL" : "PENDING",
          notes,
        },
        { transaction: t }
      );

      // ===== CREATE SALE ITEMS (WITH POINTS!) =====
      for (const item of itemsWithPoints) {
        await SaleItem.create(
          {
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            sellingPrice: item.sellingPrice,
            subtotal: item.subtotal,
            pointsEarned: item.pointsEarned, // NEW!
          },
          { transaction: t }
        );

        // ===== UPDATE PRODUCT STOCK =====
        const product = await Product.findByPk(item.productId, { transaction: t });
        await product.reduceStock(item.quantity);

        // ===== RECORD STOCK MOVEMENT =====
        await StockMovement.create(
          {
            productId: item.productId,
            type: "OUT",
            quantity: -item.quantity,
            quantityBefore: product.stock + item.quantity,
            quantityAfter: product.stock,
            referenceType: "SALE",
            referenceId: sale.id,
            notes: `Penjualan ${invoiceNumber}`,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      // ===== CREATE MEMBER DEBT (if KREDIT) =====
      if (saleType === "KREDIT" && remainingDebt > 0) {
        await MemberDebt.create(
          {
            memberId: member.id,
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            totalAmount: finalAmount,
            paidAmount: dpAmount,
            remainingAmount: remainingDebt,
            dueDate: dueDate,
            status: dpAmount > 0 ? "PARTIAL" : "PENDING",
          },
          { transaction: t }
        );

        member.totalDebt = parseFloat(member.totalDebt) + remainingDebt;
        await member.save({ transaction: t });
      }

      // ===== RECORD POINTS (NEW!) =====
      if (member && totalPointsEarned > 0) {
        await PointTransaction.recordEarn(member.id, sale.id, totalPointsEarned, `Pembelian ${invoiceNumber} - ${totalPointsEarned} point`, t);
      }

      // ===== UPDATE MEMBER STATS =====
      if (member) {
        member.totalTransactions += 1;
        member.monthlySpending = parseFloat(member.monthlySpending) + finalAmount;
        await member.save({ transaction: t });
      }

      // Commit transaction
      await t.commit();

      // ===== LOAD COMPLETE DATA FOR RESPONSE =====
      const completeSale = await Sale.findByPk(sale.id, {
        include: [
          {
            model: SaleItem,
            as: "items",
          },
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "whatsapp", "totalPoints"],
          },
        ],
      });

      console.log(`✅ Sale created: ${sale.invoiceNumber} - ${saleType} - Rp ${finalAmount.toLocaleString("id-ID")} - ${totalPointsEarned} points`);

      return ApiResponse.created(res, completeSale, "Transaksi berhasil dibuat");
    } catch (error) {
      await t.rollback();
      console.error("❌ Error creating sale:", error);
      next(error);
    }
  }

  // ... (getAll, getById, printInvoice, printThermal, getStats methods tetap sama seperti sebelumnya)
}

module.exports = SaleController;
