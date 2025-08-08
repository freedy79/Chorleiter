const { body } = require('express-validator');

exports.createLibraryItemValidation = [
  body('collectionId').isInt().withMessage('collectionId must be an integer'),
  body('copies').isInt({ min: 1 }).withMessage('copies must be an integer'),
  body('isBorrowed').optional().isBoolean().withMessage('isBorrowed must be a boolean')
];

exports.loanRequestValidation = [
  body('items').isArray({ min: 1 }).withMessage('items must be an array'),
  body('items.*.libraryItemId').isInt().withMessage('libraryItemId must be an integer'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('quantity must be an integer'),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('reason').optional().isString()
];

exports.updateLibraryItemValidation = [
  body('copies').optional().isInt({ min: 1 }).withMessage('copies must be an integer'),
  body('status').optional().isIn(['available', 'borrowed']).withMessage('status must be valid'),
  body('availableAt').optional().isISO8601().toDate()
];

