// ============================================
// src/models/User.js
// User model untuk authentication
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: "Username sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Username harus diisi",
        },
        len: {
          args: [3, 50],
          msg: "Username minimal 3 karakter",
        },
        is: {
          args: /^[a-zA-Z0-9_]+$/,
          msg: "Username hanya boleh huruf, angka, dan underscore",
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: "Email sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Email harus diisi",
        },
        isEmail: {
          msg: "Format email tidak valid",
        },
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama harus diisi",
        },
        len: {
          args: [3, 100],
          msg: "Nama minimal 3 karakter",
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Password harus diisi",
        },
        len: {
          args: [6, 255],
          msg: "Password minimal 6 karakter",
        },
      },
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "KASIR"),
      allowNull: false,
      defaultValue: "KASIR",
      validate: {
        isIn: {
          args: [["ADMIN", "KASIR"]],
          msg: "Role harus ADMIN atau KASIR",
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
    tableName: "users",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["username"],
      },
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["is_active"],
      },
    ],
    hooks: {
      // Hash password before creating user
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Hash password before updating user
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Compare password
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>}
 */
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get user without password
 */
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
