// ============================================
// src/controllers/PointController.js (NEW)
// Controller untuk Point Management
// ============================================
const PointTransaction = require("../models/PointTransaction");
const Member = require("../models/Member");
const Setting = require("../models/Setting");
const ApiResponse = require("../utils/response");
const { sequelize } = require("../config/database");
const { getPointPreview, validatePointRedemption, calculatePointValue } = require("../utils/pointCalculator");

class PointController {
  // ============================================
  // GET /api/points/settings - Get Point Settings
  // ============================================
  static async getSettings(req, res, next) {
    try {
      const settings = {
        pointEnabled: await Setting.get("point_enabled", true),
        pointSystemMode: await Setting.get("point_system_mode", "GLOBAL"),
        pointPerAmount: await Setting.get("point_per_amount", 1000),
        pointDecimalRounding: await Setting.get("point_decimal_rounding", "DOWN"),
        minTransactionForPoints: await Setting.get("min_transaction_for_points", 0),
        pointExpiryMonths: await Setting.get("point_expiry_months", 12),
      };

      return ApiResponse.success(res, settings, "Point settings retrieved successfully");
    } catch (error) {
      console.error("Error getting point settings:", error);
      next(error);
    }
  }

  // ============================================
  // PUT /api/points/settings - Update Point Settings (ADMIN ONLY)
  // ============================================
  static async updateSettings(req, res, next) {
    try {
      const { pointEnabled, pointSystemMode, pointPerAmount, pointDecimalRounding, minTransactionForPoints, pointExpiryMonths } = req.body;

      // Validate pointSystemMode
      if (pointSystemMode && !["GLOBAL", "PER_PRODUCT", "PER_CATEGORY"].includes(pointSystemMode)) {
        return ApiResponse.validationError(res, { pointSystemMode: ["Mode harus: GLOBAL, PER_PRODUCT, atau PER_CATEGORY"] }, "Validation Error");
      }

      // Validate rounding
      if (pointDecimalRounding && !["UP", "DOWN", "NEAREST"].includes(pointDecimalRounding)) {
        return ApiResponse.validationError(res, { pointDecimalRounding: ["Rounding harus: UP, DOWN, atau NEAREST"] }, "Validation Error");
      }

      // Update settings
      if (pointEnabled !== undefined) {
        await Setting.set("point_enabled", pointEnabled.toString(), "BOOLEAN", "POINTS");
      }
      if (pointSystemMode) {
        await Setting.set("point_system_mode", pointSystemMode, "TEXT", "POINTS");
      }
      if (pointPerAmount) {
        await Setting.set("point_per_amount", pointPerAmount.toString(), "NUMBER", "POINTS");
      }
      if (pointDecimalRounding) {
        await Setting.set("point_decimal_rounding", pointDecimalRounding, "TEXT", "POINTS");
      }
      if (minTransactionForPoints !== undefined) {
        await Setting.set("min_transaction_for_points", minTransactionForPoints.toString(), "NUMBER", "POINTS");
      }
      if (pointExpiryMonths) {
        await Setting.set("point_expiry_months", pointExpiryMonths.toString(), "NUMBER", "POINTS");
      }

      // Get updated settings
      const updatedSettings = {
        pointEnabled: await Setting.get("point_enabled", true),
        pointSystemMode: await Setting.get("point_system_mode", "GLOBAL"),
        pointPerAmount: await Setting.get("point_per_amount", 1000),
        pointDecimalRounding: await Setting.get("point_decimal_rounding", "DOWN"),
        minTransactionForPoints: await Setting.get("min_transaction_for_points", 0),
        pointExpiryMonths: await Setting.get("point_expiry_months", 12),
      };

      console.log(`✅ Point settings updated by: ${req.user.name}`);

      return ApiResponse.success(res, updatedSettings, "Point settings updated successfully");
    } catch (error) {
      console.error("Error updating point settings:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/points/member/:memberId - Get Member Point Summary
  // ============================================
  static async getMemberSummary(req, res, next) {
    try {
      const { memberId } = req.params;

      const summary = await PointTransaction.getMemberSummary(memberId);

      return ApiResponse.success(res, summary, "Member point summary retrieved successfully");
    } catch (error) {
      if (error.message === "Member tidak ditemukan") {
        return ApiResponse.notFound(res, error.message);
      }
      console.error("Error getting member summary:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/points/member/:memberId/history - Get Member Point History
  // ============================================
  static async getMemberHistory(req, res, next) {
    try {
      const { memberId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const result = await PointTransaction.getMemberHistory(memberId, parseInt(page), parseInt(limit), type);

      return ApiResponse.paginated(res, result.transactions, result.pagination, "Point history retrieved successfully");
    } catch (error) {
      console.error("Error getting member history:", error);
      next(error);
    }
  }

  // ============================================
  // POST /api/points/redeem - Redeem Points (Tukar Point)
  // ============================================
  static async redeemPoints(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { memberId, points, description, notes } = req.body;
      const userId = req.user.id;

      // Validation
      if (!memberId || !points) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? ["Member ID harus diisi"] : undefined,
            points: !points ? ["Jumlah point harus diisi"] : undefined,
          },
          "Validation Error"
        );
      }

      if (points <= 0) {
        await t.rollback();
        return ApiResponse.validationError(res, { points: ["Jumlah point harus lebih dari 0"] }, "Validation Error");
      }

      // Get member
      const member = await Member.findByPk(memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return ApiResponse.notFound(res, "Member tidak ditemukan");
      }

      // Check if member has enough points
      if (member.totalPoints < points) {
        await t.rollback();
        return ApiResponse.error(res, `Point tidak cukup. Tersedia: ${member.totalPoints}, Diminta: ${points}`, 400);
      }

      // Record redemption
      const pointTrx = await PointTransaction.recordRedeem(memberId, points, description || `Penukaran ${points} point`, userId, t);

      await t.commit();

      // Load complete transaction
      const completeTrx = await PointTransaction.findByPk(pointTrx.id, {
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "totalPoints"],
          },
        ],
      });

      const pointValue = calculatePointValue(points);

      console.log(`✅ Points redeemed: ${member.fullName} - ${points} points (Rp ${pointValue.toLocaleString("id-ID")})`);

      return ApiResponse.created(
        res,
        {
          transaction: completeTrx,
          pointValue,
        },
        "Points redeemed successfully"
      );
    } catch (error) {
      await t.rollback();
      console.error("Error redeeming points:", error);
      next(error);
    }
  }

  // ============================================
  // POST /api/points/adjust - Adjust Points (ADMIN ONLY)
  // ============================================
  static async adjustPoints(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { memberId, points, description, notes } = req.body;
      const userId = req.user.id;

      // Validation
      if (!memberId || !points || !description) {
        await t.rollback();
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? ["Member ID harus diisi"] : undefined,
            points: !points ? ["Jumlah point harus diisi"] : undefined,
            description: !description ? ["Deskripsi harus diisi"] : undefined,
          },
          "Validation Error"
        );
      }

      if (points === 0) {
        await t.rollback();
        return ApiResponse.validationError(res, { points: ["Point adjustment tidak boleh 0"] }, "Validation Error");
      }

      // Record adjustment
      const pointTrx = await PointTransaction.recordAdjustment(memberId, parseInt(points), description, userId, notes, t);

      await t.commit();

      // Load complete transaction
      const completeTrx = await PointTransaction.findByPk(pointTrx.id, {
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "totalPoints"],
          },
        ],
      });

      console.log(`✅ Points adjusted: ${completeTrx.member.fullName} ${points > 0 ? "+" : ""}${points} points by ${req.user.name}`);

      return ApiResponse.created(res, completeTrx, "Points adjusted successfully");
    } catch (error) {
      await t.rollback();

      if (error.message.includes("Point akan menjadi negatif")) {
        return ApiResponse.error(res, error.message, 400);
      }

      if (error.message === "Member tidak ditemukan") {
        return ApiResponse.notFound(res, error.message);
      }

      console.error("Error adjusting points:", error);
      next(error);
    }
  }

  // ============================================
  // POST /api/points/expire - Expire Old Points (ADMIN ONLY)
  // ============================================
  static async expirePoints(req, res, next) {
    try {
      const result = await PointTransaction.expirePoints();

      console.log(`✅ Points expired: ${result.totalExpired} transactions by ${req.user.name}`);

      return ApiResponse.success(res, result, `Successfully expired ${result.totalExpired} point transactions`);
    } catch (error) {
      console.error("Error expiring points:", error);
      next(error);
    }
  }

  // ============================================
  // POST /api/points/preview - Preview Point Calculation
  // ============================================
  static async previewCalculation(req, res, next) {
    try {
      const { items } = req.body;

      if (!items || items.length === 0) {
        return ApiResponse.validationError(res, { items: ["Items harus diisi"] }, "Validation Error");
      }

      const preview = await getPointPreview(items);

      return ApiResponse.success(res, preview, "Point calculation preview");
    } catch (error) {
      console.error("Error previewing points:", error);
      next(error);
    }
  }

  // ============================================
  // POST /api/points/validate-redemption - Validate Point Redemption
  // ============================================
  static async validateRedemption(req, res, next) {
    try {
      const { memberId, pointsToRedeem, transactionAmount } = req.body;

      if (!memberId || !pointsToRedeem || !transactionAmount) {
        return ApiResponse.validationError(
          res,
          {
            memberId: !memberId ? ["Member ID harus diisi"] : undefined,
            pointsToRedeem: !pointsToRedeem ? ["Point to redeem harus diisi"] : undefined,
            transactionAmount: !transactionAmount ? ["Transaction amount harus diisi"] : undefined,
          },
          "Validation Error"
        );
      }

      const member = await Member.findByPk(memberId);
      if (!member) {
        return ApiResponse.notFound(res, "Member tidak ditemukan");
      }

      const validation = validatePointRedemption(member.totalPoints, parseInt(pointsToRedeem), parseFloat(transactionAmount));

      return ApiResponse.success(res, validation, "Redemption validation result");
    } catch (error) {
      console.error("Error validating redemption:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/points/transactions - Get All Point Transactions (ADMIN)
  // ============================================
  static async getAllTransactions(req, res, next) {
    try {
      const { page = 1, limit = 20, type, memberId } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (type) whereClause.type = type;
      if (memberId) whereClause.memberId = memberId;

      const { rows, count } = await PointTransaction.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName"],
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
}

module.exports = PointController;
