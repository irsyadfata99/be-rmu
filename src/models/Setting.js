// ============================================
// src/models/Setting.js
// Model untuk konfigurasi aplikasi (key-value storage)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Setting = sequelize.define(
  "Setting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: "Key sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Key harus diisi",
        },
      },
      comment: "Unique key untuk setting",
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Value dalam format string/JSON",
    },
    type: {
      type: DataTypes.ENUM("TEXT", "NUMBER", "BOOLEAN", "JSON"),
      allowNull: false,
      defaultValue: "TEXT",
      comment: "Tipe data value",
    },
    group: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "GENERAL",
      comment: "Kelompok setting (COMPANY, PRINT, TRANSACTION, dll)",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Deskripsi setting",
    },
  },
  {
    tableName: "settings",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["key"],
      },
      {
        fields: ["group"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get parsed value based on type
 */
Setting.prototype.getParsedValue = function () {
  if (!this.value) return null;

  switch (this.type) {
    case "NUMBER":
      return parseFloat(this.value);
    case "BOOLEAN":
      return this.value === "true" || this.value === "1";
    case "JSON":
      try {
        return JSON.parse(this.value);
      } catch (e) {
        return null;
      }
    case "TEXT":
    default:
      return this.value;
  }
};

/**
 * Get formatted data for response
 */
Setting.prototype.toJSON = function () {
  const values = { ...this.get() };
  values.parsedValue = this.getParsedValue();
  return values;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get setting value by key
 */
Setting.get = async function (key, defaultValue = null) {
  const setting = await this.findOne({ where: { key } });
  if (!setting) return defaultValue;
  return setting.getParsedValue();
};

/**
 * Set setting value
 */
Setting.set = async function (key, value, type = "TEXT", group = "GENERAL", description = null) {
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);

  const [setting] = await this.findOrCreate({
    where: { key },
    defaults: {
      key,
      value: stringValue,
      type,
      group,
      description,
    },
  });

  if (setting.value !== stringValue) {
    await setting.update({ value: stringValue, type, group, description });
  }

  return setting;
};

/**
 * Initialize default settings
 */
Setting.initializeDefaults = async function () {
  const defaults = [
    // ===== COMPANY INFO =====
    {
      key: "company_name",
      value: "KOPERASI YAMUGHNI",
      type: "TEXT",
      group: "COMPANY",
      description: "Nama perusahaan",
    },
    {
      key: "company_address",
      value: "Jalan Kaum No. 4 Samping Terminal Cicaheum",
      type: "TEXT",
      group: "COMPANY",
      description: "Alamat perusahaan",
    },
    {
      key: "company_phone",
      value: "Telepon (022) 20503787, 085877877877",
      type: "TEXT",
      group: "COMPANY",
      description: "Nomor telepon perusahaan",
    },
    {
      key: "company_website",
      value: "www.yamughni.info",
      type: "TEXT",
      group: "COMPANY",
      description: "Website perusahaan",
    },
    {
      key: "company_city",
      value: "Bandung",
      type: "TEXT",
      group: "COMPANY",
      description: "Kota perusahaan",
    },

    // ===== BANK INFO =====
    {
      key: "bank_name",
      value: "MANDIRI",
      type: "TEXT",
      group: "BANK",
      description: "Nama bank",
    },
    {
      key: "bank_account_number",
      value: "131-00-1687726-0",
      type: "TEXT",
      group: "BANK",
      description: "Nomor rekening bank",
    },
    {
      key: "bank_account_name",
      value: "KOPERASI YAMUGHNI",
      type: "TEXT",
      group: "BANK",
      description: "Nama pemilik rekening",
    },

    // ===== TRANSACTION SETTINGS =====
    {
      key: "default_credit_days",
      value: "30",
      type: "NUMBER",
      group: "TRANSACTION",
      description: "Jangka waktu kredit default (hari)",
    },
    {
      key: "min_credit_dp_percentage",
      value: "20",
      type: "NUMBER",
      group: "TRANSACTION",
      description: "Minimal DP untuk kredit (%)",
    },
    {
      key: "point_per_rupiah",
      value: "1000",
      type: "NUMBER",
      group: "TRANSACTION",
      description: "Poin per rupiah (1 poin per 1000 rupiah)",
    },
    {
      key: "auto_print_after_sale",
      value: "true",
      type: "BOOLEAN",
      group: "PRINT",
      description: "Auto print setelah transaksi",
    },

    // ===== PRINT SETTINGS =====
    {
      key: "print_thermal_width",
      value: "58",
      type: "NUMBER",
      group: "PRINT",
      description: "Lebar kertas thermal (mm)",
    },
    {
      key: "print_dot_matrix_width",
      value: "80",
      type: "NUMBER",
      group: "PRINT",
      description: "Lebar karakter dot matrix",
    },
    {
      key: "print_show_barcode",
      value: "true",
      type: "BOOLEAN",
      group: "PRINT",
      description: "Tampilkan barcode di struk",
    },

    // ===== LOW STOCK ALERT =====
    {
      key: "low_stock_alert_threshold",
      value: "10",
      type: "NUMBER",
      group: "INVENTORY",
      description: "Batas minimal stok untuk alert",
    },
    {
      key: "auto_reorder_enabled",
      value: "false",
      type: "BOOLEAN",
      group: "INVENTORY",
      description: "Auto reorder saat stok menipis",
    },
  ];

  const results = [];

  for (const setting of defaults) {
    try {
      const created = await this.set(setting.key, setting.value, setting.type, setting.group, setting.description);
      results.push(created);
    } catch (error) {
      console.error(`Error creating setting ${setting.key}:`, error.message);
    }
  }

  return results;
};

/**
 * Get all settings grouped
 */
Setting.getAllGrouped = async function () {
  const settings = await this.findAll({
    order: [
      ["group", "ASC"],
      ["key", "ASC"],
    ],
  });

  const grouped = {};
  settings.forEach((setting) => {
    if (!grouped[setting.group]) {
      grouped[setting.group] = {};
    }
    grouped[setting.group][setting.key] = setting.getParsedValue();
  });

  return grouped;
};

module.exports = Setting;
