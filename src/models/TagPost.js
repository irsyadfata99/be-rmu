// ============================================
// Model untuk Tag Post Berita / Artikel
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TagPost = sequelize.define(
  "TagPost",
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
          msg: "Nama tag harus diisi",
        },
        len: {
          args: [2, 50],
          msg: "Nama tag minimal 2 dan maksimal 50 karakter",
        },
      },
    },

    slug: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
      comment: "Slug SEO friendly untuk tag",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Status aktif tag",
    },
  },
  {
    tableName: "tag_posts",
    timestamps: true,
    underscored: true,

    // ❗ INDEX DIBERI NAMA (AMAN)
    indexes: [
      {
        unique: true,
        fields: ["slug"],
        name: "tag_posts_slug_unique",
      },
      {
        fields: ["is_active"],
        name: "tag_posts_is_active_index",
      },
    ],

    // Default hanya tag aktif
    defaultScope: {
      where: { is_active: true },
      order: [["name", "ASC"]],
    },

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

TagPost.prototype.toJSON = function () {
  return { ...this.get() };
};

// ============================================
// STATIC METHODS
// ============================================

TagPost.getAllActive = async function () {
  return await this.findAll();
};

TagPost.getAllWithInactive = async function () {
  return await this.scope("all").findAll();
};

module.exports = TagPost;
