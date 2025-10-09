// ============================================
// src/validations/returnValidation.js
// Validation schemas for Purchase & Sales Returns
// ============================================
const Joi = require("joi");

/**
 * Validation schema for creating purchase return
 */
const createPurchaseReturnSchema = Joi.object({
  purchaseId: Joi.string().uuid().required().messages({
    "string.guid": "Purchase ID harus berupa UUID yang valid",
    "any.required": "Purchase ID wajib diisi",
  }),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required().messages({
          "string.guid": "Product ID harus berupa UUID yang valid",
          "any.required": "Product ID wajib diisi",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          "number.base": "Quantity harus berupa angka",
          "number.min": "Quantity minimal 1",
          "any.required": "Quantity wajib diisi",
        }),
        price: Joi.number().min(0).required().messages({
          "number.base": "Harga harus berupa angka",
          "number.min": "Harga tidak boleh negatif",
          "any.required": "Harga wajib diisi",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Minimal 1 item harus diisi",
      "any.required": "Items wajib diisi",
    }),
  reason: Joi.string().min(10).max(500).required().messages({
    "string.min": "Alasan minimal 10 karakter",
    "string.max": "Alasan maksimal 500 karakter",
    "any.required": "Alasan retur wajib diisi",
  }),
  notes: Joi.string().max(500).optional().allow("").messages({
    "string.max": "Catatan maksimal 500 karakter",
  }),
});

/**
 * Validation schema for creating sales return
 */
const createSalesReturnSchema = Joi.object({
  saleId: Joi.string().uuid().required().messages({
    "string.guid": "Sale ID harus berupa UUID yang valid",
    "any.required": "Sale ID wajib diisi",
  }),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required().messages({
          "string.guid": "Product ID harus berupa UUID yang valid",
          "any.required": "Product ID wajib diisi",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          "number.base": "Quantity harus berupa angka",
          "number.min": "Quantity minimal 1",
          "any.required": "Quantity wajib diisi",
        }),
        price: Joi.number().min(0).required().messages({
          "number.base": "Harga harus berupa angka",
          "number.min": "Harga tidak boleh negatif",
          "any.required": "Harga wajib diisi",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Minimal 1 item harus diisi",
      "any.required": "Items wajib diisi",
    }),
  reason: Joi.string().min(10).max(500).required().messages({
    "string.min": "Alasan minimal 10 karakter",
    "string.max": "Alasan maksimal 500 karakter",
    "any.required": "Alasan retur wajib diisi",
  }),
  refundMethod: Joi.string()
    .valid("CASH", "DEBT_DEDUCTION", "STORE_CREDIT")
    .default("CASH")
    .messages({
      "any.only":
        "Metode refund harus salah satu dari: CASH, DEBT_DEDUCTION, STORE_CREDIT",
    }),
  notes: Joi.string().max(500).optional().allow("").messages({
    "string.max": "Catatan maksimal 500 karakter",
  }),
});

/**
 * Validation schema for approving return
 */
const approveReturnSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow("").messages({
    "string.max": "Catatan maksimal 500 karakter",
  }),
});

/**
 * Validation schema for rejecting return
 */
const rejectReturnSchema = Joi.object({
  notes: Joi.string().min(10).max(500).required().messages({
    "string.min": "Alasan penolakan minimal 10 karakter",
    "string.max": "Alasan penolakan maksimal 500 karakter",
    "any.required": "Alasan penolakan wajib diisi",
  }),
});

/**
 * Validation middleware wrapper
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = {};
      error.details.forEach((detail) => {
        errors[detail.path.join(".")] = detail.message;
      });

      return res.status(422).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  createPurchaseReturnSchema,
  createSalesReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
  validate,
};
