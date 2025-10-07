// ============================================
// 1. src/models/User.js
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
          msg: "Username tidak boleh kosong",
        },
        len: {
          args: [3, 50],
          msg: "Username harus 3-50 karakter",
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
          msg: "Email tidak boleh kosong",
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
          msg: "Nama tidak boleh kosong",
        },
        len: {
          args: [3, 100],
          msg: "Nama harus 3-100 karakter",
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Password tidak boleh kosong",
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
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    hooks: {
      // Hash password before create
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Hash password before update
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Instance method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get user data without password
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
