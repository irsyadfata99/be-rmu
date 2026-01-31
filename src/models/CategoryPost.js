// ============================================
// Kategori untuk Artikel / Berita
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CategoryPost = sequelize.define(
  "CategoryPost",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama kategori harus diisi",
        },
        len: {
          args: [3, 50],
          msg: "Nama kategori minimal 3 dan maksimal 50 karakter",
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
      comment: "Status aktif kategori artikel",
    },
  },
  {
    tableName: "categories_posts",
    timestamps: true,
    underscored: true,

    // ❗ INDEX DI SINI (AMAN DARI 64 KEYS)
    indexes: [
      {
        unique: true,
        fields: ["name"],
        name: "category_posts_name_unique",
      },
      {
        fields: ["is_active"],
        name: "category_posts_is_active_index",
      },
    ],

    // Default scope → hanya aktif
    defaultScope: {
      where: { is_active: true },
      order: [["name", "ASC"]],
    },

    // Scope tambahan
    scopes: {
      all: {
        where: {},
      },
      inactive: {
        where: { is_active: false },
      },
    },
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

CategoryPost.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

// ============================================
// STATIC METHODS
// ============================================

CategoryPost.getAllActive = async function () {
  return await this.findAll();
};

CategoryPost.getAllWithInactive = async function () {
  return await this.scope("all").findAll();
};

module.exports = CategoryPost;
