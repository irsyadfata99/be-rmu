// ============================================
// src/seeders/seedCategories.js
// Seeder untuk membuat kategori produk
// ============================================
const { sequelize } = require("../config/database");
const Category = require("../models/Category");
require("dotenv").config();

const categoryData = [
  {
    name: "Sembako",
    description: "Bahan makanan pokok (beras, minyak, gula, tepung, dll)",
  },
  {
    name: "Minuman",
    description: "Air mineral, teh, kopi, soft drink, jus, dll",
  },
  {
    name: "Snack",
    description: "Makanan ringan, keripik, biskuit, coklat, permen, dll",
  },
  {
    name: "Mie Instan",
    description: "Mie instan berbagai merek dan rasa",
  },
  {
    name: "Susu",
    description: "Susu cair, susu bubuk, susu kental manis, dll",
  },
  {
    name: "Toiletries",
    description: "Sabun, shampoo, pasta gigi, detergen, dan kebutuhan mandi",
  },
  {
    name: "Bumbu Dapur",
    description: "Bumbu masak, kecap, saus, MSG, garam, merica, dll",
  },
  {
    name: "Frozen Food",
    description: "Makanan beku (nugget, sosis, bakso, dll)",
  },
  {
    name: "Roti & Kue",
    description: "Roti tawar, roti manis, kue kering, dll",
  },
  {
    name: "Kebutuhan Bayi",
    description: "Popok, susu bayi, bedak bayi, dll",
  },
  {
    name: "Alat Tulis",
    description: "Pulpen, pensil, buku tulis, kertas, dll",
  },
  {
    name: "Rokok",
    description: "Berbagai merek rokok",
  },
  {
    name: "Elektronik",
    description: "Baterai, lampu, kabel, dan elektronik kecil lainnya",
  },
  {
    name: "Lain-lain",
    description: "Produk lain yang tidak termasuk kategori di atas",
  },
];

const seedCategories = async () => {
  try {
    console.log("🌱 Starting category seeding...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log(`📝 Creating ${categoryData.length} categories...\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const data of categoryData) {
      try {
        // Check if category already exists
        const existing = await Category.findOne({
          where: { name: data.name },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${data.name} (already exists)`);
          skippedCount++;
          continue;
        }

        // Create category
        const category = await Category.create({
          name: data.name,
          description: data.description,
          isActive: true,
        });

        console.log(`✅ ${category.name}`);
        console.log(`   ${category.description}\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${data.name}:`, error.message);
        errorCount++;
      }
    }

    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created: ${successCount} categories`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} categories`);
    console.log(`❌ Failed: ${errorCount} categories`);
    console.log(`📝 Total attempted: ${categoryData.length} categories`);
    console.log("=".repeat(70) + "\n");

    // Show statistics
    const totalCategories = await Category.count();
    const activeCategories = await Category.count({
      where: { isActive: true },
    });

    console.log("📈 CATEGORY STATISTICS");
    console.log("=".repeat(70));
    console.log(`Total categories: ${totalCategories}`);
    console.log(`Active categories: ${activeCategories}`);
    console.log(`Inactive categories: ${totalCategories - activeCategories}`);
    console.log("=".repeat(70) + "\n");

    // List all categories
    console.log("📋 CATEGORY LIST");
    console.log("=".repeat(70));
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });

    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   ${cat.description}\n`);
    });

    console.log("=".repeat(70));
    console.log("🎉 Category seeding completed successfully!");
    console.log("=".repeat(70) + "\n");

    console.log("💡 NEXT STEPS:");
    console.log("  1. Seed suppliers: node src/seeders/seedSuppliers.js");
    console.log("  2. Seed products: node src/seeders/seedProducts.js\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedCategories();
