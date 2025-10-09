// ============================================
// 2. src/controllers/categoryController.js
// ============================================
const Category = require("../models/Category");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");

class CategoryController {
  // GET /api/categories - Get all categories with pagination & search
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", isActive, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const whereClause = {};

      if (search) {
        whereClause.name = {
          [Op.like]: `%${search}%`,
        };
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }

      // Get categories with pagination
      const { count, rows } = await Category.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(res, rows, pagination, "Kategori berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categories/:id - Get category by ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return ApiResponse.error(res, "Kategori tidak ditemukan", 404);
      }

      return ApiResponse.success(res, category, "Kategori berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // POST /api/categories - Create new category
  static async create(req, res, next) {
    try {
      const { name, description } = req.body;

      // In create() method (line 70-74):
      if (!name) {
        return ApiResponse.error(res, "Nama kategori harus diisi", 422, {
          name: ["Nama kategori harus diisi"],
        });
      } else if (name.length < 3) {
        // ← NEW!
        return ApiResponse.error(res, "Nama kategori minimal 3 karakter", 422, {
          name: ["Nama kategori minimal 3 karakter"],
        });
      } else if (name.length > 50) {
        // ← NEW!
        return ApiResponse.error(res, "Nama kategori maksimal 50 karakter", 422, {
          name: ["Nama kategori maksimal 50 karakter"],
        });
      }

      // ✅ ADD: Description max length validation
      if (description && description.length > 255) {
        // ← NEW!
        return ApiResponse.error(res, "Deskripsi maksimal 255 karakter", 422, {
          description: ["Deskripsi maksimal 255 karakter"],
        });
      }

      // Check if category name already exists
      const existingCategory = await Category.findOne({ where: { name } });
      if (existingCategory) {
        return ApiResponse.error(res, "Nama kategori sudah digunakan", 422, {
          name: ["Nama kategori sudah digunakan"],
        });
      }

      // Create category
      const category = await Category.create({
        name,
        description,
      });

      return ApiResponse.success(res, category, "Kategori berhasil dibuat", 201);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categories/:id - Update category
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const category = await Category.findByPk(id);

      if (!category) {
        return ApiResponse.error(res, "Kategori tidak ditemukan", 404);
      }

      // Check if new name already exists (excluding current category)
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          where: {
            name,
            id: { [Op.ne]: id },
          },
        });

        if (existingCategory) {
          return ApiResponse.error(res, "Nama kategori sudah digunakan", 422, {
            name: ["Nama kategori sudah digunakan"],
          });
        }
      }

      // Update category
      await category.update({
        ...(name && { name }),
        description: description !== undefined ? description : category.description,
        ...(isActive !== undefined && { isActive }),
      });

      return ApiResponse.success(res, category, "Kategori berhasil diupdate");
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categories/:id - Delete category (soft delete)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return ApiResponse.error(res, "Kategori tidak ditemukan", 404);
      }

      // Soft delete - just set isActive to false
      await category.update({ isActive: false });

      return ApiResponse.success(res, { id: category.id }, "Kategori berhasil dihapus");
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/categories/:id/toggle - Toggle category active status
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return ApiResponse.error(res, "Kategori tidak ditemukan", 404);
      }

      await category.update({ isActive: !category.isActive });

      return ApiResponse.success(res, category, `Kategori berhasil ${category.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
