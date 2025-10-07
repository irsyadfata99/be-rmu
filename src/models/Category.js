// ============================================
// src/models/Category.js
// Category model untuk kategori produk
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
          msg: "Nama kategori harus diisi",
        },
        len: {
          args: [3, 50],
          msg: "Nama kategori minimal 3 karakter",
        },
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: "Deskripsi maksimal 255 karakter",
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "categories",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["name"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

module.exports = Category;
