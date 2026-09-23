const db = require('../models');
const logger = require('../config/logger');

const DEFAULT_SUBJECT = 'API-Token "{{label}}" läuft in {{days_left}} Tagen ab – {{choir}}';
const DEFAULT_BODY =
  '<p>Hallo {{first_name}} {{surname}},</p>' +
  '<p>der API-Token <b>{{label}}</b> ({{token_prefix}}…) für den Chor <b>{{choir}}</b> ' +
  'läuft am <b>{{expires_at}}</b> ab – das ist in {{days_left}} Tagen.</p>' +
  '<p>Danach kann der verbundene Dienst (z.B. ChatGPT) keine Chordaten mehr abrufen. ' +
  'Du kannst den Token in der Chorverwaltung verlängern, ohne ihn neu einrichten zu müssen.</p>' +
  '<p style="margin:24px 0;">' +
  '<a href="{{link}}" style="background-color:#1976d2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Token verlängern</a>' +
  '</p>' +
  '<p>Wenn du den Token nicht mehr brauchst, kannst du ihn dort auch widerrufen.</p>' +
  '<p>Viele Grüße<br>{{choir}}</p>';

async function ensureApiTokenExpiryTemplate() {
  try {
    const [, created] = await db.mail_template.findOrCreate({
      where: { type: 'api-token-expiry' },
      defaults: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: api-token-expiry');
    } else {
      logger.debug('[Migration] Mail template api-token-expiry already exists.');
    }
  } catch (err) {
    logger.error(`[Migration] Failed to ensure api-token-expiry template: ${err.message}`);
  }
}

module.exports = { ensureApiTokenExpiryTemplate, DEFAULT_SUBJECT, DEFAULT_BODY };
