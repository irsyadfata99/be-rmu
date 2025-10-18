// ============================================
// scripts/check-products-data.js
// Script untuk check data integrity produk di database
// Jalankan: node scripts/check-products-data.js
// ============================================

const { Product, Category, Supplier } = require("../src/models");
const { sequelize } = require("../src/config/database");

async function checkProductsData() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Get all products
    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: Supplier,
          as: "supplier",
          attributes: ["id", "code", "name"],
          required: false,
        },
      ],
    });

    console.log(`📦 Total Products: ${products.length}\n`);
    console.log("=".repeat(100));

    let invalidCount = 0;
    let validCount = 0;

    for (const product of products) {
      const issues = [];

      // Check required fields
      if (!product.id) issues.push("❌ Missing ID");
      if (!product.sku) issues.push("❌ Missing SKU");
      if (!product.name) issues.push("❌ Missing Name");
      if (!product.categoryId) issues.push("❌ Missing Category ID");

      // Check price fields
      if (!product.sellingPriceGeneral || product.sellingPriceGeneral <= 0) {
        issues.push(`❌ Invalid sellingPriceGeneral: ${product.sellingPriceGeneral}`);
      }
      if (!product.sellingPriceMember || product.sellingPriceMember <= 0) {
        issues.push(`❌ Invalid sellingPriceMember: ${product.sellingPriceMember}`);
      }
      if (!product.sellingPrice || product.sellingPrice <= 0) {
        issues.push(`❌ Invalid sellingPrice: ${product.sellingPrice}`);
      }
      if (!product.purchasePrice || product.purchasePrice < 0) {
        issues.push(`❌ Invalid purchasePrice: ${product.purchasePrice}`);
      }

      // Check stock fields
      if (product.stock < 0) {
        issues.push(`❌ Negative stock: ${product.stock}`);
      }
      if (product.minStock < 0) {
        issues.push(`❌ Negative minStock: ${product.minStock}`);
      }
      if (product.maxStock < 0) {
        issues.push(`❌ Negative maxStock: ${product.maxStock}`);
      }

      // Check associations
      if (!product.category) {
        issues.push("❌ Category not found");
      }

      if (issues.length > 0) {
        invalidCount++;
        console.log(`\n❌ INVALID PRODUCT: ${product.sku} - ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Barcode: ${product.barcode || "N/A"}`);
        console.log(`   Active: ${product.isActive}`);
        console.log(`   Issues:`);
        issues.forEach((issue) => console.log(`     ${issue}`));
        console.log(`   Raw Data:`, {
          sellingPriceGeneral: product.sellingPriceGeneral,
          sellingPriceMember: product.sellingPriceMember,
          sellingPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          stock: product.stock,
          minStock: product.minStock,
          maxStock: product.maxStock,
        });
      } else {
        validCount++;
        if (process.env.VERBOSE === "true") {
          console.log(`✅ ${product.sku} - ${product.name}`);
        }
      }
    }

    console.log("\n" + "=".repeat(100));
    console.log("\n📊 SUMMARY:");
    console.log(`   ✅ Valid Products: ${validCount}`);
    console.log(`   ❌ Invalid Products: ${invalidCount}`);
    console.log(`   📦 Total: ${products.length}`);

    if (invalidCount > 0) {
      console.log("\n⚠️  RECOMMENDATION:");
      console.log("   1. Fix invalid products manually via SQL or admin panel");
      console.log("   2. Ensure all products have valid price data");
      console.log("   3. Run data migration if needed");
    } else {
      console.log("\n✅ All products are valid!");
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkProductsData();
