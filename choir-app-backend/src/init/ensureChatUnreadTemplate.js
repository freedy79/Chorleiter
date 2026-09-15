const db = require('../models');
const logger = require('../config/logger');

const OLD_AUTHOR_SNIPPET = '<p>Letzte Nachricht von <b>{{last_author}}</b>:</p>';
const NEW_AUTHOR_SNIPPET = '<p>Letzte Nachricht von <b>{{last_author}}</b> am <b>{{last_message_date}}</b>:</p>';

const DEFAULT_BODY =
  '<p>Hallo {{first_name}} {{surname}},</p>' +
  '<p>im Chatraum <b>{{room_title}}</b> des Chors <b>{{choir}}</b> ' +
  'gibt es <b>{{unread_count}}</b> ungelesene Nachricht(en), ' +
  'die seit {{oldest_unread_date}} auf dich warten.</p>' +
  NEW_AUTHOR_SNIPPET +
  '<blockquote style="border-left:3px solid #ccc;padding:4px 12px;color:#555;">{{last_message_preview}}</blockquote>' +
  '<p style="margin:24px 0;">' +
  '<a href="{{link}}" style="background-color:#1976d2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Zum Chat</a>' +
  '</p>' +
  '<p>Viele Grüße<br>{{choir}}</p>';

async function ensureChatUnreadTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'chat-unread' },
      defaults: {
        subject: 'Ungelesene Nachrichten in {{room_title}} – {{choir}}',
        body: DEFAULT_BODY
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: chat-unread');
      return template;
    }

    logger.debug('[Migration] Mail template chat-unread already exists.');

    // Safe upgrade: add {{last_message_date}} if the template still uses the old
    // author line (i.e. it has not been manually customized away from the default).
    if (template.body && template.body.includes(OLD_AUTHOR_SNIPPET)) {
      await template.update({
        body: template.body.replace(OLD_AUTHOR_SNIPPET, NEW_AUTHOR_SNIPPET)
      });
      logger.info('[Migration] Updated mail template chat-unread: added {{last_message_date}}');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring chat-unread template:', err);
    throw err;
  }
}

module.exports = { ensureChatUnreadTemplate };
