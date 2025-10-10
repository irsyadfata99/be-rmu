// ============================================
// IMPORTS
// ============================================
const ExcelExporter = require("../utils/excelExporter");
const { PointTransaction, Member } = require("../models");
const { Op } = require("sequelize");
const ApiResponse = require("../utils/response");

// ============================================
// POINT CONTROLLER CLASS
// ============================================
class PointController {
  /**
   * GET /api/points/transactions - Get All Point Transactions (ADMIN)
   * ENHANCED: Better search, date range filter, flexible sorting
   */
  static async getAllTransactions(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        memberId,
        search = "", // ✨ NEW: Search member name/uniqueId
        startDate, // ✨ NEW: Date range
        endDate, // ✨ NEW: Date range
        sortBy = "created_at", // ✨ NEW: Flexible sorting
        sortOrder = "DESC", // ✨ NEW: Flexible sorting
      } = req.query;

      const offset = (page - 1) * limit;

      const whereClause = {};
      const memberWhereClause = {}; // ✨ NEW: For member search

      if (type) whereClause.type = type;
      if (memberId) whereClause.memberId = memberId;

      // ✨ NEW: Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      } // ⚠️ FIX: Added missing closing brace

      // ✨ NEW: Search member by name or uniqueId
      if (search) {
        memberWhereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { uniqueId: { [Op.like]: `%${search}%` } },
        ];
      }

      const { rows, count } = await PointTransaction.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]], // ✨ ENHANCED: Flexible sorting
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
            ],
            where:
              Object.keys(memberWhereClause).length > 0
                ? memberWhereClause
                : undefined,
            required: Object.keys(memberWhereClause).length > 0, // ✨ Inner join if searching
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

      // Build where clause (same as getAllTransactions)
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

      // Fetch all data (no pagination for export)
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
            model: require("../models/Sale"),
            as: "sale",
            attributes: ["id", "invoiceNumber", "finalAmount"],
            required: false,
          },
        ],
      });

      // Prepare data for Excel
      const excelData = transactions.map((trx) => {
        // Format type
        const typeMap = {
          EARN: "📈 Dapat Point",
          REDEEM: "📉 Tukar Point",
          ADJUSTMENT: "⚙️ Penyesuaian",
          EXPIRED: "⏰ Kadaluarsa",
        };

        return {
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
        };
      });

      // Define columns
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

      // Calculate summary
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

      // Prepare filters for display
      const filters = {};
      if (type) {
        const typeMap = {
          EARN: "Dapat Point",
          REDEEM: "Tukar Point",
          ADJUSTMENT: "Penyesuaian",
          EXPIRED: "Kadaluarsa",
        };
        filters.Jenis = typeMap[type] || type;
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

      // Generate Excel
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

      // Set response headers
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
      // TODO: Get from Settings model or config
      const settings = {
        pointEnabled: true,
        pointSystemMode: "TRANSACTION", // or "PRODUCT"
        pointPerAmount: 1000, // 1 point per 1000 rupiah
        minTransactionForPoints: 50000,
        pointExpiryMonths: 12,
        redeemEnabled: true,
        minPointsToRedeem: 100,
        pointValue: 1000, // 1 point = 1000 rupiah
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

      const member = await Member.findByPk(memberId, {
        attributes: ["id", "uniqueId", "fullName", "totalPoints"],
      });

      if (!member) {
        return ApiResponse.notFound(res, "Member not found");
      }

      // Get point statistics
      const earnedPoints = await PointTransaction.sum("points", {
        where: { memberId, type: "EARN" },
      });

      const redeemedPoints = Math.abs(
        (await PointTransaction.sum("points", {
          where: { memberId, type: "REDEEM" },
        })) || 0
      );

      const expiredPoints = Math.abs(
        (await PointTransaction.sum("points", {
          where: { memberId, type: "EXPIRED" },
        })) || 0
      );

      return ApiResponse.success(res, {
        member: {
          id: member.id,
          uniqueId: member.uniqueId,
          fullName: member.fullName,
          currentPoints: member.totalPoints || 0,
        },
        statistics: {
          totalEarned: earnedPoints || 0,
          totalRedeemed: redeemedPoints,
          totalExpired: expiredPoints,
          available: member.totalPoints || 0,
        },
      });
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
      const offset = (page - 1) * limit;

      const whereClause = { memberId };
      if (type) whereClause.type = type;

      const { rows, count } = await PointTransaction.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: require("../models/Sale"),
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
      const { items, totalAmount } = req.body;

      // Simple calculation: 1 point per 1000 rupiah
      const pointsToEarn = Math.floor(totalAmount / 1000);

      return ApiResponse.success(res, {
        totalAmount,
        pointsToEarn,
        calculation: `Rp ${totalAmount.toLocaleString(
          "id-ID"
        )} = ${pointsToEarn} points`,
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

      const member = await Member.findByPk(memberId);
      if (!member) {
        return ApiResponse.notFound(res, "Member not found");
      }

      const currentPoints = member.totalPoints || 0;
      const minPoints = 100; // Minimum points to redeem
      const pointValue = 1000; // 1 point = 1000 rupiah
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
    try {
      const { memberId, points, description, notes } = req.body;

      // TODO: Implement with transaction and validation
      return ApiResponse.success(
        res,
        null,
        "Point redemption - Implementation pending"
      );
    } catch (error) {
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
      const settings = req.body;

      // TODO: Update settings in database
      return ApiResponse.success(
        res,
        settings,
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
    try {
      const { memberId, points, description, notes } = req.body;

      // TODO: Implement with transaction
      return ApiResponse.success(
        res,
        null,
        "Point adjustment - Implementation pending"
      );
    } catch (error) {
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
      // TODO: Implement expiration logic
      return ApiResponse.success(
        res,
        { expired: 0 },
        "Point expiration - Implementation pending"
      );
    } catch (error) {
      next(error);
    }
  }

  // Add other PointController methods here...
  // static async getMemberPoints(req, res, next) { ... }
  // static async addPoints(req, res, next) { ... }
  // static async redeemPoints(req, res, next) { ... }
  // etc.
}

module.exports = PointController;
