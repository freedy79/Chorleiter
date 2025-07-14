const { body } = require('express-validator');

exports.createCollectionValidation = [
  body('title').notEmpty().withMessage('Title is required.'),
  body('pieces').optional().isArray().withMessage('pieces must be an array'),
  body('pieces.*.pieceId').optional().isInt().withMessage('pieceId must be an integer'),
  body('pieces.*.numberInCollection').optional().isInt().withMessage('numberInCollection must be an integer'),
  body('singleEdition').optional().isBoolean()
];

exports.updateCollectionValidation = [
  body('title').optional().notEmpty(),
  body('pieces').optional().isArray(),
  body('pieces.*.pieceId').optional().isInt(),
  body('pieces.*.numberInCollection').optional().isInt(),
  body('singleEdition').optional().isBoolean()
];
