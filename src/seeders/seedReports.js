// ============================================
// src/seeders/seedReports.js (FIXED)
// Seeder untuk membuat sample data transaksi untuk laporan
// ✅ FIXED: Import models yang benar
// ============================================
const { sequelize } = require("../config/database");
const Sale = require("../models/Sale");
const SaleItem = require("../models/SaleItem");
const Purchase = require("../models/Purchase");
const PurchaseItem = require("../models/PurchaseItem");

// ✅ FIXED: Import dengan destructuring yang benar
const {
  PurchaseReturn,
  PurchaseReturnItem,
} = require("../models/PurchaseReturn");
const { SalesReturn, SalesReturnItem } = require("../models/SalesReturn");

const SupplierDebt = require("../models/SupplierDebt");
const { MemberDebt, DebtPayment } = require("../models/MemberDebt");
const PointTransaction = require("../models/PointTransaction");
const Member = require("../models/Member");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const User = require("../models/User");
const moment = require("moment");
require("dotenv").config();

// Helper untuk random date dalam range
const randomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Helper untuk random number
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const seedReports = async () => {
  try {
    console.log("🌱 Starting REPORT DATA seeding...\n");
    console.log("This will create sample transactions for all reports:\n");
    console.log("  📊 Sales transactions (daily/monthly)");
    console.log("  🛒 Purchase transactions");
    console.log("  🔄 Return transactions");
    console.log("  💳 Debt & Receivables");
    console.log("  🎁 Point transactions\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    // Check prerequisites
    const memberCount = await Member.count();
    const productCount = await Product.count();
    const supplierCount = await Supplier.count();
    const userCount = await User.count();

    if (memberCount === 0) {
      console.log("❌ No members found! Run: npm run seed:members");
      process.exit(1);
    }
    if (productCount === 0) {
      console.log("❌ No products found! Run: npm run seed:products");
      process.exit(1);
    }
    if (supplierCount === 0) {
      console.log("❌ No suppliers found! Run: npm run seed:suppliers");
      process.exit(1);
    }
    if (userCount === 0) {
      console.log("❌ No users found! Run: npm run seed:admin");
      process.exit(1);
    }

    // Get data
    const members = await Member.findAll({ where: { isActive: true } });
    const products = await Product.findAll({ where: { isActive: true } });
    const suppliers = await Supplier.findAll({ where: { isActive: true } });
    const users = await User.findAll({ limit: 1 });
    const user = users[0];

    console.log(`✅ Found ${members.length} members`);
    console.log(`✅ Found ${products.length} products`);
    console.log(`✅ Found ${suppliers.length} suppliers`);
    console.log(`✅ User: ${user.name}\n`);

    let saleCount = 0;
    let purchaseCount = 0;
    let returnCount = 0;
    let debtCount = 0;
    let pointCount = 0;

    // ==========================================
    // 1. CREATE SALES TRANSACTIONS (Last 30 days)
    // ==========================================
    console.log("📊 Creating sales transactions...\n");

    const startDate = moment().subtract(30, "days").toDate();
    const endDate = new Date();

    for (let i = 0; i < 50; i++) {
      try {
        const member = members[randomInt(0, members.length - 1)];
        const saleDate = randomDate(startDate, endDate);
        const saleType = Math.random() > 0.7 ? "KREDIT" : "TUNAI";

        // Random 1-5 items
        const itemCount = randomInt(1, 5);
        const items = [];
        let totalAmount = 0;

        for (let j = 0; j < itemCount; j++) {
          const product = products[randomInt(0, products.length - 1)];
          const quantity = randomInt(1, 5);
          const sellingPrice = parseFloat(product.sellingPrice);
          const subtotal = sellingPrice * quantity;

          items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unit: product.unit,
            sellingPrice,
            subtotal,
          });

          totalAmount += subtotal;
        }

        // Discount
        const discountPercentage = Math.random() > 0.8 ? randomInt(5, 15) : 0;
        const discountAmount = (totalAmount * discountPercentage) / 100;
        const finalAmount = totalAmount - discountAmount;

        // Payment
        const dpAmount = saleType === "TUNAI" ? 0 : finalAmount * 0.3; // 30% DP for credit
        const paymentReceived = saleType === "TUNAI" ? finalAmount : dpAmount;
        const changeAmount = saleType === "TUNAI" ? 0 : 0;
        const remainingDebt =
          saleType === "KREDIT" ? finalAmount - dpAmount : 0;

        // Create sale
        const sale = await Sale.create({
          invoiceNumber: `INV-${moment(saleDate).format("YYYYMMDD")}-${String(
            i + 1
          ).padStart(4, "0")}`,
          saleDate: saleDate,
          memberId: member.id,
          userId: user.id,
          saleType: saleType,
          totalAmount: totalAmount,
          discountPercentage: discountPercentage,
          discountAmount: discountAmount,
          finalAmount: finalAmount,
          dpAmount: dpAmount,
          remainingDebt: remainingDebt,
          paymentReceived: paymentReceived,
          changeAmount: changeAmount,
          dueDate:
            saleType === "KREDIT"
              ? moment(saleDate).add(30, "days").toDate()
              : null,
          status: saleType === "TUNAI" ? "PAID" : "PENDING",
          notes: null,
        });

        // Create sale items
        for (const item of items) {
          await SaleItem.create({
            saleId: sale.id,
            ...item,
          });
        }

        // Create member debt (if KREDIT)
        if (saleType === "KREDIT" && remainingDebt > 0) {
          await MemberDebt.create({
            invoiceNumber: sale.invoiceNumber,
            memberId: member.id,
            saleId: sale.id,
            totalAmount: finalAmount,
            paidAmount: dpAmount,
            remainingAmount: remainingDebt,
            dueDate: moment(saleDate).add(30, "days").toDate(),
            status: dpAmount > 0 ? "PARTIAL" : "PENDING",
          });

          debtCount++;
        }

        saleCount++;

        if (saleCount % 10 === 0) {
          console.log(`  ✅ Created ${saleCount} sales...`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating sale:`, error.message);
      }
    }

    console.log(`✅ Created ${saleCount} sales transactions\n`);

    // ==========================================
    // 2. CREATE PURCHASES (Last 60 days)
    // ==========================================
    console.log("🛒 Creating purchase transactions...\n");

    const purchaseStartDate = moment().subtract(60, "days").toDate();

    for (let i = 0; i < 30; i++) {
      try {
        const supplier = suppliers[randomInt(0, suppliers.length - 1)];
        const purchaseDate = randomDate(purchaseStartDate, endDate);
        const purchaseType = ["TUNAI", "KREDIT", "KONSINYASI"][randomInt(0, 2)];

        const itemCount = randomInt(2, 8);
        const items = [];
        let totalAmount = 0;

        for (let j = 0; j < itemCount; j++) {
          const product = products[randomInt(0, products.length - 1)];
          const quantity = randomInt(10, 50);
          const purchasePrice = parseFloat(product.purchasePrice);
          const subtotal = purchasePrice * quantity;

          items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unit: product.unit,
            purchasePrice,
            subtotal,
          });

          totalAmount += subtotal;
        }

        const paidAmount =
          purchaseType === "TUNAI"
            ? totalAmount
            : purchaseType === "KONSINYASI"
            ? 0
            : totalAmount * 0.5;
        const remainingDebt = totalAmount - paidAmount;

        const purchase = await Purchase.create({
          invoiceNumber: `PO-${moment(purchaseDate).format(
            "YYYYMMDD"
          )}-${String(i + 1).padStart(4, "0")}`,
          purchaseDate: purchaseDate,
          supplierId: supplier.id,
          userId: user.id,
          purchaseType: purchaseType,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          remainingDebt: remainingDebt,
          status:
            purchaseType === "TUNAI"
              ? "PAID"
              : remainingDebt > 0
              ? "PARTIAL"
              : "PAID",
          dueDate:
            purchaseType === "KREDIT"
              ? moment(purchaseDate).add(30, "days").toDate()
              : null,
          notes: null,
        });

        for (const item of items) {
          await PurchaseItem.create({
            purchaseId: purchase.id,
            ...item,
          });
        }

        // Create supplier debt if KREDIT
        if (purchaseType === "KREDIT" && remainingDebt > 0) {
          await SupplierDebt.create({
            invoiceNumber: purchase.invoiceNumber,
            supplierId: supplier.id,
            purchaseId: purchase.id,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            remainingAmount: remainingDebt,
            dueDate: moment(purchaseDate).add(30, "days").toDate(),
            status: paidAmount > 0 ? "PARTIAL" : "PENDING",
          });

          debtCount++;
        }

        purchaseCount++;

        if (purchaseCount % 5 === 0) {
          console.log(`  ✅ Created ${purchaseCount} purchases...`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating purchase:`, error.message);
      }
    }

    console.log(`✅ Created ${purchaseCount} purchase transactions\n`);

    // ==========================================
    // 3. CREATE RETURNS (5 purchase, 5 sales)
    // ==========================================
    console.log("🔄 Creating return transactions...\n");

    // Get some purchases and sales
    const recentPurchases = await Purchase.findAll({
      limit: 5,
      order: [["purchaseDate", "DESC"]],
    });
    const recentSales = await Sale.findAll({
      limit: 5,
      order: [["saleDate", "DESC"]],
    });

    // Purchase returns
    for (const purchase of recentPurchases) {
      try {
        const returnAmount = randomInt(10000, 50000);

        const purchaseReturn = await PurchaseReturn.create({
          returnNumber: `PRN-${moment().format("YYYYMMDD")}-${String(
            returnCount + 1
          ).padStart(3, "0")}`,
          returnDate: moment().subtract(randomInt(1, 10), "days").toDate(),
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          userId: user.id,
          totalAmount: returnAmount,
          status: ["PENDING", "APPROVED", "REJECTED"][randomInt(0, 2)],
          reason: "Barang rusak",
          notes: null,
        });

        returnCount++;
      } catch (error) {
        console.error(`  ❌ Error creating purchase return:`, error.message);
      }
    }

    // Sales returns
    for (const sale of recentSales) {
      try {
        const returnAmount = randomInt(5000, 30000);

        // ✅ FIXED: Menggunakan SalesReturn (plural)
        const salesReturn = await SalesReturn.create({
          returnNumber: `SRN-${moment().format("YYYYMMDD")}-${String(
            returnCount + 1
          ).padStart(3, "0")}`,
          returnDate: moment().subtract(randomInt(1, 10), "days").toDate(),
          saleId: sale.id,
          memberId: sale.memberId,
          userId: user.id,
          totalAmount: returnAmount,
          status: ["PENDING", "APPROVED", "REJECTED"][randomInt(0, 2)],
          reason: "Produk tidak sesuai",
          refundMethod: "CASH",
          notes: null,
        });

        returnCount++;
      } catch (error) {
        console.error(`  ❌ Error creating sale return:`, error.message);
      }
    }

    console.log(`✅ Created ${returnCount} return transactions\n`);

    // ==========================================
    // 4. CREATE ADDITIONAL POINT TRANSACTIONS
    // ==========================================
    console.log("🎁 Creating point transactions...\n");

    for (let i = 0; i < 20; i++) {
      try {
        const member = members[randomInt(0, members.length - 1)];
        const type = ["EARN", "REDEEM", "EXPIRED", "ADJUSTMENT"][
          randomInt(0, 3)
        ];
        const points = randomInt(10, 500);

        await PointTransaction.create({
          memberId: member.id,
          type: type,
          points: type === "EARN" ? points : -points,
          pointsBefore: 0,
          pointsAfter: type === "EARN" ? points : -points,
          description: `Point ${type.toLowerCase()}`,
          expiryDate:
            type === "EARN" ? moment().add(12, "months").toDate() : null,
          isExpired: false,
        });

        pointCount++;
      } catch (error) {
        console.error(`  ❌ Error creating point:`, error.message);
      }
    }

    console.log(`✅ Created ${pointCount} point transactions\n`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Sales transactions: ${saleCount}`);
    console.log(`✅ Purchase transactions: ${purchaseCount}`);
    console.log(`✅ Return transactions: ${returnCount}`);
    console.log(`✅ Debt/Receivable records: ${debtCount}`);
    console.log(`✅ Point transactions: ${pointCount}`);
    console.log("=".repeat(70) + "\n");

    console.log("🎉 Report data seeding completed!\n");
    console.log("💡 Now you can test all reports:");
    console.log("  - Dashboard: /laporan/dashboard");
    console.log("  - Barang Return: /laporan/barang-return");
    console.log("  - Transaksi Harian: /laporan/transaksi-harian");
    console.log("  - Transaksi Bulanan: /laporan/transaksi-bulanan");
    console.log("  - Jenis Pembelian: /laporan/jenis-pembelian");
    console.log("  - Hutang Supplier: /laporan/hutang-supplier");
    console.log("  - Piutang Member: /laporan/piutang-member");
    console.log("  - Bonus Point: /laporan/bonus-point\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run seeder
seedReports();
