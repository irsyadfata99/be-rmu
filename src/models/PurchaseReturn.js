// ============================================
// src/models/PurchaseReturn.js
// Model untuk retur pembelian (barang kembali ke supplier)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PurchaseReturn = sequelize.define(
  "PurchaseReturn",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "purchases",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
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
    },
    returnNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Nomor retur (auto-generate)",
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Alasan retur",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "purchase_returns",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["return_number"],
      },
      {
        fields: ["purchase_id"],
      },
      {
        fields: ["supplier_id"],
      },
      {
        fields: ["return_date"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

module.exports = PurchaseReturn;
