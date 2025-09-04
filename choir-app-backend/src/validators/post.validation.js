const { body } = require('express-validator');

function noHtml(value) {
  return !/<[^>]+>/.test(value);
}

exports.postValidation = [
  body('title').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('text').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('expiresAt').optional({ checkFalsy: true }).isISO8601()
];
