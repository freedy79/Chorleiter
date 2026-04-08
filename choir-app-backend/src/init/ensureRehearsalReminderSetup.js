const db = require('../models');
const logger = require('../config/logger');

async function ensureReminderLogTable() {
  try {
    // Create the reminder_log table if it doesn't exist
    await db.reminder_log.sync();
    logger.info('[Migration] reminder_log table ensured.');
  } catch (err) {
    logger.error('[Migration] Error ensuring reminder_log table:', err);
    throw err;
  }
}

async function ensureRehearsalReminderTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'rehearsal-reminder' },
      defaults: {
        subject: 'Erinnerung: {{event_type}} am {{event_date}} – {{choir}}',
        body: '<p>Hallo {{first_name}} {{surname}},</p>' +
              '<p>dies ist eine Erinnerung an die bevorstehende <b>{{event_type}}</b> am <b>{{event_date}}</b> im Chor <b>{{choir}}</b>.</p>' +
              '<p>{{event_notes}}</p>' +
              '<p>Viele Grüße<br>{{choir}}</p>'
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: rehearsal-reminder');
    } else {
      logger.debug('[Migration] Mail template rehearsal-reminder already exists.');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring rehearsal-reminder template:', err);
    throw err;
  }
}

async function ensureRehearsalReminderSetup() {
  await ensureReminderLogTable();
  await ensureRehearsalReminderTemplate();
}

module.exports = { ensureRehearsalReminderSetup };
