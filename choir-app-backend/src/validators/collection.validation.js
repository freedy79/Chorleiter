const { body } = require('express-validator');

exports.createCollectionValidation = [
  body('title').notEmpty().withMessage('Title is required.'),
  body('subtitle').optional().isString(),
  body('pieces').optional().isArray().withMessage('pieces must be an array'),
  body('pieces.*.pieceId').optional().isInt().withMessage('pieceId must be an integer'),
  body('pieces.*.numberInCollection')
    .optional()
    .matches(/^\d+[a-zA-Z]*$/)
    .withMessage('numberInCollection must be numeric with optional letters'),
  body('singleEdition').optional().isBoolean()
];

exports.updateCollectionValidation = [
  body('title').optional().notEmpty(),
  body('subtitle').optional().isString(),
  body('pieces').optional().isArray(),
  body('pieces.*.pieceId').optional().isInt(),
  body('pieces.*.numberInCollection')
    .optional()
    .matches(/^\d+[a-zA-Z]*$/),
  body('singleEdition').optional().isBoolean()
];
