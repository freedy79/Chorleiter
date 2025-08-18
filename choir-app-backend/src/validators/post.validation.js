const { body } = require('express-validator');

function noHtml(value) {
  return !/<[^>]+>/.test(value);
}

exports.postValidation = [
  body('title').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('text').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('pieceId').optional().isInt(),
  body('expiresAt').optional().isISO8601()
];
