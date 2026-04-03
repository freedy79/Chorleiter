const { body, param } = require('express-validator');
const { isISO8601 } = require('validator');

const FIELD_TYPES = [
  'text_short', 'text_long', 'number', 'checkbox',
  'select', 'radio', 'multi_checkbox', 'date', 'time',
  'rating', 'email', 'heading', 'separator'
];

exports.createFormValidation = [
  body('title').isString().notEmpty().withMessage('Titel ist erforderlich'),
  body('description').optional({ nullable: true }).isString(),
  body('status').optional().isIn(['draft', 'published', 'closed']).withMessage('Ungültiger Status'),
  body('openDate')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Ungültiges Datum'),
  body('closeDate')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Ungültiges Datum'),
  body('allowAnonymous').optional().isBoolean(),
  body('allowMultipleSubmissions').optional().isBoolean(),
  body('maxSubmissions').optional({ nullable: true }).isInt({ min: 1 }).withMessage('maxSubmissions muss >= 1 sein'),
  body('notifyOnSubmission').optional().isBoolean(),
  body('confirmationText').optional({ nullable: true }).isString(),
  body('fields').optional().isArray(),
  body('fields.*.type').optional().isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('fields.*.label').optional().isString().notEmpty().withMessage('Feldbezeichnung ist erforderlich'),
  body('fields.*.placeholder').optional({ nullable: true }).isString(),
  body('fields.*.required').optional().isBoolean(),
  body('fields.*.options').optional({ nullable: true }).isArray(),
  body('fields.*.sortOrder').optional().isInt({ min: 0 }),
  body('fields.*.validationRules').optional({ nullable: true }).isObject(),
  body('fields.*.showIf').optional({ nullable: true }).isObject(),
];

exports.updateFormValidation = [
  param('id').isInt().withMessage('Ungültige Formular-ID'),
  body('title').optional().isString().notEmpty().withMessage('Titel ist erforderlich'),
  body('description').optional({ nullable: true }).isString(),
  body('status').optional().isIn(['draft', 'published', 'closed']).withMessage('Ungültiger Status'),
  body('openDate')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Ungültiges Datum'),
  body('closeDate')
    .optional({ nullable: true })
    .custom(value => value === null || isISO8601(String(value)))
    .withMessage('Ungültiges Datum'),
  body('allowAnonymous').optional().isBoolean(),
  body('allowMultipleSubmissions').optional().isBoolean(),
  body('maxSubmissions').optional({ nullable: true }).isInt({ min: 1 }).withMessage('maxSubmissions muss >= 1 sein'),
  body('notifyOnSubmission').optional().isBoolean(),
  body('confirmationText').optional({ nullable: true }).isString(),
];

exports.addFieldValidation = [
  body('type').isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('label').isString().notEmpty().withMessage('Feldbezeichnung ist erforderlich'),
  body('placeholder').optional({ nullable: true }).isString(),
  body('required').optional().isBoolean(),
  body('options').optional({ nullable: true }).isArray(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('validationRules').optional({ nullable: true }).isObject(),
  body('showIf').optional({ nullable: true }).isObject(),
];

exports.updateFieldValidation = [
  param('fieldId').isInt().withMessage('Ungültige Feld-ID'),
  body('type').optional().isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('label').optional().isString().notEmpty().withMessage('Feldbezeichnung ist erforderlich'),
  body('placeholder').optional({ nullable: true }).isString(),
  body('required').optional().isBoolean(),
  body('options').optional({ nullable: true }).isArray(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('validationRules').optional({ nullable: true }).isObject(),
  body('showIf').optional({ nullable: true }).isObject(),
];

exports.reorderFieldsValidation = [
  body('fieldIds').isArray({ min: 1 }).withMessage('Feld-IDs sind erforderlich'),
  body('fieldIds.*').isInt().withMessage('Ungültige Feld-ID'),
];

exports.submitFormValidation = [
  body('answers').isArray().withMessage('Antworten sind erforderlich'),
  body('answers.*.fieldId').isInt().withMessage('Ungültige Feld-ID'),
  body('answers.*.value')
    .optional({ nullable: true })
    .custom(value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null)
    .withMessage('Ungültiger Wert'),
  body('submitterName').optional({ nullable: true }).isString(),
  body('submitterEmail').optional({ nullable: true }).isEmail().withMessage('Ungültige E-Mail-Adresse'),
];
