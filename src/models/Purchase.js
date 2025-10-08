// ============================================
// src/models/Purchase.js (FIXED - NO ASSOCIATIONS!)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Purchase = sequelize.define(
  "Purchase",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "suppliers",
        key: "id",
      },
      onDelete: "RESTRICT",
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
      comment: "User yang input pembelian",
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Nomor faktur dari supplier",
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    purchaseType: {
      type: DataTypes.ENUM("TUNAI", "KREDIT", "KONSINYASI"),
      allowNull: false,
      defaultValue: "TUNAI",
      comment:
        "TUNAI = Bayar langsung, KREDIT = Hutang, KONSINYASI = Bayar yg laku",
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
    },
    paidAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Jumlah bayar tidak boleh negatif",
        },
      },
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
      comment: "Total amount - paid amount",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Jatuh tempo untuk kredit",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PARTIAL", "PAID", "CANCELLED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "purchases",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["supplier_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["purchase_date"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["purchase_type"],
      },
    ],
  }
);

// ❌ HAPUS SEMUA INI:
// const PurchaseItem = require("./PurchaseItem");
// Purchase.hasMany(PurchaseItem, { ... });
// PurchaseItem.belongsTo(Purchase, { ... });

// ✅ EXPORT HANYA MODEL
module.exports = Purchase;
