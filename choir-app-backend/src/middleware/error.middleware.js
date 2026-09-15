/**
 * Global Error Handling Middleware
 *
 * This middleware catches all errors thrown in the application
 * and formats them into consistent JSON responses.
 */

const { AppError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Error Handler Middleware
 * Should be registered AFTER all routes in app.js
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log error details
  const logMeta = {
    path: req.path,
    method: req.method,
    userId: req.userId,
    choirId: req.activeChoirId,
    ip: req.ip
  };

  if (err.isOperational) {
    // Operational errors (expected errors)
    logger.warn(`Operational Error: ${err.message}`, { ...logMeta, statusCode: err.statusCode });
  } else {
    // Programming errors (bugs)
    logger.error(`Programming Error: ${err.message}`, {
      ...logMeta,
      stack: err.stack,
      error: err
    });
  }

  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;

  // Build error response
  const response = {
    success: false,
    message: err.message || 'An unexpected error occurred.'
  };

  if (err.code) {
    response.code = err.code;
  }

  // Add error details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (err.details) {
      response.details = err.details;
    }
  } else if (err.details && err.isOperational) {
    // Only include details for operational errors in production
    response.details = err.details;
  }

  // Send error response
  res.status(statusCode).json(response);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Middleware
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.method} ${req.path} not found.`, 404);
  next(error);
};

/**
 * Builds a searchable error code from the request route and method.
 * Format: {PREFIX}_{METHOD}_{ROUTER_BASE}_{ROUTE_PATTERN}
 * Example: DB_DELETE_PIECES_LINK_FILE
 * Search for any segment of the code in the routes files to find the failing endpoint.
 */
function buildErrorCode(req, prefix) {
  const baseSlug = (req.baseUrl || '')
    .replace(/^\/api\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

  const routeSlug = ((req.route && req.route.path) || req.path || '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

  return [prefix, req.method, baseSlug, routeSlug]
    .filter(Boolean)
    .join('_')
    .replace(/_+/g, '_');
}

/**
 * Sequelize Error Handler
 * Converts Sequelize errors to AppError instances
 */
const sequelizeErrorHandler = (err, req, res, next) => {
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));

    const validationError = new AppError(
      'Validation failed.',
      400,
      details,
      buildErrorCode(req, 'VAL')
    );
    validationError.isOperational = true;
    return next(validationError);
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    const conflictError = new AppError(
      `A record with this ${field} already exists.`,
      409,
      null,
      buildErrorCode(req, 'UNQ')
    );
    conflictError.isOperational = true;
    return next(conflictError);
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const foreignKeyError = new AppError(
      'Cannot complete operation due to related records.',
      400,
      null,
      buildErrorCode(req, 'FK')
    );
    foreignKeyError.isOperational = true;
    return next(foreignKeyError);
  }

  // Handle Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    const code = buildErrorCode(req, 'DB');
    logger.error('SequelizeDatabaseError during request', {
      code,
      path: req.path,
      method: req.method,
      ip: req.ip,
      message: err.message,
      sql: err.sql,
      parentMessage: err.parent?.message,
      parentCode: err.parent?.code,
      parentDetail: err.parent?.detail,
      parentConstraint: err.parent?.constraint,
      originalMessage: err.original?.message,
      originalCode: err.original?.code,
      stack: err.stack,
    });

    const dbError = new AppError(
      'Database operation failed.',
      500,
      process.env.NODE_ENV === 'development' ? err.message : null,
      code
    );
    return next(dbError);
  }

  // Pass other errors to the main error handler
  next(err);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  sequelizeErrorHandler
};
