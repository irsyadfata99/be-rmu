// ============================================
// src/models/index.js
// Central file untuk import semua models dan setup associations
// ============================================

// Import existing models
const User = require("./User");
const Member = require("./Member");
const Category = require("./Category");

// Import new models
const Supplier = require("./Supplier");
const Product = require("./Product");
const Setting = require("./Setting");

const { Purchase, PurchaseItem } = require("./Purchase");
const { Sale, SaleItem } = require("./Sale");
const { MemberDebt, DebtPayment, SupplierDebt } = require("./MemberDebt");
const { StockMovement, StockAdjustment } = require("./StockMovement");
const {
  PurchaseReturn,
  PurchaseReturnItem,
  SalesReturn,
  SalesReturnItem,
} = require("./PurchaseReturn");

// ============================================
// SETUP ASSOCIATIONS
// ============================================

// Category <-> Product
Category.hasMany(Product, {
  foreignKey: "categoryId",
  as: "products",
});

Product.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Supplier <-> Purchase
Supplier.hasMany(Purchase, {
  foreignKey: "supplierId",
  as: "purchases",
});

Purchase.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// User <-> Purchase
User.hasMany(Purchase, {
  foreignKey: "userId",
  as: "purchases",
});

Purchase.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Purchase <-> PurchaseItem
Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items",
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// Product <-> PurchaseItem
Product.hasMany(PurchaseItem, {
  foreignKey: "productId",
  as: "purchaseItems",
});

PurchaseItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// Member <-> Sale
Member.hasMany(Sale, {
  foreignKey: "memberId",
  as: "sales",
});

Sale.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// User <-> Sale
User.hasMany(Sale, {
  foreignKey: "userId",
  as: "sales",
});

Sale.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Sale <-> SaleItem
Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// Product <-> SaleItem
Product.hasMany(SaleItem, {
  foreignKey: "productId",
  as: "saleItems",
});

SaleItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// Member <-> MemberDebt
Member.hasMany(MemberDebt, {
  foreignKey: "memberId",
  as: "debts",
});

MemberDebt.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// Sale <-> MemberDebt
Sale.hasOne(MemberDebt, {
  foreignKey: "saleId",
  as: "debt",
});

MemberDebt.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// MemberDebt <-> DebtPayment
MemberDebt.hasMany(DebtPayment, {
  foreignKey: "memberDebtId",
  as: "payments",
});

DebtPayment.belongsTo(MemberDebt, {
  foreignKey: "memberDebtId",
  as: "debt",
});

// User <-> DebtPayment
User.hasMany(DebtPayment, {
  foreignKey: "userId",
  as: "debtPayments",
});

DebtPayment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Supplier <-> SupplierDebt
Supplier.hasMany(SupplierDebt, {
  foreignKey: "supplierId",
  as: "debts",
});

SupplierDebt.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// Purchase <-> SupplierDebt
Purchase.hasOne(SupplierDebt, {
  foreignKey: "purchaseId",
  as: "debt",
});

SupplierDebt.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// Product <-> StockMovement
Product.hasMany(StockMovement, {
  foreignKey: "productId",
  as: "stockMovements",
});

StockMovement.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// User <-> StockMovement
User.hasMany(StockMovement, {
  foreignKey: "createdBy",
  as: "stockMovements",
});

StockMovement.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// Product <-> StockAdjustment
Product.hasMany(StockAdjustment, {
  foreignKey: "productId",
  as: "stockAdjustments",
});

StockAdjustment.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// User <-> StockAdjustment
User.hasMany(StockAdjustment, {
  foreignKey: "userId",
  as: "stockAdjustments",
});

StockAdjustment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Purchase <-> PurchaseReturn
Purchase.hasMany(PurchaseReturn, {
  foreignKey: "purchaseId",
  as: "returns",
});

PurchaseReturn.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// Supplier <-> PurchaseReturn
Supplier.hasMany(PurchaseReturn, {
  foreignKey: "supplierId",
  as: "returns",
});

PurchaseReturn.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// Sale <-> SalesReturn
Sale.hasMany(SalesReturn, {
  foreignKey: "saleId",
  as: "returns",
});

SalesReturn.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// Member <-> SalesReturn
Member.hasMany(SalesReturn, {
  foreignKey: "memberId",
  as: "returns",
});

SalesReturn.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// ============================================
// EXPORT ALL MODELS
// ============================================
module.exports = {
  // Existing
  User,
  Member,
  Category,

  // New
  Supplier,
  Product,
  Setting,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  MemberDebt,
  DebtPayment,
  SupplierDebt,
  StockMovement,
  StockAdjustment,
  PurchaseReturn,
  PurchaseReturnItem,
  SalesReturn,
  SalesReturnItem,
};
