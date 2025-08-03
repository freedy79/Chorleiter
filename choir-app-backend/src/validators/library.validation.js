const { body } = require('express-validator');

exports.createLibraryItemValidation = [
  body('collectionId').isInt().withMessage('collectionId must be an integer'),
  body('copies').isInt({ min: 1 }).withMessage('copies must be an integer'),
  body('isBorrowed').optional().isBoolean().withMessage('isBorrowed must be a boolean')
];

