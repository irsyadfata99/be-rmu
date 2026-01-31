// ============================================
// 2. src/controllers/categoryController.js
// ============================================
const TagPost = require("../models/TagPost");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");

class TagPostController {
    
  // GET /api/tagPost - Get all tagPost with pagination & search
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

        // Get tagPost with pagination
        const { count, rows } = await TagPost.findAndCountAll({
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

        return ApiResponse.paginated(res, rows, pagination, "Tag Post berhasil diambil");
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

      const tags = await TagPost.findAll({
        where: whereClause,
        attributes: ["id", "name", "slug"],
        order: [["name", "ASC"]],
      });

      return ApiResponse.success(
        res,
        tags,
        "List tag untuk option berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tagPost/:id - Get tagPost by ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const tagPost = await TagPost.findByPk(id);

      if (!tagPost) {
        return ApiResponse.error(res, "Tag Post tidak ditemukan", 404);
      }

      return ApiResponse.success(res, tagPost, "Tag Post berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tagPost - Create new tagPost
    static async create(req, res, next) {
    try {
        const { name } = req.body;

        if (!name || name.length < 2 || name.length > 50) {
        return ApiResponse.error(res, "Nama tag tidak valid", 422);
        }

        const slug = slugify(name);

        const exists = await TagPost.scope("all").findOne({
        where: { slug },
        });

        if (exists) {
        return ApiResponse.error(res, "Slug tag sudah digunakan", 422);
        }

        const tag = await TagPost.create({
        name,
        slug,
        isActive: true,
        });

        return ApiResponse.success(res, tag, "Tag berhasil dibuat", 201);
    } catch (err) {
        next(err);
    }
    }

  // PUT /api/tagPost/:id - Update tagPost
    static async update(req, res, next) {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;

        const tag = await TagPost.scope("all").findByPk(id);
        if (!tag) return ApiResponse.error(res, "Tag tidak ditemukan", 404);

        let slug = tag.slug;

        if (name && name !== tag.name) {
        slug = slugify(name);

        const exists = await TagPost.scope("all").findOne({
            where: {
            slug,
            id: { [Op.ne]: id },
            },
        });

        if (exists) {
            return ApiResponse.error(res, "Slug tag sudah digunakan", 422);
        }
        }

        await tag.update({
        ...(name && { name }),
        slug,
        ...(isActive !== undefined && { isActive }),
        });

        return ApiResponse.success(res, tag, "Tag berhasil diperbarui");
    } catch (err) {
        next(err);
    }
    }


  // DELETE /api/tagPost/:id - Delete tagPost (soft delete)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const tagPost = await TagPost.findByPk(id);

      if (!tagPost) {
        return ApiResponse.error(res, "Tag Post tidak ditemukan", 404);
      }

      // Soft delete - just set isActive to false
      await tagPost.update({ isActive: false });

      return ApiResponse.success(res, { id: tagPost.id }, "Tag Post berhasil dihapus");
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/tagPost/:id/toggle - Toggle tagPost active status
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;

      const tagPost = await TagPost.findByPk(id);

      if (!tagPost) {
        return ApiResponse.error(res, "Tag Post tidak ditemukan", 404);
      }

      await tagPost.update({ isActive: !tagPost.isActive });

      return ApiResponse.success(res, tagPost, `Tag Post berhasil ${tagPost.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TagPostController;
