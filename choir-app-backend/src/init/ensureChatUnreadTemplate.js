const db = require('../models');
const logger = require('../config/logger');

async function ensureChatUnreadTemplate() {
  try {
    const [template, created] = await db.mail_template.findOrCreate({
      where: { type: 'chat-unread' },
      defaults: {
        subject: 'Ungelesene Nachrichten in {{room_title}} – {{choir}}',
        body:
          '<p>Hallo {{first_name}} {{surname}},</p>' +
          '<p>im Chatraum <b>{{room_title}}</b> des Chors <b>{{choir}}</b> ' +
          'gibt es <b>{{unread_count}}</b> ungelesene Nachricht(en), ' +
          'die seit {{oldest_unread_date}} auf dich warten.</p>' +
          '<p>Letzte Nachricht von <b>{{last_author}}</b>:</p>' +
          '<blockquote style="border-left:3px solid #ccc;padding:4px 12px;color:#555;">{{last_message_preview}}</blockquote>' +
          '<p style="margin:24px 0;">' +
          '<a href="{{link}}" style="background-color:#1976d2;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Zum Chat</a>' +
          '</p>' +
          '<p>Viele Grüße<br>{{choir}}</p>'
      }
    });

    if (created) {
      logger.info('[Migration] Added default mail template: chat-unread');
    } else {
      logger.debug('[Migration] Mail template chat-unread already exists.');
    }

    return template;
  } catch (err) {
    logger.error('[Migration] Error ensuring chat-unread template:', err);
    throw err;
  }
}

module.exports = { ensureChatUnreadTemplate };
