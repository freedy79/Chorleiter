/**
 * Custom Error Classes for Standardized Error Handling
 *
 * These classes provide consistent error handling across the application
 * with proper status codes and error categorization.
 */

/**
 * Base Application Error Class
 * All custom errors extend from this class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400 Bad Request
 * Used when user input doesn't meet validation requirements
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error - 401 Unauthorized
 * Used when authentication is required but not provided or invalid
 */
class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized!') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error - 403 Forbidden
 * Used when user is authenticated but doesn't have required permissions
 */
class AuthorizationError extends AppError {
  constructor(message = 'Forbidden! You do not have permission to access this resource.') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error - 409 Conflict
 * Used when a request conflicts with existing data (e.g., duplicate entries)
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Database Error - 500 Internal Server Error
 * Used when database operations fail
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed.', details = null) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * External Service Error - 502 Bad Gateway
 * Used when external service calls fail (e.g., email service)
 */
class ExternalServiceError extends AppError {
  constructor(serviceName, message = null) {
    super(message || `${serviceName} service unavailable.`, 502);
    this.name = 'ExternalServiceError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError
};
