const { body, oneOf } = require('express-validator');

exports.programValidation = [
  body('title').isString().notEmpty(),
  body('description').optional().isString(),
  body('startTime').optional().isISO8601(),
];

// Validation rules for adding a piece item to a program
exports.programItemPieceValidation = [
  oneOf(
    [body('pieceId').isUUID(), body('pieceId').isInt()],
    'pieceId must be a valid UUID or integer'
  ),
  body('title').isString().notEmpty(),
  body('composer').optional().isString(),
  body('durationSec').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
  body('slotId').optional().isUUID(),
];

// Validation rules for adding a free piece item to a program
exports.programItemFreePieceValidation = [
  body('title').isString().notEmpty(),
  body('composer').optional().isString(),
  body('instrument').optional().isString(),
  body('performerNames').optional().isString(),
  body('durationSec').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
  body('slotId').optional().isUUID(),
];


// Validation rules for adding a speech item to a program
exports.programItemSpeechValidation = [
  body('title').isString().notEmpty(),
  body('source').optional().isString(),
  body('speaker').optional().isString(),
  body('text').optional().isString(),
  body('durationSec').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
  body('slotId').optional().isUUID(),
];

// Validation rules for adding a break item to a program
exports.programItemBreakValidation = [
  body('durationSec').isInt({ min: 0 }),
  body('note').optional().isString(),
  body('slotId').optional().isUUID(),
];

// Validation for adding a slot item
exports.programItemSlotValidation = [
  body('label').isString().notEmpty(),
  body('note').optional().isString(),
];

// Validation rules for reordering program items
exports.programItemsReorderValidation = [
  body('order').isArray(),
  body('order.*').isUUID(),
];