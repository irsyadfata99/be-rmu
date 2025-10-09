// ============================================
// src/controllers/ReturnController.js
// Controller untuk Purchase Return & Sales Return
// ============================================
const {
  PurchaseReturn,
  PurchaseReturnItem,
  SalesReturn,
  SalesReturnItem,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  Product,
  Supplier,
  Member,
  SupplierDebt,
  MemberDebt,
  StockMovement,
} = require("../models");
const ApiResponse = require("../utils/response");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class ReturnController {
  // ============================================
  // PURCHASE RETURN (RETUR KE SUPPLIER)
  // ============================================

  /**
   * GET /api/returns/purchases - Get all purchase returns
   */
  static async getPurchaseReturns(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        supplierId,
        status,
        startDate,
        endDate,
        sortBy = "returnDate",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Search by return number
      if (search) {
        whereClause.returnNumber = {
          [Op.like]: `%${search}%`,
        };
      }

      // Filter by supplier
      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.returnDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const { count, rows } = await PurchaseReturn.findAndCountAll({
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
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
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
        "Retur pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/returns/purchases/:id - Get purchase return detail
   */
  static async getPurchaseReturnById(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseReturn = await PurchaseReturn.findByPk(id, {
        include: [
          {
            model: PurchaseReturnItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "sku", "name", "unit"],
              },
            ],
          },
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone", "address"],
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
          },
        ],
      });

      if (!purchaseReturn) {
        return ApiResponse.notFound(res, "Retur pembelian tidak ditemukan");
      }

      return ApiResponse.success(
        res,
        purchaseReturn,
        "Detail retur pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/returns/purchases - Create purchase return
   */
  static async createPurchaseReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { purchaseId, items, reason, notes } = req.body;
      const userId = req.user.id;

      // Validation
      if (!purchaseId) {
        await t.rollback();
        return ApiResponse.error(res, "Purchase harus dipilih", 422);
      }

      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item retur harus diisi", 422);
      }

      if (!reason) {
        await t.rollback();
        return ApiResponse.error(res, "Alasan retur harus diisi", 422);
      }

      // Get purchase
      const purchase = await Purchase.findByPk(purchaseId, { transaction: t });
      if (!purchase) {
        await t.rollback();
        return ApiResponse.error(res, "Purchase tidak ditemukan", 404);
      }

      // Process items & calculate total
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

        // Validate quantity
        if (item.quantity <= 0) {
          await t.rollback();
          return ApiResponse.error(res, `Quantity harus lebih dari 0`, 400);
        }

        const subtotal = parseFloat(item.price) * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unit: product.unit,
          price: item.price,
          subtotal,
        });
      }

      // Generate return number
      const returnNumber = await this.generatePurchaseReturnNumber();

      // Create purchase return
      const purchaseReturn = await PurchaseReturn.create(
        {
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          userId,
          returnNumber,
          returnDate: new Date(),
          totalAmount,
          reason,
          status: "PENDING",
          notes,
        },
        { transaction: t }
      );

      // Create return items & update stock
      for (const item of processedItems) {
        await PurchaseReturnItem.create(
          {
            purchaseReturnId: purchaseReturn.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            subtotal: item.subtotal,
          },
          { transaction: t }
        );

        // Reduce stock (barang keluar kembali ke supplier)
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });
        const quantityBefore = product.stock;

        if (product.stock < item.quantity) {
          await t.rollback();
          return ApiResponse.error(
            res,
            `Stok tidak cukup untuk ${product.name}. Tersedia: ${product.stock}`,
            400
          );
        }

        await product.update(
          {
            stock: product.stock - item.quantity,
          },
          { transaction: t }
        );

        // Record stock movement
        await StockMovement.create(
          {
            productId: item.productId,
            type: "RETURN_OUT",
            quantity: -item.quantity,
            quantityBefore,
            quantityAfter: product.stock,
            referenceType: "RETURN",
            referenceId: purchaseReturn.id,
            notes: `Retur pembelian: ${reason}`,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      await t.commit();

      // Load complete data
      const completeReturn = await PurchaseReturn.findByPk(purchaseReturn.id, {
        include: [
          {
            model: PurchaseReturnItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "sku", "name", "unit"],
              },
            ],
          },
          {
            model: Supplier,
            as: "supplier",
          },
        ],
      });

      console.log(
        `✅ Purchase return created: ${returnNumber} - Rp ${totalAmount.toLocaleString(
          "id-ID"
        )}`
      );

      return ApiResponse.created(
        res,
        completeReturn,
        "Retur pembelian berhasil dibuat"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error creating purchase return:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/returns/purchases/:id/approve - Approve purchase return
   */
  static async approvePurchaseReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { notes } = req.body;

      const purchaseReturn = await PurchaseReturn.findByPk(id, {
        include: [
          {
            model: Purchase,
            as: "purchase",
          },
        ],
        transaction: t,
      });

      if (!purchaseReturn) {
        await t.rollback();
        return ApiResponse.notFound(res, "Retur pembelian tidak ditemukan");
      }

      if (purchaseReturn.status !== "PENDING") {
        await t.rollback();
        return ApiResponse.error(
          res,
          `Retur sudah ${purchaseReturn.status}`,
          400
        );
      }

      // Update status
      await purchaseReturn.update(
        {
          status: "APPROVED",
          notes: notes || purchaseReturn.notes,
        },
        { transaction: t }
      );

      // Reduce supplier debt if exists
      if (purchaseReturn.purchase.purchaseType === "KREDIT") {
        const debt = await SupplierDebt.findOne({
          where: { purchaseId: purchaseReturn.purchaseId },
          transaction: t,
        });

        if (debt && debt.remainingAmount > 0) {
          const deductAmount = Math.min(
            purchaseReturn.totalAmount,
            debt.remainingAmount
          );

          debt.paidAmount = parseFloat(debt.paidAmount) + deductAmount;
          debt.remainingAmount = parseFloat(debt.totalAmount) - debt.paidAmount;

          if (debt.remainingAmount === 0) {
            debt.status = "PAID";
          }

          await debt.save({ transaction: t });

          // Update supplier total debt
          const supplier = await Supplier.findByPk(purchaseReturn.supplierId, {
            transaction: t,
          });
          supplier.totalDebt = parseFloat(supplier.totalDebt) - deductAmount;
          await supplier.save({ transaction: t });
        }
      }

      await t.commit();

      const updatedReturn = await PurchaseReturn.findByPk(id, {
        include: [
          {
            model: Supplier,
            as: "supplier",
          },
        ],
      });

      console.log(
        `✅ Purchase return approved: ${purchaseReturn.returnNumber}`
      );

      return ApiResponse.success(
        res,
        updatedReturn,
        "Retur pembelian berhasil disetujui"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error approving purchase return:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/returns/purchases/:id/reject - Reject purchase return
   */
  static async rejectPurchaseReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        await t.rollback();
        return ApiResponse.error(res, "Alasan penolakan harus diisi", 422);
      }

      const purchaseReturn = await PurchaseReturn.findByPk(id, {
        include: [
          {
            model: PurchaseReturnItem,
            as: "items",
          },
        ],
        transaction: t,
      });

      if (!purchaseReturn) {
        await t.rollback();
        return ApiResponse.notFound(res, "Retur pembelian tidak ditemukan");
      }

      if (purchaseReturn.status !== "PENDING") {
        await t.rollback();
        return ApiResponse.error(
          res,
          `Retur sudah ${purchaseReturn.status}`,
          400
        );
      }

      // Update status
      await purchaseReturn.update(
        {
          status: "REJECTED",
          notes,
        },
        { transaction: t }
      );

      // Kembalikan stok (karena retur ditolak, barang tetap di kita)
      for (const item of purchaseReturn.items) {
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });
        await product.update(
          {
            stock: product.stock + item.quantity,
          },
          { transaction: t }
        );
      }

      await t.commit();

      console.log(
        `❌ Purchase return rejected: ${purchaseReturn.returnNumber}`
      );

      return ApiResponse.success(
        res,
        purchaseReturn,
        "Retur pembelian berhasil ditolak"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error rejecting purchase return:", error);
      next(error);
    }
  }

  // ============================================
  // SALES RETURN (RETUR DARI MEMBER)
  // ============================================

  /**
   * GET /api/returns/sales - Get all sales returns
   */
  static async getSalesReturns(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        memberId,
        status,
        startDate,
        endDate,
        sortBy = "returnDate",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Search by return number
      if (search) {
        whereClause.returnNumber = {
          [Op.like]: `%${search}%`,
        };
      }

      // Filter by member
      if (memberId) {
        whereClause.memberId = memberId;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.returnDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const { count, rows } = await SalesReturn.findAndCountAll({
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
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate"],
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
        "Retur penjualan berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/returns/sales/:id - Get sales return detail
   */
  static async getSalesReturnById(req, res, next) {
    try {
      const { id } = req.params;

      const salesReturn = await SalesReturn.findByPk(id, {
        include: [
          {
            model: SalesReturnItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "sku", "name", "unit"],
              },
            ],
          },
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "whatsapp"],
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate", "saleType"],
          },
        ],
      });

      if (!salesReturn) {
        return ApiResponse.notFound(res, "Retur penjualan tidak ditemukan");
      }

      return ApiResponse.success(
        res,
        salesReturn,
        "Detail retur penjualan berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/returns/sales - Create sales return
   */
  static async createSalesReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { saleId, items, reason, refundMethod = "CASH", notes } = req.body;
      const userId = req.user.id;

      // Validation
      if (!saleId) {
        await t.rollback();
        return ApiResponse.error(res, "Transaksi penjualan harus dipilih", 422);
      }

      if (!items || items.length === 0) {
        await t.rollback();
        return ApiResponse.error(res, "Item retur harus diisi", 422);
      }

      if (!reason) {
        await t.rollback();
        return ApiResponse.error(res, "Alasan retur harus diisi", 422);
      }

      // Get sale
      const sale = await Sale.findByPk(saleId, { transaction: t });
      if (!sale) {
        await t.rollback();
        return ApiResponse.error(res, "Transaksi tidak ditemukan", 404);
      }

      // Process items & calculate total
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

        // Validate quantity
        if (item.quantity <= 0) {
          await t.rollback();
          return ApiResponse.error(res, `Quantity harus lebih dari 0`, 400);
        }

        const subtotal = parseFloat(item.price) * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unit: product.unit,
          price: item.price,
          subtotal,
        });
      }

      // Generate return number
      const returnNumber = await this.generateSalesReturnNumber();

      // Create sales return
      const salesReturn = await SalesReturn.create(
        {
          saleId: sale.id,
          memberId: sale.memberId,
          userId,
          returnNumber,
          returnDate: new Date(),
          totalAmount,
          reason,
          status: "PENDING",
          refundMethod,
          notes,
        },
        { transaction: t }
      );

      // Create return items & update stock
      for (const item of processedItems) {
        await SalesReturnItem.create(
          {
            salesReturnId: salesReturn.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            subtotal: item.subtotal,
          },
          { transaction: t }
        );

        // Add stock back (barang masuk kembali)
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });
        const quantityBefore = product.stock;

        await product.update(
          {
            stock: product.stock + item.quantity,
          },
          { transaction: t }
        );

        // Record stock movement
        await StockMovement.create(
          {
            productId: item.productId,
            type: "RETURN_IN",
            quantity: item.quantity,
            quantityBefore,
            quantityAfter: product.stock,
            referenceType: "RETURN",
            referenceId: salesReturn.id,
            notes: `Retur penjualan: ${reason}`,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      await t.commit();

      // Load complete data
      const completeReturn = await SalesReturn.findByPk(salesReturn.id, {
        include: [
          {
            model: SalesReturnItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "sku", "name", "unit"],
              },
            ],
          },
          {
            model: Member,
            as: "member",
          },
        ],
      });

      console.log(
        `✅ Sales return created: ${returnNumber} - Rp ${totalAmount.toLocaleString(
          "id-ID"
        )}`
      );

      return ApiResponse.created(
        res,
        completeReturn,
        "Retur penjualan berhasil dibuat"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error creating sales return:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/returns/sales/:id/approve - Approve sales return
   */
  static async approveSalesReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { notes } = req.body;

      const salesReturn = await SalesReturn.findByPk(id, {
        include: [
          {
            model: Sale,
            as: "sale",
          },
        ],
        transaction: t,
      });

      if (!salesReturn) {
        await t.rollback();
        return ApiResponse.notFound(res, "Retur penjualan tidak ditemukan");
      }

      if (salesReturn.status !== "PENDING") {
        await t.rollback();
        return ApiResponse.error(res, `Retur sudah ${salesReturn.status}`, 400);
      }

      // Update status
      await salesReturn.update(
        {
          status: "APPROVED",
          notes: notes || salesReturn.notes,
        },
        { transaction: t }
      );

      // Handle refund based on method
      if (
        salesReturn.refundMethod === "DEBT_DEDUCTION" &&
        salesReturn.sale.saleType === "KREDIT"
      ) {
        // Kurangi hutang member
        const debt = await MemberDebt.findOne({
          where: { saleId: salesReturn.saleId },
          transaction: t,
        });

        if (debt && debt.remainingAmount > 0) {
          const deductAmount = Math.min(
            salesReturn.totalAmount,
            debt.remainingAmount
          );

          debt.paidAmount = parseFloat(debt.paidAmount) + deductAmount;
          debt.remainingAmount = parseFloat(debt.totalAmount) - debt.paidAmount;

          if (debt.remainingAmount === 0) {
            debt.status = "PAID";
          }

          await debt.save({ transaction: t });

          // Update member total debt
          if (salesReturn.memberId) {
            const member = await Member.findByPk(salesReturn.memberId, {
              transaction: t,
            });
            member.totalDebt = parseFloat(member.totalDebt) - deductAmount;
            await member.save({ transaction: t });
          }
        }
      }

      await t.commit();

      const updatedReturn = await SalesReturn.findByPk(id, {
        include: [
          {
            model: Member,
            as: "member",
          },
        ],
      });

      console.log(`✅ Sales return approved: ${salesReturn.returnNumber}`);

      return ApiResponse.success(
        res,
        updatedReturn,
        "Retur penjualan berhasil disetujui"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error approving sales return:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/returns/sales/:id/reject - Reject sales return
   */
  static async rejectSalesReturn(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        await t.rollback();
        return ApiResponse.error(res, "Alasan penolakan harus diisi", 422);
      }

      const salesReturn = await SalesReturn.findByPk(id, {
        include: [
          {
            model: SalesReturnItem,
            as: "items",
          },
        ],
        transaction: t,
      });

      if (!salesReturn) {
        await t.rollback();
        return ApiResponse.notFound(res, "Retur penjualan tidak ditemukan");
      }

      if (salesReturn.status !== "PENDING") {
        await t.rollback();
        return ApiResponse.error(res, `Retur sudah ${salesReturn.status}`, 400);
      }

      // Update status
      await salesReturn.update(
        {
          status: "REJECTED",
          notes,
        },
        { transaction: t }
      );

      // Kurangi stok kembali (karena retur ditolak, barang kembali ke member)
      for (const item of salesReturn.items) {
        const product = await Product.findByPk(item.productId, {
          transaction: t,
        });
        await product.update(
          {
            stock: product.stock - item.quantity,
          },
          { transaction: t }
        );
      }

      await t.commit();

      console.log(`❌ Sales return rejected: ${salesReturn.returnNumber}`);

      return ApiResponse.success(
        res,
        salesReturn,
        "Retur penjualan berhasil ditolak"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error rejecting sales return:", error);
      next(error);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * GET /api/returns/stats - Get return statistics
   */
  static async getStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.returnDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // Purchase returns
      const totalPurchaseReturns = await PurchaseReturn.count({
        where: whereClause,
      });
      const pendingPurchaseReturns = await PurchaseReturn.count({
        where: { ...whereClause, status: "PENDING" },
      });
      const totalPurchaseReturnAmount = await PurchaseReturn.sum(
        "totalAmount",
        {
          where: { ...whereClause, status: "APPROVED" },
        }
      );

      // Sales returns
      const totalSalesReturns = await SalesReturn.count({ where: whereClause });
      const pendingSalesReturns = await SalesReturn.count({
        where: { ...whereClause, status: "PENDING" },
      });
      const totalSalesReturnAmount = await SalesReturn.sum("totalAmount", {
        where: { ...whereClause, status: "APPROVED" },
      });

      const stats = {
        purchaseReturns: {
          total: totalPurchaseReturns,
          pending: pendingPurchaseReturns,
          totalAmount: parseFloat(totalPurchaseReturnAmount || 0).toFixed(2),
        },
        salesReturns: {
          total: totalSalesReturns,
          pending: pendingSalesReturns,
          totalAmount: parseFloat(totalSalesReturnAmount || 0).toFixed(2),
        },
      };

      return ApiResponse.success(
        res,
        stats,
        "Statistik retur berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate purchase return number
   * Format: PRN-YYYYMMDD-XXX
   */
  static async generatePurchaseReturnNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const lastReturn = await PurchaseReturn.findOne({
      where: {
        returnNumber: {
          [Op.like]: `PRN-${dateStr}-%`,
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
    return `PRN-${dateStr}-${paddedNumber}`;
  }

  /**
   * Generate sales return number
   * Format: SRN-YYYYMMDD-XXX
   */
  static async generateSalesReturnNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const lastReturn = await SalesReturn.findOne({
      where: {
        returnNumber: {
          [Op.like]: `SRN-${dateStr}-%`,
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
    return `SRN-${dateStr}-${paddedNumber}`;
  }
}

module.exports = ReturnController;
