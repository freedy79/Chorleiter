const db = require('../models');
const logger = require('../config/logger');

async function ensureMailFooterTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'mail-footer' },
      defaults: {
        subject: '(Footer)',
        body: '<p>Du erhältst diese Mail, weil du im Chor <strong>{{choir}}</strong> angemeldet bist. Wenn du kein Interesse mehr am Chor hast und dich austragen möchtest, kannst du das <a href="{{leave_link}}">hier</a> tun.</p>'
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: mail-footer');
    } else {
      logger.debug('[Migration] Mail template mail-footer already exists.');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring mail-footer template:', err);
    throw err;
  }
}

module.exports = { ensureMailFooterTemplate };
