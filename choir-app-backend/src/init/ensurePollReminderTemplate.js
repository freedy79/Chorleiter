const db = require('../models');
const logger = require('../config/logger');

async function ensurePollReminderTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'poll-reminder' },
      defaults: {
        subject: 'Erinnerung: Abstimmung zu "{{post_title}}"',
        body: '<p>Hallo {{first_name}} {{surname}},</p><p>für den Beitrag <b>{{post_title}}</b> liegt noch keine Abstimmung von dir vor.</p><p>{{poll_text}}</p><p>Bitte klicke auf eine der folgenden Optionen:</p>{{option_links}}<p>Viele Grüße<br>{{choir}}</p>'
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: poll-reminder');
    } else {
      logger.debug('[Migration] Mail template poll-reminder already exists.');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring poll-reminder template:', err);
    throw err;
  }
}

module.exports = { ensurePollReminderTemplate };
