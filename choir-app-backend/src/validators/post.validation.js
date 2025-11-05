const { body } = require('express-validator');
const { isISO8601 } = require('validator');

function noHtml(value) {
  return !/<[^>]+>/.test(value);
}

exports.postValidation = [
  body('title').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('text').isString().notEmpty().custom(noHtml).withMessage('HTML not allowed'),
  body('expiresAt')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Invalid date'),
  body('sendTest').optional().isBoolean(),
  body('publish').optional().isBoolean(),
  body('sendAsUser').optional().isBoolean()
];
