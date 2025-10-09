// ============================================
// src/controllers/StockController.js
// Controller untuk manajemen stock movement & adjustment
// ============================================
const { StockMovement, StockAdjustment, Product, User } = require("../models");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");

class StockController {
  // ============================================
  // STOCK MOVEMENT (HISTORY)
  // ============================================

  /**
   * GET /api/stock/movements - Get all stock movements
   */
  static async getMovements(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        productId,
        type,
        referenceType,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Filter by product
      if (productId) {
        whereClause.productId = productId;
      }

      // Filter by type
      if (type) {
        whereClause.type = type;
      }

      // Filter by reference type
      if (referenceType) {
        whereClause.referenceType = referenceType;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      } else if (startDate) {
        whereClause.createdAt = {
          [Op.gte]: new Date(startDate),
        };
      } else if (endDate) {
        whereClause.createdAt = {
          [Op.lte]: new Date(endDate),
        };
      }

      const { count, rows } = await StockMovement.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit"],
          },
          {
            model: User,
            as: "creator",
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
        "Stock movement berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stock/movements/:productId/history - Get movement history by product
   */
  static async getMovementsByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit = 50 } = req.query;

      const product = await Product.findByPk(productId);
      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      const movements = await StockMovement.findAll({
        where: { productId },
        limit: parseInt(limit),
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      return ApiResponse.success(
        res,
        {
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            currentStock: product.stock,
            unit: product.unit,
          },
          movements,
        },
        "History pergerakan stok berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // STOCK ADJUSTMENT (MANUAL ADJUSTMENT)
  // ============================================

  /**
   * GET /api/stock/adjustments - Get all adjustments
   */
  static async getAdjustments(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        productId,
        adjustmentType,
        status,
        startDate,
        endDate,
        sortBy = "adjustmentDate",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Filter by product
      if (productId) {
        whereClause.productId = productId;
      }

      // Filter by type
      if (adjustmentType) {
        whereClause.adjustmentType = adjustmentType;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.adjustmentDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const { count, rows } = await StockAdjustment.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
          {
            model: User,
            as: "approver",
            attributes: ["id", "name", "username"],
            required: false,
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
        "Adjustment berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stock/adjustments/:id - Get adjustment detail
   */
  static async getAdjustmentById(req, res, next) {
    try {
      const { id } = req.params;

      const adjustment = await StockAdjustment.findByPk(id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit", "stock"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
          {
            model: User,
            as: "approver",
            attributes: ["id", "name", "username"],
            required: false,
          },
        ],
      });

      if (!adjustment) {
        return ApiResponse.notFound(res, "Adjustment tidak ditemukan");
      }

      return ApiResponse.success(
        res,
        adjustment,
        "Detail adjustment berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/stock/adjustments - Create stock adjustment
   */
  static async createAdjustment(req, res, next) {
    try {
      const { productId, adjustmentType, quantity, reason, notes } = req.body;

      const userId = req.user.id;

      // Validation
      const errors = {};

      if (!productId) {
        errors.productId = ["Produk harus dipilih"];
      }

      if (!adjustmentType) {
        errors.adjustmentType = ["Tipe adjustment harus dipilih"];
      }

      if (!quantity || quantity === 0) {
        errors.quantity = ["Jumlah adjustment tidak boleh 0"];
      }

      if (!reason) {
        errors.reason = ["Alasan adjustment harus diisi"];
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Check product
      const product = await Product.findByPk(productId);
      if (!product) {
        return ApiResponse.error(res, "Produk tidak ditemukan", 404);
      }

      // Validate quantity for negative adjustment
      if (quantity < 0 && Math.abs(quantity) > product.stock) {
        return ApiResponse.error(
          res,
          `Jumlah adjustment melebihi stok. Stok saat ini: ${product.stock}`,
          400
        );
      }

      // Create adjustment and apply to stock
      const adjustment = await StockAdjustment.createAndApply({
        productId,
        userId,
        adjustmentType,
        quantity,
        reason,
        notes,
      });

      // Load complete data
      const completeAdjustment = await StockAdjustment.findByPk(adjustment.id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit", "stock"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      console.log(
        `✅ Stock adjustment created: ${adjustment.adjustmentNumber} - ${adjustmentType} - ${quantity}`
      );

      return ApiResponse.created(
        res,
        completeAdjustment,
        "Stock adjustment berhasil dibuat"
      );
    } catch (error) {
      console.error("❌ Error creating adjustment:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/stock/adjustments/:id/approve - Approve adjustment (ADMIN only)
   */
  static async approveAdjustment(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const adjustment = await StockAdjustment.findByPk(id);

      if (!adjustment) {
        return ApiResponse.notFound(res, "Adjustment tidak ditemukan");
      }

      if (adjustment.status !== "PENDING") {
        return ApiResponse.error(
          res,
          `Adjustment sudah ${
            adjustment.status === "APPROVED" ? "disetujui" : "ditolak"
          }`,
          400
        );
      }

      await adjustment.update({
        status: "APPROVED",
        approvedBy: req.user.id,
        notes: notes || adjustment.notes,
      });

      const updatedAdjustment = await StockAdjustment.findByPk(id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit", "stock"],
          },
          {
            model: User,
            as: "approver",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      console.log(`✅ Adjustment approved: ${adjustment.adjustmentNumber}`);

      return ApiResponse.success(
        res,
        updatedAdjustment,
        "Adjustment berhasil disetujui"
      );
    } catch (error) {
      console.error("❌ Error approving adjustment:", error);
      next(error);
    }
  }

  /**
   * PATCH /api/stock/adjustments/:id/reject - Reject adjustment (ADMIN only)
   */
  static async rejectAdjustment(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        return ApiResponse.error(res, "Alasan penolakan harus diisi", 422);
      }

      const adjustment = await StockAdjustment.findByPk(id);

      if (!adjustment) {
        return ApiResponse.notFound(res, "Adjustment tidak ditemukan");
      }

      if (adjustment.status !== "PENDING") {
        return ApiResponse.error(
          res,
          `Adjustment sudah ${
            adjustment.status === "APPROVED" ? "disetujui" : "ditolak"
          }`,
          400
        );
      }

      await adjustment.update({
        status: "REJECTED",
        approvedBy: req.user.id,
        notes: notes,
      });

      const updatedAdjustment = await StockAdjustment.findByPk(id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "sku", "name", "unit", "stock"],
          },
          {
            model: User,
            as: "approver",
            attributes: ["id", "name", "username"],
          },
        ],
      });

      console.log(`❌ Adjustment rejected: ${adjustment.adjustmentNumber}`);

      return ApiResponse.success(
        res,
        updatedAdjustment,
        "Adjustment berhasil ditolak"
      );
    } catch (error) {
      console.error("❌ Error rejecting adjustment:", error);
      next(error);
    }
  }

  /**
   * GET /api/stock/stats - Get stock statistics
   */
  static async getStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // Movement stats
      const totalMovements = await StockMovement.count({ where: whereClause });
      const inMovements = await StockMovement.count({
        where: { ...whereClause, type: "IN" },
      });
      const outMovements = await StockMovement.count({
        where: { ...whereClause, type: "OUT" },
      });

      // Adjustment stats
      const totalAdjustments = await StockAdjustment.count({
        where: whereClause,
      });
      const pendingAdjustments = await StockAdjustment.count({
        where: { ...whereClause, status: "PENDING" },
      });
      const approvedAdjustments = await StockAdjustment.count({
        where: { ...whereClause, status: "APPROVED" },
      });

      const stats = {
        movements: {
          total: totalMovements,
          in: inMovements,
          out: outMovements,
        },
        adjustments: {
          total: totalAdjustments,
          pending: pendingAdjustments,
          approved: approvedAdjustments,
        },
      };

      return ApiResponse.success(res, stats, "Statistik stok berhasil diambil");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StockController;
