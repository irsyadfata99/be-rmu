// ============================================
// src/models/SalesReturn.js
// Model untuk retur penjualan (barang kembali dari member)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SalesReturn = sequelize.define(
  "SalesReturn",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "sales",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
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
    refundMethod: {
      type: DataTypes.ENUM("CASH", "DEBT_DEDUCTION", "STORE_CREDIT"),
      allowNull: false,
      defaultValue: "CASH",
      comment: "Metode pengembalian dana",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "sales_returns",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["return_number"],
      },
      {
        fields: ["sale_id"],
      },
      {
        fields: ["member_id"],
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

module.exports = SalesReturn;
