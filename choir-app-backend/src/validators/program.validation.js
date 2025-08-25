const { body } = require('express-validator');

exports.programValidation = [
  body('title').isString().notEmpty(),
  body('description').optional().isString(),
  body('startTime').optional().isISO8601(),
];
