// ============================================
// 1. src/models/Category.js
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: "Nama kategori sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Nama kategori tidak boleh kosong",
        },
        len: {
          args: [3, 50],
          msg: "Nama kategori harus 3-50 karakter",
        },
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "categories",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Category;
