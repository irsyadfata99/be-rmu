// ============================================
// src/models/Product.js
// Model untuk master data produk/barang
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: "Barcode produk untuk scanning",
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: "SKU sudah digunakan",
      },
      comment: "Stock Keeping Unit (auto-generate)",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama produk harus diisi",
        },
        len: {
          args: [3, 100],
          msg: "Nama produk minimal 3 karakter",
        },
      },
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "categories",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "suppliers",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      comment: "Supplier utama (bisa null untuk produk dari multiple supplier)",
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PCS",
      comment: "Satuan kemasan (PCS, PAK, BOX, KG, LITER, dll)",
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Harga beli tidak boleh negatif",
        },
      },
      comment: "Harga beli terakhir",
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Harga jual tidak boleh negatif",
        },
      },
      comment: "Harga jual",
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Stok tidak boleh negatif",
        },
      },
      comment: "Jumlah stok saat ini",
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Minimal stok tidak boleh negatif",
        },
      },
      comment: "Batas minimum stok untuk alert",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "URL/path gambar produk",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "products",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["barcode"],
      },
      {
        unique: true,
        fields: ["sku"],
      },
      {
        fields: ["name"],
      },
      {
        fields: ["category_id"],
      },
      {
        fields: ["supplier_id"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["stock"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if stock is low (below minimum)
 */
Product.prototype.isLowStock = function () {
  return this.stock <= this.minStock;
};

/**
 * Check if product is out of stock
 */
Product.prototype.isOutOfStock = function () {
  return this.stock === 0;
};

/**
 * Add stock
 */
Product.prototype.addStock = async function (quantity) {
  this.stock += quantity;
  await this.save();
  return this;
};

/**
 * Reduce stock
 */
Product.prototype.reduceStock = async function (quantity) {
  if (this.stock < quantity) {
    throw new Error(`Stok tidak cukup. Tersedia: ${this.stock}, Diminta: ${quantity}`);
  }
  this.stock -= quantity;
  await this.save();
  return this;
};

/**
 * Calculate profit margin
 */
Product.prototype.getProfitMargin = function () {
  if (this.purchasePrice === 0) return 0;
  const profit = this.sellingPrice - this.purchasePrice;
  return ((profit / this.purchasePrice) * 100).toFixed(2);
};

/**
 * Get formatted data for response
 */
Product.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Format decimal to number
  if (values.purchasePrice) {
    values.purchasePrice = parseFloat(values.purchasePrice);
  }
  if (values.sellingPrice) {
    values.sellingPrice = parseFloat(values.sellingPrice);
  }

  // Add computed fields
  values.profitMargin = this.getProfitMargin();
  values.isLowStock = this.isLowStock();
  values.isOutOfStock = this.isOutOfStock();

  return values;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate SKU otomatis
 * Format: PRD-YYYYMMDD-XXX
 */
Product.generateSKU = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Cari produk terakhir hari ini
  const lastProduct = await this.findOne({
    where: {
      sku: {
        [require("sequelize").Op.like]: `PRD-${dateStr}-%`,
      },
    },
    order: [["sku", "DESC"]],
  });

  let nextNumber = 1;

  if (lastProduct) {
    const lastNumber = parseInt(lastProduct.sku.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `PRD-${dateStr}-${paddedNumber}`;
};

/**
 * Search product by barcode
 */
Product.findByBarcode = async function (barcode) {
  return await this.findOne({
    where: { barcode, isActive: true },
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
      },
      {
        association: "supplier",
        attributes: ["id", "code", "name"],
        required: false,
      },
    ],
  });
};

/**
 * Search product by SKU
 */
Product.findBySKU = async function (sku) {
  return await this.findOne({
    where: { sku, isActive: true },
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
      },
      {
        association: "supplier",
        attributes: ["id", "code", "name"],
        required: false,
      },
    ],
  });
};

/**
 * Get products with low stock
 */
Product.getLowStock = async function () {
  const { Op } = require("sequelize");
  return await this.findAll({
    where: {
      isActive: true,
      [Op.or]: [sequelize.where(sequelize.col("stock"), "<=", sequelize.col("min_stock"))],
    },
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
      },
    ],
    order: [["stock", "ASC"]],
  });
};

/**
 * Get out of stock products
 */
Product.getOutOfStock = async function () {
  return await this.findAll({
    where: {
      isActive: true,
      stock: 0,
    },
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
      },
    ],
    order: [["name", "ASC"]],
  });
};

module.exports = Product;
