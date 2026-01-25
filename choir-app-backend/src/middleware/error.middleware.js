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
      details
    );
    validationError.isOperational = true;
    return next(validationError);
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    const conflictError = new AppError(
      `A record with this ${field} already exists.`,
      409
    );
    conflictError.isOperational = true;
    return next(conflictError);
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const foreignKeyError = new AppError(
      'Cannot complete operation due to related records.',
      400
    );
    foreignKeyError.isOperational = true;
    return next(foreignKeyError);
  }

  // Handle Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    const dbError = new AppError(
      'Database operation failed.',
      500,
      process.env.NODE_ENV === 'development' ? err.message : null
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
