// ============================================
// 2. src/controllers/categoryController.js
// ============================================
const CategoryPost = require("../models/CategoryPost");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");

class CategoryPostController {
  // GET /api/categoryPost - Get all categoryPost with pagination & search
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

        // Get categoryPost with pagination
        const { count, rows } = await CategoryPost.findAndCountAll({
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

        return ApiResponse.paginated(res, rows, pagination, "Kategori Post berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

   static async getAllOptions(req, res, next) {
    try {
      const { search = "" } = req.query;

      const whereClause = {
        isActive: true,
      };

      if (search) {
        whereClause.name = {
          [Op.like]: `%${search}%`,
        };
      }

      const categories = await CategoryPost.findAll({
        where: whereClause,
        attributes: ["id", "name", "description"],
        order: [["name", "ASC"]],
      });

      return ApiResponse.success(
        res,
        categories,
        "List Kategori untuk option berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categoryPost/:id - Get categoryPost by ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const categoryPost = await CategoryPost.findByPk(id);

      if (!categoryPost) {
        return ApiResponse.error(res, "Kategori Post tidak ditemukan", 404);
      }

      return ApiResponse.success(res, categoryPost, "Kategori Post berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // POST /api/categoryPost - Create new categoryPost
  static async create(req, res, next) {
    try {
      const { name, description } = req.body;

      // In create() method (line 70-74):
      if (!name) {
        return ApiResponse.error(res, "Nama Kategori Post harus diisi", 422, {
          name: ["Nama Kategori Post harus diisi"],
        });
      } else if (name.length < 3) {
        // ← NEW!
        return ApiResponse.error(res, "Nama Kategori Post minimal 3 karakter", 422, {
          name: ["Nama Kategori Post minimal 3 karakter"],
        });
      } else if (name.length > 50) {
        // ← NEW!
        return ApiResponse.error(res, "Nama Kategori Post maksimal 50 karakter", 422, {
          name: ["Nama Kategori Post maksimal 50 karakter"],
        });
      }

      // ✅ ADD: Description max length validation
      if (description && description.length > 255) {
        // ← NEW!
        return ApiResponse.error(res, "Deskripsi maksimal 255 karakter", 422, {
          description: ["Deskripsi maksimal 255 karakter"],
        });
      }

      // Check if categoryPost name already exists
      const existingCategoryPost = await CategoryPost.findOne({ where: { name } });
      if (existingCategoryPost) {
        return ApiResponse.error(res, "Nama Kategori Post sudah digunakan", 422, {
          name: ["Nama Kategori Post sudah digunakan"],
        });
      }

      // Create categoryPost
      const categoryPost = await CategoryPost.create({
        name,
        description,
      });

      return ApiResponse.success(res, categoryPost, "Kategori Post berhasil dibuat", 201);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categoryPost/:id - Update categoryPost
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const categoryPost = await CategoryPost.findByPk(id);

      if (!categoryPost) {
        return ApiResponse.error(res, "Kategori Post tidak ditemukan", 404);
      }

      // Check if new name already exists (excluding current categoryPost)
      if (name && name !== categoryPost.name) {
        const existingCategoryPost = await CategoryPost.findOne({
          where: {
            name,
            id: { [Op.ne]: id },
          },
        });

        if (existingCategoryPost) {
          return ApiResponse.error(res, "Nama Kategori Post sudah digunakan", 422, {
            name: ["Nama Kategori Post sudah digunakan"],
          });
        }
      }

      // Update categoryPost
      await categoryPost.update({
        ...(name && { name }),
        description: description !== undefined ? description : categoryPost.description,
        ...(isActive !== undefined && { isActive }),
      });

      return ApiResponse.success(res, categoryPost, "Kategori Post berhasil diupdate");
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categoryPost/:id - Delete categoryPost (soft delete)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const categoryPost = await CategoryPost.findByPk(id);

      if (!categoryPost) {
        return ApiResponse.error(res, "Kategori Post tidak ditemukan", 404);
      }

      // Soft delete - just set isActive to false
      await categoryPost.update({ isActive: false });

      return ApiResponse.success(res, { id: categoryPost.id }, "Kategori Post berhasil dihapus");
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/categoryPost/:id/toggle - Toggle categoryPost active status
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;

      const categoryPost = await CategoryPost.findByPk(id);

      if (!categoryPost) {
        return ApiResponse.error(res, "Kategori Post tidak ditemukan", 404);
      }

      await categoryPost.update({ isActive: !categoryPost.isActive });

      return ApiResponse.success(res, categoryPost, `Kategori Post berhasil ${categoryPost.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryPostController;
