// src/seeders/createAdminUser.js (FIXED)
const { sequelize } = require("../config/database");
const User = require("../models/User");
require("dotenv").config();

const createAdminUser = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

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

    // ✅ FIX: Strong passwords that meet validation requirements
    const admin = await User.create({
      username: "admin",
      email: "admin@koperasi.com",
      name: "Administrator",
      password: "Admin@123", // ✅ FIXED: Meets all requirements (8+ chars, uppercase, lowercase, number, special char)
      role: "ADMIN",
      isActive: true,
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("================================");
    console.log("Username:", admin.username);
    console.log("Email:", admin.email);
    console.log("Password: Admin@123"); // ✅ FIXED
    console.log("Role:", admin.role);
    console.log("================================\n");

    const kasir = await User.create({
      username: "kasir",
      email: "kasir@koperasi.com",
      name: "Kasir",
      password: "Kasir@123", // ✅ FIXED: Meets all requirements
      role: "KASIR",
      isActive: true,
    });

    console.log("✅ Kasir user created successfully!");
    console.log("================================");
    console.log("Username:", kasir.username);
    console.log("Email:", kasir.email);
    console.log("Password: Kasir@123"); // ✅ FIXED
    console.log("Role:", kasir.role);
    console.log("================================\n");

    console.log("💡 Password Requirements:");
    console.log("  - Minimum 8 characters");
    console.log("  - At least 1 uppercase letter (A-Z)");
    console.log("  - At least 1 lowercase letter (a-z)");
    console.log("  - At least 1 number (0-9)");
    console.log("  - At least 1 special character (!@#$%^&*)\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating users:", error);
    if (error.errors) {
      error.errors.forEach((e) => {
        console.error(`  - ${e.message}`);
      });
    }
    process.exit(1);
  }
};

createAdminUser();
