const db = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { sendMail } = require('./emailTransporter');

const Form = db.form;
const FormField = db.form_field;
const FormSubmission = db.form_submission;
const FormAnswer = db.form_answer;

class FormService {

  // ── Form CRUD ────────────────────────────────────────────────

  async createForm(data, userId, choirId) {
    const form = await Form.create({
      ...data,
      createdBy: userId,
      choirId,
      publicGuid: uuidv4(),
    });

    // If fields provided inline, create them
    if (data.fields && Array.isArray(data.fields)) {
      const fields = data.fields.map((f, idx) => ({
        ...f,
        formId: form.id,
        sortOrder: f.sortOrder ?? idx,
      }));
      await FormField.bulkCreate(fields);
    }

    return this.getFormById(form.id);
  }

  async getFormsByChoir(choirId) {
    const forms = await Form.findAll({
      where: { choirId },
      include: [
        { model: FormField, as: 'fields', separate: true, order: [['sortOrder', 'ASC']] },
        { model: db.user, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Attach submission counts
    for (const form of forms) {
      form.dataValues.submissionCount = await FormSubmission.count({ where: { formId: form.id } });
    }

    return forms;
  }

  async getFormById(id) {
    const form = await Form.findByPk(id, {
      include: [
        { model: FormField, as: 'fields', separate: true, order: [['sortOrder', 'ASC']] },
        { model: db.user, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });
    if (form) {
      form.dataValues.submissionCount = await FormSubmission.count({ where: { formId: form.id } });
    }
    return form;
  }

  async getFormByGuid(guid) {
    return Form.findOne({
      where: { publicGuid: guid },
      include: [
        { model: FormField, as: 'fields', separate: true, order: [['sortOrder', 'ASC']] },
      ],
    });
  }

  async updateForm(id, data) {
    await Form.update(data, { where: { id } });
    return this.getFormById(id);
  }

  async deleteForm(id) {
    return Form.destroy({ where: { id } });
  }

  /**
   * Get active (published & within date range) forms for a choir.
   */
  async getActiveForms(choirId) {
    const now = new Date();
    return Form.findAll({
      where: {
        choirId,
        status: 'published',
        [Op.and]: [
          { [Op.or]: [{ openDate: null }, { openDate: { [Op.lte]: now } }] },
          { [Op.or]: [{ closeDate: null }, { closeDate: { [Op.gte]: now } }] },
        ],
      },
      include: [
        { model: FormField, as: 'fields', separate: true, order: [['sortOrder', 'ASC']] },
      ],
      order: [['closeDate', 'ASC NULLS LAST']],
    });
  }

  /**
   * Duplicate a form with all its fields.
   */
  async duplicateForm(formId, userId, choirId) {
    const original = await this.getFormById(formId);
    if (!original) return null;

    const newForm = await Form.create({
      choirId,
      title: `${original.title} (Kopie)`,
      description: original.description,
      status: 'draft',
      openDate: null,
      closeDate: null,
      publicGuid: uuidv4(),
      allowAnonymous: original.allowAnonymous,
      allowMultipleSubmissions: original.allowMultipleSubmissions,
      maxSubmissions: original.maxSubmissions,
      notifyOnSubmission: original.notifyOnSubmission,
      confirmationText: original.confirmationText,
      createdBy: userId,
    });

    if (original.fields && original.fields.length > 0) {
      const fields = original.fields.map(f => ({
        formId: newForm.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options,
        sortOrder: f.sortOrder,
        validationRules: f.validationRules,
        showIf: f.showIf,
      }));
      await FormField.bulkCreate(fields);
    }

    return this.getFormById(newForm.id);
  }

  /**
   * Get per-field statistics for a form.
   */
  async getStatistics(formId) {
    const form = await this.getFormById(formId);
    if (!form) return null;

    const submissions = await this.getSubmissions(formId);
    const fields = form.fields || [];
    const stats = [];

    for (const field of fields) {
      if (field.type === 'heading' || field.type === 'separator') continue;

      const values = {};
      let total = 0;

      for (const sub of submissions) {
        const answer = (sub.answers || []).find(a => a.fieldId === field.id);
        if (answer && answer.value != null && answer.value !== '') {
          const val = String(answer.value);
          // For multi_checkbox, split by comma
          if (field.type === 'multi_checkbox') {
            const parts = val.split(',').map(p => p.trim()).filter(Boolean);
            parts.forEach(p => { values[p] = (values[p] || 0) + 1; });
          } else {
            values[val] = (values[val] || 0) + 1;
          }
          total++;
        }
      }

      stats.push({
        fieldId: field.id,
        label: field.label,
        type: field.type,
        values,
        total,
      });
    }

    return { formTitle: form.title, submissionCount: submissions.length, fields: stats };
  }

  // ── Field CRUD ────────────────────────────────────────────────

  async addField(formId, data) {
    // Determine next sortOrder if not provided
    if (data.sortOrder == null) {
      const max = await FormField.max('sortOrder', { where: { formId } });
      data.sortOrder = (max || 0) + 1;
    }
    return FormField.create({ ...data, formId });
  }

  async updateField(fieldId, data) {
    await FormField.update(data, { where: { id: fieldId } });
    return FormField.findByPk(fieldId);
  }

  async deleteField(fieldId) {
    return FormField.destroy({ where: { id: fieldId } });
  }

  async reorderFields(formId, fieldIds) {
    const updates = fieldIds.map((id, idx) =>
      FormField.update({ sortOrder: idx }, { where: { id, formId } })
    );
    await Promise.all(updates);
    return FormField.findAll({
      where: { formId },
      order: [['sortOrder', 'ASC']],
    });
  }

  // ── Submissions ───────────────────────────────────────────────

  async submitForm(formId, data, userId, ipAddress) {
    const submission = await FormSubmission.create({
      formId,
      userId: userId || null,
      submitterName: data.submitterName || null,
      submitterEmail: data.submitterEmail || null,
      ipAddress,
    });

    if (data.answers && Array.isArray(data.answers)) {
      const answers = data.answers.map(a => ({
        submissionId: submission.id,
        fieldId: a.fieldId,
        value: a.value != null ? String(a.value) : null,
      }));
      await FormAnswer.bulkCreate(answers);
    }

    // Send email notification if enabled
    try {
      const form = await Form.findByPk(formId);
      if (form && form.notifyOnSubmission) {
        const creator = await db.user.findByPk(form.createdBy, { attributes: ['email', 'firstName'] });
        if (creator && creator.email) {
          const submitterLabel = data.submitterName || (userId ? 'Ein Chormitglied' : 'Anonym');
          const count = await FormSubmission.count({ where: { formId } });
          await sendMail({
            to: creator.email,
            subject: `Neue Abgabe: ${form.title}`,
            html: `
              <p>Hallo ${creator.firstName || ''},</p>
              <p><strong>${submitterLabel}</strong> hat das Formular <strong>„${form.title}"</strong> ausgefüllt.</p>
              <p>Das sind jetzt insgesamt <strong>${count} Abgabe${count !== 1 ? 'n' : ''}</strong>.</p>
              <p>Ergebnisse anzeigen: <a href="${process.env.FRONTEND_URL || 'https://nak-chorleiter.de'}/forms/${formId}/results">Zum Ergebnis</a></p>
            `,
            text: `Hallo ${creator.firstName || ''}, ${submitterLabel} hat das Formular „${form.title}" ausgefüllt. Insgesamt ${count} Abgabe(n).`,
          });
        }
      }
    } catch (err) {
      logger.error(`Fehler beim Senden der Formular-Benachrichtigung: ${err.message}`);
    }

    return this.getSubmissionById(submission.id);
  }

  async getSubmissions(formId) {
    return FormSubmission.findAll({
      where: { formId },
      include: [
        {
          model: FormAnswer,
          as: 'answers',
          include: [{ model: FormField, as: 'field', attributes: ['id', 'label', 'type'] }],
        },
        { model: db.user, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getSubmissionById(id) {
    return FormSubmission.findByPk(id, {
      include: [
        {
          model: FormAnswer,
          as: 'answers',
          include: [{ model: FormField, as: 'field', attributes: ['id', 'label', 'type'] }],
        },
        { model: db.user, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });
  }

  async deleteSubmission(id) {
    return FormSubmission.destroy({ where: { id } });
  }

  async getSubmissionCount(formId) {
    return FormSubmission.count({ where: { formId } });
  }

  /**
   * Check if user has already submitted this form.
   */
  async hasUserSubmitted(formId, userId) {
    if (!userId) return false;
    const count = await FormSubmission.count({ where: { formId, userId } });
    return count > 0;
  }

  // ── Export ────────────────────────────────────────────────────

  async getExportData(formId) {
    const form = await this.getFormById(formId);
    if (!form) return null;

    const submissions = await this.getSubmissions(formId);
    const fields = form.fields || [];

    // Build CSV rows
    const headers = [
      'Eingereicht am',
      'Name',
      'E-Mail',
      ...fields.map(f => f.label),
    ];

    const rows = submissions.map(sub => {
      const answerMap = {};
      (sub.answers || []).forEach(a => {
        answerMap[a.fieldId] = a.value;
      });

      return [
        sub.createdAt ? new Date(sub.createdAt).toLocaleString('de-DE') : '',
        sub.submitter
          ? `${sub.submitter.firstName || ''} ${sub.submitter.lastName || ''}`.trim()
          : sub.submitterName || 'Anonym',
        sub.submitterEmail || '',
        ...fields.map(f => answerMap[f.id] || ''),
      ];
    });

    return { headers, rows, form };
  }
}

module.exports = new FormService();
