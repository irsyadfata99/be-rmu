// ============================================
// src/controllers/PaymentController.js
// Controller untuk pembayaran hutang (member & supplier)
// ============================================
const { MemberDebt, DebtPayment } = require("../models/MemberDebt");
const SupplierDebt = require("../models/SupplierDebt");
const Member = require("../models/Member");
const Supplier = require("../models/Supplier");
const { Sale } = require("../models/Sale");
const { Purchase } = require("../models/Purchase");
const ApiResponse = require("../utils/response");
const { generatePaymentNumber } = require("../utils/invoiceGenerator");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

class PaymentController {
  // ============================================
  // MEMBER DEBT PAYMENT (PIUTANG DARI MEMBER)
  // ============================================

  /**
   * GET /api/payments/member-debts - List all member debts
   */
  static async getMemberDebts(req, res, next) {
    try {
      const { page = 1, limit = 10, memberId, status, overdue = false, search = "", sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

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

      // Search by invoice number
      if (search) {
        whereClause.invoiceNumber = {
          [Op.like]: `%${search}%`,
        };
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
            attributes: ["id", "uniqueId", "fullName", "whatsapp", "regionCode", "regionName"],
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

      return ApiResponse.paginated(res, rows, pagination, "Daftar piutang member berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/member-debts/:memberId - Get debts by member
   */
  static async getMemberDebtsByMember(req, res, next) {
    try {
      const { memberId } = req.params;

      const member = await Member.findByPk(memberId);
      if (!member) {
        return ApiResponse.notFound(res, "Member tidak ditemukan");
      }

      const debts = await MemberDebt.findAll({
        where: {
          memberId,
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
        order: [["dueDate", "ASC"]],
        include: [
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate"],
          },
          {
            model: DebtPayment,
            as: "payments",
            order: [["paymentDate", "DESC"]],
          },
        ],
      });

      // Calculate totals
      const totalDebt = debts.reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
      const overdueDebts = debts.filter((debt) => debt.isOverdue());

      return ApiResponse.success(
        res,
        {
          member: {
            id: member.id,
            uniqueId: member.uniqueId,
            fullName: member.fullName,
            totalDebt: parseFloat(member.totalDebt),
          },
          debts,
          summary: {
            totalDebts: debts.length,
            totalAmount: parseFloat(totalDebt.toFixed(2)),
            overdueDebts: overdueDebts.length,
          },
        },
        "Piutang member berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/member-debts/:debtId/pay - Pay member debt
   */
  static async payMemberDebt(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { debtId } = req.params;
      const { amount, paymentMethod = "CASH", notes } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        await t.rollback();
        return ApiResponse.error(res, "Jumlah pembayaran harus lebih dari 0", 422);
      }

      // Get debt
      const debt = await MemberDebt.findByPk(debtId, {
        include: [
          {
            model: Member,
            as: "member",
          },
        ],
        transaction: t,
      });

      if (!debt) {
        await t.rollback();
        return ApiResponse.notFound(res, "Hutang tidak ditemukan");
      }

      if (debt.status === "PAID") {
        await t.rollback();
        return ApiResponse.error(res, "Hutang sudah lunas", 400);
      }

      if (amount > debt.remainingAmount) {
        await t.rollback();
        return ApiResponse.error(res, `Pembayaran melebihi sisa hutang. Sisa: ${debt.remainingAmount}`, 400);
      }

      // Generate receipt number
      const receiptNumber = await generatePaymentNumber();

      // Process payment
      const payment = await debt.addPayment(amount, req.user.id, paymentMethod, notes);

      // Update receipt number
      await payment.update({ receiptNumber }, { transaction: t });

      await t.commit();

      // Load complete data
      const updatedDebt = await MemberDebt.findByPk(debtId, {
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "totalDebt"],
          },
          {
            model: DebtPayment,
            as: "payments",
            order: [["paymentDate", "DESC"]],
          },
        ],
      });

      console.log(`✅ Member debt payment: ${debt.invoiceNumber} - Rp ${amount.toLocaleString("id-ID")} (${receiptNumber})`);

      return ApiResponse.success(
        res,
        {
          payment,
          debt: updatedDebt,
        },
        "Pembayaran berhasil diproses"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error paying member debt:", error);
      next(error);
    }
  }

  /**
   * GET /api/payments/member-debts/:debtId - Get debt detail
   */
  static async getMemberDebtDetail(req, res, next) {
    try {
      const { debtId } = req.params;

      const debt = await MemberDebt.findByPk(debtId, {
        include: [
          {
            model: Member,
            as: "member",
            attributes: ["id", "uniqueId", "fullName", "whatsapp", "address"],
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["id", "invoiceNumber", "saleDate", "totalAmount", "finalAmount"],
          },
          {
            model: DebtPayment,
            as: "payments",
            order: [["paymentDate", "DESC"]],
          },
        ],
      });

      if (!debt) {
        return ApiResponse.notFound(res, "Hutang tidak ditemukan");
      }

      return ApiResponse.success(res, debt, "Detail hutang berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // SUPPLIER DEBT PAYMENT (HUTANG KE SUPPLIER)
  // ============================================

  /**
   * GET /api/payments/supplier-debts - List all supplier debts
   */
  static async getSupplierDebts(req, res, next) {
    try {
      const { page = 1, limit = 10, supplierId, status, overdue = false, search = "", sortBy = "createdAt", sortOrder = "DESC" } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

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

      // Search by invoice number
      if (search) {
        whereClause.invoiceNumber = {
          [Op.like]: `%${search}%`,
        };
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

      return ApiResponse.paginated(res, rows, pagination, "Daftar hutang supplier berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts/:supplierId/list - Get debts by supplier
   */
  static async getSupplierDebtsBySupplier(req, res, next) {
    try {
      const { supplierId } = req.params;

      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        return ApiResponse.notFound(res, "Supplier tidak ditemukan");
      }

      const debts = await SupplierDebt.findAll({
        where: {
          supplierId,
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
        order: [["dueDate", "ASC"]],
        include: [
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate"],
          },
        ],
      });

      // Calculate totals
      const totalDebt = debts.reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
      const overdueDebts = debts.filter((debt) => debt.isOverdue());

      return ApiResponse.success(
        res,
        {
          supplier: {
            id: supplier.id,
            code: supplier.code,
            name: supplier.name,
            totalDebt: parseFloat(supplier.totalDebt),
          },
          debts,
          summary: {
            totalDebts: debts.length,
            totalAmount: parseFloat(totalDebt.toFixed(2)),
            overdueDebts: overdueDebts.length,
          },
        },
        "Hutang supplier berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/supplier-debts/:debtId/pay - Pay supplier debt
   */
  static async paySupplierDebt(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { debtId } = req.params;
      const { amount, paymentMethod = "CASH", notes } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        await t.rollback();
        return ApiResponse.error(res, "Jumlah pembayaran harus lebih dari 0", 422);
      }

      // Get debt
      const debt = await SupplierDebt.findByPk(debtId, {
        include: [
          {
            model: Supplier,
            as: "supplier",
          },
        ],
        transaction: t,
      });

      if (!debt) {
        await t.rollback();
        return ApiResponse.notFound(res, "Hutang tidak ditemukan");
      }

      if (debt.status === "PAID") {
        await t.rollback();
        return ApiResponse.error(res, "Hutang sudah lunas", 400);
      }

      if (amount > debt.remainingAmount) {
        await t.rollback();
        return ApiResponse.error(res, `Pembayaran melebihi sisa hutang. Sisa: ${debt.remainingAmount}`, 400);
      }

      // Process payment
      await debt.addPayment(amount, req.user.id, paymentMethod, notes);

      await t.commit();

      // Load complete data
      const updatedDebt = await SupplierDebt.findByPk(debtId, {
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "totalDebt"],
          },
        ],
      });

      console.log(`✅ Supplier debt payment: ${debt.invoiceNumber} - Rp ${amount.toLocaleString("id-ID")}`);

      return ApiResponse.success(
        res,
        {
          debt: updatedDebt,
        },
        "Pembayaran berhasil diproses"
      );
    } catch (error) {
      await t.rollback();
      console.error("❌ Error paying supplier debt:", error);
      next(error);
    }
  }

  /**
   * GET /api/payments/supplier-debts/:debtId - Get debt detail
   */
  static async getSupplierDebtDetail(req, res, next) {
    try {
      const { debtId } = req.params;

      const debt = await SupplierDebt.findByPk(debtId, {
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "code", "name", "phone", "address", "contactPerson"],
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["id", "invoiceNumber", "purchaseDate", "totalAmount"],
          },
        ],
      });

      if (!debt) {
        return ApiResponse.notFound(res, "Hutang tidak ditemukan");
      }

      return ApiResponse.success(res, debt, "Detail hutang berhasil diambil");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * GET /api/payments/stats - Get payment statistics
   */
  static async getStats(req, res, next) {
    try {
      // Member debts
      const totalMemberDebts = await MemberDebt.sum("remainingAmount", {
        where: {
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
      });

      const overdueMemberDebts = await MemberDebt.count({
        where: {
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
          dueDate: { [Op.lt]: new Date() },
        },
      });

      // Supplier debts
      const totalSupplierDebts = await SupplierDebt.sum("remainingAmount", {
        where: {
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
        },
      });

      const overdueSupplierDebts = await SupplierDebt.count({
        where: {
          status: { [Op.in]: ["PENDING", "PARTIAL"] },
          dueDate: { [Op.lt]: new Date() },
        },
      });

      const stats = {
        memberDebts: {
          total: parseFloat(totalMemberDebts || 0).toFixed(2),
          overdue: overdueMemberDebts,
        },
        supplierDebts: {
          total: parseFloat(totalSupplierDebts || 0).toFixed(2),
          overdue: overdueSupplierDebts,
        },
      };

      return ApiResponse.success(res, stats, "Statistik pembayaran berhasil diambil");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;
