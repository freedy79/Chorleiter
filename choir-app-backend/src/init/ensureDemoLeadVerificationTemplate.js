const db = require('../models');
const logger = require('../config/logger');

async function ensureDemoLeadVerificationTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'demo-lead-verification' },
      defaults: {
        subject: 'NAK Chorleiter ausprobieren – dein Demo-Zugang',
        body: '<p>Hallo {{first_name}},</p><p>vielen Dank für dein Interesse an <strong>NAK Chorleiter</strong>. Hier kannst du dir die Applikation in einem Teilumfang ansehen.</p><p><a href="{{link}}">Demo-Zugang jetzt bestätigen</a></p><p>Fehlt dir etwas? Zögere nicht, uns ein Feedback zu geben – wir freuen uns über jede Rückmeldung.</p><p>Der Link ist bis {{expiry}} gültig.</p>'
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: demo-lead-verification');
    } else {
      logger.debug('[Migration] Mail template demo-lead-verification already exists.');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring demo-lead-verification template:', err);
    throw err;
  }
}

module.exports = { ensureDemoLeadVerificationTemplate };
