const { body } = require('express-validator');

exports.createPieceValidation = [
  body('title').notEmpty().withMessage('Title is required.'),
  body('composerId').optional({ nullable: true }).isInt(),
  body('origin').optional({ nullable: true }).isString(),
  body().custom((value, { req }) => {
    if (!req.body.composerId && !(req.body.composers && req.body.composers.length) && !req.body.origin) {
      throw new Error('composerId or origin is required');
    }
    return true;
  }),
  body('subtitle').optional({ nullable: true }).isString(),
  body('composerCollection').optional({ nullable: true }).isString(),
  body('arrangerIds').optional().isArray().withMessage('arrangerIds must be an array'),
  body('arrangerIds.*').optional().isInt().withMessage('arrangerIds must contain integers'),
  body('composers').optional().isArray().withMessage('composers must be an array'),
  body('composers.*.id').optional().isInt().withMessage('composers.*.id must be an integer'),
  body('composers.*.type').optional({ nullable: true }).isString(),
  body('links').optional().isArray().withMessage('links must be an array'),
  body('links.*.description').optional().isString(),
  body('links.*.url').optional().isString(),
  body('authorId').optional({ nullable: true }).isInt(),
  body('categoryId').optional({ nullable: true }).isInt()
];

exports.updatePieceValidation = [
  body('title').optional().notEmpty(),
  body('composerId').optional({ nullable: true }).isInt(),
  body('origin').optional({ nullable: true }).isString(),
  body('subtitle').optional({ nullable: true }).isString(),
  body('composerCollection').optional({ nullable: true }).isString(),
  body('arrangerIds').optional().isArray(),
  body('arrangerIds.*').optional().isInt(),
  body('composers').optional().isArray(),
  body('composers.*.id').optional().isInt(),
  body('composers.*.type').optional({ nullable: true }).isString(),
  body('links').optional().isArray(),
  body('links.*.description').optional().isString(),
  body('links.*.url').optional().isString(),
  body('authorId').optional({ nullable: true }).isInt(),
  body('categoryId').optional({ nullable: true }).isInt()
];
