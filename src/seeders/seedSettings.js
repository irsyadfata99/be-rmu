// ============================================
// src/seeders/seedSettings.js (UPDATED - WITH POINT SETTINGS)
// ============================================
const { sequelize } = require("../config/database");
const Setting = require("../models/Setting");
require("dotenv").config();

const seedSettings = async () => {
  try {
    console.log("🌱 Starting settings seeding...\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log("📝 Initializing settings...\n");

    // Default settings
    const settings = [
      // ===== COMPANY INFO =====
      { key: "company_name", value: "KOPERASI YAMUGHNI", type: "TEXT", group: "COMPANY", description: "Nama perusahaan" },
      { key: "company_address", value: "Jalan Kaum No. 4 Samping Terminal Cicaheum", type: "TEXT", group: "COMPANY", description: "Alamat perusahaan" },
      { key: "company_phone", value: "Telepon (022) 20503787, 085877877877", type: "TEXT", group: "COMPANY", description: "Nomor telepon" },
      { key: "company_website", value: "www.yamughni.info", type: "TEXT", group: "COMPANY", description: "Website" },
      { key: "company_city", value: "Bandung", type: "TEXT", group: "COMPANY", description: "Kota" },

      // ===== BANK INFO =====
      { key: "bank_name", value: "MANDIRI", type: "TEXT", group: "BANK", description: "Nama bank" },
      { key: "bank_account_number", value: "131-00-1687726-0", type: "TEXT", group: "BANK", description: "Nomor rekening" },
      { key: "bank_account_name", value: "KOPERASI YAMUGHNI", type: "TEXT", group: "BANK", description: "Nama pemilik rekening" },

      // ===== TRANSACTION SETTINGS =====
      { key: "default_credit_days", value: "30", type: "NUMBER", group: "TRANSACTION", description: "Jangka waktu kredit default (hari)" },
      { key: "min_credit_dp_percentage", value: "20", type: "NUMBER", group: "TRANSACTION", description: "Minimal DP untuk kredit (%)" },
      { key: "auto_print_after_sale", value: "true", type: "BOOLEAN", group: "PRINT", description: "Auto print setelah transaksi" },

      // ===== PRINT SETTINGS =====
      { key: "print_thermal_width", value: "58", type: "NUMBER", group: "PRINT", description: "Lebar kertas thermal (mm)" },
      { key: "print_dot_matrix_width", value: "80", type: "NUMBER", group: "PRINT", description: "Lebar karakter dot matrix" },
      { key: "print_show_barcode", value: "true", type: "BOOLEAN", group: "PRINT", description: "Tampilkan barcode di struk" },

      // ===== LOW STOCK ALERT =====
      { key: "low_stock_alert_threshold", value: "10", type: "NUMBER", group: "INVENTORY", description: "Batas minimal stok untuk alert" },
      { key: "auto_reorder_enabled", value: "false", type: "BOOLEAN", group: "INVENTORY", description: "Auto reorder saat stok menipis" },

      // ===== NEW: POINT SYSTEM SETTINGS =====
      { key: "point_enabled", value: "true", type: "BOOLEAN", group: "POINTS", description: "Enable/disable point system" },
      { key: "point_system_mode", value: "GLOBAL", type: "TEXT", group: "POINTS", description: "Mode perhitungan point (GLOBAL/PER_PRODUCT/PER_CATEGORY)" },
      { key: "point_per_amount", value: "1000", type: "NUMBER", group: "POINTS", description: "Rupiah per 1 point (mode GLOBAL)" },
      { key: "point_decimal_rounding", value: "DOWN", type: "TEXT", group: "POINTS", description: "Pembulatan decimal (UP/DOWN/NEAREST)" },
      { key: "min_transaction_for_points", value: "0", type: "NUMBER", group: "POINTS", description: "Minimal transaksi untuk dapat point (Rp)" },
      { key: "point_expiry_months", value: "12", type: "NUMBER", group: "POINTS", description: "Masa berlaku point (bulan)" },
    ];

    let successCount = 0;

    for (const setting of settings) {
      await Setting.set(setting.key, setting.value, setting.type, setting.group, setting.description);
      successCount++;
    }

    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created/updated: ${successCount} settings`);
    console.log("=".repeat(70) + "\n");

    // Show grouped settings
    console.log("📋 SETTINGS BY GROUP");
    console.log("=".repeat(70));

    const grouped = await Setting.getAllGrouped();

    for (const [group, values] of Object.entries(grouped)) {
      console.log(`\n📦 ${group}:`);
      for (const [key, value] of Object.entries(values)) {
        console.log(`   ${key}: ${value}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 Settings seeding completed!");
    console.log("=".repeat(70) + "\n");

    console.log("💡 POINT SYSTEM INFO:");
    console.log("  Mode: GLOBAL (Rp 1000 = 1 point)");
    console.log("  Bisa diubah via: PUT /api/points/settings");
    console.log("  3 Mode tersedia: GLOBAL, PER_PRODUCT, PER_CATEGORY\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

seedSettings();
