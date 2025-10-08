// ============================================
// src/models/PointTransaction.js (NEW)
// Model untuk transaksi point member
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PointTransaction = sequelize.define(
  "PointTransaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "members",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "sales",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      comment: "Referensi ke transaksi penjualan (jika dari pembelian)",
    },
    type: {
      type: DataTypes.ENUM("EARN", "REDEEM", "ADJUSTMENT", "EXPIRED"),
      allowNull: false,
      comment: "EARN = Dapat point dari belanja, REDEEM = Tukar point, ADJUSTMENT = Penyesuaian manual, EXPIRED = Point kadaluarsa",
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notZero(value) {
          if (value === 0) {
            throw new Error("Points tidak boleh 0");
          }
        },
      },
      comment: "Jumlah point (+ untuk EARN, - untuk REDEEM/EXPIRED)",
    },
    pointsBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total point sebelum transaksi",
    },
    pointsAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total point setelah transaksi",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Deskripsi transaksi point",
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Tanggal kadaluarsa point (hanya untuk type EARN)",
    },
    isExpired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Status apakah point sudah expired",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      comment: "User yang membuat transaksi (untuk ADJUSTMENT/REDEEM)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "point_transactions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["member_id"],
      },
      {
        fields: ["sale_id"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["expiry_date"],
      },
      {
        fields: ["is_expired"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if point is expired
 */
PointTransaction.prototype.checkExpiry = function () {
  if (this.type !== "EARN" || !this.expiryDate) return false;
  return new Date() > new Date(this.expiryDate);
};

/**
 * Get days until expiry
 */
PointTransaction.prototype.getDaysUntilExpiry = function () {
  if (this.type !== "EARN" || !this.expiryDate) return null;
  if (this.isExpired) return 0;

  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Get formatted data for response
 */
PointTransaction.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Add computed fields
  if (this.type === "EARN") {
    values.daysUntilExpiry = this.getDaysUntilExpiry();
  }

  return values;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Record EARN points (dari pembelian)
 * @param {string} memberId - Member ID
 * @param {string} saleId - Sale ID
 * @param {number} points - Jumlah point yang didapat
 * @param {string} description - Deskripsi
 * @param {object} transaction - Sequelize transaction (optional)
 */
PointTransaction.recordEarn = async function (memberId, saleId, points, description, transaction = null) {
  const Member = require("./Member");

  // Get member
  const member = await Member.findByPk(memberId, { transaction });
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  const pointsBefore = member.totalPoints;
  const pointsAfter = pointsBefore + points;

  // Get expiry date from settings (default 12 months)
  const Setting = require("./Setting");
  const expiryMonths = (await Setting.get("point_expiry_months")) || 12;

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

  // Create point transaction
  const pointTrx = await this.create(
    {
      memberId,
      saleId,
      type: "EARN",
      points,
      pointsBefore,
      pointsAfter,
      description,
      expiryDate,
      isExpired: false,
    },
    { transaction }
  );

  // Update member total points
  member.totalPoints = pointsAfter;
  await member.save({ transaction });

  return pointTrx;
};

/**
 * Record REDEEM points (penukaran point)
 * @param {string} memberId - Member ID
 * @param {number} points - Jumlah point yang ditukar (positive number)
 * @param {string} description - Deskripsi
 * @param {string} userId - User yang melakukan redeem
 * @param {object} transaction - Sequelize transaction (optional)
 */
PointTransaction.recordRedeem = async function (memberId, points, description, userId, transaction = null) {
  const Member = require("./Member");

  // Get member
  const member = await Member.findByPk(memberId, { transaction });
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  // Check if member has enough points
  if (member.totalPoints < points) {
    throw new Error(`Point tidak cukup. Tersedia: ${member.totalPoints}, Diminta: ${points}`);
  }

  const pointsBefore = member.totalPoints;
  const pointsAfter = pointsBefore - points;

  // Create point transaction (negative for redeem)
  const pointTrx = await this.create(
    {
      memberId,
      saleId: null,
      type: "REDEEM",
      points: -points, // Negative value
      pointsBefore,
      pointsAfter,
      description,
      expiryDate: null,
      isExpired: false,
      createdBy: userId,
    },
    { transaction }
  );

  // Update member total points
  member.totalPoints = pointsAfter;
  await member.save({ transaction });

  return pointTrx;
};

/**
 * Record ADJUSTMENT (penyesuaian manual oleh admin)
 * @param {string} memberId - Member ID
 * @param {number} points - Jumlah point adjustment (bisa + atau -)
 * @param {string} description - Deskripsi
 * @param {string} userId - Admin yang melakukan adjustment
 * @param {string} notes - Catatan tambahan
 * @param {object} transaction - Sequelize transaction (optional)
 */
PointTransaction.recordAdjustment = async function (memberId, points, description, userId, notes = null, transaction = null) {
  const Member = require("./Member");

  // Get member
  const member = await Member.findByPk(memberId, { transaction });
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  const pointsBefore = member.totalPoints;
  const pointsAfter = pointsBefore + points;

  // Validate: pointsAfter tidak boleh negatif
  if (pointsAfter < 0) {
    throw new Error(`Adjustment gagal. Point akan menjadi negatif (${pointsAfter})`);
  }

  // Create point transaction
  const pointTrx = await this.create(
    {
      memberId,
      saleId: null,
      type: "ADJUSTMENT",
      points,
      pointsBefore,
      pointsAfter,
      description,
      expiryDate: null,
      isExpired: false,
      createdBy: userId,
      notes,
    },
    { transaction }
  );

  // Update member total points
  member.totalPoints = pointsAfter;
  await member.save({ transaction });

  return pointTrx;
};

/**
 * Expire points yang sudah lewat tanggal kadaluarsa
 * (Dipanggil via CRON job atau manual)
 */
PointTransaction.expirePoints = async function () {
  const { Op } = require("sequelize");
  const Member = require("./Member");

  // Find all EARN points that are expired but not marked as expired
  const expiredPoints = await this.findAll({
    where: {
      type: "EARN",
      isExpired: false,
      expiryDate: {
        [Op.lt]: new Date(),
      },
    },
  });

  let totalExpired = 0;
  const results = [];

  for (const earnTrx of expiredPoints) {
    const t = await sequelize.transaction();

    try {
      const member = await Member.findByPk(earnTrx.memberId, { transaction: t });

      if (!member) {
        await t.rollback();
        continue;
      }

      // Mark original earn as expired
      earnTrx.isExpired = true;
      await earnTrx.save({ transaction: t });

      // Create EXPIRED transaction (negative)
      const pointsBefore = member.totalPoints;
      const pointsToDeduct = earnTrx.points;
      const pointsAfter = Math.max(0, pointsBefore - pointsToDeduct);

      const expiredTrx = await this.create(
        {
          memberId: member.id,
          saleId: null,
          type: "EXPIRED",
          points: -pointsToDeduct,
          pointsBefore,
          pointsAfter,
          description: `Point kadaluarsa dari transaksi ${earnTrx.createdAt.toLocaleDateString()}`,
          expiryDate: null,
          isExpired: false,
          notes: `Original transaction ID: ${earnTrx.id}`,
        },
        { transaction: t }
      );

      // Update member total points
      member.totalPoints = pointsAfter;
      await member.save({ transaction: t });

      await t.commit();

      totalExpired++;
      results.push({
        memberId: member.id,
        memberName: member.fullName,
        pointsExpired: pointsToDeduct,
        originalDate: earnTrx.createdAt,
      });
    } catch (error) {
      await t.rollback();
      console.error(`Error expiring points for transaction ${earnTrx.id}:`, error);
    }
  }

  return {
    totalExpired,
    details: results,
  };
};

/**
 * Get point summary for a member
 */
PointTransaction.getMemberSummary = async function (memberId) {
  const { Op } = require("sequelize");
  const Member = require("./Member");

  const member = await Member.findByPk(memberId);
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  // Total earned (all time)
  const totalEarned = await this.sum("points", {
    where: {
      memberId,
      type: "EARN",
    },
  });

  // Total redeemed
  const totalRedeemed = await this.sum("points", {
    where: {
      memberId,
      type: "REDEEM",
    },
  });

  // Total expired
  const totalExpired = await this.sum("points", {
    where: {
      memberId,
      type: "EXPIRED",
    },
  });

  // Points expiring soon (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringSoon = await this.sum("points", {
    where: {
      memberId,
      type: "EARN",
      isExpired: false,
      expiryDate: {
        [Op.between]: [new Date(), thirtyDaysFromNow],
      },
    },
  });

  return {
    memberId: member.id,
    memberName: member.fullName,
    currentPoints: member.totalPoints,
    totalEarned: totalEarned || 0,
    totalRedeemed: Math.abs(totalRedeemed || 0),
    totalExpired: Math.abs(totalExpired || 0),
    expiringSoon: expiringSoon || 0,
  };
};

/**
 * Get member's point history with pagination
 */
PointTransaction.getMemberHistory = async function (memberId, page = 1, limit = 20, type = null) {
  const offset = (page - 1) * limit;

  const whereClause = { memberId };
  if (type) {
    whereClause.type = type;
  }

  const { rows, count } = await this.findAndCountAll({
    where: whereClause,
    order: [["created_at", "DESC"]],
    limit,
    offset,
    include: [
      {
        model: require("./Sale"),
        as: "sale",
        attributes: ["id", "invoiceNumber", "finalAmount"],
        required: false,
      },
    ],
  });

  return {
    transactions: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

module.exports = PointTransaction;
