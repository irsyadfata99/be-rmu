// ============================================
// src/controllers/PurchaseController.js (FIXED - Added searchByInvoice)
// Controller untuk transaksi pembelian (barang masuk)
// ============================================
const {
  Purchase,
  PurchaseItem,
  Product,
  Supplier,
  SupplierDebt,
  StockMovement,
} = require("../models");
const ApiResponse = require("../utils/response");
const { generatePurchaseNumber } = require("../utils/invoiceGenerator");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class PurchaseController {
  // ============================================
  // POST /api/purchases - Create Purchase (Input Barang Masuk)
  // ============================================
  static async create(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const {
        supplierId,
        supplierInvoiceNumber, // Nomor faktur dari supplier (optional)
        purchaseType = "TUNAI", // TUNAI, KREDIT, KONSINYASI
        items, // Array of { productId, quantity, purchasePrice, sellingPrice, expDate }
        paidAmount = 0,
        dueDate, // Untuk KREDIT
        notes,
      } = req.body;

      const userId = req.user.id;

      // ===== VALIDATION =====
      if (!supplierId) {
        await t.rollback();
        return ApiResponse.error(res, "Supplier harus dipilih", 422);
      }

      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item pembelian harus diisi", 422);
      }

      // Get supplier
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        await t.rollback();
        return ApiResponse.error(res, "Supplier tidak ditemukan", 404);
      }

      if (!supplier.isActive) {
        await t.rollback();
        return ApiResponse.error(res, "Supplier tidak aktif", 403);
      }

      // Validasi KREDIT harus punya due date
      if (purchaseType === "KREDIT" && !dueDate) {
        await t.rollback();
        return ApiResponse.error(
          res,
          "Jatuh tempo harus diisi untuk pembelian kredit",
          422
        );
      }

      if (notes && notes.length > 500) {
        await t.rollback();
        return ApiResponse.error(res, "Catatan maksimal 500 karakter", 422);
      }

      // ===== PROCESS ITEMS & CALCULATE TOTAL =====
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

        const subtotal = parseFloat(item.purchasePrice) * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unit: product.unit,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice || product.sellingPrice, // Update harga jual jika ada
          expDate: item.expDate || null,
          subtotal,
        });
      }

      // ===== CALCULATE DEBT =====
      const remainingDebt = totalAmount - paidAmount;

      if (paidAmount > totalAmount) {
        await t.rollback();
        return ApiResponse.error(
          res,
          "Pembayaran tidak boleh lebih besar dari total",
          400
        );
      }

      // ===== GENERATE PURCHASE NUMBER =====
      const invoiceNumber =
        supplierInvoiceNumber || (await generatePurchaseNumber(t));

      // ===== CREATE PURCHASE =====
      const purchase = await Purchase.create(
        {
          supplierId,
          userId,
          invoiceNumber,
          purchaseDate: new Date(),
          purchaseType,
          totalAmount,
          paidAmount: paidAmount || 0,
          remainingDebt,
          dueDate: dueDate || null,
          status:
            paidAmount >= totalAmount
              ? "PAID"
              : paidAmount > 0
              ? "PARTIAL"
              : "PENDING",
          notes,
        },
        { transaction: t }
      );

      // ===== CREATE PURCHASE ITEMS & UPDATE STOCK =====
      for (const item of processedItems) {
        // Create purchase item
        await PurchaseItem.create(
          {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            expDate: item.expDate,
            subtotal: item.subtotal,
          },
          { transaction: t }
        );

        // Update product stock & prices
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });
        const quantityBefore = product.stock;

        await product.update(
          {
            stock: product.stock + item.quantity,
            purchasePrice: item.purchasePrice, // Update harga beli
            sellingPrice: item.sellingPrice, // Update harga jual (jika ada)
          },
          { transaction: t }
        );

        // Record stock movement
        await StockMovement.create(
          {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            quantityBefore,
            quantityAfter: product.stock,
            referenceType: "PURCHASE",
            referenceId: purchase.id,
            notes: `Pembelian dari ${supplier.name}`,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      // ===== CREATE SUPPLIER DEBT (jika KREDIT) =====
      if (purchaseType === "KREDIT" && remainingDebt > 0) {
        await SupplierDebt.create(
          {
            supplierId: supplier.id,
            purchaseId: purchase.id,
            invoiceNumber: purchase.invoiceNumber,
            totalAmount,
            paidAmount: paidAmount || 0,
            remainingAmount: remainingDebt,
            dueDate: dueDate,
            status: paidAmount > 0 ? "PARTIAL" : "PENDING",
          },
          { transaction: t }
        );

        // Update supplier total debt
        supplier.totalDebt = parseFloat(supplier.totalDebt) + remainingDebt;
        await supplier.save({ transaction: t });
      }

      // ===== UPDATE SUPPLIER STATS =====
      supplier.totalPurchases += 1;
      await supplier.save({ transaction: t });

      // Commit transaction
      await t.commit();

      // ===== LOAD COMPLETE DATA FOR RESPONSE =====
      const completePurchase = await Purchase.findByPk(purchase.id, {
        include: [
          {
            model: PurchaseItem,
            as: "items",
          },
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone"],
          },
        ],
      });

      console.log(
        `✅ Purchase created: ${
          purchase.invoiceNumber
        } - ${purchaseType} - Rp ${totalAmount.toLocaleString("id-ID")}`
      );

      return ApiResponse.created(
        res,
        completePurchase,
        "Pembelian berhasil dibuat"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error creating purchase:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/purchases - Get All Purchases
  // ============================================
  static async getAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        purchaseType,
        status,
        supplierId,
        startDate,
        endDate,
        sortBy = "purchaseDate",
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
      if (purchaseType) {
        whereClause.purchaseType = purchaseType;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by supplier
      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.purchaseDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      } else if (startDate) {
        whereClause.purchaseDate = {
          [Op.gte]: new Date(startDate),
        };
      } else if (endDate) {
        whereClause.purchaseDate = {
          [Op.lte]: new Date(endDate),
        };
      }

      const { count, rows } = await Purchase.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name"],
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
        "Pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/purchases/search/:invoiceNumber - Search Purchase by Invoice
  // ✅ NEW METHOD - For purchase return functionality
  // ============================================
  static async searchByInvoice(req, res, next) {
    try {
      const { invoiceNumber } = req.params;

      const purchase = await Purchase.findOne({
        where: { invoiceNumber },
        include: [
          {
            model: PurchaseItem,
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
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone"],
          },
        ],
      });

      if (!purchase) {
        return ApiResponse.notFound(res, "Transaksi pembelian tidak ditemukan");
      }

      // Format response for return form
      const formattedPurchase = {
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber,
        purchaseDate: purchase.purchaseDate,
        totalAmount: purchase.totalAmount,
        purchaseType: purchase.purchaseType,
        status: purchase.status,
        supplier: purchase.supplier,
        items: purchase.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          unit: item.product.unit,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          subtotal: item.subtotal,
        })),
      };

      return ApiResponse.success(
        res,
        formattedPurchase,
        "Transaksi pembelian ditemukan"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/purchases/:id - Get Purchase Detail
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const purchase = await Purchase.findByPk(id, {
        include: [
          {
            model: PurchaseItem,
            as: "items",
          },
          {
            model: Supplier,
            as: "supplier",
            attributes: [
              "id",
              "code",
              "name",
              "phone",
              "address",
              "contactPerson",
            ],
          },
          {
            model: SupplierDebt,
            as: "debt",
            required: false,
          },
        ],
      });

      if (!purchase) {
        return ApiResponse.notFound(res, "Pembelian tidak ditemukan");
      }

      return ApiResponse.success(
        res,
        purchase,
        "Detail pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/purchases/stats - Get Purchase Statistics
  // ============================================
  static async getStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.purchaseDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const totalPurchases = await Purchase.count({ where: whereClause });

      const totalSpending = await Purchase.sum("totalAmount", {
        where: whereClause,
      });

      const tunaiPurchases = await Purchase.count({
        where: { ...whereClause, purchaseType: "TUNAI" },
      });

      const kreditPurchases = await Purchase.count({
        where: { ...whereClause, purchaseType: "KREDIT" },
      });

      const konsinyasiPurchases = await Purchase.count({
        where: { ...whereClause, purchaseType: "KONSINYASI" },
      });

      const pendingDebts = await Purchase.sum("remainingDebt", {
        where: {
          ...whereClause,
          purchaseType: "KREDIT",
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
      });

      const stats = {
        totalPurchases,
        totalSpending: parseFloat(totalSpending || 0).toFixed(2),
        tunaiPurchases,
        kreditPurchases,
        konsinyasiPurchases,
        pendingDebts: parseFloat(pendingDebts || 0).toFixed(2),
      };

      return ApiResponse.success(
        res,
        stats,
        "Statistik pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PATCH /api/purchases/:id/pay - Update Payment (untuk KREDIT)
  // ============================================
  static async updatePayment(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { amount, notes } = req.body;

      if (!amount || amount <= 0) {
        await t.rollback();
        return ApiResponse.error(
          res,
          "Jumlah pembayaran harus lebih dari 0",
          422
        );
      }

      const purchase = await Purchase.findByPk(id, {
        include: [
          {
            model: SupplierDebt,
            as: "debt",
          },
        ],
        transaction: t,
      });

      if (!purchase) {
        await t.rollback();
        return ApiResponse.notFound(res, "Pembelian tidak ditemukan");
      }

      if (amount > purchase.remainingDebt) {
        await t.rollback();
        return ApiResponse.error(
          res,
          `Pembayaran melebihi sisa hutang. Sisa: ${purchase.remainingDebt}`,
          400
        );
      }

      // Update purchase payment
      purchase.paidAmount = parseFloat(purchase.paidAmount) + amount;
      purchase.remainingDebt =
        parseFloat(purchase.totalAmount) - purchase.paidAmount;

      if (purchase.remainingDebt === 0) {
        purchase.status = "PAID";
      } else {
        purchase.status = "PARTIAL";
      }

      await purchase.save({ transaction: t });

      // Update supplier debt if exists
      if (purchase.debt) {
        await purchase.debt.addPayment(amount, req.user.id, "CASH", notes);
      }

      await t.commit();

      const updatedPurchase = await Purchase.findByPk(id, {
        include: [
          {
            model: Supplier,
            as: "supplier",
          },
          {
            model: SupplierDebt,
            as: "debt",
          },
        ],
      });

      console.log(
        `✅ Purchase payment updated: ${
          purchase.invoiceNumber
        } - Rp ${amount.toLocaleString("id-ID")}`
      );

      return ApiResponse.success(
        res,
        updatedPurchase,
        "Pembayaran berhasil diupdate"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error updating purchase payment:", error);
      next(error);
    }
  }
}

module.exports = PurchaseController;
