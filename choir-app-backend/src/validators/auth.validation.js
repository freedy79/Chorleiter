const { body } = require('express-validator');

exports.signupValidation = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters.'),
  body('choirName').notEmpty().withMessage('Choir name is required.')
];
