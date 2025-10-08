// ============================================
// src/seeders/seedSettings.js
// Seeder untuk initialize default settings
// ============================================
const { sequelize } = require("../config/database");
const Setting = require("../models/Setting");
require("dotenv").config();

const seedSettings = async () => {
  try {
    console.log("🌱 Starting settings seeding...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log("📝 Initializing default settings...\n");

    // Initialize default settings
    const settings = await Setting.initializeDefaults();

    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created/updated: ${settings.length} settings`);
    console.log("=".repeat(70) + "\n");

    // Show all settings grouped
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
    console.log("🎉 Settings seeding completed successfully!");
    console.log("=".repeat(70) + "\n");

    console.log("💡 TIP: You can update settings via:");
    console.log("  - API: PUT /api/settings/:key");
    console.log("  - Code: await Setting.set('key', 'value')\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedSettings();
