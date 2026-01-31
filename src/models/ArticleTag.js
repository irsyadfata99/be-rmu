const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ArticleTag = sequelize.define(
  "ArticleTag",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
  },
  {
    tableName: "article_tags",
    timestamps: true,
    underscored: true,
  }
);

module.exports = ArticleTag;
