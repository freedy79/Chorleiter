/**
 * Standardized API Response Utility
 *
 * Provides consistent response structure across all endpoints
 */

class ApiResponse {
  /**
   * Send a successful response
   * @param {Object} res - Express response object
   * @param {*} data - Data to send in response
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data
    });
  }

  /**
   * Send a paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data items
   * @param {number} total - Total count of items
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   */
  static paginated(res, data, total, page, limit) {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  }

  /**
   * Send a created response (201)
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Optional success message
   */
  static created(res, data, message = null) {
    return res.status(201).json({
      success: true,
      data,
      ...(message && { message })
    });
  }

  /**
   * Send an accepted response (202) - for async operations
   * @param {Object} res - Express response object
   * @param {*} data - Response data (e.g., job ID)
   * @param {string} message - Optional message
   */
  static accepted(res, data = null, message = 'Request accepted for processing.') {
    return res.status(202).json({
      success: true,
      message,
      ...(data && { data })
    });
  }

  /**
   * Send a no content response (204)
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details - Additional error details
   */
  static error(res, message, statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(details && { details })
    });
  }

  /**
   * Send a simple message response
   * @param {Object} res - Express response object
   * @param {string} message - Message to send
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static message(res, message, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message
    });
  }
}

module.exports = ApiResponse;
