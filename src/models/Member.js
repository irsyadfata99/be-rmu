// ============================================
// src/models/Member.js
// Model untuk tabel members
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Member = sequelize.define(
  "Member",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    uniqueId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: {
        msg: "Unique ID sudah digunakan",
      },
      comment: "Format: BDG-001, KBG-002, dll",
    },
    nik: {
      type: DataTypes.STRING(16),
      allowNull: false,
      unique: {
        msg: "NIK sudah terdaftar",
      },
      validate: {
        len: {
          args: [16, 16],
          msg: "NIK harus 16 digit",
        },
        isNumeric: {
          msg: "NIK hanya boleh berisi angka",
        },
      },
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama lengkap harus diisi",
        },
        len: {
          args: [3, 100],
          msg: "Nama lengkap minimal 3 karakter",
        },
      },
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Alamat harus diisi",
        },
        len: {
          args: [10, 255],
          msg: "Alamat minimal 10 karakter",
        },
      },
    },
    regionCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Kode wilayah harus diisi",
        },
      },
      comment: "Kode wilayah: BDG, KBG, CMH, dll",
    },
    regionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama wilayah harus diisi",
        },
      },
    },
    whatsapp: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nomor WhatsApp harus diisi",
        },
        is: {
          args: /^08\d{8,11}$/,
          msg: "Format nomor WhatsApp tidak valid (contoh: 081234567890)",
        },
      },
    },
    gender: {
      type: DataTypes.ENUM("Laki-laki", "Perempuan"),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Jenis kelamin harus dipilih",
        },
        isIn: {
          args: [["Laki-laki", "Perempuan"]],
          msg: "Jenis kelamin harus Laki-laki atau Perempuan",
        },
      },
    },
    totalDebt: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total hutang tidak boleh negatif",
        },
      },
      comment: "Total hutang member ke koperasi",
    },
    totalTransactions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total transaksi tidak boleh negatif",
        },
      },
    },
    monthlySpending: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Pengeluaran bulanan tidak boleh negatif",
        },
      },
      comment: "Total belanja bulan ini",
    },
    totalPoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Total poin tidak boleh negatif",
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
    tableName: "members",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["unique_id"],
      },
      {
        unique: true,
        fields: ["nik"],
      },
      {
        fields: ["region_code"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["full_name"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get formatted member info for response
 */
Member.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Format decimal to number
  if (values.totalDebt) {
    values.totalDebt = parseFloat(values.totalDebt);
  }
  if (values.monthlySpending) {
    values.monthlySpending = parseFloat(values.monthlySpending);
  }

  return values;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate unique ID berdasarkan region code
 * Format: BDG-001, KBG-002, dll
 */
Member.generateUniqueId = async function (regionCode) {
  // Cari member terakhir di region tersebut
  const lastMember = await this.findOne({
    where: { regionCode },
    order: [["unique_id", "DESC"]],
  });

  let nextNumber = 1;

  if (lastMember) {
    // Extract number dari uniqueId (contoh: BDG-001 -> 001)
    const lastNumber = parseInt(lastMember.uniqueId.split("-")[1]) || 0;
    nextNumber = lastNumber + 1;
  }

  // Format: BDG-001, BDG-002, dst
  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${regionCode}-${paddedNumber}`;
};

/**
 * Search member by uniqueId
 */
Member.searchByUniqueId = async function (uniqueId) {
  const member = await this.findOne({
    where: { uniqueId },
  });

  if (!member) {
    throw new Error("Anggota tidak ditemukan");
  }

  return member;
};

/**
 * Check if NIK already exists
 */
Member.isNikExists = async function (nik) {
  const member = await this.findOne({ where: { nik } });
  return !!member;
};

module.exports = Member;
