// ============================================
// src/models/User.js - FIXED VERSION
// User model dengan STRONG password validation
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
          args: [8, 255], // ✅ FIX: Changed from 6 to 8 minimum
          msg: "Password minimal 8 karakter",
        },
        // ✅ FIX: Added strong password validation
        isStrongPassword(value) {
          // Check minimum length
          if (value.length < 8) {
            throw new Error("Password minimal 8 karakter");
          }

          // Check for at least one uppercase letter
          if (!/[A-Z]/.test(value)) {
            throw new Error("Password harus mengandung minimal 1 huruf besar (A-Z)");
          }

          // Check for at least one lowercase letter
          if (!/[a-z]/.test(value)) {
            throw new Error("Password harus mengandung minimal 1 huruf kecil (a-z)");
          }

          // Check for at least one number
          if (!/[0-9]/.test(value)) {
            throw new Error("Password harus mengandung minimal 1 angka (0-9)");
          }

          // Check for at least one special character
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
            throw new Error("Password harus mengandung minimal 1 karakter spesial (!@#$%^&*)");
          }

          // Check for common weak passwords
          const weakPasswords = ["password123", "admin123", "12345678", "qwerty123", "password1", "abc12345", "admin1234", "kasir1234"];

          if (weakPasswords.includes(value.toLowerCase())) {
            throw new Error("Password terlalu umum, gunakan password yang lebih kuat");
          }

          // Check for sequential characters
          if (/(.)\1{2,}/.test(value)) {
            throw new Error("Password tidak boleh mengandung karakter berulang berturut-turut (contoh: aaa, 111)");
          }

          return true;
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
    // ✅ FIX: Added password-related security fields
    lastPasswordChange: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastFailedLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accountLockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
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
          // ✅ FIX: Increased salt rounds from 10 to 12 for better security
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
          user.lastPasswordChange = new Date();
        }
      },
      // Hash password before updating user
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          // ✅ FIX: Increased salt rounds from 10 to 12 for better security
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
          user.lastPasswordChange = new Date();
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
 * ✅ FIX: Added method to check if account is locked
 * @returns {boolean}
 */
User.prototype.isAccountLocked = function () {
  if (!this.accountLockedUntil) return false;
  return new Date() < this.accountLockedUntil;
};

/**
 * ✅ FIX: Added method to increment failed login attempts
 * @returns {Promise<void>}
 */
User.prototype.incrementFailedLogins = async function () {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();

  // Lock account after 5 failed attempts for 15 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  await this.save();
};

/**
 * ✅ FIX: Added method to reset failed login attempts
 * @returns {Promise<void>}
 */
User.prototype.resetFailedLogins = async function () {
  if (this.failedLoginAttempts > 0 || this.accountLockedUntil) {
    this.failedLoginAttempts = 0;
    this.lastFailedLogin = null;
    this.accountLockedUntil = null;
    await this.save();
  }
};

/**
 * ✅ FIX: Added method to check if password needs to be changed (older than 90 days)
 * @returns {boolean}
 */
User.prototype.needsPasswordChange = function () {
  if (!this.lastPasswordChange) return true;

  const daysSinceChange = Math.floor((new Date() - new Date(this.lastPasswordChange)) / (1000 * 60 * 60 * 24));

  return daysSinceChange > 90; // Password expires after 90 days
};

/**
 * Get user without password
 */
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  // ✅ FIX: Also hide sensitive security fields
  delete values.failedLoginAttempts;
  delete values.accountLockedUntil;
  return values;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * ✅ FIX: Added static method to validate password strength before hashing
 * @param {string} password - Plain text password
 * @returns {object} - { valid: boolean, errors: string[] }
 */
User.validatePasswordStrength = function (password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push("Password minimal 8 karakter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 huruf besar (A-Z)");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 huruf kecil (a-z)");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 angka (0-9)");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 karakter spesial (!@#$%^&*)");
  }

  const weakPasswords = ["password123", "admin123", "12345678", "qwerty123", "password1", "abc12345", "admin1234", "kasir1234"];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push("Password terlalu umum, gunakan password yang lebih kuat");
  }

  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password tidak boleh mengandung karakter berulang berturut-turut");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = User;
