// ============================================
// src/models/index.js (COMPLETE & VERIFIED)
// PRODUCTION READY - Complete Model Associations
// ============================================

// Import core models
const User = require("./User");
const Member = require("./Member");
const Category = require("./Category");
const Supplier = require("./Supplier");
const Setting = require("./Setting");
const Product = require("./Product");

// Import debt models
const { MemberDebt, DebtPayment } = require("./MemberDebt");
const SupplierDebt = require("./SupplierDebt");

// Import stock models
const { StockMovement, StockAdjustment } = require("./StockMovement");

// Import transaction models
const Purchase = require("./Purchase");
const PurchaseItem = require("./PurchaseItem");
const Sale = require("./Sale");
const SaleItem = require("./SaleItem");

// Import return models
const { PurchaseReturn, PurchaseReturnItem } = require("./PurchaseReturn");
const { SalesReturn, SalesReturnItem } = require("./SalesReturn");

// Import point model
const PointTransaction = require("./PointTransaction");

// ============================================
// SETUP ALL ASSOCIATIONS
// ============================================

// ========== CATEGORY <-> PRODUCT ==========
Category.hasMany(Product, {
  foreignKey: "categoryId",
  as: "products",
});

Product.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// ========== SUPPLIER <-> PRODUCT ==========
Supplier.hasMany(Product, {
  foreignKey: "supplierId",
  as: "products",
});

Product.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ========== SUPPLIER <-> PURCHASE ==========
Supplier.hasMany(Purchase, {
  foreignKey: "supplierId",
  as: "purchases",
});

Purchase.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ========== USER <-> PURCHASE ==========
User.hasMany(Purchase, {
  foreignKey: "userId",
  as: "purchases",
});

Purchase.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== PURCHASE <-> PURCHASE ITEM ==========
Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items",
  onDelete: "CASCADE",
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// ========== PRODUCT <-> PURCHASE ITEM ==========
Product.hasMany(PurchaseItem, {
  foreignKey: "productId",
  as: "purchaseItems",
});

PurchaseItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== MEMBER <-> SALE ==========
Member.hasMany(Sale, {
  foreignKey: "memberId",
  as: "sales",
});

Sale.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// ========== USER <-> SALE ==========
User.hasMany(Sale, {
  foreignKey: "userId",
  as: "sales",
});

Sale.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== SALE <-> SALE ITEM ==========
Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items",
  onDelete: "CASCADE",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ========== PRODUCT <-> SALE ITEM ==========
Product.hasMany(SaleItem, {
  foreignKey: "productId",
  as: "saleItems",
});

SaleItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== MEMBER <-> MEMBER DEBT ==========
Member.hasMany(MemberDebt, {
  foreignKey: "memberId",
  as: "debts",
});

MemberDebt.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// ========== SALE <-> MEMBER DEBT ==========
Sale.hasOne(MemberDebt, {
  foreignKey: "saleId",
  as: "debt",
});

MemberDebt.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ========== MEMBER DEBT <-> DEBT PAYMENT ==========
MemberDebt.hasMany(DebtPayment, {
  foreignKey: "memberDebtId",
  as: "payments",
});

DebtPayment.belongsTo(MemberDebt, {
  foreignKey: "memberDebtId",
  as: "debt",
});

// ========== MEMBER <-> DEBT PAYMENT ==========
Member.hasMany(DebtPayment, {
  foreignKey: "memberId",
  as: "payments",
});

DebtPayment.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// ========== USER <-> DEBT PAYMENT ==========
User.hasMany(DebtPayment, {
  foreignKey: "userId",
  as: "debtPayments",
});

DebtPayment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== SUPPLIER <-> SUPPLIER DEBT ==========
Supplier.hasMany(SupplierDebt, {
  foreignKey: "supplierId",
  as: "debts",
});

SupplierDebt.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ========== PURCHASE <-> SUPPLIER DEBT ==========
Purchase.hasOne(SupplierDebt, {
  foreignKey: "purchaseId",
  as: "debt",
});

SupplierDebt.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// ========== PRODUCT <-> STOCK MOVEMENT ==========
Product.hasMany(StockMovement, {
  foreignKey: "productId",
  as: "stockMovements",
});

StockMovement.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== USER <-> STOCK MOVEMENT ==========
User.hasMany(StockMovement, {
  foreignKey: "createdBy",
  as: "stockMovements",
});

StockMovement.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// ========== PRODUCT <-> STOCK ADJUSTMENT ==========
Product.hasMany(StockAdjustment, {
  foreignKey: "productId",
  as: "stockAdjustments",
});

StockAdjustment.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== USER <-> STOCK ADJUSTMENT ==========
User.hasMany(StockAdjustment, {
  foreignKey: "userId",
  as: "stockAdjustments",
});

StockAdjustment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== PURCHASE <-> PURCHASE RETURN ==========
Purchase.hasMany(PurchaseReturn, {
  foreignKey: "purchaseId",
  as: "returns",
});

PurchaseReturn.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// ========== SUPPLIER <-> PURCHASE RETURN ==========
Supplier.hasMany(PurchaseReturn, {
  foreignKey: "supplierId",
  as: "returns",
});

PurchaseReturn.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ========== USER <-> PURCHASE RETURN ==========
User.hasMany(PurchaseReturn, {
  foreignKey: "userId",
  as: "purchaseReturns",
});

PurchaseReturn.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== PURCHASE RETURN <-> PURCHASE RETURN ITEM ==========
PurchaseReturn.hasMany(PurchaseReturnItem, {
  foreignKey: "purchaseReturnId",
  as: "items",
  onDelete: "CASCADE",
});

PurchaseReturnItem.belongsTo(PurchaseReturn, {
  foreignKey: "purchaseReturnId",
  as: "purchaseReturn",
});

// ========== PRODUCT <-> PURCHASE RETURN ITEM ==========
Product.hasMany(PurchaseReturnItem, {
  foreignKey: "productId",
  as: "purchaseReturnItems",
});

PurchaseReturnItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== SALE <-> SALES RETURN ==========
Sale.hasMany(SalesReturn, {
  foreignKey: "saleId",
  as: "returns",
});

SalesReturn.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ========== MEMBER <-> SALES RETURN ==========
Member.hasMany(SalesReturn, {
  foreignKey: "memberId",
  as: "returns",
});

SalesReturn.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// ========== USER <-> SALES RETURN ==========
User.hasMany(SalesReturn, {
  foreignKey: "userId",
  as: "salesReturns",
});

SalesReturn.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ========== SALES RETURN <-> SALES RETURN ITEM ==========
SalesReturn.hasMany(SalesReturnItem, {
  foreignKey: "salesReturnId",
  as: "items",
  onDelete: "CASCADE",
});

SalesReturnItem.belongsTo(SalesReturn, {
  foreignKey: "salesReturnId",
  as: "salesReturn",
});

// ========== PRODUCT <-> SALES RETURN ITEM ==========
Product.hasMany(SalesReturnItem, {
  foreignKey: "productId",
  as: "salesReturnItems",
});

SalesReturnItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// ========== POINT TRANSACTION ASSOCIATIONS ==========

// PointTransaction <-> Member
Member.hasMany(PointTransaction, {
  foreignKey: "memberId",
  as: "pointTransactions",
});

PointTransaction.belongsTo(Member, {
  foreignKey: "memberId",
  as: "member",
});

// PointTransaction <-> Sale
Sale.hasMany(PointTransaction, {
  foreignKey: "saleId",
  as: "pointTransactions",
});

PointTransaction.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// PointTransaction <-> User (creator)
User.hasMany(PointTransaction, {
  foreignKey: "createdBy",
  as: "pointTransactions",
});

PointTransaction.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// ============================================
// EXPORT ALL MODELS
// ============================================
module.exports = {
  // Core
  User,
  Member,
  Category,
  Supplier,
  Setting,

  // Products & Stock
  Product,
  StockMovement,
  StockAdjustment,

  // Debt
  MemberDebt,
  DebtPayment,
  SupplierDebt,

  // Transactions
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,

  // Returns
  PurchaseReturn,
  PurchaseReturnItem,
  SalesReturn,
  SalesReturnItem,

  // Points
  PointTransaction,
};
