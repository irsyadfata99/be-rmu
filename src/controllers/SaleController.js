// ============================================
// src/controllers/SaleController.js (COMPLETE WITH POINTS - FIXED)
// ✅ FIXED: Transaction deadlock dengan proper transaction passing
// ✅ FIXED: searchByInvoice method menjadi static
// ============================================
const { Sale, SaleItem } = require("../models");
const Product = require("../models/Product");
const Member = require("../models/Member");
const User = require("../models/User");
const { MemberDebt } = require("../models/MemberDebt");
const { StockMovement } = require("../models/StockMovement");
const PointTransaction = require("../models/PointTransaction");
const ApiResponse = require("../utils/response");
const { generateInvoiceNumber } = require("../utils/invoiceGenerator");
const {
  generateDotMatrixInvoice,
  generateThermalReceipt,
} = require("../utils/printFormatter");
const { calculateTransactionPoints } = require("../utils/pointCalculator");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class SaleController {
  // ============================================
  // POST /api/sales - Create Sale Transaction (WITH POINTS!)
  // ✅ FIXED: Proper transaction handling untuk prevent deadlock
  // ============================================
  static async create(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const {
        memberId,
        saleType = "TUNAI",
        items,
        discountPercentage = 0,
        discountAmount = 0,
        dpAmount = 0,
        paymentReceived = 0,
        dueDate,
        notes,
      } = req.body;

      const userId = req.user.id;

      // ===== VALIDATION =====
      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item transaksi harus diisi", 422);
      }

      if (saleType === "KREDIT" && !memberId) {
        await t.rollback();
        return ApiResponse.error(
          res,
          "Member harus dipilih untuk transaksi kredit",
          422
        );
      }

      if (notes && notes.length > 500) {
        await t.rollback();
        return ApiResponse.error(res, "Catatan maksimal 500 karakter", 422);
      }

      // Get member (if exists)
      let member = null;
      if (memberId) {
        member = await Member.findByPk(memberId, { transaction: t });
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
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });

        if (!product) {
          await t.rollback();
          return ApiResponse.error(
            res,
            `Produk tidak ditemukan: ${item.productId}`,
            404
          );
        }

        if (!product.isActive) {
          await t.rollback();
          return ApiResponse.error(
            res,
            `Produk tidak aktif: ${product.name}`,
            400
          );
        }

        if (product.stock < item.quantity) {
          await t.rollback();
          return ApiResponse.error(
            res,
            `Stok tidak cukup untuk ${product.name}. Tersedia: ${product.stock}, Diminta: ${item.quantity}`,
            400
          );
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

      // ===== CALCULATE POINTS =====
      const pointsResult = member
        ? await calculateTransactionPoints(processedItems)
        : {
            totalPoints: 0,
            itemsWithPoints: processedItems.map((i) => ({
              ...i,
              pointsEarned: 0,
            })),
          };
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
          return ApiResponse.error(
            res,
            `Pembayaran kurang. Total: ${finalAmount}, Diterima: ${paymentReceived}`,
            400
          );
        }
        changeAmount = paymentReceived - finalAmount;
      } else {
        remainingDebt = finalAmount - dpAmount;
        if (dpAmount > finalAmount) {
          await t.rollback();
          return ApiResponse.error(
            res,
            "DP tidak boleh lebih besar dari total",
            400
          );
        }
        if (!dueDate) {
          await t.rollback();
          return ApiResponse.error(
            res,
            "Jatuh tempo harus diisi untuk transaksi kredit",
            422
          );
        }
      }

      // ===== GENERATE INVOICE NUMBER =====
      const invoiceNumber = await generateInvoiceNumber(
        saleType,
        new Date(),
        t
      );

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
          status:
            saleType === "TUNAI"
              ? "PAID"
              : dpAmount >= finalAmount
              ? "PAID"
              : dpAmount > 0
              ? "PARTIAL"
              : "PENDING",
          notes,
        },
        { transaction: t }
      );

      // ===== CREATE SALE ITEMS & UPDATE STOCK =====
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
            pointsEarned: item.pointsEarned,
          },
          { transaction: t }
        );

        // ===== UPDATE PRODUCT STOCK =====
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });

        // ✅ CRITICAL FIX: Store stock BEFORE reduction
        const quantityBefore = product.stock;

        // ✅ CRITICAL FIX: Pass transaction to reduceStock
        await product.reduceStock(item.quantity, t);

        // ✅ CRITICAL FIX: Get stock AFTER reduction
        const quantityAfter = product.stock;

        // ===== RECORD STOCK MOVEMENT =====
        await StockMovement.create(
          {
            productId: item.productId,
            type: "OUT",
            quantity: -item.quantity,
            quantityBefore: quantityBefore,
            quantityAfter: quantityAfter,
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

      // ===== RECORD POINTS =====
      if (member && totalPointsEarned > 0) {
        await PointTransaction.recordEarn(
          member.id,
          sale.id,
          totalPointsEarned,
          `Pembelian ${invoiceNumber} - ${totalPointsEarned} point`,
          t
        );
      }

      // ===== UPDATE MEMBER STATS =====
      if (member) {
        member.totalTransactions += 1;
        member.monthlySpending =
          parseFloat(member.monthlySpending) + finalAmount;
        await member.save({ transaction: t });
      }

      // ✅ COMMIT TRANSACTION
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
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "whatsapp",
              "totalPoints",
            ],
          },
        ],
      });

      console.log(
        `✅ Sale created: ${
          sale.invoiceNumber
        } - ${saleType} - Rp ${finalAmount.toLocaleString(
          "id-ID"
        )} - ${totalPointsEarned} points`
      );

      return ApiResponse.created(
        res,
        completeSale,
        "Transaksi berhasil dibuat"
      );
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
      const {
        page = 1,
        limit = 10,
        search = "",
        saleType,
        status,
        memberId,
        startDate,
        endDate,
        sortBy = "saleDate",
        sortOrder = "DESC",
      } = req.query;

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
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        rows,
        pagination,
        "Penjualan berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/search/:invoiceNumber - Search Sale by Invoice
  // ✅ FIXED: Made static method
  // ============================================
  static async searchByInvoice(req, res, next) {
    try {
      const { invoiceNumber } = req.params;

      const sale = await Sale.findOne({
        where: { invoiceNumber },
        include: [
          {
            model: SaleItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "name", "unit"],
              },
            ],
          },
          {
            model: Member,
            as: "member",
            attributes: ["id", "fullName", "whatsapp"],
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi penjualan tidak ditemukan");
      }

      // Format response
      const formattedSale = {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        finalAmount: sale.finalAmount,
        paymentStatus: sale.status,
        member: sale.member,
        items: sale.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          unit: item.product.unit,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          subtotal: item.subtotal,
        })),
      };

      return ApiResponse.success(
        res,
        formattedSale,
        "Transaksi penjualan ditemukan"
      );
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
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "whatsapp",
              "address",
              "totalPoints",
            ],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
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

      return ApiResponse.success(
        res,
        sale,
        "Detail transaksi berhasil diambil"
      );
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
        where: whereClause,
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

      return ApiResponse.success(
        res,
        stats,
        "Statistik penjualan berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/:id/print/invoice - Print Dot Matrix (KREDIT)
  // ✅ AUTO PRINT
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
          {
            model: User,
            as: "user",
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi tidak ditemukan");
      }

      const html = await generateDotMatrixInvoice({
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        member: sale.member,
        items: sale.items,
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount,
        finalAmount: sale.finalAmount,
        dpAmount: sale.dpAmount,
        remainingDebt: sale.remainingDebt,
        dueDate: sale.dueDate,
        notes: sale.notes,
      });

      // ✅ ADD: Auto-print script
      const htmlWithPrint = html.replace(
        "</body>",
        `
        <script>
          window.onload = function() {
            // Tunggu sebentar agar halaman fully loaded
            setTimeout(function() {
              window.print();
              
              // Optional: Auto close setelah print/cancel
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      `
      );

      res.setHeader("Content-Type", "text/html");
      res.send(htmlWithPrint);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/sales/:id/print/thermal - Print Thermal (TUNAI)
  // ✅ AUTO PRINT
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
          {
            model: User,
            as: "user",
          },
        ],
      });

      if (!sale) {
        return ApiResponse.notFound(res, "Transaksi tidak ditemukan");
      }

      const html = await generateThermalReceipt({
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        member: sale.member,
        user: sale.user,
        items: sale.items,
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount,
        finalAmount: sale.finalAmount,
        paymentReceived: sale.paymentReceived,
        changeAmount: sale.changeAmount,
      });

      // ✅ ADD: Auto-print script
      const htmlWithPrint = html.replace(
        "</body>",
        `
        <script>
          window.onload = function() {
            // Tunggu sebentar agar halaman fully loaded
            setTimeout(function() {
              window.print();
              
              // Optional: Auto close setelah print/cancel
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      `
      );

      res.setHeader("Content-Type", "text/html");
      res.send(htmlWithPrint);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SaleController;
