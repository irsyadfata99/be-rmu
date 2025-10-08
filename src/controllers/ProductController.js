// ============================================
// src/controllers/ProductController.js
// Controller untuk manage produk
// ============================================
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");

class ProductController {
  // ============================================
  // GET /api/products - Get all products with pagination
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", categoryId, supplierId, isActive, lowStock = false, outOfStock = false, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const whereClause = {};

      // Search by name, barcode, or SKU
      if (search) {
        whereClause[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { barcode: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }];
      }

      // Filter by category
      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      // Filter by supplier
      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      // Filter by active status
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }

      // Filter low stock
      if (lowStock === "true") {
        whereClause[Op.and] = [require("sequelize").where(require("sequelize").col("stock"), "<=", require("sequelize").col("min_stock"))];
      }

      // Filter out of stock
      if (outOfStock === "true") {
        whereClause.stock = 0;
      }

      // Get products with pagination
      const { count, rows } = await Product.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
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

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(res, rows, pagination, "Produk berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/:id - Get product by ID
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
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

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      return ApiResponse.success(res, product, "Produk berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/barcode/:barcode - Search by barcode
  // PENTING untuk fitur scanning!
  // ============================================
  static async searchByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;

      if (!barcode) {
        return ApiResponse.error(res, "Barcode harus diisi", 422);
      }

      const product = await Product.findByBarcode(barcode);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      return ApiResponse.success(res, product, "Produk berhasil ditemukan");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/sku/:sku - Search by SKU
  // ============================================
  static async searchBySKU(req, res, next) {
    try {
      const { sku } = req.params;

      if (!sku) {
        return ApiResponse.error(res, "SKU harus diisi", 422);
      }

      const product = await Product.findBySKU(sku);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      return ApiResponse.success(res, product, "Produk berhasil ditemukan");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/low-stock - Get products with low stock
  // ============================================
  static async getLowStock(req, res, next) {
    try {
      const products = await Product.getLowStock();

      return ApiResponse.success(res, products, `Ditemukan ${products.length} produk dengan stok menipis`);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/out-of-stock - Get out of stock products
  // ============================================
  static async getOutOfStock(req, res, next) {
    try {
      const products = await Product.getOutOfStock();

      return ApiResponse.success(res, products, `Ditemukan ${products.length} produk yang habis`);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // POST /api/products - Create new product
  // ============================================
  static async create(req, res, next) {
    try {
      const { barcode, name, categoryId, supplierId, unit, purchasePrice, sellingPrice, stock, minStock, description, image } = req.body;

      // Validation
      const errors = {};

      if (!name) {
        errors.name = ["Nama produk harus diisi"];
      }

      if (!categoryId) {
        errors.categoryId = ["Kategori harus dipilih"];
      }

      if (!unit) {
        errors.unit = ["Satuan harus diisi"];
      }

      if (purchasePrice === undefined || purchasePrice < 0) {
        errors.purchasePrice = ["Harga beli harus diisi dan tidak boleh negatif"];
      }

      if (sellingPrice === undefined || sellingPrice < 0) {
        errors.sellingPrice = ["Harga jual harus diisi dan tidak boleh negatif"];
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Check if category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return ApiResponse.error(res, "Kategori tidak ditemukan", 404);
      }

      // Check if supplier exists (if provided)
      if (supplierId) {
        const supplier = await Supplier.findByPk(supplierId);
        if (!supplier) {
          return ApiResponse.error(res, "Supplier tidak ditemukan", 404);
        }
      }

      // Check if barcode already exists
      if (barcode) {
        const existingBarcode = await Product.findOne({ where: { barcode } });
        if (existingBarcode) {
          return ApiResponse.error(res, "Barcode sudah digunakan", 422, {
            barcode: ["Barcode sudah digunakan"],
          });
        }
      }

      // Generate SKU
      const sku = await Product.generateSKU();

      // Create product
      const product = await Product.create({
        barcode: barcode || null,
        sku,
        name,
        categoryId,
        supplierId: supplierId || null,
        unit,
        purchasePrice,
        sellingPrice,
        stock: stock || 0,
        minStock: minStock || 0,
        description,
        image,
        isActive: true,
      });

      // Load associations
      await product.reload({
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

      console.log(`✅ Product created: ${product.sku} - ${product.name}`);

      return ApiResponse.created(res, product, "Produk berhasil dibuat");
    } catch (error) {
      console.error("❌ Error creating product:", error);
      next(error);
    }
  }

  // ============================================
  // PUT /api/products/:id - Update product
  // ============================================
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { barcode, name, categoryId, supplierId, unit, purchasePrice, sellingPrice, minStock, description, image, isActive } = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      // Validation
      const errors = {};

      if (categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
          errors.categoryId = ["Kategori tidak ditemukan"];
        }
      }

      if (supplierId) {
        const supplier = await Supplier.findByPk(supplierId);
        if (!supplier) {
          errors.supplierId = ["Supplier tidak ditemukan"];
        }
      }

      // Check if new barcode already exists
      if (barcode && barcode !== product.barcode) {
        const existingBarcode = await Product.findOne({
          where: {
            barcode,
            id: { [Op.ne]: id },
          },
        });

        if (existingBarcode) {
          errors.barcode = ["Barcode sudah digunakan"];
        }
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Update product
      const updateData = {};
      if (barcode !== undefined) updateData.barcode = barcode || null;
      if (name) updateData.name = name;
      if (categoryId) updateData.categoryId = categoryId;
      if (supplierId !== undefined) updateData.supplierId = supplierId || null;
      if (unit) updateData.unit = unit;
      if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice;
      if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
      if (minStock !== undefined) updateData.minStock = minStock;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (isActive !== undefined) updateData.isActive = isActive;

      await product.update(updateData);

      // Reload with associations
      await product.reload({
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

      console.log(`✅ Product updated: ${product.sku} - ${product.name}`);

      return ApiResponse.success(res, product, "Produk berhasil diupdate");
    } catch (error) {
      console.error("❌ Error updating product:", error);
      next(error);
    }
  }

  // ============================================
  // DELETE /api/products/:id - Soft delete product
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      // Soft delete - set isActive to false
      await product.update({ isActive: false });

      console.log(`🗑️ Product deactivated: ${product.sku} - ${product.name}`);

      return ApiResponse.success(res, { id: product.id }, "Produk berhasil dinonaktifkan");
    } catch (error) {
      console.error("❌ Error deleting product:", error);
      next(error);
    }
  }

  // ============================================
  // PATCH /api/products/:id/toggle - Toggle product active status
  // ============================================
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      await product.update({ isActive: !product.isActive });

      console.log(`🔄 Product ${product.isActive ? "activated" : "deactivated"}: ${product.sku} - ${product.name}`);

      return ApiResponse.success(res, product, `Produk berhasil ${product.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (error) {
      console.error("❌ Error toggling product status:", error);
      next(error);
    }
  }

  // ============================================
  // PATCH /api/products/:id/stock - Update stock manually
  // (Untuk adjustment cepat, tidak melalui StockAdjustment)
  // ============================================
  static async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || stock < 0) {
        return ApiResponse.error(res, "Stok harus diisi dan tidak boleh negatif", 422);
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      const oldStock = product.stock;
      await product.update({ stock });

      console.log(`📦 Stock updated: ${product.sku} - ${oldStock} → ${stock}`);

      return ApiResponse.success(
        res,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          oldStock,
          newStock: stock,
        },
        "Stok berhasil diupdate"
      );
    } catch (error) {
      console.error("❌ Error updating stock:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/products/stats - Get product statistics
  // ============================================
  static async getStats(req, res, next) {
    try {
      const totalProducts = await Product.count();
      const activeProducts = await Product.count({ where: { isActive: true } });
      const inactiveProducts = await Product.count({
        where: { isActive: false },
      });

      const lowStockProducts = await Product.count({
        where: {
          isActive: true,
          [Op.or]: [require("sequelize").where(require("sequelize").col("stock"), "<=", require("sequelize").col("min_stock"))],
        },
      });

      const outOfStockProducts = await Product.count({
        where: {
          isActive: true,
          stock: 0,
        },
      });

      // Total stock value
      const products = await Product.findAll({
        where: { isActive: true },
        attributes: ["stock", "purchasePrice", "sellingPrice"],
      });

      const totalStockValue = products.reduce((sum, p) => sum + p.stock * parseFloat(p.purchasePrice), 0);

      const potentialRevenue = products.reduce((sum, p) => sum + p.stock * parseFloat(p.sellingPrice), 0);

      const stats = {
        totalProducts,
        activeProducts,
        inactiveProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue: parseFloat(totalStockValue.toFixed(2)),
        potentialRevenue: parseFloat(potentialRevenue.toFixed(2)),
      };

      return ApiResponse.success(res, stats, "Statistik produk berhasil diambil");
    } catch (error) {
      console.error("❌ Error getting product stats:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/products/autocomplete - Autocomplete search
  // Untuk fitur search dropdown saat transaksi
  // ============================================
  static async autocomplete(req, res, next) {
    try {
      const { query = "", limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return ApiResponse.success(res, [], "Query minimal 2 karakter");
      }

      const products = await Product.findAll({
        where: {
          isActive: true,
          [Op.or]: [{ name: { [Op.like]: `%${query}%` } }, { barcode: { [Op.like]: `%${query}%` } }, { sku: { [Op.like]: `%${query}%` } }],
        },
        limit: parseInt(limit),
        attributes: ["id", "sku", "barcode", "name", "unit", "sellingPrice", "stock"],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["name"],
          },
        ],
      });

      // Format response untuk autocomplete
      const formatted = products.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        unit: p.unit,
        price: parseFloat(p.sellingPrice),
        stock: p.stock,
        category: p.category?.name,
        label: `${p.name} (${p.unit}) - Rp ${parseFloat(p.sellingPrice).toLocaleString("id-ID")}`,
        value: p.id,
      }));

      return ApiResponse.success(res, formatted, `Ditemukan ${formatted.length} produk`);
    } catch (error) {
      console.error("❌ Error autocomplete:", error);
      next(error);
    }
  }
}

module.exports = ProductController;
