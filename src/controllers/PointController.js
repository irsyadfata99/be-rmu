// ============================================
// src/controllers/PointController.js
// PRODUCTION READY - Complete Point System Management
// ============================================
const ExcelExporter = require("../utils/excelExporter");
const { PointTransaction, Member, Sale } = require("../models");
const { Op } = require("sequelize");
const ApiResponse = require("../utils/response");
const { sequelize } = require("../config/database");
const Setting = require("../models/Setting");

// ============================================
// POINT CONTROLLER CLASS
// ============================================
class PointController {
  /**
   * GET /api/points/transactions
   * @desc Get all point transactions with advanced filtering
   * @access Private (ADMIN)
   */
  static async getAllTransactions(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        memberId,
        search = "",
        startDate,
        endDate,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};
      const memberWhereClause = {};

      if (type) whereClause.type = type;
      if (memberId) whereClause.memberId = memberId;

      // Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Search member by name or uniqueId
      if (search) {
        memberWhereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { uniqueId: { [Op.like]: `%${search}%` } },
        ];
      }

      const { rows, count } = await PointTransaction.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "regionCode",
              "regionName",
              "totalPoints",
            ],
            where:
              Object.keys(memberWhereClause).length > 0
                ? memberWhereClause
                : undefined,
            required: Object.keys(memberWhereClause).length > 0,
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "finalAmount"],
            required: false,
          },
        ],
      });

      return ApiResponse.paginated(
        res,
        rows,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        "Point transactions retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting all transactions:", error);
      next(error);
    }
  }

  /**
   * GET /api/points/transactions/export
   * @desc Export point transactions to Excel
   * @access Private (ADMIN only)
   */
  static async exportTransactions(req, res, next) {
    try {
      const {
        type,
        memberId,
        search = "",
        startDate,
        endDate,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const whereClause = {};
      const memberWhereClause = {};

      if (type) whereClause.type = type;
      if (memberId) whereClause.memberId = memberId;

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      if (search) {
        memberWhereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { uniqueId: { [Op.like]: `%${search}%` } },
        ];
      }

      const transactions = await PointTransaction.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "regionCode",
              "regionName",
              "totalPoints",
            ],
            where:
              Object.keys(memberWhereClause).length > 0
                ? memberWhereClause
                : undefined,
            required: Object.keys(memberWhereClause).length > 0,
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "finalAmount"],
            required: false,
          },
        ],
      });

      const typeMap = {
        EARN: "📈 Dapat Point",
        REDEEM: "📉 Tukar Point",
        ADJUSTMENT: "⚙️ Penyesuaian",
        EXPIRED: "⏰ Kadaluarsa",
      };

      const excelData = transactions.map((trx) => ({
        date: new Date(trx.createdAt),
        memberUniqueId: trx.member?.uniqueId || "-",
        memberName: trx.member?.fullName || "-",
        regionName: trx.member?.regionName || "-",
        type: typeMap[trx.type] || trx.type,
        points: trx.points,
        pointsBefore: trx.pointsBefore,
        pointsAfter: trx.pointsAfter,
        currentPoints: trx.member?.totalPoints || 0,
        description: trx.description,
        saleInvoice: trx.sale?.invoiceNumber || "-",
        saleAmount: trx.sale?.finalAmount
          ? ExcelExporter.formatCurrency(trx.sale.finalAmount)
          : "-",
        expiryDate: trx.expiryDate ? new Date(trx.expiryDate) : "-",
        isExpired: trx.isExpired ? "Ya" : "Tidak",
      }));

      const columns = [
        { header: "Tanggal", key: "date", width: 18 },
        { header: "ID Member", key: "memberUniqueId", width: 12 },
        { header: "Nama Member", key: "memberName", width: 25 },
        { header: "Wilayah", key: "regionName", width: 18 },
        { header: "Jenis", key: "type", width: 18 },
        { header: "Point", key: "points", width: 12 },
        { header: "Point Sebelum", key: "pointsBefore", width: 15 },
        { header: "Point Sesudah", key: "pointsAfter", width: 15 },
        { header: "Point Saat Ini", key: "currentPoints", width: 15 },
        { header: "Deskripsi", key: "description", width: 35 },
        { header: "No. Faktur", key: "saleInvoice", width: 15 },
        { header: "Nilai Transaksi", key: "saleAmount", width: 15 },
        { header: "Tgl Kadaluarsa", key: "expiryDate", width: 15 },
        { header: "Expired", key: "isExpired", width: 10 },
      ];

      const totalEarned = transactions
        .filter((t) => t.type === "EARN")
        .reduce((sum, t) => sum + t.points, 0);

      const totalRedeemed = Math.abs(
        transactions
          .filter((t) => t.type === "REDEEM")
          .reduce((sum, t) => sum + t.points, 0)
      );

      const totalExpired = Math.abs(
        transactions
          .filter((t) => t.type === "EXPIRED")
          .reduce((sum, t) => sum + t.points, 0)
      );

      const totalAdjustment = transactions
        .filter((t) => t.type === "ADJUSTMENT")
        .reduce((sum, t) => sum + t.points, 0);

      const summary = {
        "Total Transaksi": transactions.length,
        "Point Didapat (EARN)": totalEarned.toLocaleString("id-ID"),
        "Point Ditukar (REDEEM)": totalRedeemed.toLocaleString("id-ID"),
        "Point Kadaluarsa (EXPIRED)": totalExpired.toLocaleString("id-ID"),
        "Penyesuaian (ADJUSTMENT)": totalAdjustment.toLocaleString("id-ID"),
        "Net Point": (
          totalEarned -
          totalRedeemed -
          totalExpired +
          totalAdjustment
        ).toLocaleString("id-ID"),
      };

      const filters = {};
      if (type) {
        const typeMapFilter = {
          EARN: "Dapat Point",
          REDEEM: "Tukar Point",
          ADJUSTMENT: "Penyesuaian",
          EXPIRED: "Kadaluarsa",
        };
        filters.Jenis = typeMapFilter[type] || type;
      }
      if (search) filters.Pencarian = search;
      if (startDate)
        filters["Dari Tanggal"] = new Date(startDate).toLocaleDateString(
          "id-ID"
        );
      if (endDate)
        filters["Sampai Tanggal"] = new Date(endDate).toLocaleDateString(
          "id-ID"
        );

      const buffer = await ExcelExporter.exportToExcel(
        excelData,
        columns,
        "Transaksi Point",
        {
          title: "LAPORAN TRANSAKSI POINT MEMBER",
          filters,
          summary,
        }
      );

      const filename = `Transaksi-Point-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      console.log(
        `✅ Exported ${transactions.length} point transactions to Excel by ${req.user.name}`
      );

      return res.send(buffer);
    } catch (error) {
      console.error("❌ Error exporting point transactions:", error);
      next(error);
    }
  }

  /**
   * GET /api/points/settings
   * @desc Get point system settings
   * @access Private (All authenticated users)
   */
  static async getSettings(req, res, next) {
    try {
      const pointEnabled = (await Setting.get("point_enabled")) || true;
      const pointPerAmount = (await Setting.get("point_per_rupiah")) || 1000;
      const minTransactionForPoints =
        (await Setting.get("min_transaction_for_points")) || 50000;
      const pointExpiryMonths =
        (await Setting.get("point_expiry_months")) || 12;
      const minPointsToRedeem =
        (await Setting.get("min_points_to_redeem")) || 100;
      const pointValue = (await Setting.get("point_value")) || 1000;

      const settings = {
        pointEnabled: pointEnabled === true || pointEnabled === "true",
        pointSystemMode: "TRANSACTION",
        pointPerAmount: parseInt(pointPerAmount),
        minTransactionForPoints: parseInt(minTransactionForPoints),
        pointExpiryMonths: parseInt(pointExpiryMonths),
        redeemEnabled: true,
        minPointsToRedeem: parseInt(minPointsToRedeem),
        pointValue: parseInt(pointValue),
      };

      return ApiResponse.success(
        res,
        settings,
        "Point settings retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/points/member/:memberId
   * @desc Get member point summary
   * @access Private
   */
  static async getMemberSummary(req, res, next) {
    try {
      const { memberId } = req.params;

      const summary = await PointTransaction.getMemberSummary(memberId);

      return ApiResponse.success(
        res,
        summary,
        "Member point summary retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/points/member/:memberId/history
   * @desc Get member point transaction history
   * @access Private
   */
  static async getMemberHistory(req, res, next) {
    try {
      const { memberId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const result = await PointTransaction.getMemberHistory(
        memberId,
        parseInt(page),
        parseInt(limit),
        type
      );

      return ApiResponse.paginated(
        res,
        result.transactions,
        result.pagination,
        "Point history retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/points/preview
   * @desc Preview point calculation for cart items
   * @access Private
   */
  static async previewCalculation(req, res, next) {
    try {
      const { totalAmount } = req.body;

      if (!totalAmount || totalAmount <= 0) {
        return ApiResponse.validationError(
          res,
          { totalAmount: "Total amount must be greater than 0" },
          "Invalid amount"
        );
      }

      // Get settings
      const pointPerAmount = (await Setting.get("point_per_rupiah")) || 1000;
      const minTransactionForPoints =
        (await Setting.get("min_transaction_for_points")) || 50000;

      // Check if transaction qualifies for points
      if (totalAmount < minTransactionForPoints) {
        return ApiResponse.success(res, {
          totalAmount,
          pointsToEarn: 0,
          calculation: `Minimum transaction for points: Rp ${minTransactionForPoints.toLocaleString(
            "id-ID"
          )}`,
          qualified: false,
        });
      }

      // Calculate points: 1 point per X rupiah
      const pointsToEarn = Math.floor(totalAmount / pointPerAmount);

      return ApiResponse.success(res, {
        totalAmount,
        pointsToEarn,
        calculation: `Rp ${totalAmount.toLocaleString(
          "id-ID"
        )} = ${pointsToEarn} points (1 point per Rp ${pointPerAmount.toLocaleString(
          "id-ID"
        )})`,
        qualified: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/points/validate-redemption
   * @desc Validate if member can redeem points
   * @access Private
   */
  static async validateRedemption(req, res, next) {
    try {
      const { memberId, pointsToRedeem, transactionAmount } = req.body;

      // Validate inputs
      if (!memberId || !pointsToRedeem || !transactionAmount) {
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? "Member ID is required" : undefined,
            pointsToRedeem: !pointsToRedeem
              ? "Points to redeem is required"
              : undefined,
            transactionAmount: !transactionAmount
              ? "Transaction amount is required"
              : undefined,
          },
          "Validation failed"
        );
      }

      const member = await Member.findByPk(memberId);
      if (!member) {
        return ApiResponse.notFound(res, "Member not found");
      }

      const currentPoints = member.totalPoints || 0;
      const minPoints = (await Setting.get("min_points_to_redeem")) || 100;
      const pointValue = (await Setting.get("point_value")) || 1000;
      const maxRedeemPercentage = 50; // Max 50% of transaction

      const errors = [];

      if (pointsToRedeem < minPoints) {
        errors.push(`Minimum redemption is ${minPoints} points`);
      }

      if (pointsToRedeem > currentPoints) {
        errors.push(`Insufficient points. Available: ${currentPoints}`);
      }

      const redeemValue = pointsToRedeem * pointValue;
      const maxRedeemValue = (transactionAmount * maxRedeemPercentage) / 100;

      if (redeemValue > maxRedeemValue) {
        errors.push(
          `Maximum redemption is ${maxRedeemPercentage}% of transaction (${Math.floor(
            maxRedeemValue / pointValue
          )} points)`
        );
      }

      const isValid = errors.length === 0;

      return ApiResponse.success(res, {
        isValid,
        errors,
        details: {
          currentPoints,
          pointsToRedeem,
          redeemValue,
          maxRedeemValue,
          maxRedeemPoints: Math.floor(maxRedeemValue / pointValue),
          remainingPoints: currentPoints - pointsToRedeem,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/points/redeem
   * @desc Redeem member points
   * @access Private
   */
  static async redeemPoints(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { memberId, points, description, notes } = req.body;

      // Validate inputs
      if (!memberId || !points || points <= 0) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? "Member ID is required" : undefined,
            points:
              !points || points <= 0
                ? "Points must be greater than 0"
                : undefined,
          },
          "Validation failed"
        );
      }

      // Get member
      const member = await Member.findByPk(memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return ApiResponse.notFound(res, "Member not found");
      }

      // Check minimum points
      const minPoints = (await Setting.get("min_points_to_redeem")) || 100;
      if (points < minPoints) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          { points: `Minimum redemption is ${minPoints} points` },
          "Points below minimum"
        );
      }

      // Check if member has enough points
      if (member.totalPoints < points) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          {
            points: `Insufficient points. Available: ${member.totalPoints}, Requested: ${points}`,
          },
          "Insufficient points"
        );
      }

      // Record redemption
      const pointTrx = await PointTransaction.recordRedeem(
        memberId,
        points,
        description || `Penukaran ${points} point`,
        req.user.id,
        t
      );

      await t.commit();

      // Reload with member data
      await pointTrx.reload({
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "totalPoints"],
          },
        ],
      });

      console.log(
        `✅ Points redeemed: ${points} points for member ${member.uniqueId} by ${req.user.name}`
      );

      return ApiResponse.success(res, pointTrx, "Points redeemed successfully");
    } catch (error) {
      await t.rollback();
      console.error("❌ Error redeeming points:", error);
      next(error);
    }
  }

  /**
   * PUT /api/points/settings
   * @desc Update point system settings
   * @access Private (ADMIN only)
   */
  static async updateSettings(req, res, next) {
    try {
      const {
        pointEnabled,
        pointPerAmount,
        minTransactionForPoints,
        pointExpiryMonths,
        minPointsToRedeem,
        pointValue,
      } = req.body;

      // Update settings
      if (pointEnabled !== undefined) {
        await Setting.set(
          "point_enabled",
          pointEnabled,
          "BOOLEAN",
          "TRANSACTION",
          "Enable/disable point system"
        );
      }

      if (pointPerAmount) {
        await Setting.set(
          "point_per_rupiah",
          pointPerAmount,
          "NUMBER",
          "TRANSACTION",
          "Points per rupiah (1 point per X rupiah)"
        );
      }

      if (minTransactionForPoints) {
        await Setting.set(
          "min_transaction_for_points",
          minTransactionForPoints,
          "NUMBER",
          "TRANSACTION",
          "Minimum transaction amount to earn points"
        );
      }

      if (pointExpiryMonths) {
        await Setting.set(
          "point_expiry_months",
          pointExpiryMonths,
          "NUMBER",
          "TRANSACTION",
          "Point expiry duration in months"
        );
      }

      if (minPointsToRedeem) {
        await Setting.set(
          "min_points_to_redeem",
          minPointsToRedeem,
          "NUMBER",
          "TRANSACTION",
          "Minimum points required for redemption"
        );
      }

      if (pointValue) {
        await Setting.set(
          "point_value",
          pointValue,
          "NUMBER",
          "TRANSACTION",
          "Point value in rupiah (1 point = X rupiah)"
        );
      }

      // Get updated settings
      const updatedSettings = {
        pointEnabled: (await Setting.get("point_enabled")) || true,
        pointPerAmount: (await Setting.get("point_per_rupiah")) || 1000,
        minTransactionForPoints:
          (await Setting.get("min_transaction_for_points")) || 50000,
        pointExpiryMonths: (await Setting.get("point_expiry_months")) || 12,
        minPointsToRedeem: (await Setting.get("min_points_to_redeem")) || 100,
        pointValue: (await Setting.get("point_value")) || 1000,
      };

      console.log(`✅ Point settings updated by ${req.user.name}`);

      return ApiResponse.success(
        res,
        updatedSettings,
        "Point settings updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/points/adjust
   * @desc Manual point adjustment
   * @access Private (ADMIN only)
   */
  static async adjustPoints(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { memberId, points, description, notes } = req.body;

      // Validate inputs
      if (!memberId || !points || points === 0) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? "Member ID is required" : undefined,
            points:
              !points || points === 0 ? "Points cannot be zero" : undefined,
          },
          "Validation failed"
        );
      }

      // Get member
      const member = await Member.findByPk(memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return ApiResponse.notFound(res, "Member not found");
      }

      // Record adjustment
      const pointTrx = await PointTransaction.recordAdjustment(
        memberId,
        parseInt(points),
        description ||
          `Penyesuaian manual: ${points > 0 ? "+" : ""}${points} point`,
        req.user.id,
        notes,
        t
      );

      await t.commit();

      // Reload with member data
      await pointTrx.reload({
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "totalPoints"],
          },
        ],
      });

      console.log(
        `✅ Point adjustment: ${
          points > 0 ? "+" : ""
        }${points} points for member ${member.uniqueId} by ${req.user.name}`
      );

      return ApiResponse.success(
        res,
        pointTrx,
        "Point adjustment recorded successfully"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error adjusting points:", error);
      next(error);
    }
  }

  /**
   * POST /api/points/expire
   * @desc Run point expiration process
   * @access Private (ADMIN only)
   */
  static async expirePoints(req, res, next) {
    try {
      console.log(`🔄 Running point expiration process by ${req.user.name}...`);

      const result = await PointTransaction.expirePoints();

      console.log(
        `✅ Point expiration completed: ${result.totalExpired} points expired`
      );

      return ApiResponse.success(
        res,
        result,
        `Successfully expired ${result.totalExpired} point transactions`
      );
    } catch (error) {
      console.error("❌ Error expiring points:", error);
      next(error);
    }
  }
}

module.exports = PointController;
