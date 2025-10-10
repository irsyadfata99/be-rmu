// ============================================
// src/models/Sale.js (FIXED)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "members",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "User kasir yang input transaksi",
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: "Nomor faktur sudah digunakan",
      },
      comment: "Format: MMYY-XXX K/T (contoh: 0125-001 K)",
    },
    saleDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    saleType: {
      type: DataTypes.ENUM("TUNAI", "KREDIT"),
      allowNull: false,
      defaultValue: "TUNAI",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total tidak boleh negatif",
        },
      },
      comment: "Total sebelum discount",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Discount tidak boleh negatif",
        },
      },
      comment: "Total discount",
    },
    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Persentase discount tidak boleh negatif",
        },
        max: {
          args: [100],
          msg: "Persentase discount maksimal 100%",
        },
      },
    },
    finalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total akhir tidak boleh negatif",
        },
      },
      comment: "totalAmount - discountAmount",
    },
    dpAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "DP tidak boleh negatif",
        },
      },
      comment: "Down payment untuk kredit (opsional)",
    },
    remainingDebt: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Sisa hutang tidak boleh negatif",
        },
      },
      comment: "finalAmount - dpAmount (untuk kredit)",
    },
    paymentReceived: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Pembayaran tidak boleh negatif",
        },
      },
      comment: "Uang yang diterima dari pembeli (untuk tunai)",
    },
    changeAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Kembalian tidak boleh negatif",
        },
      },
      comment: "Kembalian untuk pembeli (untuk tunai)",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Jatuh tempo untuk kredit",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PARTIAL", "PAID", "CANCELLED"),
      allowNull: false,
      defaultValue: "PAID",
      comment: "PAID untuk tunai, PENDING/PARTIAL untuk kredit",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "sales",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["invoice_number"],
      },
      {
        fields: ["member_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["sale_date"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["sale_type"],
      },
    ],
  }
);

/**
 * After create sale, automatically record points if:
 * - Sale has memberId
 * - Point system is enabled
 * - Items exist
 */
Sale.afterCreate(async (sale, options) => {
  try {
    // Only process if member exists
    if (!sale.memberId) {
      console.log(`⏭️  Skip points - No member for sale ${sale.invoiceNumber}`);
      return;
    }

    // Check if point system is enabled
    const Setting = require("./Setting");
    const pointEnabled = await Setting.get("point_enabled");

    if (!pointEnabled || pointEnabled === "false") {
      console.log(`⏭️  Skip points - Point system disabled`);
      return;
    }

    // Import dependencies
    const PointTransaction = require("./PointTransaction");
    const SaleItem = require("./SaleItem");
    const { calculateTransactionPoints } = require("../utils/pointCalculator");

    // Get sale items
    const saleItems = await SaleItem.findAll({
      where: { saleId: sale.id },
      transaction: options.transaction,
    });

    if (saleItems.length === 0) {
      console.log(`⏭️  Skip points - No items for sale ${sale.invoiceNumber}`);
      return;
    }

    // Prepare items for point calculation
    const items = saleItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
      sellingPrice: parseFloat(item.sellingPrice),
    }));

    // Calculate points
    const pointResult = await calculateTransactionPoints(items);

    // If points > 0, record EARN transaction
    if (pointResult.totalPoints > 0) {
      await PointTransaction.recordEarn(
        sale.memberId,
        sale.id,
        pointResult.totalPoints,
        `Dapat point dari pembelian #${sale.invoiceNumber}`,
        options.transaction
      );

      console.log(
        `✅ Points earned: ${pointResult.totalPoints} points for sale ${sale.invoiceNumber} (Member: ${sale.memberId})`
      );
    } else {
      const reason = pointResult.reason || "Point calculation returned 0";
      console.log(
        `ℹ️  No points earned for sale ${sale.invoiceNumber}. Reason: ${reason}`
      );
    }
  } catch (error) {
    console.error(
      `❌ Error recording points for sale ${sale.invoiceNumber}:`,
      error.message
    );
    // Don't throw error to prevent sale creation failure
    // Just log it for monitoring
  }
});

module.exports = Sale;
