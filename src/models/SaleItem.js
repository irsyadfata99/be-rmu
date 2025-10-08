// ============================================
// src/models/SaleItem.js (UPDATED - WITH POINTS EARNED)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SaleItem = sequelize.define(
  "SaleItem",
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
    productName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Nama produk saat transaksi (snapshot)",
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
      comment: "Satuan kemasan",
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Harga jual tidak boleh negatif",
        },
      },
      comment: "Harga jual per unit saat transaksi",
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
      comment: "quantity * sellingPrice",
    },
    // ===== NEW: POINTS EARNED =====
    pointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Points earned tidak boleh negatif",
        },
      },
      comment: "Point yang didapat dari item ini",
    },
    // ==============================
  },
  {
    tableName: "sale_items",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["sale_id"],
      },
      {
        fields: ["product_id"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get formatted data for response
 */
SaleItem.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Format decimals to number
  if (values.sellingPrice) {
    values.sellingPrice = parseFloat(values.sellingPrice);
  }
  if (values.subtotal) {
    values.subtotal = parseFloat(values.subtotal);
  }

  return values;
};

module.exports = SaleItem;
