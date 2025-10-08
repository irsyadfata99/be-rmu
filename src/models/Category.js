// ============================================
// src/models/Category.js (UPDATED - WITH POINTS MULTIPLIER)
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
    // ===== NEW: POINTS MULTIPLIER =====
    pointsMultiplier: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: {
          args: [0],
          msg: "Points multiplier tidak boleh negatif",
        },
        max: {
          args: [100],
          msg: "Points multiplier maksimal 100",
        },
      },
      comment: "Pengali point untuk mode PER_CATEGORY (1.0 = normal, 1.5 = bonus 50%, 2.0 = double)",
    },
    // ==================================
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

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get formatted data for response
 */
Category.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Format decimal to number
  if (values.pointsMultiplier) {
    values.pointsMultiplier = parseFloat(values.pointsMultiplier);
  }

  return values;
};

module.exports = Category;
