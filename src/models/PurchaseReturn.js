// ============================================
// src/models/PurchaseReturn.js (OPTIMIZED - NO DUPLICATE INDEXES)
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
      // unique: true, // ✅ Index otomatis dari unique
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
      // ❌ HAPUS: return_number (sudah unique di field definition)
      // ❌ HAPUS: purchase_id (sudah ada index dari foreign key)
      {
        fields: ["supplier_id"], // ✅ Keep
      },
      {
        fields: ["return_date"], // ✅ Keep
      },
      {
        fields: ["status"], // ✅ Keep
      },
    ],
  }
);

const PurchaseReturnItem = sequelize.define(
  "PurchaseReturnItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseReturnId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "purchase_returns",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: "Quantity minimal 1",
        },
      },
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Harga tidak boleh negatif",
        },
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Subtotal tidak boleh negatif",
        },
      },
    },
  },
  {
    tableName: "purchase_return_items",
    timestamps: true,
    underscored: true,
    indexes: [
      // ❌ HAPUS: purchase_return_id (sudah ada dari foreign key)
      // ❌ HAPUS: product_id (sudah ada dari foreign key)
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

PurchaseReturn.prototype.toJSON = function () {
  const values = { ...this.get() };
  values.totalAmount = parseFloat(values.totalAmount);
  return values;
};

PurchaseReturnItem.prototype.toJSON = function () {
  const values = { ...this.get() };
  values.price = parseFloat(values.price);
  values.subtotal = parseFloat(values.subtotal);
  return values;
};

// ============================================
// ⚠️ NO ASSOCIATIONS HERE!
// All associations are defined in src/models/index.js
// ============================================

module.exports = { PurchaseReturn, PurchaseReturnItem };
