const formService = require('../services/form.service');
const { NotFoundError, AuthorizationError, AppError } = require('../utils/errors');
const logger = require('../config/logger');

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
  const formId = parseInt(req.params.id);
  await ensureFormOwnership(formId, req.activeChoirId);

  try {
    // DEBUG-FORM-REORDER-TEMP: Temporary diagnostics for reorder payloads.
    // eslint-disable-next-line no-console
    console.info('[DEBUG-FORM-REORDER-TEMP][CONTROLLER][REQUEST]', {
      formId,
      choirId: req.activeChoirId,
      fieldIds: req.body?.fieldIds,
    });

    const fields = await formService.reorderFields(formId, req.body.fieldIds);

    // eslint-disable-next-line no-console
    console.info('[DEBUG-FORM-REORDER-TEMP][CONTROLLER][SUCCESS]', {
      formId,
      returnedFieldCount: Array.isArray(fields) ? fields.length : 0,
    });

    res.json(fields);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG-FORM-REORDER-TEMP][CONTROLLER][ERROR]', {
      formId,
      fieldIds: req.body?.fieldIds,
      message: error?.message,
      stack: error?.stack,
    });

    throw new AppError(
      'Fehler beim Aktualisieren der Feldreihenfolge.',
      500,
      {
        debugTag: 'DEBUG-FORM-REORDER-TEMP',
        formId,
        fieldIds: req.body?.fieldIds,
        cause: error?.message,
      },
    );
  }
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
  logger.warn('[FORM-SUBMIT-PUBLIC] Incoming submission request', {
    guid: req.params.guid,
    ip: req.ip,
    hasAnswers: Array.isArray(req.body?.answers),
    answerCount: Array.isArray(req.body?.answers) ? req.body.answers.length : 0,
    hasSubmitterName: !!req.body?.submitterName,
    hasSubmitterEmail: !!req.body?.submitterEmail,
    sendCopyToEmail: !!req.body?.sendCopyToEmail,
  });

  const form = await formService.getFormByGuid(req.params.guid);
  if (!form) throw new NotFoundError('Formular nicht gefunden');

  logger.warn('[FORM-SUBMIT-PUBLIC] Form resolved', {
    guid: req.params.guid,
    formId: form.id,
    status: form.status,
    closeDate: form.closeDate,
    maxSubmissions: form.maxSubmissions,
    fieldCount: Array.isArray(form.fields) ? form.fields.length : 0,
  });

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

  try {
    const submission = await formService.submitForm(form.id, req.body, null, req.ip, {
      hydrateResult: false,
    });

    logger.warn('[FORM-SUBMIT-PUBLIC] Submission stored successfully', {
      guid: req.params.guid,
      formId: form.id,
      submissionId: submission?.id,
    });

    const confirmationText = form.confirmationText || 'Danke für deine Teilnahme!';
    res.status(201).json({ message: confirmationText, submission });
  } catch (error) {
    const debugDetails = {
      debugTag: 'FORM-SUBMIT-PUBLIC-TEMP',
      formId: form.id,
      guid: req.params.guid,
      errorName: error?.name || 'UnknownError',
      errorMessage: error?.message || 'Unknown error',
      answerCount: Array.isArray(req.body?.answers) ? req.body.answers.length : 0,
      answerFieldIds: Array.isArray(req.body?.answers)
        ? req.body.answers.slice(0, 10).map(a => a?.fieldId ?? null)
        : [],
    };

    logger.error('[FORM-SUBMIT-PUBLIC] Submission failed', debugDetails);
    // eslint-disable-next-line no-console
    console.error('[FORM-SUBMIT-PUBLIC] Submission failed', debugDetails, error);

    throw new AppError(
      'Fehler beim Absenden des Formulars.',
      500,
      debugDetails,
    );
  }
};

const checkPublicDuplicate = async (req, res) => {
  const { guid } = req.params;
  const email = String(req.query.email || '').trim();

  if (!email) return res.json({ submissionId: null });

  const form = await formService.getFormByGuid(guid);
  if (!form) throw new NotFoundError('Formular nicht gefunden');

  const submission = await formService.findSubmissionByEmailFieldValue(form.id, email);
  res.json({ submissionId: submission?.id ?? null });
};

const updatePublicSubmission = async (req, res) => {
  const { guid } = req.params;
  const submissionId = parseInt(req.params.submissionId);

  const form = await formService.getFormByGuid(guid);
  if (!form) throw new NotFoundError('Formular nicht gefunden');

  const now = new Date();
  if (form.status !== 'published') {
    return res.status(400).json({ message: 'Formular ist nicht verfügbar' });
  }
  if (form.closeDate && new Date(form.closeDate) < now) {
    return res.status(400).json({ message: 'Formular ist geschlossen' });
  }

  const result = await formService.updateSubmissionAnswers(submissionId, form.id, req.body);
  if (!result) throw new NotFoundError('Abgabe nicht gefunden');

  res.json({ message: form.confirmationText || 'Danke für deine Teilnahme!' });
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
  checkPublicDuplicate,
  updatePublicSubmission,
};
