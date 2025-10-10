// ============================================
// IMPORTS
// ============================================
const ExcelExporter = require("../utils/excelExporter");
const {
  MemberDebt,
  Member,
  Sale,
  DebtPayment,
  SupplierDebt,
  Supplier,
  Purchase,
} = require("../models");
const { Op } = require("sequelize");
const ApiResponse = require("../utils/response");

// ============================================
// PAYMENT CONTROLLER CLASS
// ============================================
class PaymentController {
  /**
   * GET /api/payments/member-debts - List all member debts
   * ENHANCED: Better search, filter by region, sort options
   */
  static async getMemberDebts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        memberId,
        status,
        overdue = false,
        search = "",
        regionCode = "", // ✨ NEW: Filter by region
        sortBy = "createdAt",
        sortOrder = "DESC",
        startDate, // ✨ NEW: Date range filter
        endDate, // ✨ NEW: Date range filter
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const memberWhereClause = {}; // ✨ NEW: For member filtering

      // Filter by member
      if (memberId) {
        whereClause.memberId = memberId;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter overdue
      if (overdue === "true") {
        whereClause.dueDate = {
          [Op.lt]: new Date(),
        };
        whereClause.status = {
          [Op.in]: ["PENDING", "PARTIAL"],
        };
      }

      // ✨ NEW: Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // ✨ ENHANCED: Search by invoice, member name, or uniqueId
      if (search) {
        whereClause[Op.or] = [
          { invoiceNumber: { [Op.like]: `%${search}%` } },
          // Search in member will be handled in include
        ];
      }

      // ✨ NEW: Filter by region
      if (regionCode) {
        memberWhereClause.regionCode = regionCode;
      }

      // ✨ ENHANCED: Member search in include
      if (search) {
        memberWhereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { uniqueId: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await MemberDebt.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "whatsapp",
              "regionCode",
              "regionName",
            ],
            where:
              Object.keys(memberWhereClause).length > 0
                ? memberWhereClause
                : undefined,
            required: Object.keys(memberWhereClause).length > 0, // ✨ Inner join if filtering
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate"],
          },
          {
            model: DebtPayment,
            as: "payments",
            limit: 5,
            order: [["paymentDate", "DESC"]],
          },
        ],
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
        "Daftar piutang member berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts - List all supplier debts
   * ENHANCED: Better search, filter options
   */
  static async getSupplierDebts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        supplierId,
        status,
        overdue = false,
        search = "",
        sortBy = "createdAt",
        sortOrder = "DESC",
        startDate, // ✨ NEW: Date range filter
        endDate, // ✨ NEW: Date range filter
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const supplierWhereClause = {}; // ✨ NEW: For supplier filtering

      // Filter by supplier
      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter overdue
      if (overdue === "true") {
        whereClause.dueDate = {
          [Op.lt]: new Date(),
        };
        whereClause.status = {
          [Op.in]: ["PENDING", "PARTIAL"],
        };
      }

      // ✨ NEW: Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // ✨ ENHANCED: Search by invoice or supplier name
      if (search) {
        whereClause[Op.or] = [{ invoiceNumber: { [Op.like]: `%${search}%` } }];
        supplierWhereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await SupplierDebt.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone", "contactPerson"],
            where:
              Object.keys(supplierWhereClause).length > 0
                ? supplierWhereClause
                : undefined,
            required: Object.keys(supplierWhereClause).length > 0,
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
          },
        ],
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
        "Daftar hutang supplier berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/member-debts/export
   * @desc Export member debts to Excel
   * @access Private (ADMIN, KASIR)
   */
  static async exportMemberDebts(req, res, next) {
    try {
      const {
        memberId,
        status,
        overdue = false,
        search = "",
        regionCode = "",
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      // Build where clause (same as getMemberDebts)
      const whereClause = {};
      const memberWhereClause = {};

      if (memberId) whereClause.memberId = memberId;
      if (status) whereClause.status = status;

      if (overdue === "true") {
        whereClause.dueDate = { [Op.lt]: new Date() };
        whereClause.status = { [Op.in]: ["PENDING", "PARTIAL"] };
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      if (search) {
        whereClause[Op.or] = [{ invoiceNumber: { [Op.like]: `%${search}%` } }];
        memberWhereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { uniqueId: { [Op.like]: `%${search}%` } },
        ];
      }

      if (regionCode) memberWhereClause.regionCode = regionCode;

      // Fetch all data (no pagination for export)
      const debts = await MemberDebt.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "regionCode",
              "regionName",
              "whatsapp",
            ],
            where:
              Object.keys(memberWhereClause).length > 0
                ? memberWhereClause
                : undefined,
            required: Object.keys(memberWhereClause).length > 0,
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate"],
          },
        ],
      });

      // Prepare data for Excel
      const excelData = debts.map((debt) => ({
        invoiceNumber: debt.invoiceNumber,
        memberUniqueId: debt.member?.uniqueId || "-",
        memberName: debt.member?.fullName || "-",
        regionName: debt.member?.regionName || "-",
        whatsapp: debt.member?.whatsapp || "-",
        saleDate: debt.sale?.saleDate ? new Date(debt.sale.saleDate) : "-",
        totalAmount: ExcelExporter.formatCurrency(debt.totalAmount),
        paidAmount: ExcelExporter.formatCurrency(debt.paidAmount),
        remainingAmount: ExcelExporter.formatCurrency(debt.remainingAmount),
        dueDate: debt.dueDate ? new Date(debt.dueDate) : "-",
        status: ExcelExporter.formatStatus(debt.status),
        isOverdue: debt.isOverdue() ? "Ya" : "Tidak",
        daysOverdue: debt.getDaysOverdue(),
      }));

      // Define columns
      const columns = [
        { header: "No. Faktur", key: "invoiceNumber", width: 15 },
        { header: "ID Member", key: "memberUniqueId", width: 12 },
        { header: "Nama Member", key: "memberName", width: 25 },
        { header: "Wilayah", key: "regionName", width: 18 },
        { header: "WhatsApp", key: "whatsapp", width: 15 },
        { header: "Tgl Transaksi", key: "saleDate", width: 15 },
        { header: "Total Hutang", key: "totalAmount", width: 15 },
        { header: "Sudah Dibayar", key: "paidAmount", width: 15 },
        { header: "Sisa Hutang", key: "remainingAmount", width: 15 },
        { header: "Jatuh Tempo", key: "dueDate", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Terlambat", key: "isOverdue", width: 12 },
        { header: "Hari Terlambat", key: "daysOverdue", width: 15 },
      ];

      // Calculate summary
      const totalDebt = debts.reduce(
        (sum, d) => sum + parseFloat(d.totalAmount),
        0
      );
      const totalPaid = debts.reduce(
        (sum, d) => sum + parseFloat(d.paidAmount),
        0
      );
      const totalRemaining = debts.reduce(
        (sum, d) => sum + parseFloat(d.remainingAmount),
        0
      );
      const overdueCount = debts.filter((d) => d.isOverdue()).length;

      const summary = {
        "Total Piutang": `Rp ${totalDebt.toLocaleString("id-ID")}`,
        "Total Dibayar": `Rp ${totalPaid.toLocaleString("id-ID")}`,
        "Total Sisa": `Rp ${totalRemaining.toLocaleString("id-ID")}`,
        "Jumlah Piutang": debts.length,
        "Jatuh Tempo": overdueCount,
      };

      // Prepare filters for display
      const filters = {};
      if (status) filters.Status = status;
      if (regionCode) filters.Wilayah = regionCode;
      if (overdue === "true") filters.Filter = "Jatuh Tempo Saja";
      if (search) filters.Pencarian = search;
      if (startDate)
        filters["Dari Tanggal"] = new Date(startDate).toLocaleDateString(
          "id-ID"
        );
      if (endDate)
        filters["Sampai Tanggal"] = new Date(endDate).toLocaleDateString(
          "id-ID"
        );

      // Generate Excel
      const buffer = await ExcelExporter.exportToExcel(
        excelData,
        columns,
        "Piutang Member",
        {
          title: "LAPORAN PIUTANG MEMBER",
          filters,
          summary,
        }
      );

      // Set response headers
      const filename = `Piutang-Member-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      console.log(
        `✅ Exported ${debts.length} member debts to Excel by ${req.user.name}`
      );

      return res.send(buffer);
    } catch (error) {
      console.error("❌ Error exporting member debts:", error);
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts/export
   * @desc Export supplier debts to Excel
   * @access Private (ADMIN, KASIR)
   */
  static async exportSupplierDebts(req, res, next) {
    try {
      const {
        supplierId,
        status,
        overdue = false,
        search = "",
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      // Build where clause (same as getSupplierDebts)
      const whereClause = {};
      const supplierWhereClause = {};

      if (supplierId) whereClause.supplierId = supplierId;
      if (status) whereClause.status = status;

      if (overdue === "true") {
        whereClause.dueDate = { [Op.lt]: new Date() };
        whereClause.status = { [Op.in]: ["PENDING", "PARTIAL"] };
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      if (search) {
        whereClause[Op.or] = [{ invoiceNumber: { [Op.like]: `%${search}%` } }];
        supplierWhereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ];
      }

      // Fetch all data (no pagination for export)
      const debts = await SupplierDebt.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone", "contactPerson"],
            where:
              Object.keys(supplierWhereClause).length > 0
                ? supplierWhereClause
                : undefined,
            required: Object.keys(supplierWhereClause).length > 0,
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
          },
        ],
      });

      // Prepare data for Excel
      const excelData = debts.map((debt) => ({
        invoiceNumber: debt.invoiceNumber,
        supplierCode: debt.supplier?.code || "-",
        supplierName: debt.supplier?.name || "-",
        contactPerson: debt.supplier?.contactPerson || "-",
        phone: debt.supplier?.phone || "-",
        purchaseDate: debt.purchase?.purchaseDate
          ? new Date(debt.purchase.purchaseDate)
          : "-",
        totalAmount: ExcelExporter.formatCurrency(debt.totalAmount),
        paidAmount: ExcelExporter.formatCurrency(debt.paidAmount),
        remainingAmount: ExcelExporter.formatCurrency(debt.remainingAmount),
        dueDate: debt.dueDate ? new Date(debt.dueDate) : "-",
        status: ExcelExporter.formatStatus(debt.status),
        isOverdue: debt.isOverdue() ? "Ya" : "Tidak",
        daysOverdue: debt.getDaysOverdue(),
      }));

      // Define columns
      const columns = [
        { header: "No. Faktur", key: "invoiceNumber", width: 15 },
        { header: "Kode Supplier", key: "supplierCode", width: 12 },
        { header: "Nama Supplier", key: "supplierName", width: 25 },
        { header: "Contact Person", key: "contactPerson", width: 20 },
        { header: "Telepon", key: "phone", width: 15 },
        { header: "Tgl Pembelian", key: "purchaseDate", width: 15 },
        { header: "Total Hutang", key: "totalAmount", width: 15 },
        { header: "Sudah Dibayar", key: "paidAmount", width: 15 },
        { header: "Sisa Hutang", key: "remainingAmount", width: 15 },
        { header: "Jatuh Tempo", key: "dueDate", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Terlambat", key: "isOverdue", width: 12 },
        { header: "Hari Terlambat", key: "daysOverdue", width: 15 },
      ];

      // Calculate summary
      const totalDebt = debts.reduce(
        (sum, d) => sum + parseFloat(d.totalAmount),
        0
      );
      const totalPaid = debts.reduce(
        (sum, d) => sum + parseFloat(d.paidAmount),
        0
      );
      const totalRemaining = debts.reduce(
        (sum, d) => sum + parseFloat(d.remainingAmount),
        0
      );
      const overdueCount = debts.filter((d) => d.isOverdue()).length;

      const summary = {
        "Total Hutang": `Rp ${totalDebt.toLocaleString("id-ID")}`,
        "Total Dibayar": `Rp ${totalPaid.toLocaleString("id-ID")}`,
        "Total Sisa": `Rp ${totalRemaining.toLocaleString("id-ID")}`,
        "Jumlah Hutang": debts.length,
        "Jatuh Tempo": overdueCount,
      };

      // Prepare filters for display
      const filters = {};
      if (status) filters.Status = status;
      if (overdue === "true") filters.Filter = "Jatuh Tempo Saja";
      if (search) filters.Pencarian = search;
      if (startDate)
        filters["Dari Tanggal"] = new Date(startDate).toLocaleDateString(
          "id-ID"
        );
      if (endDate)
        filters["Sampai Tanggal"] = new Date(endDate).toLocaleDateString(
          "id-ID"
        );

      // Generate Excel
      const buffer = await ExcelExporter.exportToExcel(
        excelData,
        columns,
        "Hutang Supplier",
        {
          title: "LAPORAN HUTANG SUPPLIER",
          filters,
          summary,
        }
      );

      // Set response headers
      const filename = `Hutang-Supplier-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      console.log(
        `✅ Exported ${debts.length} supplier debts to Excel by ${req.user.name}`
      );

      return res.send(buffer);
    } catch (error) {
      console.error("❌ Error exporting supplier debts:", error);
      next(error);
    }
  }

  /**
   * GET /api/payments/stats
   * @desc Get payment statistics
   * @access Private (ADMIN, KASIR)
   */
  static async getStats(req, res, next) {
    try {
      // TODO: Implement payment statistics
      return res.json({
        success: true,
        message: "Payment stats - Coming soon",
        data: {
          memberDebts: { total: 0, paid: 0, pending: 0 },
          supplierDebts: { total: 0, paid: 0, pending: 0 },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/member-debts/member/:memberId
   * @desc Get all debts by specific member
   * @access Private (ADMIN, KASIR)
   */
  static async getMemberDebtsByMember(req, res, next) {
    try {
      const { memberId } = req.params;

      const debts = await MemberDebt.findAll({
        where: { memberId },
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "whatsapp"],
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return ApiResponse.success(
        res,
        debts,
        "Member debts retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/member-debts/:debtId
   * @desc Get member debt detail
   * @access Private (ADMIN, KASIR)
   */
  static async getMemberDebtDetail(req, res, next) {
    try {
      const { debtId } = req.params;

      const debt = await MemberDebt.findByPk(debtId, {
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "id",
              "uniqueId",
              "fullName",
              "whatsapp",
              "regionName",
            ],
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate", "finalAmount"],
          },
          {
            model: DebtPayment,
            as: "payments",
            order: [["paymentDate", "DESC"]],
          },
        ],
      });

      if (!debt) {
        return ApiResponse.notFound(res, "Member debt not found");
      }

      return ApiResponse.success(
        res,
        debt,
        "Member debt detail retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/member-debts/:debtId/pay
   * @desc Pay member debt
   * @access Private (ADMIN, KASIR)
   */
  static async payMemberDebt(req, res, next) {
    try {
      const { debtId } = req.params;
      const { amount, paymentMethod, notes } = req.body;

      // TODO: Implement payment logic with transaction
      return ApiResponse.success(
        res,
        null,
        "Payment recorded successfully - Implementation pending"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts/supplier/:supplierId/list
   * @desc Get all debts to specific supplier
   * @access Private (ADMIN, KASIR)
   */
  static async getSupplierDebtsBySupplier(req, res, next) {
    try {
      const { supplierId } = req.params;

      const debts = await SupplierDebt.findAll({
        where: { supplierId },
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone"],
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return ApiResponse.success(
        res,
        debts,
        "Supplier debts retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts/:debtId
   * @desc Get supplier debt detail
   * @access Private (ADMIN, KASIR)
   */
  static async getSupplierDebtDetail(req, res, next) {
    try {
      const { debtId } = req.params;

      const debt = await SupplierDebt.findByPk(debtId, {
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone", "contactPerson"],
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate", "totalAmount"],
          },
        ],
      });

      if (!debt) {
        return ApiResponse.notFound(res, "Supplier debt not found");
      }

      return ApiResponse.success(
        res,
        debt,
        "Supplier debt detail retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/supplier-debts/:debtId/pay
   * @desc Pay supplier debt
   * @access Private (ADMIN, KASIR)
   */
  static async paySupplierDebt(req, res, next) {
    try {
      const { debtId } = req.params;
      const { amount, paymentMethod, notes } = req.body;

      // TODO: Implement payment logic with transaction
      return ApiResponse.success(
        res,
        null,
        "Payment recorded successfully - Implementation pending"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;
