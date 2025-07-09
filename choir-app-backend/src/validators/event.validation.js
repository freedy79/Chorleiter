const { body } = require('express-validator');

exports.createEventValidation = [
  body('date').isISO8601().withMessage('Valid date is required.'),
  body('type').isIn(['REHEARSAL', 'SERVICE']).withMessage('Type must be REHEARSAL or SERVICE.'),
  body('pieceIds').optional().isArray().withMessage('pieceIds must be an array'),
  body('pieceIds.*').optional().isInt().withMessage('pieceIds must contain integers'),
  body('organistId').optional({ nullable: true }).isInt().withMessage('organistId must be an integer'),
  body('directorId').optional({ nullable: true }).isInt().withMessage('directorId must be an integer'),
  body('finalized').optional().isBoolean(),
  body('version').optional().isInt(),
  body('monthlyPlanId').optional({ nullable: true }).isInt()
];
