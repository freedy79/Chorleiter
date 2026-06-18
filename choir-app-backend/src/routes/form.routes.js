const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/form.controller');
const validate = require('../validators/validate');
const {
  createFormValidation,
  updateFormValidation,
  addFieldValidation,
  updateFieldValidation,
  reorderFieldsValidation,
  submitFormValidation,
} = require('../validators/form.validation');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

// ── Form CRUD (Choir Admin/Admin only) ───────────────────────────
router.get('/', wrap(controller.getForms));
router.get('/active', wrap(controller.getActiveForms));
router.post('/', role.requireNonDemo, role.requireChoirAdmin, createFormValidation, validate, wrap(controller.createForm));
router.get('/:id', wrap(controller.getFormById));
router.put('/:id', role.requireNonDemo, role.requireChoirAdmin, updateFormValidation, validate, wrap(controller.updateForm));
router.delete('/:id', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.deleteForm));
router.post('/:id/duplicate', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.duplicateForm));

// ── Field CRUD (Choir Admin/Admin only) ──────────────────────────
router.post('/:id/fields', role.requireNonDemo, role.requireChoirAdmin, addFieldValidation, validate, wrap(controller.addField));
router.put('/:id/fields/reorder', role.requireNonDemo, role.requireChoirAdmin, reorderFieldsValidation, validate, wrap(controller.reorderFields));
router.put('/:id/fields/:fieldId', role.requireNonDemo, role.requireChoirAdmin, updateFieldValidation, validate, wrap(controller.updateField));
router.delete('/:id/fields/:fieldId', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.deleteField));

// ── Submission (authenticated members) ───────────────────────────
router.post('/:id/submit', role.requireNonDemo, submitFormValidation, validate, wrap(controller.submitForm));

// ── Results (Choir Admin/Admin only) ─────────────────────────────
router.get('/:id/submissions', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.getSubmissions));
router.delete('/:id/submissions/:submissionId', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.deleteSubmission));
router.get('/:id/export', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.exportSubmissions));
router.get('/:id/statistics', role.requireNonDemo, role.requireChoirAdmin, wrap(controller.getStatistics));

module.exports = router;
