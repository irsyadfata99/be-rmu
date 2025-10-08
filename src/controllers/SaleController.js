// ============================================
// src/controllers/SaleController.js
// CONTROLLER PALING PENTING! Core business logic POS
// ============================================
const { Sale, SaleItem } = require("../models/Sale");
const Product = require("../models/Product");
const Member = require("../models/Member");
const { MemberDebt } = require("../models/MemberDebt");
const { StockMovement } = require("../models/StockMovement");
const ApiResponse = require("../utils/response");
const { generateInvoiceNumber } = require("../utils/invoiceGenerator");
const { generateDotMatrixInvoice, generateThermalReceipt } = require("../utils/printFormatter");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class SaleController {
  // ============================================
  // POST /api/sales - Create Sale Transaction (CRITICAL!)
  // ============================================
  static async create(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const {
        memberId, // Optional untuk TUNAI
        saleType = "TUNAI", // TUNAI atau KREDIT
        items, // Array of { productId, quantity }
        discountPercentage = 0,
        discountAmount = 0,
        dpAmount = 0, // Down payment (untuk KREDIT)
        paymentReceived = 0, // Uang yang diterima (untuk TUNAI)
        dueDate, // Jatuh tempo (untuk KREDIT)
        notes,
      } = req.body;

      const userId = req.user.id;

      // ===== VALIDATION =====
      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item transaksi harus diisi", 422);
      }

      // Validasi member untuk KREDIT
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
        // KREDIT
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

      // ===== CREATE SALE ITEMS =====
      for (const item of processedItems) {
        await SaleItem.create(
          {
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            sellingPrice: item.sellingPrice,
            subtotal: item.subtotal,
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

      // ===== CREATE MEMBER DEBT (jika KREDIT) =====
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

        // Update member total debt
        member.totalDebt = parseFloat(member.totalDebt) + remainingDebt;
        await member.save({ transaction: t });
      }

      // ===== UPDATE MEMBER STATS =====
      if (member) {
        member.totalTransactions += 1;
        member.monthlySpending = parseFloat(member.monthlySpending) + finalAmount;
        member.totalPoints += Math.floor(finalAmount / 1000); // 1 poin per 1000 rupiah
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
            attributes: ["id", "uniqueId", "fullName", "whatsapp"],
          },
        ],
      });

      console.log(`✅ Sale created: ${sale.invoiceNumber} - ${saleType} - Rp ${finalAmount.toLocaleString("id-ID")}`);

      return ApiResponse.created(res, completeSale, "Transaksi berhasil dibuat");
    } catch (error) {
      await t.rollback();
      console.error("❌ Error creating sale:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/sales - Get All Sales
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", saleType, status, memberId, startDate, endDate, sortBy = "saleDate", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Search by invoice number
      if (search) {
        whereClause.invoiceNumber = {
          [Op.like]: `%${search}%`,
        };
      }

      // Filter by type
      if (saleType) {
        whereClause.saleType = saleType;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by member
      if (memberId) {
        whereClause.memberId = memberId;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.saleDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      } else if (startDate) {
        whereClause.saleDate = {
          [Op.gte]: new Date(startDate),
        };
      } else if (endDate) {
        whereClause.saleDate = {
          [Op.lte]: new Date(endDate),
        };
      }

      const { count, rows } = await Sale.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName"],
          },
        ],
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(res, rows, pagination, "Transaksi penjualan berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/:id - Get Sale Detail
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: "items",
          },
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "whatsapp", "address", "regionCode", "regionName"],
          },
          {
            model: MemberDebt,
            as: "debt",
            required: false,
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi tidak ditemukan");
      }

      return ApiResponse.success(res, sale, "Detail transaksi berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/:id/print/invoice - Print DOT MATRIX (KREDIT)
  // ============================================
  static async printInvoice(req, res, next) {
    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: "items",
          },
          {
            model: Member,
            as: "member",
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi tidak ditemukan");
      }

      // Generate HTML untuk DOT MATRIX
      const html = await generateDotMatrixInvoice({
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        member: sale.member,
        items: sale.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          subtotal: item.subtotal,
        })),
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount,
        finalAmount: sale.finalAmount,
        dpAmount: sale.dpAmount,
        remainingDebt: sale.remainingDebt,
        dueDate: sale.dueDate,
        notes: sale.notes,
      });

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/:id/print/thermal - Print THERMAL (TUNAI)
  // ============================================
  static async printThermal(req, res, next) {
    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: "items",
          },
          {
            model: Member,
            as: "member",
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi tidak ditemukan");
      }

      // Generate HTML untuk THERMAL
      const html = await generateThermalReceipt({
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        member: sale.member,
        user: req.user,
        items: sale.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          subtotal: item.subtotal,
        })),
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount,
        finalAmount: sale.finalAmount,
        paymentReceived: sale.paymentReceived,
        changeAmount: sale.changeAmount,
      });

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/stats - Get Sales Statistics
  // ============================================
  static async getStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.saleDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const totalSales = await Sale.count({ where: whereClause });

      const totalRevenue = await Sale.sum("finalAmount", {
        where: { ...whereClause, status: { [Op.in]: ["PAID", "PARTIAL"] } },
      });

      const tunaiSales = await Sale.count({
        where: { ...whereClause, saleType: "TUNAI" },
      });

      const kreditSales = await Sale.count({
        where: { ...whereClause, saleType: "KREDIT" },
      });

      const pendingDebts = await Sale.sum("remainingDebt", {
        where: {
          ...whereClause,
          saleType: "KREDIT",
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
      });

      const stats = {
        totalSales,
        totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
        tunaiSales,
        kreditSales,
        pendingDebts: parseFloat(pendingDebts || 0).toFixed(2),
      };

      return ApiResponse.success(res, stats, "Statistik penjualan berhasil diambil");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SaleController;
