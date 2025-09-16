const db = require('../models');
const logger = require('../config/logger');
const { getFrontendUrl } = require('../utils/frontend-url');
const { buildTemplate } = require('./emailTemplateManager');
const { sendMail, emailDisabled } = require('./emailTransporter');
const { marked } = require('marked');

const TIME_ZONE = process.env.TZ || 'Europe/Berlin';

function formatDate(date = new Date()) {
  return date.toLocaleString('de-DE', { timeZone: TIME_ZONE });
}

async function sendTemplateMail(type, to, replacements = {}, overrideSettings) {
  if (emailDisabled()) return;
  const template = await db.mail_template.findOne({ where: { type } });

  // merge defaults first to avoid undefined values overriding fallbacks
  const final = { date: formatDate(), ...replacements };

  // prefer provided names and fall back to the email prefix
  if (!final.surname) {
    final.surname = final.name || to.split('@')[0];
  }
  if (!final.first_name) {
    final.first_name = final.firstName || to.split('@')[0];
  }

  const { subject, html, text } = buildTemplate(template, type, final);
  await sendMail({ to, subject, html, text }, overrideSettings);
}

async function buildPostEmail(text, choirName) {
  const linkBase = await getFrontendUrl();
  const ids = Array.from(new Set(Array.from(text.matchAll(/\{\{(\d+)\}\}/g)).map(m => +m[1])));
  let replaced = text;
  if (ids.length) {
    const pieces = await db.piece.findAll({ where: { id: ids } });
    const titles = new Map(pieces.map(p => [p.id, p.title]));
    replaced = text.replace(/\{\{(\d+)\}\}/g, (match, id) => {
      const title = titles.get(+id);
      return title ? `[${title}](${linkBase}/pieces/${id})` : match;
    });
  }
  const body = marked.parse(replaced);
  const signatureHtml = `<p>--<br>${choirName}<br><a href="https://nak-chorleiter.de">nak-chorleiter.de</a></p>`;
  const html = `${body}${signatureHtml}`;
  const textSignature = `\n\n--\n${choirName}\nhttps://nak-chorleiter.de`;
  const plainText = `${replaced}${textSignature}`;
  return { html, text: plainText };
}

exports.buildPostEmail = buildPostEmail;

exports.sendInvitationMail = async (to, token, choirName, expiry, surname, invitorName, firstName) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/register/${token}`;
  try {
    await sendTemplateMail('invite', to, {
      choir: choirName,
      choirname: choirName,
      invitor: invitorName,
      link,
      expiry: formatDate(expiry),
      surname,
      first_name: firstName
    });
  } catch (err) {
    logger.error(`Error sending invitation mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPasswordResetMail = async (to, token, surname, firstName) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/reset-password/${token}`;
  try {
    await sendTemplateMail('reset', to, { link, surname, first_name: firstName });
  } catch (err) {
    logger.error(`Error sending password reset mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendEmailChangeMail = async (to, token, surname, firstName) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/confirm-email/${token}`;
  const expiry = formatDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
  try {
    await sendTemplateMail('email-change', to, { link, expiry, surname, first_name: firstName });
  } catch (err) {
    logger.error(`Error sending email change mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendTestMail = async (to, override, surname, firstName) => {
  try {
    const fallback = to.split('@')[0];
    const replacements = {
      surname: surname || fallback,
      first_name: firstName || surname || fallback,
      date: formatDate()
    };
    const { html, text } = buildTemplate({ body: '<p>Dies ist eine Testmail.</p>' }, 'test', replacements);
    await sendMail({ to, subject: 'Testmail', html, text }, override);
  } catch (err) {
    logger.error(`Error sending test mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendTemplatePreviewMail = async (to, type, surname, firstName) => {
  try {
    const placeholders = {
      choir: 'Beispielchor',
      choirname: 'Beispielchor',
      invitor: 'Max Mustermann',
      link: 'https://nak-chorleiter.de',
      expiry: formatDate(new Date(Date.now() + 86400000)),
      surname,
      first_name: firstName
    };
    await sendTemplateMail(type, to, placeholders);
  } catch (err) {
    logger.error(`Error sending template preview mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendMonthlyPlanMail = async (recipients, pdfBuffer, year, month, choir) => {
  if (emailDisabled()) return;
  const template = await db.mail_template.findOne({ where: { type: 'monthly-plan' } });
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/dienstplan?year=${year}&month=${month}`;
  try {
    const defaults = {
      month: String(month),
      year: String(year),
      choir: choir || '',
      choirname: choir || '',
      link
    };
    const subjectTemplate = template?.subject || 'Dienstplan {{month}}/{{year}}';
    const bodyTemplate = template?.body ||
      '<p>Im Anhang befindet sich der aktuelle Dienstplan.</p>' +
      '<p><a href="{{link}}">Dienstplan online ansehen</a></p>';
    const { subject, html, text } = buildTemplate({ subject: subjectTemplate, body: bodyTemplate }, 'monthly-plan', defaults);
    await sendMail({
      to: recipients,
      subject,
      text,
      html,
      attachments: [{ filename: `dienstplan-${year}-${month}.pdf`, content: pdfBuffer }]
    });
  } catch (err) {
    logger.error(`Error sending monthly plan mail: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

function statusText(status) {
  switch (status) {
    case 'AVAILABLE': return 'verfügbar';
    case 'MAYBE': return 'nach Absprache';
    case 'UNAVAILABLE': return 'nicht verfügbar';
    default: return status;
  }
}

exports.sendAvailabilityRequestMail = async (to, surname, firstName, year, month, dates) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/dienstplan?year=${year}&month=${month}&tab=avail`;
  try {
    const list = '<ul>' + dates.map(d => `<li>${d.date}: ${statusText(d.status)}</li>`).join('') + '</ul>';
    await sendTemplateMail('availability-request', to, {
      month: String(month),
      year: String(year),
      list,
      link,
      surname,
      first_name: firstName
    });
  } catch (err) {
    logger.error(`Error sending availability request mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPieceChangeProposalMail = async (to, piece, proposer, link) => {
  try {
    await sendTemplateMail('piece-change', to, { piece, proposer, link });
  } catch (err) {
    logger.error(`Error sending piece change mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPostNotificationMail = async (recipients, title, text, choirName, replyTo) => {
  if (emailDisabled() || !Array.isArray(recipients) || recipients.length === 0) return;
  try {
    const { html, text: plainText } = await buildPostEmail(text, choirName);
    const options = { to: recipients, subject: title, text: plainText, html };
    if (replyTo) options.replyTo = replyTo;
    await sendMail(options);
  } catch (err) {
    logger.error(`Error sending post mail: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPieceReportMail = async (recipients, piece, reporter, category, reason, link) => {
  if (emailDisabled() || !Array.isArray(recipients) || recipients.length === 0) return;
  try {
    const subject = `Meldung zu Stück: ${piece}`;
    const text = `${reporter} hat das Stück "${piece}" gemeldet.\nKategorie: ${category}\nBegründung: ${reason}\n${link}`;
    const html = `<p>${reporter} hat das Stück "${piece}" gemeldet.</p>` +
      `<p><strong>Kategorie:</strong> ${category}</p>` +
      `<p><strong>Begründung:</strong><br>${reason.replace(/\n/g, '<br>')}</p>` +
      `<p><a href="${link}">Stück ansehen</a></p>`;
    await sendMail({ to: recipients, subject, text, html });
  } catch (err) {
    logger.error(`Error sending piece report mail: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendNewMemberNotification = async (choirId, member) => {
  if (emailDisabled()) return;
  try {
    const associations = await db.user_choir.findAll({
      where: { choirId },
      include: [
        { model: db.user, attributes: ['email'] },
        { model: db.choir, attributes: ['name'] }
      ]
    });
    const choirName = associations[0]?.choir?.name;
    const recipients = associations
      .filter(a => Array.isArray(a.rolesInChoir) && (a.rolesInChoir.includes('choir_admin') || a.rolesInChoir.includes('director')))
      .map(a => a.user?.email)
      .filter(Boolean);
    if (!choirName || recipients.length === 0) return;
    const fullName = [member.firstName, member.name].filter(Boolean).join(' ');
    const subject = `Neues Mitglied im Chor ${choirName}`;
    const text = `${fullName} (${member.email}) ist dem Chor ${choirName} beigetreten.`;
    const html = `<p>${fullName} (${member.email}) ist dem Chor ${choirName} beigetreten.</p>`;
    await sendMail({ to: recipients, subject, text, html });
  } catch (err) {
    logger.error(`Error sending new member notification mail: ${err.message}`);
    logger.error(err.stack);
  }
};

exports.sendCrashReportMail = async (to, error) => {
  if (emailDisabled() || !to) return;
  try {
    const subject = 'Backend crashed';
    const message = error instanceof Error ? `${error.message}\n\n${error.stack}` : String(error);
    await sendMail({ to, subject, text: message, html: `<pre>${message}</pre>` });
  } catch (err) {
    logger.error(`Error sending crash report mail to ${to}: ${err.message}`);
    logger.error(err.stack);
  }
};

exports.notifyAdminsOnCrash = async (error, req) => {
  try {
    if (emailDisabled() || (!process.env.SMTP_HOST && !process.env.SMTP_USER)) return;
    const users = await db.user.findAll();
    const recipients = new Set();
    users.forEach(u => {
      if (Array.isArray(u.roles) && u.roles.includes('admin') && u.email) {
        recipients.add(u.email);
      }
    });
    const systemEmail = await db.system_setting.findByPk('SYSTEM_ADMIN_EMAIL');
    if (systemEmail?.value) {
      recipients.add(systemEmail.value);
    }
    if (recipients.size === 0) return;

    const details = [
      `Time: ${new Date().toISOString()}`,
      `Error: ${error.message || error}`
    ];
    if (req) {
      details.push(`Request: ${req.method} ${req.originalUrl}`);
      if (req.userId) details.push(`User: ${req.userId}`);
      if (req.body && Object.keys(req.body).length > 0) {
        details.push(`Body: ${JSON.stringify(req.body)}`);
      }
    }
    if (error?.stack) {
      details.push('Stack:', error.stack);
    }
    const message = details.join('\n');

    await Promise.all([...recipients].map(to => exports.sendCrashReportMail(to, message)));
  } catch (err) {
    logger.error(`Error notifying admins of crash: ${err.message}`);
    logger.error(err.stack);
  }
};
