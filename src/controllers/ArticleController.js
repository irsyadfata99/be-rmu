const { Op } = require("sequelize");
const { Article, CategoryPost, TagPost, User } = require("../models");
const ApiResponse = require("../utils/response");
const fs = require("fs");
const path = require("path");

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");

const injectEditorImages = (content, files = []) => {
  if (!content) return content;

  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return content;
  }

  if (!parsed.blocks || !Array.isArray(parsed.blocks)) return content;

  // mapping: images[tempId] => url
  const fileMap = {};
  files.forEach(file => {
    fileMap[file.fieldname] = `/uploads/articles/${file.filename}`;
  });

  parsed.blocks.forEach(block => {
    if (
      block.type === "image" &&
      block.data?.tempId
    ) {
      const key = `images[${block.data.tempId}]`;

      if (fileMap[key]) {
        block.data.file.url = fileMap[key];
        delete block.data.tempId;
      }
    }
  });

  return JSON.stringify(parsed);
};



class ArticleController {
  // =====================================================
  // GET /api/articles
  // =====================================================
  static async getAll(req, res, next) {
    try {
      const {
        page = 1,limit = 10,search,status,category_id,
        isActive,sortBy = "createdAt",sortOrder = "DESC",
      } = req.query;

      const where = {
        isActive: true, 
        ...(search && { title: { [Op.like]: `%${search}%` } }),
        ...(status && { status }),
        ...(category_id && { category_id }),
      };

      const { count, rows } = await Article.findAndCountAll({
        where,
        limit: +limit,
        offset: (+page - 1) * +limit,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          { model: CategoryPost },
          { model: User, attributes: ["id", "name", "email"] },
          { model: TagPost },
        ],
      });

      return ApiResponse.paginated(
        res,
        rows,
        {
          page: +page,limit: +limit,total: count,totalPages: Math.ceil(count / limit),
        },
        "Artikel berhasil diambil"
      );
    } catch (err) {
      next(err);
    }
  }

  // =====================================================
  // GET /api/articles/publish
  // =====================================================
  static async getPublish(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category_id,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const where = {
        status: "PUBLISHED",
        isActive: true,
        ...(search && { title: { [Op.like]: `%${search}%` } }),
        ...(category_id && { category_id }),
      };

      const { count, rows } = await Article.findAndCountAll({
        where,
        limit: +limit,
        offset: (+page - 1) * +limit,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          { model: CategoryPost },
          { model: User, attributes: ["id", "name", "email"] },
          { model: TagPost },
        ],
      });

      return ApiResponse.paginated(
        res,
        rows,
        {
          page: +page,
          limit: +limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        "Artikel publish berhasil diambil"
      );
    } catch (err) {
      next(err);
    }
  }


  // =====================================================
  // GET /api/articles/:id
  // =====================================================
  static async getById(req, res, next) {
    try {
      const article = await Article.findByPk(req.params.id, {
        include: [
          { model: CategoryPost },
          { model: User, attributes: ["id", "name", "email"] },
          { model: TagPost },
        ],
      });

      if (!article)
        return ApiResponse.error(res, "Artikel tidak ditemukan", 404);

      await article.increment("views", { by: 1 });

      return ApiResponse.success(
        res,
        article,
        "Artikel berhasil diambil"
      );
    } catch (err) {
      next(err);
    }
  }


  // =====================================================
  // POST /api/articles
  // =====================================================
  static async create(req, res, next) {
    try {
      const {
        title,
        date,
        content,
        excerpt,
        category_id,
        tag_ids = [],
      } = req.body;

      if (!title || title.length < 5 || !content) {
        return ApiResponse.error(res, "Data artikel tidak valid", 422);
      }

      const slug = slugify(title);

      const exists = await Article.findOne({ where: { slug } });
      if (exists)
        return ApiResponse.error(res, "Judul artikel sudah digunakan", 422);

      // 🔥 INJECT IMAGE KE CONTENT
      const finalContent = injectEditorImages(
        content,
        req.files || []
      );

      const article = await Article.create({
        title,
        date: date ? new Date(date) : new Date(),
        slug,
        content: finalContent,
        excerpt,
        category_id,
        thumbImage: req.file ? req.file.filename : null,
        author_id: req.user.id,
      });

      if (Array.isArray(tag_ids) && tag_ids.length) {
        await article.setTagPosts(tag_ids);
      }

      return ApiResponse.success(
        res,
        await Article.findByPk(article.id, {
          include: [CategoryPost, User, TagPost],
        }),
        "Artikel berhasil dibuat",
        201
      );
    } catch (err) {
      next(err);
    }
  }

  // =====================================================
  // PUT /api/articles/:id
  // =====================================================
    static async update(req, res, next) {
    try {
        const { id } = req.params;
        const {
        title,
        date,
        content,
        excerpt,
        status,
        category_id,
        isActive,
        tag_ids,
        } = req.body;

        const article = await Article.findByPk(id);
        if (!article)
        return ApiResponse.error(res, "Artikel tidak ditemukan", 404);

        let slug = article.slug;

        if (title && title !== article.title) {
        slug = slugify(title);

        const exists = await Article.findOne({
            where: { slug, id: { [Op.ne]: id } },
        });

        if (exists)
            return ApiResponse.error(res, "Judul artikel sudah digunakan", 422);
        }

        // =====================================
        // HANDLE IMAGE UPDATE (AMAN)
        // =====================================
        let newThumbImage = article.thumbImage;

        if (req.file) {
        if (article.thumbImage) {
            const oldPath = path.join(
            __dirname,
            "../../storage/uploads/articles",
            article.thumbImage
            );

            if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            }
        }

        newThumbImage = req.file.filename;
        }

      let finalContent = article.content;

      if (content) {
        if (req.files && req.files.length > 0) {
          finalContent = injectEditorImages(content, req.files);
        } else {
          try {
            const parsed = JSON.parse(content);
            parsed.blocks?.forEach(block => {
              if (block.type === "image") {
                delete block.data?.tempId;
              }
            });
            finalContent = JSON.stringify(parsed);
          } catch {
            finalContent = content;
          }
        }
      }


       await article.update({
        ...(title && { title, slug }),
        ...(finalContent && { content: finalContent }),
        ...(excerpt !== undefined && { excerpt }),
        ...(status && { status }),
        ...(category_id && { category_id }),
        ...(isActive !== undefined && { isActive }),
        ...(req.file && { thumbImage: newThumbImage }),
        ...(date && { date: new Date(date) }),
      });

        if (Array.isArray(tag_ids)) {
        await article.setTagPosts(tag_ids);
        }

        return ApiResponse.success(
        res,
        await Article.findByPk(id, {
            include: [CategoryPost, User, TagPost],
        }),
        "Artikel berhasil diperbarui"
        );
    } catch (err) {
        next(err);
    }
    }



  // =====================================================
  // DELETE /api/articles/:id
  // =====================================================
  static async delete(req, res, next) {
    try {
      const article = await Article.findByPk(req.params.id);
      if (!article)
        return ApiResponse.error(res, "Artikel tidak ditemukan", 404);

      await article.update({ isActive: false });

      return ApiResponse.success(res, { id: article.id }, "Artikel berhasil dihapus");
    } catch (err) {
      next(err);
    }
  }

  // =====================================================
  // PATCH /api/articles/publish/:id
  // =====================================================
    static async publishArticle(req, res, next) {
    try {
        const article = await Article.findByPk(req.params.id);
        if (!article)
        return ApiResponse.error(res, "Artikel tidak ditemukan", 404);

        if (article.status === "PUBLISHED") {
        return ApiResponse.success(
            res,
            article,
            "Artikel sudah dipublish"
        );
        }

        await article.update({
        status: "PUBLISHED",
        isActive: true,
        });

        return ApiResponse.success(
        res,
        article,
        "Artikel berhasil dipublish"
        );
    } catch (err) {
        next(err);
    }
    }

}

module.exports = ArticleController;
