const { body } = require('express-validator');

exports.createPieceValidation = [
  body('title').notEmpty().withMessage('Title is required.'),
  body('composerId').isInt().withMessage('Valid composerId is required.'),
  body('arrangerIds').optional().isArray().withMessage('arrangerIds must be an array'),
  body('arrangerIds.*').optional().isInt().withMessage('arrangerIds must contain integers'),
  body('links').optional().isArray().withMessage('links must be an array'),
  body('links.*.description').optional().isString(),
  body('links.*.url').optional().isURL().withMessage('links.*.url must be a valid URL'),
  body('authorId').optional({ nullable: true }).isInt(),
  body('categoryId').optional({ nullable: true }).isInt()
];

exports.updatePieceValidation = [
  body('title').optional().notEmpty(),
  body('composerId').optional().isInt(),
  body('arrangerIds').optional().isArray(),
  body('arrangerIds.*').optional().isInt(),
  body('links').optional().isArray(),
  body('links.*.description').optional().isString(),
  body('links.*.url').optional().isURL(),
  body('authorId').optional({ nullable: true }).isInt(),
  body('categoryId').optional({ nullable: true }).isInt()
];
