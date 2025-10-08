// ============================================
// src/models/Supplier.js
// Model untuk data supplier
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Supplier = sequelize.define(
  "Supplier",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: {
        msg: "Kode supplier sudah digunakan",
      },
      comment: "Kode unik supplier (SUP-001, SUP-002, dll)",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama supplier harus diisi",
        },
        len: {
          args: [3, 100],
          msg: "Nama supplier minimal 3 karakter",
        },
      },
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: {
          args: /^[0-9+\-\s()]*$/,
          msg: "Format nomor telepon tidak valid",
        },
      },
    },
    contactPerson: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Nama contact person supplier",
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: {
          msg: "Format email tidak valid",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalDebt: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total hutang tidak boleh negatif",
        },
      },
      comment: "Total hutang ke supplier",
    },
    totalPurchases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total pembelian tidak boleh negatif",
        },
      },
      comment: "Total jumlah transaksi pembelian",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "suppliers",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        fields: ["name"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate kode supplier otomatis (SUP-001, SUP-002, dll)
 */
Supplier.generateCode = async function () {
  const lastSupplier = await this.findOne({
    order: [["code", "DESC"]],
  });

  let nextNumber = 1;

  if (lastSupplier) {
    const lastNumber = parseInt(lastSupplier.code.split("-")[1]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `SUP-${paddedNumber}`;
};

/**
 * Get supplier by code
 */
Supplier.findByCode = async function (code) {
  return await this.findOne({ where: { code } });
};

module.exports = Supplier;
