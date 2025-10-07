// ============================================
// 7. src/seeders/createAdminUser.js (SEEDER SCRIPT)
// ============================================
const { sequelize } = require("../config/database");
const User = require("../models/User");
require("dotenv").config();

const createAdminUser = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced");

    // Check if admin exists
    const adminExists = await User.findOne({ where: { username: "admin" } });

    if (adminExists) {
      console.log("⚠️  Admin user already exists!");
      console.log("Username:", adminExists.username);
      console.log("Email:", adminExists.email);
      console.log("Role:", adminExists.role);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      username: "admin",
      email: "admin@koperasi.com",
      name: "Administrator",
      password: "admin123", // Will be hashed automatically
      role: "ADMIN",
      isActive: true,
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("================================");
    console.log("Username:", admin.username);
    console.log("Email:", admin.email);
    console.log("Password: admin123");
    console.log("Role:", admin.role);
    console.log("================================\n");

    // Create kasir user
    const kasir = await User.create({
      username: "kasir",
      email: "kasir@koperasi.com",
      name: "Kasir",
      password: "kasir123", // Will be hashed automatically
      role: "KASIR",
      isActive: true,
    });

    console.log("✅ Kasir user created successfully!");
    console.log("================================");
    console.log("Username:", kasir.username);
    console.log("Email:", kasir.email);
    console.log("Password: kasir123");
    console.log("Role:", kasir.role);
    console.log("================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating users:", error);
    process.exit(1);
  }
};

createAdminUser();

//node src/seeders/createAdminUser.js
