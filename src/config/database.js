// ============================================
// src/config/database.js
// ============================================
const { Sequelize } = require("sequelize");
require("dotenv").config();

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DB_NAME || "koperasi_db", process.env.DB_USER || "root", process.env.DB_PASSWORD || "", {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",

  // Logging
  logging: process.env.NODE_ENV === "development" ? console.log : false,

  // Pool configuration (untuk koneksi yang lebih efisien)
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  // Timezone
  timezone: "+07:00", // WIB (sesuaikan dengan lokasi Anda)

  // Define options (untuk semua model)
  define: {
    underscored: true, // Gunakan snake_case untuk kolom
    timestamps: true, // Otomatis tambahkan createdAt & updatedAt
    freezeTableName: false, // Gunakan plural untuk nama tabel
  },
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");
    console.log(`📊 Connected to: ${process.env.DB_NAME || "koperasi_db"}`);
    console.log(`🏠 Host: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}`);
    return true;
  } catch (error) {
    console.error("❌ Unable to connect to database:", error.message);
    console.error("\n⚠️  Please check your database configuration:");
    console.error("   1. MySQL is running");
    console.error("   2. Database exists (or will be created)");
    console.error("   3. Credentials are correct in .env file");
    throw error;
  }
};

// Export
module.exports = {
  sequelize,
  testConnection,
  Sequelize, // Export Sequelize class juga kalau dibutuhkan
};
