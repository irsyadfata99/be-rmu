// ============================================
// src/models/SupplierDebt.js (FIXED - Remove Associations)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SupplierDebt = sequelize.define(
  "SupplierDebt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "suppliers",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    purchaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "purchases",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "Referensi ke transaksi pembelian kredit",
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Nomor faktur pembelian (copy dari purchase)",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Total hutang tidak boleh negatif",
        },
      },
      comment: "Total hutang awal",
    },
    paidAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Jumlah bayar tidak boleh negatif",
        },
      },
      comment: "Total yang sudah dibayar",
    },
    remainingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Sisa hutang tidak boleh negatif",
        },
      },
      comment: "Sisa hutang (totalAmount - paidAmount)",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Tanggal jatuh tempo (jika ada)",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PARTIAL", "PAID", "OVERDUE"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "supplier_debts",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["supplier_id"],
      },
      {
        fields: ["purchase_id"],
      },
      {
        fields: ["invoice_number"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["due_date"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if debt is overdue
 */
SupplierDebt.prototype.isOverdue = function () {
  if (this.status === "PAID" || !this.dueDate) return false;
  return new Date() > new Date(this.dueDate);
};

/**
 * Get days overdue
 */
SupplierDebt.prototype.getDaysOverdue = function () {
  if (!this.isOverdue()) return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = Math.abs(today - dueDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Calculate payment completion percentage
 */
SupplierDebt.prototype.getPaymentPercentage = function () {
  if (this.totalAmount === 0) return 100;
  return ((this.paidAmount / this.totalAmount) * 100).toFixed(2);
};

/**
 * Add payment to this debt
 */
SupplierDebt.prototype.addPayment = async function (
  amount,
  userId,
  paymentMethod = "CASH",
  notes = null
) {
  if (amount <= 0) {
    throw new Error("Jumlah pembayaran harus lebih dari 0");
  }

  if (amount > this.remainingAmount) {
    throw new Error(
      `Pembayaran melebihi sisa hutang. Sisa: ${this.remainingAmount}`
    );
  }

  // Update debt amounts
  this.paidAmount = parseFloat(this.paidAmount) + amount;
  this.remainingAmount =
    parseFloat(this.totalAmount) - parseFloat(this.paidAmount);

  // Update status
  if (this.remainingAmount === 0) {
    this.status = "PAID";
  } else {
    this.status = "PARTIAL";
  }

  await this.save();

  // Update supplier's total debt
  const Supplier = sequelize.models.Supplier;
  const supplier = await Supplier.findByPk(this.supplierId);
  if (supplier) {
    supplier.totalDebt = parseFloat(supplier.totalDebt) - amount;
    await supplier.save();
  }

  return this;
};

/**
 * Get formatted data for response
 */
SupplierDebt.prototype.toJSON = function () {
  const values = { ...this.get() };

  // Format decimals
  values.totalAmount = parseFloat(values.totalAmount);
  values.paidAmount = parseFloat(values.paidAmount);
  values.remainingAmount = parseFloat(values.remainingAmount);

  // Add computed fields
  values.isOverdue = this.isOverdue();
  values.daysOverdue = this.getDaysOverdue();
  values.paymentPercentage = this.getPaymentPercentage();

  return values;
};

// ============================================
// ⚠️ NO ASSOCIATIONS HERE
// All associations are in src/models/index.js
// ============================================

module.exports = SupplierDebt;
