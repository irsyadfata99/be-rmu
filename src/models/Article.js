// src/models/Article.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Article = sequelize.define(
  "Article",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Judul artikel harus diisi" },
        len: {
          args: [5, 150],
          msg: "Judul minimal 5 dan maksimal 150 karakter",
        },
      },
    },

    slug: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    thumbImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Cover / thumbnail artikel",
    },

    excerpt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("DRAFT", "PUBLISHED"),
      defaultValue: "DRAFT",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Tanggal publikasi atau tanggal khusus artikel",
    },

    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "Jumlah views artikel",
    },
  },
  {
    tableName: "articles",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["slug"], unique: true },
      { fields: ["status"] },
      { fields: ["is_active"] },
    ],
  }
);

Article.prototype.toJSON = function () {
  return { ...this.get() };
};

module.exports = Article;
