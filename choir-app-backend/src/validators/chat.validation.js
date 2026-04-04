const { body, param, query } = require('express-validator');

function noHtml(value) {
  return !/<[^>]+>/.test(String(value || ''));
}

exports.createRoomValidation = [
  body('isPrivate')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('Invalid private-room flag'),
  body('memberUserIds')
    .optional({ nullable: true })
    .isArray({ max: 300 })
    .withMessage('Invalid member list'),
  body('memberUserIds.*')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Invalid member id'),
  body('key')
    .optional({ nullable: true })
    .isString()
    .trim()
    .matches(/^[a-z0-9-]{2,40}$/)
    .withMessage('Invalid room key'),
  body('title')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 })
    .custom(noHtml)
    .withMessage('Invalid room title')
];

exports.roomDetailValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id')
];

exports.updateRoomValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id'),
  body('isPrivate')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('Invalid private-room flag'),
  body('memberUserIds')
    .optional({ nullable: true })
    .isArray({ max: 300 })
    .withMessage('Invalid member list'),
  body('memberUserIds.*')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Invalid member id'),
  body('title')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 })
    .custom(noHtml)
    .withMessage('Invalid room title')
];

exports.messageListValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id'),
  query('before').optional({ nullable: true }).isISO8601().withMessage('Invalid before timestamp'),
  query('after').optional({ nullable: true }).isISO8601().withMessage('Invalid after timestamp'),
  query('afterId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid afterId cursor'),
  query('limit').optional({ nullable: true }).isInt({ min: 1, max: 100 }).withMessage('Invalid limit')
];

exports.createMessageValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id'),
  body('text').optional({ nullable: true }).isString().custom(noHtml).withMessage('HTML not allowed'),
  body('replyToMessageId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid reply target id')
];

exports.updateMessageValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid message id'),
  body('text').isString().trim().notEmpty().custom(noHtml).withMessage('Invalid message text')
];

exports.deleteMessageValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid message id')
];

exports.messageDetailValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid message id')
];

exports.markReadValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id'),
  body('lastReadMessageId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid message id')
];

exports.messageStreamValidation = [
  param('roomId').isInt({ min: 1 }).withMessage('Invalid room id'),
  query('afterId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid afterId cursor')
];

exports.reportMessageValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid message id'),
  body('reason').isString().trim().notEmpty().isLength({ max: 2000 }).custom(noHtml).withMessage('Bitte einen gültigen Meldegrund angeben (max. 2000 Zeichen)')
];
