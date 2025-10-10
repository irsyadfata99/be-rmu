// ============================================
// src/seeders/pointSettings.js
// Initial settings untuk Point System
// ============================================

const { v4: uuidv4 } = require("uuid");
const Setting = require("../models/Setting");

async function seedPointSettings() {
  try {
    console.log("🌱 Seeding point settings...");

    const settings = [
      {
        key: "point_enabled",
        value: "true",
        dataType: "BOOLEAN",
        category: "POINTS",
        description: "Enable/disable point system",
      },
      {
        key: "point_system_mode",
        value: "GLOBAL",
        dataType: "TEXT",
        category: "POINTS",
        description:
          "Point calculation mode: GLOBAL, PER_PRODUCT, PER_CATEGORY",
      },
      {
        key: "point_per_amount",
        value: "1000",
        dataType: "NUMBER",
        category: "POINTS",
        description: "Amount (Rp) needed for 1 point (default: 1000)",
      },
      {
        key: "point_decimal_rounding",
        value: "DOWN",
        dataType: "TEXT",
        category: "POINTS",
        description: "Rounding method: UP, DOWN, NEAREST",
      },
      {
        key: "min_transaction_for_points",
        value: "0",
        dataType: "NUMBER",
        category: "POINTS",
        description:
          "Minimum transaction amount to earn points (0 = no minimum)",
      },
      {
        key: "point_expiry_months",
        value: "12",
        dataType: "NUMBER",
        category: "POINTS",
        description: "Point expiry duration in months (default: 12)",
      },
    ];

    for (const setting of settings) {
      // Check if setting already exists
      const existing = await Setting.findOne({
        where: { key: setting.key },
      });

      if (existing) {
        console.log(
          `  ⏭️  Setting '${setting.key}' already exists, skipping...`
        );
      } else {
        await Setting.create({
          id: uuidv4(),
          ...setting,
        });
        console.log(`  ✅ Created setting: ${setting.key} = ${setting.value}`);
      }
    }

    console.log("✅ Point settings seeded successfully!\n");
  } catch (error) {
    console.error("❌ Error seeding point settings:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const { sequelize } = require("../config/database");

  sequelize
    .authenticate()
    .then(() => seedPointSettings())
    .then(() => {
      console.log("🎉 Seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedPointSettings;
