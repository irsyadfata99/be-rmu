// ============================================
// src/seeders/seedSuppliers.js
// Seeder untuk membuat data supplier dummy
// ============================================
const { sequelize } = require("../config/database");
const Supplier = require("../models/Supplier");
require("dotenv").config();

const supplierData = [
  {
    code: "SUP-001",
    name: "PT Sumber Rezeki Jaya",
    address: "Jl. Soekarno Hatta No. 456, Bandung",
    phone: "022-5201234",
    contactPerson: "Bapak Ahmad",
    email: "sumberrezeki@gmail.com",
    description: "Supplier sembako, mie instan, dan bahan pokok",
  },
  {
    code: "SUP-002",
    name: "CV Maju Bersama",
    address: "Jl. Buah Batu No. 789, Bandung",
    phone: "022-7301567",
    contactPerson: "Ibu Siti",
    email: "majubersama@yahoo.com",
    description: "Supplier minuman, susu, dan produk dairy",
  },
  {
    code: "SUP-003",
    name: "UD Barokah Selalu",
    address: "Jl. Cibaduyut No. 234, Bandung",
    phone: "022-5401890",
    contactPerson: "Bapak Budi",
    email: "barokah.supplier@gmail.com",
    description: "Supplier snack, toiletries, dan kebutuhan rumah tangga",
  },
  {
    code: "SUP-004",
    name: "Toko Roti Keliling (Pak Ujang)",
    address: "Keliling Bandung",
    phone: "081234567890",
    contactPerson: "Pak Ujang",
    email: null,
    description: "Supplier roti keliling (tidak ada bon resmi, hanya catatan manual)",
  },
  {
    code: "SUP-005",
    name: "Kerupuk Pasar (Bu Ema)",
    address: "Pasar Kosambi, Bandung",
    phone: "085678901234",
    contactPerson: "Bu Ema",
    email: null,
    description: "Supplier kerupuk dari pasar (bon alakadarnya, kadang pake kertas rokok)",
  },
  {
    code: "SUP-006",
    name: "PT Indo Food Distribusi",
    address: "Jl. Raya Jakarta-Bogor KM 47, Bogor",
    phone: "021-8752000",
    contactPerson: "Marketing Division",
    email: "sales@indofood.co.id",
    description: "Distributor resmi Indofood (mie, bumbu, snack)",
  },
  {
    code: "SUP-007",
    name: "CV Tani Makmur",
    address: "Jl. Raya Lembang No. 88, Bandung Barat",
    phone: "022-2701122",
    contactPerson: "Bapak Andi",
    email: "tanimakmur@gmail.com",
    description: "Supplier sayuran dan hasil pertanian lokal",
  },
];

const seedSuppliers = async () => {
  try {
    console.log("🌱 Starting supplier seeding...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log(`📝 Creating ${supplierData.length} suppliers...\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const data of supplierData) {
      try {
        // Check if supplier code already exists
        const existing = await Supplier.findOne({
          where: { code: data.code },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${data.name} (${data.code} already exists)`);
          skippedCount++;
          continue;
        }

        // Create supplier
        const supplier = await Supplier.create({
          code: data.code,
          name: data.name,
          address: data.address,
          phone: data.phone,
          contactPerson: data.contactPerson,
          email: data.email,
          description: data.description,
          totalDebt: 0,
          totalPurchases: 0,
          isActive: true,
        });

        console.log(`✅ ${supplier.code} - ${supplier.name}`);
        console.log(`   📞 ${supplier.phone || "-"} | 👤 ${supplier.contactPerson || "-"}`);
        console.log(`   📍 ${supplier.address}\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${data.name}:`, error.message);
        errorCount++;
      }
    }

    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created: ${successCount} suppliers`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} suppliers`);
    console.log(`❌ Failed: ${errorCount} suppliers`);
    console.log(`📝 Total attempted: ${supplierData.length} suppliers`);
    console.log("=".repeat(70) + "\n");

    // Show statistics
    const totalSuppliers = await Supplier.count();
    const activeSuppliers = await Supplier.count({ where: { isActive: true } });

    console.log("📈 SUPPLIER STATISTICS");
    console.log("=".repeat(70));
    console.log(`Total suppliers: ${totalSuppliers}`);
    console.log(`Active suppliers: ${activeSuppliers}`);
    console.log(`Inactive suppliers: ${totalSuppliers - activeSuppliers}`);
    console.log("=".repeat(70) + "\n");

    // List all suppliers
    console.log("📋 SUPPLIER LIST");
    console.log("=".repeat(70));
    const suppliers = await Supplier.findAll({
      order: [["code", "ASC"]],
    });

    suppliers.forEach((s) => {
      console.log(`${s.code}: ${s.name}`);
      console.log(`  📍 ${s.address}`);
      console.log(`  📞 ${s.phone || "-"} | 👤 ${s.contactPerson || "-"}`);
      console.log(`  💳 Hutang: Rp ${parseFloat(s.totalDebt).toLocaleString("id-ID")}`);
      console.log(`  📦 Total Pembelian: ${s.totalPurchases}x\n`);
    });

    console.log("=".repeat(70));
    console.log("🎉 Supplier seeding completed successfully!");
    console.log("=".repeat(70) + "\n");

    console.log("💡 NEXT STEPS:");
    console.log("  1. Seed categories: node src/seeders/seedCategories.js");
    console.log("  2. Seed products: node src/seeders/seedProducts.js");
    console.log("  3. Start creating purchases!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedSuppliers();
