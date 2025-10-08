// ============================================
// src/seeders/seedProducts.js
// Seeder untuk membuat data produk dummy
// ============================================
const { sequelize } = require("../config/database");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
require("dotenv").config();

const productData = [
  // Kategori: Sembako
  {
    barcode: "8991002501010",
    name: "BERAS PREMIUM 5KG",
    categoryName: "Sembako",
    supplierCode: "SUP-001",
    unit: "SACK",
    purchasePrice: 60000,
    sellingPrice: 70000,
    stock: 50,
    minStock: 10,
    description: "Beras premium kualitas A",
  },
  {
    barcode: "8992761111014",
    name: "MINYAK GORENG TROPICAL 2L",
    categoryName: "Sembako",
    supplierCode: "SUP-001",
    unit: "BTL",
    purchasePrice: 28000,
    sellingPrice: 32000,
    stock: 30,
    minStock: 5,
    description: "Minyak goreng kemasan 2 liter",
  },
  {
    barcode: "8996001600108",
    name: "GULA PASIR GULAKU 1KG",
    categoryName: "Sembako",
    supplierCode: "SUP-001",
    unit: "PAK",
    purchasePrice: 14000,
    sellingPrice: 16000,
    stock: 40,
    minStock: 10,
    description: "Gula pasir putih 1kg",
  },
  {
    barcode: "8992388211011",
    name: "TEPUNG TERIGU SEGITIGA BIRU 1KG",
    categoryName: "Sembako",
    supplierCode: "SUP-001",
    unit: "PAK",
    purchasePrice: 11000,
    sellingPrice: 13000,
    stock: 25,
    minStock: 5,
    description: "Tepung terigu serbaguna",
  },

  // Kategori: Minuman
  {
    barcode: "8993675100014",
    name: "AQUA BOTOL 600ML",
    categoryName: "Minuman",
    supplierCode: "SUP-002",
    unit: "KARTON",
    purchasePrice: 36000,
    sellingPrice: 42000,
    stock: 20,
    minStock: 5,
    description: "Air mineral Aqua isi 24 botol",
  },
  {
    barcode: "8992753100016",
    name: "TEH PUCUK HARUM 350ML",
    categoryName: "Minuman",
    supplierCode: "SUP-002",
    unit: "KARTON",
    purchasePrice: 48000,
    sellingPrice: 54000,
    stock: 15,
    minStock: 3,
    description: "Teh kemasan botol isi 24",
  },
  {
    barcode: "8992761100018",
    name: "COCA COLA 390ML",
    categoryName: "Minuman",
    supplierCode: "SUP-002",
    unit: "KARTON",
    purchasePrice: 42000,
    sellingPrice: 48000,
    stock: 12,
    minStock: 3,
    description: "Coca Cola kemasan botol isi 24",
  },

  // Kategori: Snack
  {
    barcode: "8996001320013",
    name: "CHITATO RASA SAPI PANGGANG 68G",
    categoryName: "Snack",
    supplierCode: "SUP-003",
    unit: "PAK",
    purchasePrice: 8000,
    sellingPrice: 10000,
    stock: 50,
    minStock: 10,
    description: "Keripik kentang rasa sapi panggang",
  },
  {
    barcode: "8992741100011",
    name: "OREO VANILLA 137G",
    categoryName: "Snack",
    supplierCode: "SUP-003",
    unit: "PAK",
    purchasePrice: 7500,
    sellingPrice: 9000,
    stock: 40,
    minStock: 10,
    description: "Biskuit Oreo vanilla",
  },
  {
    barcode: "8996001411018",
    name: "CHEETOS KEJU 80G",
    categoryName: "Snack",
    supplierCode: "SUP-003",
    unit: "PAK",
    purchasePrice: 9000,
    sellingPrice: 11000,
    stock: 35,
    minStock: 8,
    description: "Snack keju renyah",
  },

  // Kategori: Mie Instan
  {
    barcode: "8992388100019",
    name: "INDOMIE GORENG",
    categoryName: "Mie Instan",
    supplierCode: "SUP-001",
    unit: "KARTON",
    purchasePrice: 60000,
    sellingPrice: 70000,
    stock: 30,
    minStock: 5,
    description: "Indomie goreng isi 40 pcs",
  },
  {
    barcode: "8992388100026",
    name: "INDOMIE SOTO",
    categoryName: "Mie Instan",
    supplierCode: "SUP-001",
    unit: "KARTON",
    purchasePrice: 60000,
    sellingPrice: 70000,
    stock: 25,
    minStock: 5,
    description: "Indomie rasa soto isi 40 pcs",
  },

  // Kategori: Susu
  {
    barcode: "8992388100033",
    name: "SUSU ULTRA MILK COKLAT 1L",
    categoryName: "Susu",
    supplierCode: "SUP-002",
    unit: "KARTON",
    purchasePrice: 96000,
    sellingPrice: 108000,
    stock: 15,
    minStock: 3,
    description: "Susu UHT coklat isi 12",
  },
  {
    barcode: "8992388100040",
    name: "SUSU DANCOW PUTIH 800G",
    categoryName: "Susu",
    supplierCode: "SUP-002",
    unit: "BOX",
    purchasePrice: 85000,
    sellingPrice: 95000,
    stock: 20,
    minStock: 5,
    description: "Susu bubuk Dancow 800 gram",
  },

  // Kategori: Toiletries
  {
    barcode: "8992388100057",
    name: "SABUN LIFEBUOY 85G",
    categoryName: "Toiletries",
    supplierCode: "SUP-003",
    unit: "PAK",
    purchasePrice: 3500,
    sellingPrice: 4500,
    stock: 60,
    minStock: 15,
    description: "Sabun mandi batangan",
  },
  {
    barcode: "8992388100064",
    name: "PASTA GIGI PEPSODENT 190G",
    categoryName: "Toiletries",
    supplierCode: "SUP-003",
    unit: "PCS",
    purchasePrice: 10000,
    sellingPrice: 12000,
    stock: 40,
    minStock: 10,
    description: "Pasta gigi keluarga",
  },
  {
    barcode: "8992388100071",
    name: "SHAMPOO PANTENE 170ML",
    categoryName: "Toiletries",
    supplierCode: "SUP-003",
    unit: "BTL",
    purchasePrice: 18000,
    sellingPrice: 21000,
    stock: 25,
    minStock: 5,
    description: "Shampoo rambut",
  },

  // Produk dengan stok menipis (untuk testing low stock)
  {
    barcode: "8992388100088",
    name: "DETERGEN RINSO 800G",
    categoryName: "Toiletries",
    supplierCode: "SUP-003",
    unit: "PAK",
    purchasePrice: 16000,
    sellingPrice: 19000,
    stock: 3, // LOW STOCK!
    minStock: 5,
    description: "Detergen bubuk",
  },

  // Produk habis (untuk testing out of stock)
  {
    barcode: "8992388100095",
    name: "KECAP BANGO 220ML",
    categoryName: "Sembako",
    supplierCode: "SUP-001",
    unit: "BTL",
    purchasePrice: 11000,
    sellingPrice: 13000,
    stock: 0, // OUT OF STOCK!
    minStock: 5,
    description: "Kecap manis",
  },
];

const seedProducts = async () => {
  try {
    console.log("🌱 Starting product seeding...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    // Check if categories and suppliers exist
    const categoryCount = await Category.count();
    const supplierCount = await Supplier.count();

    if (categoryCount === 0) {
      console.log("❌ No categories found! Please seed categories first.");
      console.log("Run: node src/seeders/seedCategories.js\n");
      process.exit(1);
    }

    if (supplierCount === 0) {
      console.log("❌ No suppliers found! Please seed suppliers first.");
      console.log("Run: node src/seeders/seedSuppliers.js\n");
      process.exit(1);
    }

    console.log(`📝 Creating ${productData.length} products...\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const data of productData) {
      try {
        // Check if barcode already exists
        const existing = await Product.findOne({
          where: { barcode: data.barcode },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${data.name} (already exists)`);
          skippedCount++;
          continue;
        }

        // Find category
        const category = await Category.findOne({
          where: { name: data.categoryName },
        });

        if (!category) {
          console.log(`❌ Category not found: ${data.categoryName}`);
          errorCount++;
          continue;
        }

        // Find supplier
        const supplier = await Supplier.findOne({
          where: { code: data.supplierCode },
        });

        // Generate SKU
        const sku = await Product.generateSKU();

        // Create product
        const product = await Product.create({
          barcode: data.barcode,
          sku,
          name: data.name,
          categoryId: category.id,
          supplierId: supplier ? supplier.id : null,
          unit: data.unit,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          stock: data.stock,
          minStock: data.minStock,
          description: data.description,
          isActive: true,
        });

        // Show status
        let status = "✅";
        if (product.stock === 0) {
          status = "❌ OUT OF STOCK";
        } else if (product.isLowStock()) {
          status = "⚠️  LOW STOCK";
        }

        console.log(`${status} ${product.sku} - ${product.name} (${product.stock} ${product.unit})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${data.name}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created: ${successCount} products`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log(`📝 Total attempted: ${productData.length} products`);
    console.log("=".repeat(70) + "\n");

    // Show statistics
    const totalProducts = await Product.count();
    const activeProducts = await Product.count({ where: { isActive: true } });
    const lowStockProducts = await Product.getLowStock();
    const outOfStockProducts = await Product.getOutOfStock();

    console.log("📈 PRODUCT STATISTICS");
    console.log("=".repeat(70));
    console.log(`Total products: ${totalProducts}`);
    console.log(`Active products: ${activeProducts}`);
    console.log(`Low stock products: ${lowStockProducts.length}`);
    console.log(`Out of stock products: ${outOfStockProducts.length}`);
    console.log("=".repeat(70) + "\n");

    // Show products by category
    console.log("📦 PRODUCTS BY CATEGORY");
    console.log("=".repeat(70));

    const categories = await Category.findAll({
      include: [
        {
          model: Product,
          as: "products",
        },
      ],
    });

    for (const category of categories) {
      if (category.products.length > 0) {
        console.log(`\n${category.name}: ${category.products.length} product(s)`);
        category.products.forEach((p) => {
          let badge = "✅";
          if (p.stock === 0) badge = "❌";
          else if (p.isLowStock()) badge = "⚠️ ";

          console.log(`  ${badge} ${p.sku}: ${p.name} (${p.stock} ${p.unit}) - Rp ${parseFloat(p.sellingPrice).toLocaleString("id-ID")}`);
        });
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 Product seeding completed successfully!");
    console.log("=".repeat(70) + "\n");

    console.log("💡 TIP: You can now:");
    console.log("  - Test barcode scanning: GET /api/products/barcode/:barcode");
    console.log("  - Check low stock: GET /api/products/low-stock");
    console.log("  - Autocomplete search: GET /api/products/autocomplete?query=...");
    console.log("  - Create sales transactions with these products!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedProducts();
