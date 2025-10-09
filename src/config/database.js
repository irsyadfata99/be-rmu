// src/config/database.js (PRODUCTION READY)
const { Sequelize } = require("sequelize");
require("dotenv").config();

// ✅ FIX: Production-ready connection pool configuration
const sequelize = new Sequelize(process.env.DB_NAME || "koperasi_db", process.env.DB_USER || "root", process.env.DB_PASSWORD || "", {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",

  // ✅ CRITICAL: Proper logging based on environment
  logging: process.env.NODE_ENV === "production" ? false : console.log,

  // ✅ CRITICAL: Production-ready connection pool
  pool: {
    max: process.env.NODE_ENV === "production" ? 20 : 5, // More connections in production
    min: process.env.NODE_ENV === "production" ? 5 : 0, // Keep minimum connections alive
    acquire: 60000, // 60 seconds max to acquire connection
    idle: 10000, // 10 seconds idle time before releasing
    evict: 5000, // Check for idle connections every 5 seconds
  },

  // ✅ CRITICAL: Retry strategy
  retry: {
    max: 3, // Retry failed queries up to 3 times
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /EPIPE/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
  },

  // ✅ CRITICAL: Timezone configuration
  timezone: "+07:00", // WIB

  // ✅ CRITICAL: Define options for all models
  define: {
    underscored: true,
    timestamps: true,
    freezeTableName: false,
  },

  // ✅ CRITICAL: Dialect options for production
  dialectOptions: {
    connectTimeout: 60000, // 60 seconds connection timeout
    // ✅ For SSL in production (uncomment if needed)
    // ssl: process.env.NODE_ENV === 'production' ? {
    //   require: true,
    //   rejectUnauthorized: false
    // } : false
  },
});

// ✅ CRITICAL: Test database connection with retry
const testConnection = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection established successfully");
      console.log(`📊 Database: ${process.env.DB_NAME || "koperasi_db"}`);
      console.log(`🏠 Host: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🏊 Pool: max=${sequelize.config.pool.max}, min=${sequelize.config.pool.min}`);
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt < retries) {
        console.log(`⏳ Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error("\n⚠️  Please check your database configuration:");
        console.error("   1. MySQL is running");
        console.error("   2. Database credentials are correct in .env");
        console.error("   3. Database exists");
        console.error("   4. Network connectivity is stable");
        throw error;
      }
    }
  }
};

// ✅ CRITICAL: Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received. Closing database connections...");
  try {
    await sequelize.close();
    console.log("✅ Database connections closed successfully");
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
  }
});

process.on("SIGINT", async () => {
  console.log("\n🔄 SIGINT received. Closing database connections...");
  try {
    await sequelize.close();
    console.log("✅ Database connections closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
    process.exit(1);
  }
});

module.exports = {
  sequelize,
  testConnection,
  Sequelize,
};
