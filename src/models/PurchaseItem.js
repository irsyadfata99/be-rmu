// ============================================
// src/models/PurchaseItem.js
// Model untuk detail item pembelian
// ============================================
const PurchaseItem = sequelize.define(
  "PurchaseItem",
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
      comment: "Satuan kemasan",
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Harga beli tidak boleh negatif",
        },
      },
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
    },
    expDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Tanggal expired untuk batch ini",
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
      comment: "quantity * purchasePrice",
    },
  },
  {
    tableName: "purchase_items",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["purchase_id"],
      },
      {
        fields: ["product_id"],
      },
    ],
  }
);

module.exports = PurchaseItem;

// ============================================
// ASSOCIATIONS
// ============================================
Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items",
  onDelete: "CASCADE",
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

module.exports = { Purchase, PurchaseItem };
