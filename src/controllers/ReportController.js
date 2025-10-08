// ============================================
// src/controllers/ReportController.js
// Controller untuk semua laporan
// ============================================
const { Sale, SaleItem } = require("../models/Sale");
const { Purchase, PurchaseItem } = require("../models/Purchase");
const {
  PurchaseReturn,
  PurchaseReturnItem,
} = require("../models/PurchaseReturn");
const { SalesReturn, SalesReturnItem } = require("../models/SalesReturn");
const { MemberDebt, DebtPayment } = require("../models/MemberDebt");
const SupplierDebt = require("../models/SupplierDebt");
const Member = require("../models/Member");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const User = require("../models/User");
const PointTransaction = require("../models/PointTransaction");
const ApiResponse = require("../utils/response");
const ExcelExporter = require("../utils/excelExporter");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const moment = require("moment");

class ReportController {
  // ============================================
  // 1. LAPORAN BARANG RETURN
  // ============================================
  static async getReturns(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        status,
        startDate,
        endDate,
        search = "",
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let data = [];
      let total = 0;

      if (!type || type === "purchase") {
        const whereClause = {};
        if (status) whereClause.status = status;
        if (startDate && endDate) {
          whereClause.returnDate = {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          };
        }
        if (search) whereClause.returnNumber = { [Op.like]: `%${search}%` };

        const purchaseReturns = await PurchaseReturn.findAndCountAll({
          where: whereClause,
          limit: exportExcel ? undefined : parseInt(limit),
          offset: exportExcel ? undefined : offset,
          order: [["returnDate", "DESC"]],
          include: [
            {
              model: PurchaseReturnItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["sku", "name", "unit"],
                },
              ],
            },
            { model: Supplier, as: "supplier", attributes: ["code", "name"] },
            { model: Purchase, as: "purchase", attributes: ["invoiceNumber"] },
          ],
        });

        data = purchaseReturns.rows.map((ret) => ({
          type: "Purchase Return",
          returnNumber: ret.returnNumber,
          returnDate: moment(ret.returnDate).format("DD/MM/YYYY"),
          referenceNumber: ret.purchase?.invoiceNumber || "-",
          supplierCode: ret.supplier?.code || "-",
          supplierName: ret.supplier?.name || "-",
          totalAmount: parseFloat(ret.totalAmount),
          status: ret.status,
          reason: ret.reason,
          itemCount: ret.items?.length || 0,
        }));

        total = purchaseReturns.count;
      }

      if (!type || type === "sales") {
        const whereClause = {};
        if (status) whereClause.status = status;
        if (startDate && endDate) {
          whereClause.returnDate = {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          };
        }
        if (search) whereClause.returnNumber = { [Op.like]: `%${search}%` };

        const salesReturns = await SalesReturn.findAndCountAll({
          where: whereClause,
          limit: exportExcel ? undefined : parseInt(limit),
          offset: exportExcel ? undefined : offset,
          order: [["returnDate", "DESC"]],
          include: [
            {
              model: SalesReturnItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["sku", "name", "unit"],
                },
              ],
            },
            {
              model: Member,
              as: "member",
              attributes: ["uniqueId", "fullName"],
            },
            { model: Sale, as: "sale", attributes: ["invoiceNumber"] },
          ],
        });

        const salesData = salesReturns.rows.map((ret) => ({
          type: "Sales Return",
          returnNumber: ret.returnNumber,
          returnDate: moment(ret.returnDate).format("DD/MM/YYYY"),
          referenceNumber: ret.sale?.invoiceNumber || "-",
          memberCode: ret.member?.uniqueId || "-",
          memberName: ret.member?.fullName || "UMUM",
          totalAmount: parseFloat(ret.totalAmount),
          status: ret.status,
          reason: ret.reason,
          refundMethod: ret.refundMethod,
          itemCount: ret.items?.length || 0,
        }));

        data = type === "sales" ? salesData : [...data, ...salesData];
        total += salesReturns.count;
      }

      if (exportExcel === "true") {
        const columns = [
          { header: "Tipe", key: "type", width: 15 },
          { header: "No. Retur", key: "returnNumber", width: 20 },
          { header: "Tanggal", key: "returnDate", width: 15 },
          { header: "No. Referensi", key: "referenceNumber", width: 20 },
          { header: "Kode", key: "code", width: 15 },
          { header: "Nama", key: "name", width: 30 },
          { header: "Total", key: "totalAmount", width: 15 },
          { header: "Status", key: "status", width: 12 },
          { header: "Alasan", key: "reason", width: 40 },
        ];

        const excelData = data.map((item) => ({
          type: item.type,
          returnNumber: item.returnNumber,
          returnDate: item.returnDate,
          referenceNumber: item.referenceNumber,
          code: item.supplierCode || item.memberCode || "-",
          name: item.supplierName || item.memberName || "-",
          totalAmount: item.totalAmount,
          status: item.status,
          reason: item.reason,
        }));

        const buffer = await ExcelExporter.exportToExcel(
          excelData,
          columns,
          "Laporan Return",
          "LAPORAN BARANG RETURN"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Return"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan return berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 2. LAPORAN BARANG PALING LAKU
  // ============================================
  static async getBestSelling(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        categoryId,
        limit = 50,
        export: exportExcel = false,
      } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause["$sale.saleDate$"] = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      if (categoryId) {
        whereClause["$product.categoryId$"] = categoryId;
      }

      const bestSelling = await SaleItem.findAll({
        attributes: [
          "productId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
          [
            sequelize.fn("COUNT", sequelize.col("sale_items.id")),
            "totalTransactions",
          ],
          [sequelize.fn("SUM", sequelize.col("subtotal")), "totalRevenue"],
        ],
        where: whereClause,
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["sku", "name", "unit", "sellingPrice"],
            include: [
              { model: Category, as: "category", attributes: ["name"] },
            ],
          },
          {
            model: Sale,
            as: "sale",
            attributes: [],
            where:
              startDate && endDate
                ? {
                    saleDate: {
                      [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                  }
                : {},
          },
        ],
        group: ["productId"],
        order: [[sequelize.fn("SUM", sequelize.col("quantity")), "DESC"]],
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        subQuery: false,
      });

      const data = bestSelling.map((item, index) => ({
        rank: index + 1,
        sku: item.product?.sku || "-",
        productName: item.product?.name || "-",
        category: item.product?.category?.name || "-",
        unit: item.product?.unit || "-",
        sellingPrice: parseFloat(item.product?.sellingPrice || 0),
        totalQuantity: parseInt(item.dataValues.totalQuantity),
        totalTransactions: parseInt(item.dataValues.totalTransactions),
        totalRevenue: parseFloat(item.dataValues.totalRevenue || 0),
        avgPerTransaction: parseFloat(
          (
            item.dataValues.totalQuantity / item.dataValues.totalTransactions
          ).toFixed(2)
        ),
      }));

      if (exportExcel === "true") {
        const columns = [
          { header: "Rank", key: "rank", width: 8 },
          { header: "SKU", key: "sku", width: 15 },
          { header: "Nama Produk", key: "productName", width: 40 },
          { header: "Kategori", key: "category", width: 20 },
          { header: "Satuan", key: "unit", width: 10 },
          { header: "Harga Jual", key: "sellingPrice", width: 15 },
          { header: "Total Terjual", key: "totalQuantity", width: 15 },
          { header: "Total Transaksi", key: "totalTransactions", width: 15 },
          { header: "Total Pendapatan", key: "totalRevenue", width: 18 },
          { header: "Avg/Transaksi", key: "avgPerTransaction", width: 15 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Barang Paling Laku",
          "LAPORAN BARANG PALING LAKU"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Barang_Paling_Laku"
          )}`
        );
        return res.send(buffer);
      }

      return ApiResponse.success(
        res,
        data,
        "Laporan barang paling laku berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 3. LAPORAN TRANSAKSI HARIAN
  // ============================================
  static async getDailyTransactions(req, res, next) {
    try {
      const { startDate, endDate, export: exportExcel = false } = req.query;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.saleDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const dailyData = await Sale.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("sale_date")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalTransactions"],
          [sequelize.fn("SUM", sequelize.col("final_amount")), "totalRevenue"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'TUNAI' THEN 1 ELSE 0 END"
              )
            ),
            "tunaiCount",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'KREDIT' THEN 1 ELSE 0 END"
              )
            ),
            "kreditCount",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'TUNAI' THEN final_amount ELSE 0 END"
              )
            ),
            "tunaiRevenue",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'KREDIT' THEN final_amount ELSE 0 END"
              )
            ),
            "kreditRevenue",
          ],
        ],
        where: whereClause,
        group: [sequelize.fn("DATE", sequelize.col("sale_date"))],
        order: [[sequelize.fn("DATE", sequelize.col("sale_date")), "DESC"]],
        raw: true,
      });

      const data = dailyData.map((item) => ({
        date: moment(item.date).format("DD/MM/YYYY"),
        dayName: moment(item.date).format("dddd"),
        totalTransactions: parseInt(item.totalTransactions),
        totalRevenue: parseFloat(item.totalRevenue || 0),
        tunaiCount: parseInt(item.tunaiCount),
        tunaiRevenue: parseFloat(item.tunaiRevenue || 0),
        kreditCount: parseInt(item.kreditCount),
        kreditRevenue: parseFloat(item.kreditRevenue || 0),
        avgPerTransaction: parseFloat(
          (item.totalRevenue / item.totalTransactions).toFixed(2)
        ),
      }));

      if (exportExcel === "true") {
        const columns = [
          { header: "Tanggal", key: "date", width: 15 },
          { header: "Hari", key: "dayName", width: 12 },
          { header: "Total Transaksi", key: "totalTransactions", width: 15 },
          { header: "Total Pendapatan", key: "totalRevenue", width: 18 },
          { header: "Tunai (Qty)", key: "tunaiCount", width: 12 },
          { header: "Tunai (Rp)", key: "tunaiRevenue", width: 18 },
          { header: "Kredit (Qty)", key: "kreditCount", width: 12 },
          { header: "Kredit (Rp)", key: "kreditRevenue", width: 18 },
          { header: "Avg/Transaksi", key: "avgPerTransaction", width: 15 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Transaksi Harian",
          "LAPORAN TRANSAKSI HARIAN"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Transaksi_Harian"
          )}`
        );
        return res.send(buffer);
      }

      return ApiResponse.success(
        res,
        data,
        "Laporan transaksi harian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 4. LAPORAN TRANSAKSI BULANAN
  // ============================================
  static async getMonthlyTransactions(req, res, next) {
    try {
      const { year = new Date().getFullYear(), export: exportExcel = false } =
        req.query;

      const monthlyData = await Sale.findAll({
        attributes: [
          [sequelize.fn("MONTH", sequelize.col("sale_date")), "month"],
          [sequelize.fn("YEAR", sequelize.col("sale_date")), "year"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalTransactions"],
          [sequelize.fn("SUM", sequelize.col("final_amount")), "totalRevenue"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'TUNAI' THEN 1 ELSE 0 END"
              )
            ),
            "tunaiCount",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'KREDIT' THEN 1 ELSE 0 END"
              )
            ),
            "kreditCount",
          ],
        ],
        where: {
          saleDate: {
            [Op.between]: [
              new Date(`${year}-01-01`),
              new Date(`${year}-12-31 23:59:59`),
            ],
          },
        },
        group: [
          sequelize.fn("MONTH", sequelize.col("sale_date")),
          sequelize.fn("YEAR", sequelize.col("sale_date")),
        ],
        order: [
          [sequelize.fn("YEAR", sequelize.col("sale_date")), "ASC"],
          [sequelize.fn("MONTH", sequelize.col("sale_date")), "ASC"],
        ],
        raw: true,
      });

      const monthNames = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      const data = monthlyData.map((item) => ({
        month: parseInt(item.month),
        monthName: monthNames[item.month - 1],
        year: parseInt(item.year),
        totalTransactions: parseInt(item.totalTransactions),
        totalRevenue: parseFloat(item.totalRevenue || 0),
        tunaiCount: parseInt(item.tunaiCount),
        kreditCount: parseInt(item.kreditCount),
        avgPerTransaction: parseFloat(
          (item.totalRevenue / item.totalTransactions).toFixed(2)
        ),
      }));

      if (exportExcel === "true") {
        const columns = [
          { header: "Bulan", key: "monthName", width: 15 },
          { header: "Tahun", key: "year", width: 10 },
          { header: "Total Transaksi", key: "totalTransactions", width: 15 },
          { header: "Total Pendapatan", key: "totalRevenue", width: 18 },
          { header: "Tunai (Qty)", key: "tunaiCount", width: 12 },
          { header: "Kredit (Qty)", key: "kreditCount", width: 12 },
          { header: "Avg/Transaksi", key: "avgPerTransaction", width: 15 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Transaksi Bulanan",
          `LAPORAN TRANSAKSI BULANAN - ${year}`
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Transaksi_Bulanan"
          )}`
        );
        return res.send(buffer);
      }

      return ApiResponse.success(
        res,
        data,
        "Laporan transaksi bulanan berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 5. LAPORAN TRANSAKSI PER MEMBER
  // ============================================
  static async getMemberTransactions(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        regionCode,
        startDate,
        endDate,
        sortBy = "totalSpending",
        sortOrder = "DESC",
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (regionCode) {
        whereClause.regionCode = regionCode;
      }

      const memberData = await Member.findAndCountAll({
        where: whereClause,
        attributes: [
          "id",
          "uniqueId",
          "fullName",
          "regionCode",
          "regionName",
          "whatsapp",
          "totalDebt",
          "totalPoints",
          "isActive",
        ],
        include: [
          {
            model: Sale,
            as: "sales",
            attributes: [
              [
                sequelize.fn("COUNT", sequelize.col("sales.id")),
                "transactionCount",
              ],
              [
                sequelize.fn("SUM", sequelize.col("sales.final_amount")),
                "totalSpending",
              ],
            ],
            where:
              startDate && endDate
                ? {
                    saleDate: {
                      [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                  }
                : {},
            required: false,
          },
        ],
        group: ["Member.id"],
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        offset: exportExcel === "true" ? undefined : offset,
        subQuery: false,
      });

      const data = memberData.rows.map((member) => ({
        uniqueId: member.uniqueId,
        fullName: member.fullName,
        regionCode: member.regionCode,
        regionName: member.regionName,
        whatsapp: member.whatsapp,
        totalTransactions: member.sales?.[0]?.dataValues?.transactionCount || 0,
        totalSpending: parseFloat(
          member.sales?.[0]?.dataValues?.totalSpending || 0
        ),
        totalDebt: parseFloat(member.totalDebt),
        totalPoints: member.totalPoints,
        isActive: member.isActive ? "Aktif" : "Nonaktif",
        avgPerTransaction:
          member.sales?.[0]?.dataValues?.transactionCount > 0
            ? parseFloat(
                (
                  member.sales[0].dataValues.totalSpending /
                  member.sales[0].dataValues.transactionCount
                ).toFixed(2)
              )
            : 0,
      }));

      data.sort((a, b) => {
        if (sortOrder === "DESC") {
          return b[sortBy] - a[sortBy];
        }
        return a[sortBy] - b[sortBy];
      });

      if (exportExcel === "true") {
        const columns = [
          { header: "ID Member", key: "uniqueId", width: 15 },
          { header: "Nama Lengkap", key: "fullName", width: 30 },
          { header: "Wilayah", key: "regionName", width: 20 },
          { header: "WhatsApp", key: "whatsapp", width: 18 },
          { header: "Total Transaksi", key: "totalTransactions", width: 15 },
          { header: "Total Belanja", key: "totalSpending", width: 18 },
          { header: "Hutang", key: "totalDebt", width: 15 },
          { header: "Poin", key: "totalPoints", width: 10 },
          { header: "Avg/Transaksi", key: "avgPerTransaction", width: 15 },
          { header: "Status", key: "isActive", width: 12 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Transaksi per Member",
          "LAPORAN TRANSAKSI PER MEMBER"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Transaksi_Member"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: memberData.count.length,
        totalPages: Math.ceil(memberData.count.length / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan transaksi per member berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 6. LAPORAN JENIS PEMBELIAN
  // ============================================
  static async getPurchaseReport(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        purchaseType,
        supplierId,
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (startDate && endDate) {
        whereClause.purchaseDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      if (purchaseType) {
        whereClause.purchaseType = purchaseType;
      }

      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      const { count, rows } = await Purchase.findAndCountAll({
        where: whereClause,
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        offset: exportExcel === "true" ? undefined : offset,
        order: [["purchaseDate", "DESC"]],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["code", "name", "phone"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name", "username"],
          },
        ],
      });

      const data = rows.map((purchase) => ({
        invoiceNumber: purchase.invoiceNumber,
        purchaseDate: moment(purchase.purchaseDate).format("DD/MM/YYYY"),
        supplierCode: purchase.supplier?.code || "-",
        supplierName: purchase.supplier?.name || "-",
        purchaseType: purchase.purchaseType,
        totalAmount: parseFloat(purchase.totalAmount),
        paidAmount: parseFloat(purchase.paidAmount),
        remainingDebt: parseFloat(purchase.remainingDebt),
        status: purchase.status,
        dueDate: purchase.dueDate
          ? moment(purchase.dueDate).format("DD/MM/YYYY")
          : "-",
        inputBy: purchase.user?.name || "-",
      }));

      if (exportExcel === "true") {
        const columns = [
          { header: "No. Faktur", key: "invoiceNumber", width: 20 },
          { header: "Tanggal", key: "purchaseDate", width: 15 },
          { header: "Kode Supplier", key: "supplierCode", width: 15 },
          { header: "Nama Supplier", key: "supplierName", width: 30 },
          { header: "Jenis", key: "purchaseType", width: 15 },
          { header: "Total", key: "totalAmount", width: 15 },
          { header: "Dibayar", key: "paidAmount", width: 15 },
          { header: "Sisa Hutang", key: "remainingDebt", width: 15 },
          { header: "Status", key: "status", width: 12 },
          { header: "Jatuh Tempo", key: "dueDate", width: 15 },
          { header: "Input By", key: "inputBy", width: 20 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Jenis Pembelian",
          "LAPORAN JENIS PEMBELIAN"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Jenis_Pembelian"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan jenis pembelian berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 7. LAPORAN HUTANG (Hutang ke Supplier)
  // ============================================
  static async getDebtReport(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        overdue = false,
        supplierId,
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      if (overdue === "true") {
        whereClause.dueDate = {
          [Op.lt]: new Date(),
        };
        whereClause.status = {
          [Op.in]: ["PENDING", "PARTIAL"],
        };
      }

      const { count, rows } = await SupplierDebt.findAndCountAll({
        where: whereClause,
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        offset: exportExcel === "true" ? undefined : offset,
        order: [["dueDate", "ASC"]],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["code", "name", "phone", "contactPerson"],
          },
          {
            model: Purchase,
            as: "purchase",
            attributes: ["purchaseDate"],
          },
        ],
      });

      const data = rows.map((debt) => {
        const isOverdue =
          debt.dueDate &&
          new Date() > new Date(debt.dueDate) &&
          debt.status !== "PAID";
        const daysOverdue = isOverdue
          ? Math.ceil(
              (new Date() - new Date(debt.dueDate)) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          invoiceNumber: debt.invoiceNumber,
          supplierCode: debt.supplier?.code || "-",
          supplierName: debt.supplier?.name || "-",
          contactPerson: debt.supplier?.contactPerson || "-",
          phone: debt.supplier?.phone || "-",
          purchaseDate: moment(debt.purchase?.purchaseDate).format(
            "DD/MM/YYYY"
          ),
          totalAmount: parseFloat(debt.totalAmount),
          paidAmount: parseFloat(debt.paidAmount),
          remainingAmount: parseFloat(debt.remainingAmount),
          dueDate: debt.dueDate
            ? moment(debt.dueDate).format("DD/MM/YYYY")
            : "-",
          status: debt.status,
          isOverdue: isOverdue ? "YA" : "TIDAK",
          daysOverdue: daysOverdue,
          paymentProgress: parseFloat(
            ((debt.paidAmount / debt.totalAmount) * 100).toFixed(2)
          ),
        };
      });

      if (exportExcel === "true") {
        const columns = [
          { header: "No. Faktur", key: "invoiceNumber", width: 20 },
          { header: "Kode Supplier", key: "supplierCode", width: 15 },
          { header: "Nama Supplier", key: "supplierName", width: 30 },
          { header: "Contact Person", key: "contactPerson", width: 25 },
          { header: "Telp", key: "phone", width: 15 },
          { header: "Tgl Pembelian", key: "purchaseDate", width: 15 },
          { header: "Total Hutang", key: "totalAmount", width: 15 },
          { header: "Sudah Dibayar", key: "paidAmount", width: 15 },
          { header: "Sisa Hutang", key: "remainingAmount", width: 15 },
          { header: "Jatuh Tempo", key: "dueDate", width: 15 },
          { header: "Status", key: "status", width: 12 },
          { header: "Overdue?", key: "isOverdue", width: 10 },
          { header: "Hari Terlambat", key: "daysOverdue", width: 15 },
          { header: "Progress (%)", key: "paymentProgress", width: 12 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Hutang ke Supplier",
          "LAPORAN HUTANG KOPERASI KE SUPPLIER"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Hutang_Supplier"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan hutang berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 8. LAPORAN PIUTANG (Piutang dari Member)
  // ============================================
  static async getReceivableReport(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        overdue = false,
        memberId,
        regionCode,
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      if (memberId) {
        whereClause.memberId = memberId;
      }

      if (overdue === "true") {
        whereClause.dueDate = {
          [Op.lt]: new Date(),
        };
        whereClause.status = {
          [Op.in]: ["PENDING", "PARTIAL"],
        };
      }

      const memberWhereClause = {};
      if (regionCode) {
        memberWhereClause.regionCode = regionCode;
      }

      const { count, rows } = await MemberDebt.findAndCountAll({
        where: whereClause,
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        offset: exportExcel === "true" ? undefined : offset,
        order: [["dueDate", "ASC"]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "uniqueId",
              "fullName",
              "whatsapp",
              "regionCode",
              "regionName",
              "address",
            ],
            where: memberWhereClause,
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["saleDate"],
          },
          {
            model: DebtPayment,
            as: "payments",
            attributes: ["paymentDate", "amount"],
            separate: true,
            order: [["paymentDate", "DESC"]],
            limit: 1,
          },
        ],
      });

      const data = rows.map((debt) => {
        const isOverdue =
          debt.dueDate &&
          new Date() > new Date(debt.dueDate) &&
          debt.status !== "PAID";
        const daysOverdue = isOverdue
          ? Math.ceil(
              (new Date() - new Date(debt.dueDate)) / (1000 * 60 * 60 * 24)
            )
          : 0;
        const lastPayment = debt.payments?.[0];

        return {
          invoiceNumber: debt.invoiceNumber,
          memberCode: debt.member?.uniqueId || "-",
          memberName: debt.member?.fullName || "-",
          regionCode: debt.member?.regionCode || "-",
          regionName: debt.member?.regionName || "-",
          whatsapp: debt.member?.whatsapp || "-",
          address: debt.member?.address || "-",
          saleDate: moment(debt.sale?.saleDate).format("DD/MM/YYYY"),
          totalAmount: parseFloat(debt.totalAmount),
          paidAmount: parseFloat(debt.paidAmount),
          remainingAmount: parseFloat(debt.remainingAmount),
          dueDate: debt.dueDate
            ? moment(debt.dueDate).format("DD/MM/YYYY")
            : "-",
          status: debt.status,
          isOverdue: isOverdue ? "YA" : "TIDAK",
          daysOverdue: daysOverdue,
          lastPaymentDate: lastPayment
            ? moment(lastPayment.paymentDate).format("DD/MM/YYYY")
            : "-",
          lastPaymentAmount: lastPayment ? parseFloat(lastPayment.amount) : 0,
          paymentProgress: parseFloat(
            ((debt.paidAmount / debt.totalAmount) * 100).toFixed(2)
          ),
        };
      });

      if (exportExcel === "true") {
        const columns = [
          { header: "No. Faktur", key: "invoiceNumber", width: 20 },
          { header: "ID Member", key: "memberCode", width: 15 },
          { header: "Nama Member", key: "memberName", width: 30 },
          { header: "Wilayah", key: "regionName", width: 20 },
          { header: "WhatsApp", key: "whatsapp", width: 15 },
          { header: "Tgl Transaksi", key: "saleDate", width: 15 },
          { header: "Total Piutang", key: "totalAmount", width: 15 },
          { header: "Sudah Dibayar", key: "paidAmount", width: 15 },
          { header: "Sisa Piutang", key: "remainingAmount", width: 15 },
          { header: "Jatuh Tempo", key: "dueDate", width: 15 },
          { header: "Status", key: "status", width: 12 },
          { header: "Overdue?", key: "isOverdue", width: 10 },
          { header: "Hari Terlambat", key: "daysOverdue", width: 15 },
          { header: "Bayar Terakhir", key: "lastPaymentDate", width: 15 },
          { header: "Nominal Terakhir", key: "lastPaymentAmount", width: 15 },
          { header: "Progress (%)", key: "paymentProgress", width: 12 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Piutang dari Member",
          "LAPORAN PIUTANG KOPERASI DARI MEMBER"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Piutang_Member"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan piutang berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 9. LAPORAN BONUS POINT PER ANGGOTA
  // ============================================
  static async getPointReport(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        memberId,
        regionCode,
        type,
        startDate,
        endDate,
        export: exportExcel = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (memberId) {
        whereClause.memberId = memberId;
      }

      if (type) {
        whereClause.type = type;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const memberWhereClause = {};
      if (regionCode) {
        memberWhereClause.regionCode = regionCode;
      }

      const { count, rows } = await PointTransaction.findAndCountAll({
        where: whereClause,
        limit: exportExcel === "true" ? undefined : parseInt(limit),
        offset: exportExcel === "true" ? undefined : offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Member,
            as: "member",
            attributes: [
              "uniqueId",
              "fullName",
              "regionCode",
              "regionName",
              "totalPoints",
            ],
            where: memberWhereClause,
          },
          {
            model: Sale,
            as: "sale",
            attributes: ["invoiceNumber", "finalAmount"],
            required: false,
          },
        ],
      });

      const data = rows.map((point) => {
        const daysUntilExpiry = point.expiryDate
          ? Math.ceil(
              (new Date(point.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null;

        return {
          transactionDate: moment(point.createdAt).format("DD/MM/YYYY HH:mm"),
          memberCode: point.member?.uniqueId || "-",
          memberName: point.member?.fullName || "-",
          regionName: point.member?.regionName || "-",
          type: point.type,
          points: point.points,
          pointsBefore: point.pointsBefore,
          pointsAfter: point.pointsAfter,
          currentPoints: point.member?.totalPoints || 0,
          description: point.description,
          invoiceNumber: point.sale?.invoiceNumber || "-",
          transactionAmount: point.sale
            ? parseFloat(point.sale.finalAmount)
            : 0,
          expiryDate: point.expiryDate
            ? moment(point.expiryDate).format("DD/MM/YYYY")
            : "-",
          daysUntilExpiry:
            daysUntilExpiry !== null
              ? daysUntilExpiry > 0
                ? `${daysUntilExpiry} hari`
                : "EXPIRED"
              : "-",
          isExpired: point.isExpired ? "YA" : "TIDAK",
        };
      });

      if (exportExcel === "true") {
        const columns = [
          { header: "Tanggal", key: "transactionDate", width: 20 },
          { header: "ID Member", key: "memberCode", width: 15 },
          { header: "Nama Member", key: "memberName", width: 30 },
          { header: "Wilayah", key: "regionName", width: 20 },
          { header: "Tipe", key: "type", width: 12 },
          { header: "Point", key: "points", width: 12 },
          { header: "Point Sebelum", key: "pointsBefore", width: 15 },
          { header: "Point Setelah", key: "pointsAfter", width: 15 },
          { header: "Point Saat Ini", key: "currentPoints", width: 15 },
          { header: "Deskripsi", key: "description", width: 40 },
          { header: "No. Faktur", key: "invoiceNumber", width: 20 },
          { header: "Nominal Transaksi", key: "transactionAmount", width: 18 },
          { header: "Expired", key: "expiryDate", width: 15 },
          { header: "Sisa Waktu", key: "daysUntilExpiry", width: 15 },
          { header: "Sudah Expired?", key: "isExpired", width: 12 },
        ];

        const buffer = await ExcelExporter.exportToExcel(
          data,
          columns,
          "Bonus Point",
          "LAPORAN BONUS POINT PER ANGGOTA"
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${ExcelExporter.generateFilename(
            "Laporan_Bonus_Point"
          )}`
        );
        return res.send(buffer);
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      };

      return ApiResponse.paginated(
        res,
        data,
        pagination,
        "Laporan bonus point berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // 10. SUMMARY DASHBOARD (All Reports Overview)
  // ============================================
  static async getSummary(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // Sales Summary
      const salesSummary = await Sale.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalTransactions"],
          [sequelize.fn("SUM", sequelize.col("final_amount")), "totalRevenue"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'TUNAI' THEN final_amount ELSE 0 END"
              )
            ),
            "tunaiRevenue",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN sale_type = 'KREDIT' THEN final_amount ELSE 0 END"
              )
            ),
            "kreditRevenue",
          ],
        ],
        where: startDate && endDate ? { saleDate: whereClause.createdAt } : {},
        raw: true,
      });

      // Purchase Summary
      const purchaseSummary = await Purchase.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalPurchases"],
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalSpending"],
        ],
        where:
          startDate && endDate ? { purchaseDate: whereClause.createdAt } : {},
        raw: true,
      });

      // Debt Summary (Hutang ke Supplier)
      const debtSummary = await SupplierDebt.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("remaining_amount")), "totalDebt"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN status IN ('PENDING', 'PARTIAL') THEN 1 END"
              )
            ),
            "pendingCount",
          ],
        ],
        raw: true,
      });

      // Receivable Summary (Piutang dari Member)
      const receivableSummary = await MemberDebt.findOne({
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("remaining_amount")),
            "totalReceivable",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN status IN ('PENDING', 'PARTIAL') THEN 1 END"
              )
            ),
            "pendingCount",
          ],
        ],
        raw: true,
      });

      // Point Summary
      const pointSummary = await PointTransaction.findOne({
        attributes: [
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN type = 'EARN' THEN points ELSE 0 END"
              )
            ),
            "totalEarned",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN type = 'REDEEM' THEN ABS(points) ELSE 0 END"
              )
            ),
            "totalRedeemed",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "CASE WHEN type = 'EXPIRED' THEN ABS(points) ELSE 0 END"
              )
            ),
            "totalExpired",
          ],
        ],
        where: whereClause,
        raw: true,
      });

      // Product Stats
      const productStats = await Product.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalProducts"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN stock = 0 THEN 1 END")
            ),
            "outOfStock",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN stock <= min_stock THEN 1 END")
            ),
            "lowStock",
          ],
        ],
        where: { isActive: true },
        raw: true,
      });

      // Member Stats
      const memberStats = await Member.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalMembers"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN is_active = 1 THEN 1 END")
            ),
            "activeMembers",
          ],
          [sequelize.fn("SUM", sequelize.col("total_points")), "totalPoints"],
        ],
        raw: true,
      });

      // Return Summary
      const purchaseReturnCount = await PurchaseReturn.count({
        where: whereClause,
      });
      const salesReturnCount = await SalesReturn.count({ where: whereClause });

      const summary = {
        sales: {
          totalTransactions: parseInt(salesSummary?.totalTransactions || 0),
          totalRevenue: parseFloat(salesSummary?.totalRevenue || 0),
          tunaiRevenue: parseFloat(salesSummary?.tunaiRevenue || 0),
          kreditRevenue: parseFloat(salesSummary?.kreditRevenue || 0),
        },
        purchases: {
          totalPurchases: parseInt(purchaseSummary?.totalPurchases || 0),
          totalSpending: parseFloat(purchaseSummary?.totalSpending || 0),
        },
        debts: {
          totalDebt: parseFloat(debtSummary?.totalDebt || 0),
          pendingCount: parseInt(debtSummary?.pendingCount || 0),
        },
        receivables: {
          totalReceivable: parseFloat(receivableSummary?.totalReceivable || 0),
          pendingCount: parseInt(receivableSummary?.pendingCount || 0),
        },
        points: {
          totalEarned: parseInt(pointSummary?.totalEarned || 0),
          totalRedeemed: parseInt(pointSummary?.totalRedeemed || 0),
          totalExpired: parseInt(pointSummary?.totalExpired || 0),
        },
        products: {
          totalProducts: parseInt(productStats?.totalProducts || 0),
          outOfStock: parseInt(productStats?.outOfStock || 0),
          lowStock: parseInt(productStats?.lowStock || 0),
        },
        members: {
          totalMembers: parseInt(memberStats?.totalMembers || 0),
          activeMembers: parseInt(memberStats?.activeMembers || 0),
          totalPoints: parseInt(memberStats?.totalPoints || 0),
        },
        returns: {
          purchaseReturns: purchaseReturnCount,
          salesReturns: salesReturnCount,
          totalReturns: purchaseReturnCount + salesReturnCount,
        },
        period: {
          startDate: startDate || "All Time",
          endDate: endDate || "Now",
        },
      };

      return ApiResponse.success(
        res,
        summary,
        "Summary dashboard berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
