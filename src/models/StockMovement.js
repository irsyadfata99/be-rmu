// ============================================
// src/models/StockMovement.js (FIXED - Remove Associations)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ============================================
// MODEL: STOCK MOVEMENT (History Pergerakan Stok)
// ============================================
const StockMovement = sequelize.define(
  "StockMovement",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM(
        "IN", // Masuk (dari pembelian)
        "OUT", // Keluar (dari penjualan)
        "ADJUSTMENT", // Penyesuaian manual
        "RETURN_IN", // Retur penjualan (barang kembali)
        "RETURN_OUT" // Retur pembelian (barang keluar)
      ),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Jumlah perubahan (+ untuk IN, - untuk OUT)",
    },
    quantityBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Stok sebelum perubahan",
    },
    quantityAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Stok setelah perubahan",
    },
    referenceType: {
      type: DataTypes.ENUM("PURCHASE", "SALE", "ADJUSTMENT", "RETURN"),
      allowNull: true,
      comment: "Tipe referensi transaksi",
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID referensi (purchaseId, saleId, adjustmentId, dll)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "User yang membuat movement",
    },
  },
  {
    tableName: "stock_movements",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["product_id"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["reference_type", "reference_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

// ============================================
// STATIC METHODS - STOCK MOVEMENT
// ============================================

/**
 * Record stock IN (barang masuk dari pembelian)
 */
StockMovement.recordIn = async function (
  productId,
  quantity,
  referenceId,
  userId,
  notes = null
) {
  const Product = sequelize.models.Product;
  const product = await Product.findByPk(productId);

  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const quantityBefore = product.stock;
  await product.addStock(quantity);
  const quantityAfter = product.stock;

  return await this.create({
    productId,
    type: "IN",
    quantity,
    quantityBefore,
    quantityAfter,
    referenceType: "PURCHASE",
    referenceId,
    notes,
    createdBy: userId,
  });
};

/**
 * Record stock OUT (barang keluar dari penjualan)
 */
StockMovement.recordOut = async function (
  productId,
  quantity,
  referenceId,
  userId,
  notes = null
) {
  const Product = sequelize.models.Product;
  const product = await Product.findByPk(productId);

  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const quantityBefore = product.stock;
  await product.reduceStock(quantity);
  const quantityAfter = product.stock;

  return await this.create({
    productId,
    type: "OUT",
    quantity: -quantity, // Negative for OUT
    quantityBefore,
    quantityAfter,
    referenceType: "SALE",
    referenceId,
    notes,
    createdBy: userId,
  });
};

/**
 * Record adjustment (penyesuaian manual)
 */
StockMovement.recordAdjustment = async function (
  productId,
  quantity,
  adjustmentId,
  userId,
  notes = null
) {
  const Product = sequelize.models.Product;
  const product = await Product.findByPk(productId);

  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const quantityBefore = product.stock;

  if (quantity > 0) {
    await product.addStock(quantity);
  } else {
    await product.reduceStock(Math.abs(quantity));
  }

  const quantityAfter = product.stock;

  return await this.create({
    productId,
    type: "ADJUSTMENT",
    quantity,
    quantityBefore,
    quantityAfter,
    referenceType: "ADJUSTMENT",
    referenceId: adjustmentId,
    notes,
    createdBy: userId,
  });
};

// ============================================
// MODEL: STOCK ADJUSTMENT (Penyesuaian Stok Manual)
// ============================================
const StockAdjustment = sequelize.define(
  "StockAdjustment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "User yang melakukan adjustment",
    },
    adjustmentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Nomor adjustment (auto-generate)",
    },
    adjustmentType: {
      type: DataTypes.ENUM(
        "DAMAGED", // Rusak
        "EXPIRED", // Kadaluarsa
        "LOST", // Hilang
        "LEAKED", // Bocor
        "REPACK", // Packing ulang
        "FOUND", // Ketemu (tambah stok)
        "OTHER" // Lainnya
      ),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Jumlah adjustment (+ untuk tambah, - untuk kurang)",
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Alasan adjustment",
    },
    adjustmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      comment: "User yang approve (untuk ADMIN)",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      allowNull: false,
      defaultValue: "APPROVED",
      comment: "Status persetujuan (default APPROVED untuk flexibility)",
    },
  },
  {
    tableName: "stock_adjustments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["adjustment_number"],
      },
      {
        fields: ["product_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["adjustment_type"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["adjustment_date"],
      },
    ],
  }
);

// ============================================
// STATIC METHODS - STOCK ADJUSTMENT
// ============================================

/**
 * Generate adjustment number
 * Format: ADJ-YYYYMMDD-XXX
 */
StockAdjustment.generateAdjustmentNumber = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const { Op } = require("sequelize");
  const lastAdjustment = await this.findOne({
    where: {
      adjustmentNumber: {
        [Op.like]: `ADJ-${dateStr}-%`,
      },
    },
    order: [["adjustmentNumber", "DESC"]],
  });

  let nextNumber = 1;

  if (lastAdjustment) {
    const lastNumber =
      parseInt(lastAdjustment.adjustmentNumber.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `ADJ-${dateStr}-${paddedNumber}`;
};

/**
 * Create adjustment and update stock
 */
StockAdjustment.createAndApply = async function (data) {
  const { productId, userId, adjustmentType, quantity, reason, notes } = data;

  // Generate adjustment number
  const adjustmentNumber = await this.generateAdjustmentNumber();

  // Create adjustment record
  const adjustment = await this.create({
    adjustmentNumber,
    productId,
    userId,
    adjustmentType,
    quantity,
    reason,
    notes,
    status: "APPROVED", // Auto-approve
  });

  // Record stock movement
  await StockMovement.recordAdjustment(
    productId,
    quantity,
    adjustment.id,
    userId,
    `${adjustmentType}: ${reason}`
  );

  return adjustment;
};

// ============================================
// INSTANCE METHODS
// ============================================

StockAdjustment.prototype.toJSON = function () {
  const values = { ...this.get() };
  return values;
};

// ============================================
// ⚠️ NO ASSOCIATIONS HERE
// All associations are in src/models/index.js
// ============================================

module.exports = { StockMovement, StockAdjustment };
