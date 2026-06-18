const { body, param } = require('express-validator');
const { isISO8601 } = require('validator');

const FIELD_TYPES = [
  'text_short', 'text_long', 'number', 'checkbox',
  'select', 'radio', 'multi_checkbox', 'date', 'time',
  'rating', 'email', 'heading', 'separator'
];

const MAX_FORM_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_CONFIRMATION_TEXT_LENGTH = 2000;
const MAX_FIELD_LABEL_LENGTH = 255;
const MAX_FIELD_PLACEHOLDER_LENGTH = 4000;

exports.createFormValidation = [
  body('title')
    .isString()
    .notEmpty().withMessage('Titel ist erforderlich')
    .isLength({ max: MAX_FORM_TITLE_LENGTH }).withMessage(`Titel darf maximal ${MAX_FORM_TITLE_LENGTH} Zeichen haben`),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_DESCRIPTION_LENGTH }).withMessage(`Beschreibung darf maximal ${MAX_DESCRIPTION_LENGTH} Zeichen haben`),
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
  body('confirmationText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_CONFIRMATION_TEXT_LENGTH }).withMessage(`Bestätigungstext darf maximal ${MAX_CONFIRMATION_TEXT_LENGTH} Zeichen haben`),
  body('fields').optional().isArray(),
  body('fields.*.type').optional().isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('fields.*.label')
    .optional()
    .isString()
    .notEmpty().withMessage('Feldbezeichnung ist erforderlich')
    .isLength({ max: MAX_FIELD_LABEL_LENGTH }).withMessage(`Feldbezeichnung darf maximal ${MAX_FIELD_LABEL_LENGTH} Zeichen haben`),
  body('fields.*.placeholder')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_FIELD_PLACEHOLDER_LENGTH }).withMessage(`Platzhalter darf maximal ${MAX_FIELD_PLACEHOLDER_LENGTH} Zeichen haben`),
  body('fields.*.required').optional().isBoolean(),
  body('fields.*.options').optional({ nullable: true }).isArray(),
  body('fields.*.sortOrder').optional().isInt({ min: 0 }),
  body('fields.*.validationRules').optional({ nullable: true }).isObject(),
  body('fields.*.showIf').optional({ nullable: true }).isObject(),
];

exports.updateFormValidation = [
  param('id').isInt().withMessage('Ungültige Formular-ID'),
  body('title')
    .optional()
    .isString()
    .notEmpty().withMessage('Titel ist erforderlich')
    .isLength({ max: MAX_FORM_TITLE_LENGTH }).withMessage(`Titel darf maximal ${MAX_FORM_TITLE_LENGTH} Zeichen haben`),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_DESCRIPTION_LENGTH }).withMessage(`Beschreibung darf maximal ${MAX_DESCRIPTION_LENGTH} Zeichen haben`),
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
  body('confirmationText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_CONFIRMATION_TEXT_LENGTH }).withMessage(`Bestätigungstext darf maximal ${MAX_CONFIRMATION_TEXT_LENGTH} Zeichen haben`),
];

exports.addFieldValidation = [
  body('type').isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('label')
    .isString()
    .notEmpty().withMessage('Feldbezeichnung ist erforderlich')
    .isLength({ max: MAX_FIELD_LABEL_LENGTH }).withMessage(`Feldbezeichnung darf maximal ${MAX_FIELD_LABEL_LENGTH} Zeichen haben`),
  body('placeholder')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_FIELD_PLACEHOLDER_LENGTH }).withMessage(`Platzhalter darf maximal ${MAX_FIELD_PLACEHOLDER_LENGTH} Zeichen haben`),
  body('required').optional().isBoolean(),
  body('options').optional({ nullable: true }).isArray(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('validationRules').optional({ nullable: true }).isObject(),
  body('showIf').optional({ nullable: true }).isObject(),
];

exports.updateFieldValidation = [
  param('fieldId').isInt().withMessage('Ungültige Feld-ID'),
  body('type').optional().isIn(FIELD_TYPES).withMessage('Ungültiger Feldtyp'),
  body('label')
    .optional()
    .isString()
    .notEmpty().withMessage('Feldbezeichnung ist erforderlich')
    .isLength({ max: MAX_FIELD_LABEL_LENGTH }).withMessage(`Feldbezeichnung darf maximal ${MAX_FIELD_LABEL_LENGTH} Zeichen haben`),
  body('placeholder')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: MAX_FIELD_PLACEHOLDER_LENGTH }).withMessage(`Platzhalter darf maximal ${MAX_FIELD_PLACEHOLDER_LENGTH} Zeichen haben`),
  body('required').optional().isBoolean(),
  body('options').optional({ nullable: true }).isArray(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('validationRules').optional({ nullable: true }).isObject(),
  body('showIf').optional({ nullable: true }).isObject(),
];

exports.reorderFieldsValidation = [
  body('fieldIds').isArray().withMessage('Feld-IDs müssen als Array übergeben werden'),
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
  body('sendCopyToEmail').optional().isBoolean(),
];
