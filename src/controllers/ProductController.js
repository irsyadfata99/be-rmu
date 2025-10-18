// ============================================
// src/controllers/ProductController.js - HARD DELETE VERSION
// ✅ Removed ALL isActive filters
// ✅ Implemented paranoid delete with safety check
// ✅ Fixed barcode search - no isActive filter
// ============================================
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/response");
const { Op, literal, col, where } = require("sequelize");

// ✅ Import models for checking references
const { SaleItem, PurchaseItem, StockMovement } = require("../models");

function sanitizeLikeInput(input) {
  if (!input) return "";
  return String(input)
    .replace(/[%_\\]/g, "\\$&")
    .trim();
}

function validateSortField(sortBy, allowedFields) {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return allowedFields[0];
  }
  return sortBy;
}

function validateSortOrder(sortOrder) {
  const normalized = String(sortOrder).toUpperCase();
  return ["ASC", "DESC"].includes(normalized) ? normalized : "DESC";
}

class ProductController {
  // ============================================
  // GET /api/products - Get all products
  // ✅ REMOVED isActive filter
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", categoryId, supplierId, lowStock = false, outOfStock = false, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const offset = (pageNum - 1) * limitNum;

      const allowedSortFields = ["createdAt", "updatedAt", "name", "sku", "barcode", "stock", "sellingPrice", "purchasePrice"];
      const validSortBy = validateSortField(sortBy, allowedSortFields);
      const validSortOrder = validateSortOrder(sortOrder);

      const whereClause = {};

      if (search) {
        const sanitizedSearch = sanitizeLikeInput(search);
        whereClause[Op.or] = [{ name: { [Op.like]: `%${sanitizedSearch}%` } }, { barcode: { [Op.like]: `%${sanitizedSearch}%` } }, { sku: { [Op.like]: `%${sanitizedSearch}%` } }];
      }

      if (categoryId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId) || /^\d+$/.test(categoryId)) {
          whereClause.categoryId = categoryId;
        }
      }

      if (supplierId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId) || /^\d+$/.test(supplierId)) {
          whereClause.supplierId = supplierId;
        }
      }

      // ✅ REMOVED: isActive filter - all products in DB are active

      if (lowStock === "true" || lowStock === true) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(where(col("stock"), Op.lte, col("min_stock")));
      }

      if (outOfStock === "true" || outOfStock === true) {
        whereClause.stock = 0;
      }

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
  // ✅ FIXED: Removed isActive filter & simplified sanitization
  // ============================================
  static async searchByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;

      if (!barcode || barcode.trim().length === 0) {
        return ApiResponse.error(res, "Barcode harus diisi", 422);
      }

      // ✅ FIXED: Simple trim for exact match (not LIKE query)
      const sanitizedBarcode = barcode.trim();

      if (sanitizedBarcode.length > 50) {
        return ApiResponse.error(res, "Barcode terlalu panjang", 422);
      }

      // ✅ CRITICAL FIX: Load with associations & NO isActive filter
      const product = await Product.findOne({
        where: {
          barcode: sanitizedBarcode,
          // ✅ REMOVED: isActive: true
        },
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

      // ✅ Validate price data
      if (!product.sellingPriceGeneral || !product.sellingPriceMember) {
        console.error("❌ Product missing price data:", {
          id: product.id,
          sku: product.sku,
          sellingPriceGeneral: product.sellingPriceGeneral,
          sellingPriceMember: product.sellingPriceMember,
        });
        return ApiResponse.error(res, "Data harga produk tidak valid", 500);
      }

      console.log("✅ Barcode search success:", {
        barcode: sanitizedBarcode,
        product: product.name,
        priceGeneral: product.sellingPriceGeneral,
        priceMember: product.sellingPriceMember,
      });

      return ApiResponse.success(res, product, "Produk berhasil ditemukan");
    } catch (error) {
      console.error("❌ Error in searchByBarcode:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/products/sku/:sku - Search by SKU
  // ✅ REMOVED isActive filter
  // ============================================
  static async searchBySKU(req, res, next) {
    try {
      const { sku } = req.params;

      if (!sku || sku.trim().length === 0) {
        return ApiResponse.error(res, "SKU harus diisi", 422);
      }

      const sanitizedSKU = sku.trim();

      if (sanitizedSKU.length > 50) {
        return ApiResponse.error(res, "SKU terlalu panjang", 422);
      }

      const product = await Product.findOne({
        where: {
          sku: sanitizedSKU,
          // ✅ REMOVED: isActive: true
        },
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

      return ApiResponse.success(res, product, "Produk berhasil ditemukan");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/products/low-stock
  // ✅ Uses model method (already fixed)
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
  // GET /api/products/out-of-stock
  // ✅ Uses model method (already fixed)
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
      const { barcode, name, categoryId, supplierId, productType, purchaseType, invoiceNo, expiryDate, description, unit, purchasePrice, sellingPriceGeneral, sellingPriceMember, points, stock, minStock, maxStock } = req.body;

      const errors = {};

      if (!name || name.trim().length === 0) {
        errors.name = ["Nama barang harus diisi"];
      } else if (name.length < 3) {
        errors.name = ["Nama barang minimal 3 karakter"];
      } else if (name.length > 100) {
        errors.name = ["Nama barang maksimal 100 karakter"];
      }

      if (!categoryId || categoryId.trim() === "") {
        errors.categoryId = ["Kategori harus dipilih"];
      }

      if (!supplierId || supplierId.trim() === "") {
        errors.supplierId = ["Supplier harus dipilih"];
      }

      if (!productType) {
        errors.productType = ["Jenis barang harus dipilih"];
      } else if (!["Tunai", "Beli Putus", "Konsinyasi"].includes(productType)) {
        errors.productType = ["Jenis barang tidak valid"];
      }

      if (!purchaseType) {
        errors.purchaseType = ["Jenis pembelian harus dipilih"];
      } else if (!["TUNAI", "KREDIT", "KONSINYASI"].includes(purchaseType)) {
        errors.purchaseType = ["Jenis pembelian tidak valid"];
      }

      if (!unit || unit.trim().length === 0) {
        errors.unit = ["Satuan harus diisi"];
      } else if (unit.length > 20) {
        errors.unit = ["Satuan maksimal 20 karakter"];
      }

      if (!barcode || barcode.trim().length === 0) {
        errors.barcode = ["Barcode harus diisi"];
      } else if (barcode.length < 3) {
        errors.barcode = ["Barcode minimal 3 karakter"];
      } else if (barcode.length > 50) {
        errors.barcode = ["Barcode maksimal 50 karakter"];
      }

      const parsedPurchasePrice = parseFloat(purchasePrice);
      if (isNaN(parsedPurchasePrice) || parsedPurchasePrice <= 0) {
        errors.purchasePrice = ["Harga beli harus lebih dari 0"];
      }

      const parsedSellingPriceGeneral = parseFloat(sellingPriceGeneral);
      if (isNaN(parsedSellingPriceGeneral) || parsedSellingPriceGeneral <= 0) {
        errors.sellingPriceGeneral = ["Harga jual umum harus lebih dari 0"];
      }

      const parsedSellingPriceMember = parseFloat(sellingPriceMember);
      if (isNaN(parsedSellingPriceMember) || parsedSellingPriceMember <= 0) {
        errors.sellingPriceMember = ["Harga jual anggota harus lebih dari 0"];
      }

      const parsedStock = parseInt(stock) || 0;
      const parsedMinStock = parseInt(minStock) || 0;
      const parsedMaxStock = parseInt(maxStock) || 0;
      const parsedPoints = parseInt(points) || 0;

      if (parsedStock < 0) errors.stock = ["Stok tidak boleh negatif"];
      if (parsedMinStock < 0) errors.minStock = ["Stok minimum tidak boleh negatif"];
      if (parsedMaxStock < 0) errors.maxStock = ["Stok maksimum tidak boleh negatif"];
      if (parsedPoints < 0) errors.points = ["Point tidak boleh negatif"];
      if (invoiceNo && invoiceNo.length > 50) errors.invoiceNo = ["Invoice maksimal 50 karakter"];
      if (description && description.length > 255) errors.description = ["Deskripsi maksimal 255 karakter"];

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        return ApiResponse.validationError(res, { categoryId: ["Kategori tidak ditemukan"] }, "Kategori tidak ditemukan");
      }

      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        return ApiResponse.validationError(res, { supplierId: ["Supplier tidak ditemukan"] }, "Supplier tidak ditemukan");
      }

      const sanitizedBarcode = barcode.trim();
      const existingBarcode = await Product.findOne({
        where: { barcode: sanitizedBarcode },
      });

      if (existingBarcode) {
        return ApiResponse.validationError(res, { barcode: ["Barcode sudah digunakan"] }, "Barcode sudah digunakan");
      }

      const sku = await Product.generateSKU();

      const product = await Product.create({
        barcode: sanitizedBarcode,
        sku,
        name: name.trim(),
        categoryId,
        supplierId,
        productType,
        purchaseType,
        invoiceNo: invoiceNo?.trim() || null,
        expiryDate: expiryDate || null,
        description: description?.trim() || null,
        unit: unit.trim(),
        purchasePrice: parsedPurchasePrice,
        sellingPriceGeneral: parsedSellingPriceGeneral,
        sellingPriceMember: parsedSellingPriceMember,
        sellingPrice: parsedSellingPriceGeneral,
        points: parsedPoints,
        stock: parsedStock,
        minStock: parsedMinStock,
        maxStock: parsedMaxStock,
        isActive: true,
      });

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

      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

      const { barcode, name, categoryId, supplierId, productType, purchaseType, invoiceNo, expiryDate, description, unit, purchasePrice, sellingPriceGeneral, sellingPriceMember, points, stock, minStock, maxStock, image } = req.body;

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      const errors = {};

      if (name !== undefined) {
        if (!name || name.trim().length < 3) {
          errors.name = ["Nama produk minimal 3 karakter"];
        } else if (name.length > 100) {
          errors.name = ["Nama produk maksimal 100 karakter"];
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

      if (sellingPriceGeneral !== undefined) {
        const parsed = parseFloat(sellingPriceGeneral);
        if (isNaN(parsed) || parsed < 0) {
          errors.sellingPriceGeneral = ["Harga jual umum harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (sellingPriceMember !== undefined) {
        const parsed = parseFloat(sellingPriceMember);
        if (isNaN(parsed) || parsed < 0) {
          errors.sellingPriceMember = ["Harga jual member harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (minStock !== undefined) {
        const parsed = parseInt(minStock);
        if (isNaN(parsed) || parsed < 0) {
          errors.minStock = ["Minimum stok harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (maxStock !== undefined) {
        const parsed = parseInt(maxStock);
        if (isNaN(parsed) || parsed < 0) {
          errors.maxStock = ["Maximum stok harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (stock !== undefined) {
        const parsed = parseInt(stock);
        if (isNaN(parsed) || parsed < 0) {
          errors.stock = ["Stok harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (points !== undefined) {
        const parsed = parseFloat(points);
        if (isNaN(parsed) || parsed < 0) {
          errors.points = ["Points harus berupa angka dan tidak boleh negatif"];
        }
      }

      if (productType !== undefined) {
        if (!["Tunai", "Beli Putus", "Konsinyasi"].includes(productType)) {
          errors.productType = ["Jenis produk tidak valid"];
        }
      }

      if (purchaseType !== undefined) {
        if (!["TUNAI", "KREDIT", "KONSINYASI"].includes(purchaseType)) {
          errors.purchaseType = ["Jenis pembelian tidak valid"];
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

      const updateData = {};

      if (barcode !== undefined) updateData.barcode = barcode ? barcode.trim() : null;
      if (name) updateData.name = name.trim();
      if (categoryId) updateData.categoryId = categoryId;
      if (supplierId !== undefined) updateData.supplierId = supplierId || null;
      if (productType) updateData.productType = productType;
      if (purchaseType) updateData.purchaseType = purchaseType;
      if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo ? invoiceNo.trim() : null;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate || null;
      if (unit) updateData.unit = unit.trim();
      if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
      if (sellingPriceGeneral !== undefined) updateData.sellingPriceGeneral = parseFloat(sellingPriceGeneral);
      if (sellingPriceMember !== undefined) updateData.sellingPriceMember = parseFloat(sellingPriceMember);
      if (points !== undefined) updateData.points = parseFloat(points);
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (minStock !== undefined) updateData.minStock = parseInt(minStock);
      if (maxStock !== undefined) updateData.maxStock = parseInt(maxStock);
      if (description !== undefined) updateData.description = description ? description.trim().substring(0, 1000) : null;
      if (image !== undefined) updateData.image = image ? image.trim().substring(0, 500) : null;

      await product.update(updateData);

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
  // DELETE /api/products/:id - HARD DELETE with Safety Check
  // ✅ CRITICAL: Check if product is used in transactions
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

      const product = await Product.findByPk(id);

      if (!product) {
        return ApiResponse.notFound(res, "Produk tidak ditemukan");
      }

      // ✅ SAFETY CHECK: Verify product is not used in any transactions
      const checks = [];

      // Check SaleItems
      if (SaleItem) {
        const salesCount = await SaleItem.count({ where: { productId: id } });
        if (salesCount > 0) {
          checks.push(`${salesCount} transaksi penjualan`);
        }
      }

      // Check PurchaseItems
      if (PurchaseItem) {
        const purchasesCount = await PurchaseItem.count({ where: { productId: id } });
        if (purchasesCount > 0) {
          checks.push(`${purchasesCount} transaksi pembelian`);
        }
      }

      // Check StockMovements
      if (StockMovement) {
        const movementsCount = await StockMovement.count({ where: { productId: id } });
        if (movementsCount > 0) {
          checks.push(`${movementsCount} pergerakan stok`);
        }
      }

      // ✅ If product is used, prevent deletion
      if (checks.length > 0) {
        return ApiResponse.error(res, `Produk tidak dapat dihapus karena masih digunakan di ${checks.join(", ")}. ` + `Silakan arsipkan produk atau hubungi administrator.`, 400);
      }

      // ✅ HARD DELETE: Permanently remove from database
      const deletedProduct = {
        id: product.id,
        sku: product.sku,
        name: product.name,
      };

      await product.destroy(); // Physical delete

      console.log(`🗑️ Product HARD DELETED: ${deletedProduct.sku} - ${deletedProduct.name}`);

      return ApiResponse.success(res, deletedProduct, "Produk berhasil dihapus permanent dari database");
    } catch (error) {
      console.error("❌ Error deleting product:", error);

      // Handle foreign key constraint errors
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return ApiResponse.error(res, "Produk tidak dapat dihapus karena masih terhubung dengan data lain. " + "Pastikan tidak ada transaksi yang menggunakan produk ini.", 400);
      }

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

      if (!id || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !/^\d+$/.test(id))) {
        return ApiResponse.error(res, "ID produk tidak valid", 400);
      }

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
  // ✅ REMOVED isActive filters
  // ============================================
  static async getStats(req, res, next) {
    try {
      const totalProducts = await Product.count();

      const lowStockProducts = await Product.count({
        where: {
          [Op.and]: [where(col("stock"), Op.lte, col("min_stock"))],
        },
      });

      const outOfStockProducts = await Product.count({
        where: {
          stock: 0,
        },
      });

      const products = await Product.findAll({
        attributes: ["stock", "purchasePrice", "sellingPrice"],
      });

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
        activeProducts: totalProducts, // All products are active
        inactiveProducts: 0, // No inactive products
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
  // ✅ REMOVED isActive filter
  // ============================================
  static async autocomplete(req, res, next) {
    try {
      const { query = "", limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return ApiResponse.success(res, [], "Query minimal 2 karakter");
      }

      const sanitizedQuery = sanitizeLikeInput(query);

      if (sanitizedQuery.length > 100) {
        return ApiResponse.error(res, "Query terlalu panjang", 422);
      }

      const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));

      const products = await Product.findAll({
        where: {
          // ✅ REMOVED: isActive: true
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
