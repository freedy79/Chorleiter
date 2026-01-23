const { body } = require('express-validator');

/**
 * Validator für sichere Passwörter (Option 1: Sanfte Migration)
 * Anforderungen: mind. 12 Zeichen, Großbuchstaben, Kleinbuchstaben, Zahlen, Sonderzeichen
 */
const strongPasswordValidator = body('password')
  .isLength({ min: 12 })
  .withMessage('Password must be at least 12 characters.')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&).');

exports.signupValidation = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  strongPasswordValidator,
  body('choirName').notEmpty().withMessage('Choir name is required.')
];

exports.resetPasswordValidation = [
  strongPasswordValidator
];
