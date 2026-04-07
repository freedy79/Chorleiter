const formService = require('../services/form.service');
const { NotFoundError, AuthorizationError } = require('../utils/errors');

// ── Helper ──────────────────────────────────────────────────────

async function ensureFormOwnership(formId, choirId) {
  const form = await formService.getFormById(formId);
  if (!form) throw new NotFoundError('Formular nicht gefunden');
  if (form.choirId !== choirId) throw new AuthorizationError('Kein Zugriff auf dieses Formular');
  return form;
}

// ── Form CRUD ───────────────────────────────────────────────────

const createForm = async (req, res) => {
  const choirId = req.activeChoirId;
  const form = await formService.createForm(req.body, req.userId, choirId);
  res.status(201).json(form);
};

const getForms = async (req, res) => {
  const choirId = req.activeChoirId;
  const forms = await formService.getFormsByChoir(choirId);
  res.json(forms);
};

const getActiveForms = async (req, res) => {
  const choirId = req.activeChoirId;
  const forms = await formService.getActiveForms(choirId);
  res.json(forms);
};

const getFormById = async (req, res) => {
  const form = await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  res.json(form);
};

const updateForm = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const form = await formService.updateForm(parseInt(req.params.id), req.body);
  res.json(form);
};

const deleteForm = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  await formService.deleteForm(parseInt(req.params.id));
  res.status(204).send();
};

const duplicateForm = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const copy = await formService.duplicateForm(parseInt(req.params.id), req.userId, req.activeChoirId);
  if (!copy) throw new NotFoundError('Formular nicht gefunden');
  res.status(201).json(copy);
};

const getStatistics = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const stats = await formService.getStatistics(parseInt(req.params.id));
  if (!stats) throw new NotFoundError('Formular nicht gefunden');
  res.json(stats);
};

// ── Field CRUD ──────────────────────────────────────────────────

const addField = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const field = await formService.addField(parseInt(req.params.id), req.body);
  res.status(201).json(field);
};

const updateField = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const field = await formService.updateField(parseInt(req.params.fieldId), req.body);
  if (!field) throw new NotFoundError('Feld nicht gefunden');
  res.json(field);
};

const deleteField = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  await formService.deleteField(parseInt(req.params.fieldId));
  res.status(204).send();
};

const reorderFields = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const fields = await formService.reorderFields(parseInt(req.params.id), req.body.fieldIds);
  res.json(fields);
};

// ── Submissions ─────────────────────────────────────────────────

const submitForm = async (req, res) => {
  const formId = parseInt(req.params.id);
  const form = await ensureFormOwnership(formId, req.activeChoirId);

  // Check if form is open
  const now = new Date();
  if (form.status !== 'published') {
    return res.status(400).json({ message: 'Formular ist nicht veröffentlicht' });
  }
  if (form.closeDate && new Date(form.closeDate) < now) {
    return res.status(400).json({ message: 'Formular ist geschlossen' });
  }

  // Check duplicate submission
  if (!form.allowMultipleSubmissions && req.userId) {
    const alreadySubmitted = await formService.hasUserSubmitted(formId, req.userId);
    if (alreadySubmitted) {
      return res.status(409).json({ message: 'Du hast bereits an diesem Formular teilgenommen' });
    }
  }

  // Check response limit
  if (form.maxSubmissions) {
    const count = await formService.getSubmissionCount(formId);
    if (count >= form.maxSubmissions) {
      return res.status(409).json({ message: 'Die maximale Anzahl an Abgaben wurde erreicht' });
    }
  }

  const submission = await formService.submitForm(formId, req.body, req.userId, req.ip);
  res.status(201).json(submission);
};

const getSubmissions = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const submissions = await formService.getSubmissions(parseInt(req.params.id));
  res.json(submissions);
};

const deleteSubmission = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  await formService.deleteSubmission(parseInt(req.params.submissionId));
  res.status(204).send();
};

// ── Export ───────────────────────────────────────────────────────

const exportSubmissions = async (req, res) => {
  await ensureFormOwnership(parseInt(req.params.id), req.activeChoirId);
  const data = await formService.getExportData(parseInt(req.params.id));
  if (!data) throw new NotFoundError('Formular nicht gefunden');

  const { headers, rows, form } = data;

  // Build CSV content
  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ];
  const csv = '\uFEFF' + csvLines.join('\r\n'); // BOM for Excel UTF-8

  const filename = `${form.title.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}_export.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

// ── Public Submission (via GUID) ────────────────────────────────

const getPublicForm = async (req, res) => {
  const form = await formService.getFormByGuid(req.params.guid);
  if (!form) throw new NotFoundError('Formular nicht gefunden');

  // Check if form is open
  const now = new Date();
  if (form.status !== 'published') {
    return res.status(400).json({ message: 'Formular ist nicht verfügbar' });
  }
  if (form.closeDate && new Date(form.closeDate) < now) {
    return res.status(400).json({ message: 'Formular ist geschlossen' });
  }
  if (form.openDate && new Date(form.openDate) > now) {
    return res.status(400).json({ message: 'Formular ist noch nicht geöffnet' });
  }

  // Return form without sensitive details
  res.json({
    id: form.id,
    title: form.title,
    description: form.description,
    fields: form.fields,
    allowAnonymous: form.allowAnonymous,
    closeDate: form.closeDate,
  });
};

const submitPublicForm = async (req, res) => {
  const form = await formService.getFormByGuid(req.params.guid);
  if (!form) throw new NotFoundError('Formular nicht gefunden');

  const now = new Date();
  if (form.status !== 'published') {
    return res.status(400).json({ message: 'Formular ist nicht verfügbar' });
  }
  if (form.closeDate && new Date(form.closeDate) < now) {
    return res.status(400).json({ message: 'Formular ist geschlossen' });
  }

  // Check response limit
  if (form.maxSubmissions) {
    const count = await formService.getSubmissionCount(form.id);
    if (count >= form.maxSubmissions) {
      return res.status(409).json({ message: 'Die maximale Anzahl an Abgaben wurde erreicht' });
    }
  }

  const submission = await formService.submitForm(form.id, req.body, null, req.ip);

  const confirmationText = form.confirmationText || 'Danke für deine Teilnahme!';
  res.status(201).json({ message: confirmationText, submission });
};

module.exports = {
  createForm,
  getForms,
  getActiveForms,
  getFormById,
  updateForm,
  deleteForm,
  duplicateForm,
  getStatistics,
  addField,
  updateField,
  deleteField,
  reorderFields,
  submitForm,
  getSubmissions,
  deleteSubmission,
  exportSubmissions,
  getPublicForm,
  submitPublicForm,
};
