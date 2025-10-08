// ============================================
// src/models/SaleItem.js
// Model untuk detail item penjualan
// ============================================
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
// ASSOCIATIONS
// ============================================
Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items",
  onDelete: "CASCADE",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Calculate totals
 */
Sale.prototype.calculateTotals = function () {
  this.finalAmount = this.totalAmount - this.discountAmount;
  this.remainingDebt = this.finalAmount - this.dpAmount;
  this.changeAmount = this.paymentReceived - this.finalAmount;
};

/**
 * Check if fully paid
 */
Sale.prototype.isFullyPaid = function () {
  return parseFloat(this.remainingDebt) === 0;
};

module.exports = { Sale, SaleItem };
