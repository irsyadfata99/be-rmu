// ============================================
// src/seeders/seedCategoryPosts.js
// Seeder untuk kategori post Artikel / Berita
// ============================================

const { sequelize } = require("../config/database");
const CategoryPost = require("../models/CategoryPost");
require("dotenv").config();

const CategoryPostData = [
  {
    name: "Berita Nasional",
    description: "Berita dan informasi terkini dari dalam negeri",
  },
  {
    name: "Berita Internasional",
    description: "Peristiwa dan isu global dari berbagai negara",
  },
  {
    name: "Politik",
    description: "Isu politik, pemerintahan, dan kebijakan publik",
  },
  {
    name: "Ekonomi & Bisnis",
    description: "Ekonomi makro, bisnis, keuangan, dan industri",
  },
  {
    name: "Teknologi",
    description: "Teknologi, startup, inovasi, dan transformasi digital",
  },
  {
    name: "Pendidikan",
    description: "Sekolah, kampus, pembelajaran, dan dunia akademik",
  },
  {
    name: "Kesehatan",
    description: "Informasi medis, kesehatan masyarakat, dan gaya hidup sehat",
  },
  {
    name: "Hukum & Kriminal",
    description: "Hukum, peradilan, dan kasus kriminal",
  },
  {
    name: "Olahraga",
    description: "Berita dan perkembangan dunia olahraga",
  },
  {
    name: "Hiburan",
    description: "Film, musik, selebriti, dan industri hiburan",
  },
  {
    name: "Lifestyle",
    description: "Gaya hidup, tren, dan inspirasi",
  },
  {
    name: "Wisata & Budaya",
    description: "Pariwisata, budaya, dan kearifan lokal",
  },
  {
    name: "Opini",
    description: "Opini, editorial, dan sudut pandang penulis",
  },
  {
    name: "Event",
    description: "Liputan acara, seminar, dan kegiatan penting",
  },
  {
    name: "Lainnya",
    description: "Kategori umum di luar kategori utama",
  },
];

const seedCategoryPosts = async () => {
  try {
    console.log("🌱 Starting category post seeding...\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log(
      `📂 Creating ${CategoryPostData.length} category posts...\n`
    );

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const data of CategoryPostData) {
      try {
        const existing = await CategoryPost.scope("all").findOne({
          where: { name: data.name },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${data.name} (already exists)`);
          skippedCount++;
          continue;
        }

        const category = await CategoryPost.create({
          name: data.name,
          description: data.description,
          isActive: true,
        });

        console.log(`✅ ${category.name}`);
        console.log(`   ${category.description}\n`);

        successCount++;
      } catch (error) {
        console.error(
          `❌ Error creating category ${data.name}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created: ${successCount} categories`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} categories`);
    console.log(`❌ Failed: ${errorCount} categories`);
    console.log(
      `📂 Total attempted: ${CategoryPostData.length} categories`
    );
    console.log("=".repeat(70) + "\n");

    const totalCategories = await CategoryPost.scope("all").count();
    const activeCategories = await CategoryPost.count();

    console.log("📈 CATEGORY STATISTICS");
    console.log("=".repeat(70));
    console.log(`Total categories: ${totalCategories}`);
    console.log(`Active categories: ${activeCategories}`);
    console.log(`Inactive categories: ${totalCategories - activeCategories}`);
    console.log("=".repeat(70) + "\n");

    console.log("📋 CATEGORY LIST");
    console.log("=".repeat(70));

    const categories = await CategoryPost.findAll();
    categories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name}`);
      console.log(`   ${category.description}\n`);
    });

    console.log("=".repeat(70));
    console.log("🎉 Category post seeding completed successfully!");
    console.log("=".repeat(70) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedCategoryPosts();
