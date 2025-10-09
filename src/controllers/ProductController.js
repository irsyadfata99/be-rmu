// ============================================
// src/controllers/ProductController.js - FIXED VERSION
// Controller dengan SQL Injection protection & validation
// ============================================
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/response");
const { Op, literal, col, where } = require("sequelize");

/**
 * ✅ FIX: Added input sanitization helper
 * Prevents SQL injection in LIKE queries
 */
function sanitizeLikeInput(input) {
  if (!input) return "";
  // Escape special characters for SQL LIKE
  return String(input)
    .replace(/[%_\\]/g, "\\$&") // Escape %, _, and \
    .trim();
}

/**
 * ✅ FIX: Added validation helper for sort parameters
 * Prevents SQL injection via sortBy parameter
 */
function validateSortField(sortBy, allowedFields) {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return allowedFields[0]; // Return default
  }
  return sortBy;
}

/**
 * ✅ FIX: Added validation helper for sort order
 */
function validateSortOrder(sortOrder) {
  const normalized = String(sortOrder).toUpperCase();
  return ["ASC", "DESC"].includes(normalized) ? normalized : "DESC";
}

class ProductController {
  // ============================================
  // GET /api/products - Get all products with pagination
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", categoryId, supplierId, isActive, lowStock = false, outOfStock = false, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      // ✅ FIX: Validate and sanitize inputs
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page
      const offset = (pageNum - 1) * limitNum;

      // ✅ FIX: Validate sort parameters
      const allowedSortFields = ["createdAt", "updatedAt", "name", "sku", "barcode", "stock", "sellingPrice", "purchasePrice"];
      const validSortBy = validateSortField(sortBy, allowedSortFields);
      const validSortOrder = validateSortOrder(sortOrder);

      // Build where clause
      const whereClause = {};

      // ✅ FIX: Sanitize search input to prevent SQL injection
      if (search) {
        const sanitizedSearch = sanitizeLikeInput(search);
        whereClause[Op.or] = [{ name: { [Op.like]: `%${sanitizedSearch}%` } }, { barcode: { [Op.like]: `%${sanitizedSearch}%` } }, { sku: { [Op.like]: `%${sanitizedSearch}%` } }];
      }

      // ✅ FIX: Validate categoryId is a valid UUID/number
      if (categoryId) {
        // Check if it's a valid ID format (UUID or number)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId) || /^\d+$/.test(categoryId)) {
          whereClause.categoryId = categoryId;
        }
      }

      // ✅ FIX: Validate supplierId
      if (supplierId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId) || /^\d+$/.test(supplierId)) {
          whereClause.supplierId = supplierId;
        }
      }

      // ✅ FIX: Properly validate boolean parameters
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true" || isActive === true;
      }

      // ✅ FIX: Use Sequelize's where() function for low stock comparison
      // This prevents SQL injection in raw queries
      if (lowStock === "true" || lowStock === true) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(where(col("stock"), Op.lte, col("min_stock")));
      }

      // Filter out of stock
      if (outOfStock === "true" || outOfStock === true) {
        whereClause.stock = 0;
      }

      // Get products with pagination
      const { count, rows } = await Product.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset: offset,
        order: [[validSortBy, validSortOrder]],
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
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
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

      // ✅ FIX: Validate ID format
      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

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
  // ============================================
  static async searchByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;

      // ✅ FIX: Validate barcode input
      if (!barcode || barcode.trim().length === 0) {
        return ApiResponse.error(res, "Barcode harus diisi", 422);
      }

      // ✅ FIX: Sanitize barcode input
      const sanitizedBarcode = sanitizeLikeInput(barcode);

      if (sanitizedBarcode.length > 50) {
        return ApiResponse.error(res, "Barcode terlalu panjang", 422);
      }

      const product = await Product.findByBarcode(sanitizedBarcode);

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

      // ✅ FIX: Validate SKU input
      if (!sku || sku.trim().length === 0) {
        return ApiResponse.error(res, "SKU harus diisi", 422);
      }

      // ✅ FIX: Sanitize SKU input
      const sanitizedSKU = sanitizeLikeInput(sku);

      if (sanitizedSKU.length > 50) {
        return ApiResponse.error(res, "SKU terlalu panjang", 422);
      }

      const product = await Product.findBySKU(sanitizedSKU);

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

      // ✅ FIX: Enhanced validation with proper checks
      const errors = {};

      if (!name || name.trim().length === 0) {
        errors.name = ["Nama produk harus diisi"];
      } else if (name.length < 3) {
        errors.name = ["Nama produk minimal 3 karakter"];
      } else if (name.length > 200) {
        errors.name = ["Nama produk maksimal 200 karakter"];
      }

      if (!categoryId) {
        errors.categoryId = ["Kategori harus dipilih"];
      }

      if (!unit || unit.trim().length === 0) {
        errors.unit = ["Satuan harus diisi"];
      } else if (unit.length > 20) {
        errors.unit = ["Satuan maksimal 20 karakter"];
      }

      // ✅ FIX: Proper number validation
      const parsedPurchasePrice = parseFloat(purchasePrice);
      if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
        errors.purchasePrice = ["Harga beli harus berupa angka dan tidak boleh negatif"];
      }

      const parsedSellingPrice = parseFloat(sellingPrice);
      if (isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
        errors.sellingPrice = ["Harga jual harus berupa angka dan tidak boleh negatif"];
      }

      // ✅ FIX: Validate stock and minStock
      const parsedStock = parseInt(stock) || 0;
      const parsedMinStock = parseInt(minStock) || 0;

      if (parsedStock < 0) {
        errors.stock = ["Stok tidak boleh negatif"];
      }

      if (parsedMinStock < 0) {
        errors.minStock = ["Minimum stok tidak boleh negatif"];
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

      // ✅ FIX: Sanitize barcode before checking
      if (barcode) {
        const sanitizedBarcode = barcode.trim();

        if (sanitizedBarcode.length > 50) {
          return ApiResponse.error(res, "Barcode terlalu panjang (maksimal 50 karakter)", 422);
        }

        const existingBarcode = await Product.findOne({
          where: { barcode: sanitizedBarcode },
        });

        if (existingBarcode) {
          return ApiResponse.error(res, "Barcode sudah digunakan", 422, {
            barcode: ["Barcode sudah digunakan"],
          });
        }
      }

      // Generate SKU
      const sku = await Product.generateSKU();

      // ✅ FIX: Sanitize description and image
      const sanitizedDescription = description ? description.trim().substring(0, 1000) : null;
      const sanitizedImage = image ? image.trim().substring(0, 500) : null;

      // Create product
      const product = await Product.create({
        barcode: barcode ? barcode.trim() : null,
        sku,
        name: name.trim(),
        categoryId,
        supplierId: supplierId || null,
        unit: unit.trim(),
        purchasePrice: parsedPurchasePrice,
        sellingPrice: parsedSellingPrice,
        stock: parsedStock,
        minStock: parsedMinStock,
        description: sanitizedDescription,
        image: sanitizedImage,
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

      // ✅ FIX: Validate ID
      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

      const { barcode, name, categoryId, supplierId, unit, purchasePrice, sellingPrice, minStock, description, image, isActive } = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      // ✅ FIX: Enhanced validation
      const errors = {};

      if (name !== undefined) {
        if (!name || name.trim().length < 3) {
          errors.name = ["Nama produk minimal 3 karakter"];
        } else if (name.length > 200) {
          errors.name = ["Nama produk maksimal 200 karakter"];
        }
      }

      if (unit !== undefined) {
        if (!unit || unit.trim().length === 0) {
          errors.unit = ["Satuan harus diisi"];
        } else if (unit.length > 20) {
          errors.unit = ["Satuan maksimal 20 karakter"];
        }
      }

      if (purchasePrice !== undefined) {
        const parsed = parseFloat(purchasePrice);
        if (isNaN(parsed) || parsed < 0) {
          errors.purchasePrice = ["Harga beli harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (sellingPrice !== undefined) {
        const parsed = parseFloat(sellingPrice);
        if (isNaN(parsed) || parsed < 0) {
          errors.sellingPrice = ["Harga jual harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (minStock !== undefined) {
        const parsed = parseInt(minStock);
        if (isNaN(parsed) || parsed < 0) {
          errors.minStock = ["Minimum stok harus berupa angka dan tidak boleh negatif"];
        }
      }

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

      // ✅ FIX: Sanitize and validate barcode
      if (barcode !== undefined && barcode !== product.barcode) {
        const sanitizedBarcode = barcode ? barcode.trim() : null;

        if (sanitizedBarcode && sanitizedBarcode.length > 50) {
          errors.barcode = ["Barcode terlalu panjang (maksimal 50 karakter)"];
        } else if (sanitizedBarcode) {
          const existingBarcode = await Product.findOne({
            where: {
              barcode: sanitizedBarcode,
              id: { [Op.ne]: id },
            },
          });

          if (existingBarcode) {
            errors.barcode = ["Barcode sudah digunakan"];
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // ✅ FIX: Sanitize all inputs before update
      const updateData = {};
      if (barcode !== undefined) updateData.barcode = barcode ? barcode.trim() : null;
      if (name) updateData.name = name.trim();
      if (categoryId) updateData.categoryId = categoryId;
      if (supplierId !== undefined) updateData.supplierId = supplierId || null;
      if (unit) updateData.unit = unit.trim();
      if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
      if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);
      if (minStock !== undefined) updateData.minStock = parseInt(minStock);
      if (description !== undefined) updateData.description = description ? description.trim().substring(0, 1000) : null;
      if (image !== undefined) updateData.image = image ? image.trim().substring(0, 500) : null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

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

      // ✅ FIX: Validate ID
      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

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

      // ✅ FIX: Validate ID
      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

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
  // ============================================
  static async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      // ✅ FIX: Validate ID
      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

      // ✅ FIX: Validate stock input
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return ApiResponse.error(res, "Stok harus berupa angka dan tidak boleh negatif", 422);
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      const oldStock = product.stock;
      await product.update({ stock: parsedStock });

      console.log(`📦 Stock updated: ${product.sku} - ${oldStock} → ${parsedStock}`);

      return ApiResponse.success(
        res,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          oldStock,
          newStock: parsedStock,
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

      // ✅ FIX: Use proper Sequelize functions instead of raw SQL
      const lowStockProducts = await Product.count({
        where: {
          isActive: true,
          [Op.and]: [where(col("stock"), Op.lte, col("min_stock"))],
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

      // ✅ FIX: Use reduce with proper type conversion
      const totalStockValue = products.reduce((sum, p) => {
        const stock = parseInt(p.stock) || 0;
        const price = parseFloat(p.purchasePrice) || 0;
        return sum + stock * price;
      }, 0);

      const potentialRevenue = products.reduce((sum, p) => {
        const stock = parseInt(p.stock) || 0;
        const price = parseFloat(p.sellingPrice) || 0;
        return sum + stock * price;
      }, 0);

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
  // ============================================
  static async autocomplete(req, res, next) {
    try {
      const { query = "", limit = 10 } = req.query;

      // ✅ FIX: Validate query length
      if (!query || query.trim().length < 2) {
        return ApiResponse.success(res, [], "Query minimal 2 karakter");
      }

      // ✅ FIX: Sanitize query input
      const sanitizedQuery = sanitizeLikeInput(query);

      if (sanitizedQuery.length > 100) {
        return ApiResponse.error(res, "Query terlalu panjang", 422);
      }

      // ✅ FIX: Validate limit
      const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));

      const products = await Product.findAll({
        where: {
          isActive: true,
          [Op.or]: [{ name: { [Op.like]: `%${sanitizedQuery}%` } }, { barcode: { [Op.like]: `%${sanitizedQuery}%` } }, { sku: { [Op.like]: `%${sanitizedQuery}%` } }],
        },
        limit: validLimit,
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
