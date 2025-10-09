// ============================================
// src/controllers/SupplierController.js
// Controller untuk manajemen supplier
// ============================================
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/response");
const { Op } = require("sequelize");

class SupplierController {
  // ============================================
  // GET /api/suppliers - Get all suppliers
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", isActive, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Search by name or code
      if (search) {
        whereClause[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { code: { [Op.like]: `%${search}%` } }, { contactPerson: { [Op.like]: `%${search}%` } }];
      }

      // Filter by active status
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }

      const { count, rows } = await Supplier.findAndCountAll({
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

      return ApiResponse.paginated(res, rows, pagination, "Supplier berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/suppliers/autocomplete - Autocomplete search
  // ============================================
  static async autocomplete(req, res, next) {
    try {
      const { query = "", limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return ApiResponse.success(res, [], "Query minimal 2 karakter");
      }

      const suppliers = await Supplier.findAll({
        where: {
          isActive: true,
          [Op.or]: [{ name: { [Op.like]: `%${query}%` } }, { code: { [Op.like]: `%${query}%` } }],
        },
        limit: parseInt(limit),
        attributes: ["id", "code", "name", "phone", "contactPerson"],
      });

      // Format for autocomplete
      const formatted = suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        phone: s.phone,
        contactPerson: s.contactPerson,
        label: `${s.code} - ${s.name}`,
        value: s.id,
      }));

      return ApiResponse.success(res, formatted, `Ditemukan ${formatted.length} supplier`);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/suppliers/:id - Get supplier by ID
  // ============================================
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      return ApiResponse.success(res, supplier, "Supplier berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/suppliers/code/:code - Get supplier by code
  // ============================================
  static async getByCode(req, res, next) {
    try {
      const { code } = req.params;

      const supplier = await Supplier.findByCode(code);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      return ApiResponse.success(res, supplier, "Supplier berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // POST /api/suppliers - Create new supplier
  // ============================================
  static async create(req, res, next) {
    try {
      const { name, address, phone, contactPerson, email, description } = req.body;

      // Validation
      const errors = {};

      // NEW (add max length check):
      if (!name) {
        errors.name = ["Nama supplier harus diisi"];
      } else if (name.length < 3) {
        errors.name = ["Nama supplier minimal 3 karakter"];
      } else if (name.length > 100) {
        // ← NEW!
        errors.name = ["Nama supplier maksimal 100 karakter"];
      }

      // Also in update() method (line 151-154):
      if (name && name.length < 3) {
        errors.name = ["Nama supplier minimal 3 karakter"];
      } else if (name && name.length > 100) {
        // ← NEW!
        errors.name = ["Nama supplier maksimal 100 karakter"];
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Check if name already exists
      const existingName = await Supplier.findOne({ where: { name } });
      if (existingName) {
        return ApiResponse.error(res, "Nama supplier sudah digunakan", 422, {
          name: ["Nama supplier sudah digunakan"],
        });
      }

      // Generate code
      const code = await Supplier.generateCode();

      // Create supplier
      const supplier = await Supplier.create({
        code,
        name,
        address,
        phone,
        contactPerson,
        email,
        description,
        totalDebt: 0,
        totalPurchases: 0,
        isActive: true,
      });

      console.log(`✅ Supplier created: ${supplier.code} - ${supplier.name}`);

      return ApiResponse.created(res, supplier, "Supplier berhasil dibuat");
    } catch (error) {
      console.error("❌ Error creating supplier:", error);
      next(error);
    }
  }

  // ============================================
  // PUT /api/suppliers/:id - Update supplier
  // ============================================
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, address, phone, contactPerson, email, description, isActive } = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      // Validation
      const errors = {};

      if (name && name.length < 3) {
        errors.name = ["Nama supplier minimal 3 karakter"];
      }

      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Check if new name already exists (excluding current supplier)
      if (name && name !== supplier.name) {
        const existingName = await Supplier.findOne({
          where: {
            name,
            id: { [Op.ne]: id },
          },
        });

        if (existingName) {
          return ApiResponse.error(res, "Nama supplier sudah digunakan", 422, {
            name: ["Nama supplier sudah digunakan"],
          });
        }
      }

      // Update supplier
      const updateData = {};
      if (name) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
      if (email !== undefined) updateData.email = email;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      await supplier.update(updateData);

      console.log(`✅ Supplier updated: ${supplier.code} - ${supplier.name}`);

      return ApiResponse.success(res, supplier, "Supplier berhasil diupdate");
    } catch (error) {
      console.error("❌ Error updating supplier:", error);
      next(error);
    }
  }

  // ============================================
  // DELETE /api/suppliers/:id - Soft delete supplier
  // ============================================
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      // Soft delete - set isActive to false
      await supplier.update({ isActive: false });

      console.log(`🗑️ Supplier deactivated: ${supplier.code} - ${supplier.name}`);

      return ApiResponse.success(res, { id: supplier.id }, "Supplier berhasil dinonaktifkan");
    } catch (error) {
      console.error("❌ Error deleting supplier:", error);
      next(error);
    }
  }

  // ============================================
  // PATCH /api/suppliers/:id/toggle - Toggle supplier active status
  // ============================================
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      await supplier.update({ isActive: !supplier.isActive });

      console.log(`🔄 Supplier ${supplier.isActive ? "activated" : "deactivated"}: ${supplier.code} - ${supplier.name}`);

      return ApiResponse.success(res, supplier, `Supplier berhasil ${supplier.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (error) {
      console.error("❌ Error toggling supplier status:", error);
      next(error);
    }
  }

  // ============================================
  // GET /api/suppliers/stats - Get supplier statistics
  // ============================================
  static async getStats(req, res, next) {
    try {
      const totalSuppliers = await Supplier.count();
      const activeSuppliers = await Supplier.count({ where: { isActive: true } });
      const inactiveSuppliers = await Supplier.count({ where: { isActive: false } });

      // Suppliers with debt
      const suppliersWithDebt = await Supplier.count({
        where: {
          totalDebt: { [Op.gt]: 0 },
        },
      });

      // Total debt to suppliers
      const totalDebt = await Supplier.sum("totalDebt");

      const stats = {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        suppliersWithDebt,
        totalDebt: parseFloat(totalDebt || 0).toFixed(2),
      };

      return ApiResponse.success(res, stats, "Statistik supplier berhasil diambil");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SupplierController;
