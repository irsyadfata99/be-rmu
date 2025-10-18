// ============================================
// src/models/Product.js - HARD DELETE VERSION
// ✅ Removed isActive filter from all queries
// ✅ Products are always active (no soft delete)
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
    },
    productType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Tunai",
      validate: {
        isIn: {
          args: [["Tunai", "Beli Putus", "Konsinyasi"]],
          msg: "Jenis produk tidak valid",
        },
      },
    },
    purchaseType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "TUNAI",
      validate: {
        isIn: {
          args: [["TUNAI", "KREDIT", "KONSINYASI"]],
          msg: "Jenis pembelian tidak valid",
        },
      },
    },
    invoiceNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PCS",
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
    },
    sellingPriceGeneral: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Harga jual umum tidak boleh negatif",
        },
      },
    },
    sellingPriceMember: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Harga jual anggota tidak boleh negatif",
        },
      },
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
    },
    maxStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Maksimal stok tidak boleh negatif",
        },
      },
    },
    points: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Points tidak boleh negatif",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // ✅ KEEP isActive column for backward compatibility
    // But we don't use it for filtering anymore
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Kept for backward compatibility, always true",
    },
  },
  {
    tableName: "products",
    timestamps: true,
    underscored: true,
    indexes: [
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
        fields: ["stock"],
      },
    ],
    hooks: {
      beforeCreate: (product) => {
        if (!product.sellingPrice && product.sellingPriceGeneral) {
          product.sellingPrice = product.sellingPriceGeneral;
        }
        // ✅ Always set isActive to true
        product.isActive = true;
      },
      beforeUpdate: (product) => {
        if (product.changed("sellingPriceGeneral")) {
          product.sellingPrice = product.sellingPriceGeneral;
        }
      },
    },
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

Product.prototype.isLowStock = function () {
  return this.stock <= this.minStock;
};

Product.prototype.isOutOfStock = function () {
  return this.stock === 0;
};

Product.prototype.addStock = async function (quantity, transaction = null) {
  await Product.increment("stock", {
    by: quantity,
    where: { id: this.id },
    transaction: transaction,
  });
  await this.reload({ transaction });
  return this;
};

Product.prototype.reduceStock = async function (quantity, transaction = null) {
  const { Op } = require("sequelize");
  await this.reload({ transaction });

  if (this.stock < quantity) {
    throw new Error(`Stok tidak cukup untuk ${this.name}. Tersedia: ${this.stock}, Diminta: ${quantity}`);
  }

  const [affectedCount] = await Product.decrement("stock", {
    by: quantity,
    where: {
      id: this.id,
      stock: { [Op.gte]: quantity },
    },
    transaction: transaction,
  });

  if (affectedCount === 0) {
    throw new Error(`Gagal mengurangi stok ${this.name}. Kemungkinan stok sudah habis atau tidak mencukupi.`);
  }

  await this.reload({ transaction });
  return this;
};

Product.prototype.getProfitMargin = function () {
  if (this.purchasePrice === 0) return 0;
  const profit = this.sellingPriceGeneral - this.purchasePrice;
  return ((profit / this.purchasePrice) * 100).toFixed(2);
};

Product.prototype.toJSON = function () {
  const values = { ...this.get() };

  if (values.purchasePrice) values.purchasePrice = parseFloat(values.purchasePrice);
  if (values.sellingPrice) values.sellingPrice = parseFloat(values.sellingPrice);
  if (values.sellingPriceGeneral) values.sellingPriceGeneral = parseFloat(values.sellingPriceGeneral);
  if (values.sellingPriceMember) values.sellingPriceMember = parseFloat(values.sellingPriceMember);
  if (values.points) values.points = parseFloat(values.points);

  values.profitMargin = this.getProfitMargin();
  values.isLowStock = this.isLowStock();
  values.isOutOfStock = this.isOutOfStock();

  return values;
};

// ============================================
// STATIC METHODS - ✅ REMOVED isActive FILTERS
// ============================================

Product.generateSKU = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const { Op } = require("sequelize");
  const lastProduct = await this.findOne({
    where: {
      sku: {
        [Op.like]: `PRD-${dateStr}-%`,
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

// ✅ FIXED: Remove isActive filter - search ALL products
Product.findByBarcode = async function (barcode) {
  return await this.findOne({
    where: { barcode },
  });
};

// ✅ FIXED: Remove isActive filter
Product.findBySKU = async function (sku) {
  return await this.findOne({
    where: { sku },
  });
};

// ✅ FIXED: Remove isActive filter
Product.getLowStock = async function () {
  const { Op } = require("sequelize");
  return await this.findAll({
    where: {
      [Op.or]: [sequelize.where(sequelize.col("stock"), "<=", sequelize.col("min_stock"))],
    },
    order: [["stock", "ASC"]],
  });
};

// ✅ FIXED: Remove isActive filter
Product.getOutOfStock = async function () {
  return await this.findAll({
    where: {
      stock: 0,
    },
    order: [["name", "ASC"]],
  });
};

module.exports = Product;
