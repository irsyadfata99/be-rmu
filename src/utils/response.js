// ============================================
// src/utils/response.js
// Utility untuk standardisasi API response
// ============================================

class ApiResponse {
  /**
   * Success response
   * @param {object} res - Express response object
   * @param {any} data - Data yang akan dikirim
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {object} errors - Validation errors (optional)
   */
  static error(res, message = "Internal Server Error", statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   * @param {object} res - Express response object
   * @param {array} data - Array of data
   * @param {object} pagination - Pagination info
   * @param {string} message - Success message
   */
  static paginated(res, data = [], pagination = {}, message = "Success") {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
      },
    });
  }

  /**
   * Created response (HTTP 201)
   * @param {object} res - Express response object
   * @param {any} data - Created data
   * @param {string} message - Success message
   */
  static created(res, data = null, message = "Resource created successfully") {
    return this.success(res, data, message, 201);
  }

  /**
   * No Content response (HTTP 204)
   * @param {object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Validation Error response (HTTP 422)
   * @param {object} res - Express response object
   * @param {object} errors - Validation errors
   * @param {string} message - Error message
   */
  static validationError(res, errors = {}, message = "Validation Error") {
    return this.error(res, message, 422, errors);
  }

  /**
   * Unauthorized response (HTTP 401)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response (HTTP 403)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  /**
   * Not Found response (HTTP 404)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }
}

module.exports = ApiResponse;
