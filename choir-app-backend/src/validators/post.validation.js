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
  body('sendAsUser').optional().isBoolean(),
  body('poll')
    .optional({ nullable: true })
    .isObject().withMessage('Poll must be an object'),
  body('poll.allowMultiple').optional().isBoolean(),
  body('poll.maxSelections').optional({ nullable: true }).isInt({ min: 1 }),
  body('poll.closesAt')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Invalid poll date'),
  body('poll.options')
    .optional({ nullable: true })
    .isArray({ min: 2 }).withMessage('At least two options required'),
  body('poll.options.*').optional().isString().notEmpty().custom(noHtml).withMessage('Invalid poll option')
];

exports.pollVoteValidation = [
  body('optionIds').isArray({ min: 1 }).withMessage('At least one option required'),
  body('optionIds.*').isInt().withMessage('Invalid option id')
];
