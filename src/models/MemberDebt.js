// ============================================
// src/models/MemberDebt.js (FIXED - Remove all require() in associations)
// ============================================
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ============================================
// MODEL: MEMBER DEBT (Piutang dari Member)
// ============================================
const MemberDebt = sequelize.define(
  "MemberDebt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "members",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "sales",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "Referensi ke transaksi penjualan kredit",
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Nomor faktur penjualan (copy dari sale)",
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
      comment: "Total hutang awal (dari sale.finalAmount)",
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
      comment: "Total yang sudah dibayar (termasuk DP)",
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
      allowNull: false,
      comment: "Tanggal jatuh tempo",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PARTIAL", "PAID", "OVERDUE"),
      allowNull: false,
      defaultValue: "PENDING",
      comment: "Status pembayaran",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "member_debts",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["member_id"],
      },
      {
        fields: ["sale_id"],
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
// MODEL: DEBT PAYMENT (Riwayat Pembayaran)
// ============================================
const DebtPayment = sequelize.define(
  "DebtPayment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    memberDebtId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "member_debts",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "members",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      comment: "User yang menerima pembayaran",
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: "Jumlah pembayaran tidak boleh negatif",
        },
      },
    },
    paymentMethod: {
      type: DataTypes.ENUM("CASH", "TRANSFER", "DEBIT", "CREDIT"),
      allowNull: false,
      defaultValue: "CASH",
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    receiptNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Nomor bukti pembayaran (optional)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "debt_payments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["member_debt_id"],
      },
      {
        fields: ["member_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["payment_date"],
      },
    ],
  }
);

// ============================================
// INSTANCE METHODS - MEMBER DEBT
// ============================================

/**
 * Check if debt is overdue
 */
MemberDebt.prototype.isOverdue = function () {
  if (this.status === "PAID") return false;
  return new Date() > new Date(this.dueDate);
};

/**
 * Get days overdue
 */
MemberDebt.prototype.getDaysOverdue = function () {
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
MemberDebt.prototype.getPaymentPercentage = function () {
  if (this.totalAmount === 0) return 100;
  return ((this.paidAmount / this.totalAmount) * 100).toFixed(2);
};

/**
 * Add payment to this debt
 */
MemberDebt.prototype.addPayment = async function (
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

  // Create payment record
  const payment = await DebtPayment.create({
    memberDebtId: this.id,
    memberId: this.memberId,
    userId: userId,
    amount: amount,
    paymentMethod: paymentMethod,
    paymentDate: new Date(),
    notes: notes,
  });

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

  // Update member's total debt
  const Member = sequelize.models.Member;
  const member = await Member.findByPk(this.memberId);
  if (member) {
    member.totalDebt = parseFloat(member.totalDebt) - amount;
    await member.save();
  }

  return payment;
};

/**
 * Get formatted data for response
 */
MemberDebt.prototype.toJSON = function () {
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
// INSTANCE METHODS - DEBT PAYMENT
// ============================================

DebtPayment.prototype.toJSON = function () {
  const values = { ...this.get() };
  values.amount = parseFloat(values.amount);
  return values;
};

// ============================================
// ⚠️ ASSOCIATIONS MOVED TO index.js
// DO NOT PUT ASSOCIATIONS HERE - CAUSES CIRCULAR DEPENDENCY
// ============================================

module.exports = { MemberDebt, DebtPayment };
