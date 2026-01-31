// ============================================
// src/seeders/seedTags.js
// Seeder untuk Tag Post Artikel / Berita
// ============================================

const { sequelize } = require("../config/database");
const TagPost = require("../models/TagPost");
require("dotenv").config();

// Helper slug
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");

const TagPostData = [
  { name: "Pemilu" },
  { name: "Pajak" },
  { name: "Startup" },
  { name: "UMKM" },
  { name: "Artificial Intelligence" },
  { name: "Blockchain" },
  { name: "Kesehatan Mental" },
  { name: "BPJS" },
  { name: "Liga Inggris" },
  { name: "Piala Dunia" },
  { name: "Film Indonesia" },
  { name: "Musik Pop" },
  { name: "Wisata Lokal" },
  { name: "Kuliner Nusantara" },
  { name: "Perubahan Iklim" },
  { name: "Opini Publik" },
  { name: "Event Nasional" },
];

const seedTags = async () => {
  try {
    console.log("🌱 Starting TAG seeding...\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log(`🏷️  Creating ${TagPostData.length} tags...\n`);

    let created = 0;
    let skipped = 0;

    for (const data of TagPostData) {
      const slug = slugify(data.name);

      const existing = await TagPost.scope("all").findOne({
        where: { slug },
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${data.name}`);
        skipped++;
        continue;
      }

      await TagPost.create({
        name: data.name,
        slug,
        isActive: true,
      });

      console.log(`✅ ${data.name} → ${slug}`);
      created++;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 TAG SEEDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Created : ${created}`);
    console.log(`⏭️  Skipped : ${skipped}`);
    console.log(`🏷️  Total   : ${TagPostData.length}`);
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder error:", error);
    process.exit(1);
  }
};

// Run seeder
seedTags();
