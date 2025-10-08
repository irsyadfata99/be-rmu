// ============================================
// src/models/SalesReturnItem.js
// ============================================
const SalesReturnItem = sequelize.define(
  "SalesReturnItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    salesReturnId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "sales_returns",
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
        min: 1,
      },
    },
  },
  {
    timestamps: true,
    underscored: true,
  }
);
SalesReturnItem.associate = (models) => {
  SalesReturnItem.belongsTo(models.SalesReturn, {
    foreignKey: "salesReturnId",
    as: "salesReturn",
  });
  SalesReturnItem.belongsTo(models.Product, {
    foreignKey: "productId",
    as: "product",
  });
};

module.exports = SalesReturnItem;
