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
      const {
        page = 1,
        limit = 10,
        search = "",
        isActive,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Search by name or code
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
          { contactPerson: { [Op.like]: `%${search}%` } },
        ];
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

      return ApiResponse.paginated(
        res,
        rows,
        pagination,
        "Supplier berhasil diambil"
      );
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
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { code: { [Op.like]: `%${query}%` } },
          ],
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

      return ApiResponse.success(
        res,
        formatted,
        `Ditemukan ${formatted.length} supplier`
      );
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
      const { name, address, phone, contactPerson, email, description } =
        req.body;

      // Validation
      const errors = {};

      // Validate name
      if (!name || name.trim() === "") {
        errors.name = ["Nama supplier harus diisi"];
      } else if (name.length < 3) {
        errors.name = ["Nama supplier minimal 3 karakter"];
      } else if (name.length > 100) {
        errors.name = ["Nama supplier maksimal 100 karakter"];
      }

      // Validate address
      if (!address || address.trim() === "") {
        errors.address = ["Alamat harus diisi"];
      } else if (address.length < 10) {
        errors.address = ["Alamat minimal 10 karakter"];
      } else if (address.length > 255) {
        errors.address = ["Alamat maksimal 255 karakter"];
      }

      // Validate phone
      if (!phone || phone.trim() === "") {
        errors.phone = ["Nomor telepon harus diisi"];
      } else if (!/^08\d{8,11}$/.test(phone)) {
        errors.phone = [
          "Format nomor telepon tidak valid (contoh: 081234567890)",
        ];
      }

      // Validate contactPerson (optional)
      if (contactPerson && contactPerson.length > 0) {
        if (contactPerson.length < 3) {
          errors.contactPerson = ["Nama kontak minimal 3 karakter"];
        } else if (contactPerson.length > 100) {
          errors.contactPerson = ["Nama kontak maksimal 100 karakter"];
        }
      }

      // Validate email (optional)
      if (email && email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.email = ["Format email tidak valid"];
        }
      }

      // Validate description (optional)
      if (description && description.length > 500) {
        errors.description = ["Deskripsi maksimal 500 karakter"];
      }

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, "Data tidak valid");
      }

      // Check if name already exists
      const existingName = await Supplier.findOne({ where: { name } });
      if (existingName) {
        return ApiResponse.validationError(
          res,
          { name: ["Nama supplier sudah digunakan"] },
          "Nama supplier sudah digunakan"
        );
      }

      // Generate code
      const code = await Supplier.generateCode();

      // Create supplier
      const supplier = await Supplier.create({
        code,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        contactPerson: contactPerson?.trim() || null,
        email: email?.trim() || null,
        description: description?.trim() || null,
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
      const {
        name,
        address,
        phone,
        contactPerson,
        email,
        description,
        isActive,
      } = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      // Validation
      const errors = {};

      // Validate name (if provided)
      if (name !== undefined) {
        if (name.trim() === "") {
          errors.name = ["Nama supplier harus diisi"];
        } else if (name.length < 3) {
          errors.name = ["Nama supplier minimal 3 karakter"];
        } else if (name.length > 100) {
          errors.name = ["Nama supplier maksimal 100 karakter"];
        }
      }

      // Validate address (if provided)
      if (address !== undefined) {
        if (address.trim() === "") {
          errors.address = ["Alamat harus diisi"];
        } else if (address.length < 10) {
          errors.address = ["Alamat minimal 10 karakter"];
        } else if (address.length > 255) {
          errors.address = ["Alamat maksimal 255 karakter"];
        }
      }

      // Validate phone (if provided)
      if (phone !== undefined) {
        if (phone.trim() === "") {
          errors.phone = ["Nomor telepon harus diisi"];
        } else if (!/^08\d{8,11}$/.test(phone)) {
          errors.phone = ["Format nomor telepon tidak valid"];
        }
      }

      // Validate contactPerson (if provided)
      if (contactPerson && contactPerson.length > 0) {
        if (contactPerson.length < 3) {
          errors.contactPerson = ["Nama kontak minimal 3 karakter"];
        } else if (contactPerson.length > 100) {
          errors.contactPerson = ["Nama kontak maksimal 100 karakter"];
        }
      }

      // Validate email (if provided)
      if (email && email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.email = ["Format email tidak valid"];
        }
      }

      // Validate description (if provided)
      if (description && description.length > 500) {
        errors.description = ["Deskripsi maksimal 500 karakter"];
      }

      // Return validation errors if any
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
          return ApiResponse.validationError(
            res,
            { name: ["Nama supplier sudah digunakan"] },
            "Nama supplier sudah digunakan"
          );
        }
      }

      // Update supplier
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (address !== undefined) updateData.address = address.trim();
      if (phone !== undefined) updateData.phone = phone.trim();
      if (contactPerson !== undefined)
        updateData.contactPerson = contactPerson?.trim() || null;
      if (email !== undefined) updateData.email = email?.trim() || null;
      if (description !== undefined)
        updateData.description = description?.trim() || null;
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

      console.log(
        `🗑️ Supplier deactivated: ${supplier.code} - ${supplier.name}`
      );

      return ApiResponse.success(
        res,
        { id: supplier.id },
        "Supplier berhasil dinonaktifkan"
      );
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

      console.log(
        `🔄 Supplier ${supplier.isActive ? "activated" : "deactivated"}: ${
          supplier.code
        } - ${supplier.name}`
      );

      return ApiResponse.success(
        res,
        supplier,
        `Supplier berhasil ${
          supplier.isActive ? "diaktifkan" : "dinonaktifkan"
        }`
      );
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
      const activeSuppliers = await Supplier.count({
        where: { isActive: true },
      });
      const inactiveSuppliers = await Supplier.count({
        where: { isActive: false },
      });

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

      return ApiResponse.success(
        res,
        stats,
        "Statistik supplier berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SupplierController;
