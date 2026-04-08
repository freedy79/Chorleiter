// Hardcoded fallback templates used when no DB template is found
const DEFAULT_TEMPLATES = {
  'invite': {
    subject: 'Invitation to join {{choir}}',
    body: '<p>You have been invited to join <b>{{choir}}</b>.<br>Click <a href="{{link}}">here</a> to complete your registration. This link is valid until {{expiry}}.</p>'
  },
  'reset': {
    subject: 'Password Reset',
    body: '<p>Click <a href="{{link}}">here</a> to set a new password.</p>'
  },
  'availability-request': {
    subject: 'Verfügbarkeitsanfrage {{month}}/{{year}}',
    body: '<p>Bitte teile uns deine Verfügbarkeit für {{month}}/{{year}} mit.</p>{{list}}<p><a href="{{link}}">Verfügbarkeit eintragen</a></p>'
  },
  'piece-change': {
    subject: 'Neuer Änderungsvorschlag zu {{piece}}',
    body: '<p>{{proposer}} hat eine Änderung zu <b>{{piece}}</b> vorgeschlagen.</p><p><a href="{{link}}">Änderung ansehen</a></p>'
  },
  'monthly-plan': {
    subject: 'Dienstplan {{month}}/{{year}}',
    body: '<p>Im Anhang befindet sich der aktuelle Dienstplan.</p><p><a href="{{link}}">Dienstplan online ansehen</a></p>'
  },
  'email-change': {
    subject: 'Bestätige deine neue E-Mail-Adresse',
    body: '<p>Hallo {{first_name}} {{surname}},</p><p>bitte bestätige deine neue E-Mail-Adresse über <a href="{{link}}">diesen Link</a>.</p><p>Der Link ist bis {{expiry}} gültig.</p>'
  },
  'lending-borrowed': {
    subject: 'Ausleihe: {{title}} (Nr. {{copyNumber}})',
    body: '<p>Hallo {{first_name}} {{surname}},</p><p>dir wurde am {{borrowedAt}} {{title}} (Nr. {{copyNumber}}) ausgeliehen.</p>'
  },
  'lending-returned': {
    subject: 'Rückgabe bestätigt: {{title}} (Nr. {{copyNumber}})',
    body: '<p>Hallo {{first_name}} {{surname}},</p><p>die Rückgabe von {{title}} (Nr. {{copyNumber}}) wurde am {{returnedAt}} erfasst.</p>'
  },
  'poll-reminder': {
    subject: 'Erinnerung: Abstimmung zu "{{post_title}}"',
    body: '<p>Hallo {{first_name}} {{surname}},</p><p>für den Beitrag <b>{{post_title}}</b> liegt noch keine Abstimmung von dir vor.</p><p>{{poll_text}}</p><p>Bitte klicke auf eine der folgenden Optionen:</p>{{option_links}}<p>Viele Grüße<br>{{choir}}</p>'
  },
  'mail-footer': {
    subject: '(Footer)',
    body: '<p>Du erhältst diese Mail, weil du im Chor <strong>{{choir}}</strong> angemeldet bist. ' +
          'Wenn du kein Interesse mehr am Chor hast und dich austragen möchtest, kannst du das ' +
          '<a href="{{leave_link}}">hier</a> tun.</p>'
  },
  'chat-unread': {
    subject: 'Ungelesene Nachrichten in {{room_title}} – {{choir}}',
    body: '<p>Hallo {{first_name}} {{surname}},</p>' +
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
};

function replacePlaceholders(text, type, replacements) {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    const anchor = key.toLowerCase().includes('link')
      ? `<a href="${value}">${value}</a>`
      : value;
    result = result.split(`{{${key}}}`).join(value);
    result = result.split(`{{${key}-html}}`).join(anchor);
    if (type) {
      result = result.split(`{{${type}-${key}}}`).join(value);
      result = result.split(`{{${type}-${key}-html}}`).join(anchor);
    }
  }
  return result;
}

function buildTemplate(template, type, replacements) {
  const fallback = DEFAULT_TEMPLATES[type];
  const subjectTemplate = template?.subject || fallback?.subject || '';
  const bodyTemplate = template?.body || fallback?.body || '';
  const subject = replacePlaceholders(subjectTemplate, type, replacements);
  const html = replacePlaceholders(bodyTemplate, type, replacements);
  const text = html.replace(/<[^>]+>/g, ' ');
  return { subject, html, text };
}

module.exports = { replacePlaceholders, buildTemplate };
