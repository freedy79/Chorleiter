const db = require("../models");
const logger = require("../config/logger");

// Models that are allowed in backup/restore, in dependency order
const ALLOWED_MODELS = [
  'choir',
  'user',
  'composer',
  'author',
  'publisher',
  'category',
  'piece',
  'event',
  'collection',
  'monthly_plan',
  'plan_rule',
  'plan_entry',
  'user_choir',
  'choir_repertoire',
  'collection_piece',
  'event_pieces',
  'piece_arranger',
  'piece_composer',
  'piece_link',
  'piece_change',
  'piece_note',
  'repertoire_filter',
  'post',
  'poll',
  'poll_option',
  'poll_vote',
  'post_comment',
  'post_reaction',
  'library_item',
  'lending',
  'loan_request',
  'loan_request_item',
  'program',
  'program_element',
  'program_item',
  'donation',
  'district',
  'congregation',
  'user_availability',
  'login_attempt',
  'mail_setting',
  'mail_template',
  'mail_log',
  'system_setting',
  'choir_log',
  'search_history',
  'physical_copy',
  'digital_license',
];

function getModelAttributes(model) {
  return new Set(Object.keys(model.rawAttributes));
}

function sanitizeRecords(records, model) {
  const allowed = getModelAttributes(model);
  return records.map(record => {
    const clean = {};
    for (const key of Object.keys(record)) {
      if (allowed.has(key)) {
        clean[key] = record[key];
      }
    }
    return clean;
  });
}

async function createInMemoryBackup() {
  const backup = {};
  for (const name of ALLOWED_MODELS) {
    const model = db[name];
    if (model && typeof model.findAll === 'function') {
      backup[name] = await model.findAll({ raw: true });
    }
  }
  return backup;
}

exports.exportData = async (req, res) => {
  try {
    const backup = await createInMemoryBackup();
    const json = JSON.stringify(backup, null, 2);
    res.setHeader('Content-Disposition', 'attachment; filename="backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.importData = async (req, res) => {
  if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

  let data;
  try {
    data = JSON.parse(req.file.buffer.toString());
  } catch {
    return res.status(400).send({ message: 'Invalid JSON file.' });
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return res.status(400).send({ message: 'Backup must be a JSON object.' });
  }

  // Reject unknown model names
  const unknownKeys = Object.keys(data).filter(k => !ALLOWED_MODELS.includes(k));
  if (unknownKeys.length > 0) {
    return res.status(400).send({ message: `Unknown tables in backup: ${unknownKeys.join(', ')}` });
  }

  // Validate each entry is an array of objects
  for (const key of Object.keys(data)) {
    if (!Array.isArray(data[key])) {
      return res.status(400).send({ message: `Table "${key}" must be an array.` });
    }
    if (data[key].some(r => typeof r !== 'object' || r === null || Array.isArray(r))) {
      return res.status(400).send({ message: `Table "${key}" contains invalid records.` });
    }
  }

  // Create safety backup before restoring
  let safetyBackup;
  try {
    safetyBackup = await createInMemoryBackup();
    logger.info('Safety backup created before restore.');
  } catch (err) {
    logger.error('Failed to create safety backup:', err);
    return res.status(500).send({ message: 'Failed to create safety backup before restore.' });
  }

  const transaction = await db.sequelize.transaction();
  try {
    // Truncate tables in reverse order to respect foreign key constraints
    for (const name of [...ALLOWED_MODELS].reverse()) {
      const model = db[name];
      if (model && typeof model.destroy === 'function') {
        await model.destroy({ where: {}, truncate: true, cascade: true, transaction });
      }
    }

    // Insert sanitized data in dependency order
    for (const name of ALLOWED_MODELS) {
      if (data[name] && data[name].length > 0 && db[name]) {
        const sanitized = sanitizeRecords(data[name], db[name]);
        await db[name].bulkCreate(sanitized, { transaction, validate: true });
      }
    }

    await transaction.commit();
    logger.info('Database restored from backup successfully.');
    res.status(200).send({ message: 'Database restored.' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Restore failed, rolled back:', err);

    // Attempt to restore safety backup
    try {
      const recoveryTx = await db.sequelize.transaction();
      for (const name of [...ALLOWED_MODELS].reverse()) {
        const model = db[name];
        if (model && typeof model.destroy === 'function') {
          await model.destroy({ where: {}, truncate: true, cascade: true, transaction: recoveryTx });
        }
      }
      for (const name of ALLOWED_MODELS) {
        if (safetyBackup[name] && safetyBackup[name].length > 0 && db[name]) {
          await db[name].bulkCreate(safetyBackup[name], { transaction: recoveryTx });
        }
      }
      await recoveryTx.commit();
      logger.info('Safety backup restored after failed import.');
    } catch (recoveryErr) {
      logger.error('CRITICAL: Safety backup restore also failed:', recoveryErr);
    }

    res.status(500).send({ message: `Restore failed: ${err.message}. Previous data has been restored.` });
  }
};
