const { body } = require('express-validator');

exports.createPhysicalCopyValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  body('purchaseDate').optional({ nullable: true }).isISO8601().toDate(),
  body('vendor').optional({ nullable: true }).isString(),
  body('unitPrice').optional({ nullable: true }).isDecimal(),
  body('notes').optional({ nullable: true }).isString(),
  body('condition').optional({ nullable: true }).isIn(['new', 'good', 'worn', 'damaged'])
];

exports.updatePhysicalCopyValidation = [
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  body('purchaseDate').optional({ nullable: true }).isISO8601().toDate(),
  body('vendor').optional({ nullable: true }).isString(),
  body('unitPrice').optional({ nullable: true }).isDecimal(),
  body('notes').optional({ nullable: true }).isString(),
  body('condition').optional({ nullable: true }).isIn(['new', 'good', 'worn', 'damaged'])
];

exports.createDigitalLicenseValidation = [
  body('licenseNumber').isString().notEmpty().withMessage('licenseNumber is required'),
  body('licenseType').optional().isIn(['print', 'display', 'stream', 'archive']),
  body('quantity').optional({ nullable: true }).isInt({ min: 1 }),
  body('purchaseDate').optional({ nullable: true }).isISO8601().toDate(),
  body('vendor').optional({ nullable: true }).isString(),
  body('unitPrice').optional({ nullable: true }).isDecimal(),
  body('validFrom').optional({ nullable: true }).isISO8601().toDate(),
  body('validUntil').optional({ nullable: true }).isISO8601().toDate(),
  body('notes').optional({ nullable: true }).isString()
];

exports.updateDigitalLicenseValidation = [
  body('licenseNumber').optional().isString().notEmpty(),
  body('licenseType').optional().isIn(['print', 'display', 'stream', 'archive']),
  body('quantity').optional({ nullable: true }).isInt({ min: 1 }),
  body('purchaseDate').optional({ nullable: true }).isISO8601().toDate(),
  body('vendor').optional({ nullable: true }).isString(),
  body('unitPrice').optional({ nullable: true }).isDecimal(),
  body('validFrom').optional({ nullable: true }).isISO8601().toDate(),
  body('validUntil').optional({ nullable: true }).isISO8601().toDate(),
  body('notes').optional({ nullable: true }).isString()
];
