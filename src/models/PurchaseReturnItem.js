// ============================================
// src/models/PurchaseReturnItem.js
// ============================================
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
      {
        fields: ["purchase_return_id"],
      },
      {
        fields: ["product_id"],
      },
    ],
  }
);

module.exports = PurchaseReturnItem;
