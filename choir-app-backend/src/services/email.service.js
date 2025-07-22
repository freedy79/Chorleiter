const nodemailer = require('nodemailer');

const db = require('../models');
const logger = require('../config/logger');
const { getFrontendUrl } = require('../utils/frontend-url');

function emailDisabled() {
  return process.env.DISABLE_EMAIL === 'true';
}

async function createTransporter(existingSettings) {
  const settings = existingSettings || await db.mail_setting.findByPk(1);
  return nodemailer.createTransport({
    host: settings?.host || process.env.SMTP_HOST,
    port: settings?.port || process.env.SMTP_PORT || 587,
    secure: settings?.secure || false,
    requireTLS: settings?.starttls || process.env.SMTP_STARTTLS === 'true' || false,
    auth: {
      user: settings?.user || process.env.SMTP_USER,
      pass: settings?.pass || process.env.SMTP_PASS
    }
  });
}

function getFromAddress(settings) {
  const address = settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de';
  return { name: address, address };
}

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

async function sendTemplateMail(type, to, replacements = {}, overrideSettings) {
  if (emailDisabled()) return;
  const settings = overrideSettings || await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type } });
  const transporter = await createTransporter(settings);
  const name = replacements.surname || replacements.name || to.split('@')[0];
  const final = { surname: name, date: new Date().toLocaleString('de-DE'), ...replacements };
  const subjectTemplate = template?.subject || '';
  const bodyTemplate = template?.body || '';
  const subject = replacePlaceholders(subjectTemplate, type, final);
  const body = replacePlaceholders(bodyTemplate, type, final);
  const text = body.replace(/<[^>]+>/g, ' ');
  await transporter.sendMail({
    from: getFromAddress(settings),
    to,
    subject,
    text,
    html: body
  });
}

exports.sendInvitationMail = async (to, token, choirName, expiry, name, invitorName) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/register/${token}`;
  try {
    await sendTemplateMail('invite', to, {
      choir: choirName,
      choirname: choirName,
      invitor: invitorName,
      link,
      expiry: expiry.toLocaleString('de-DE'),
      surname: name
    });
  } catch (err) {
    logger.error(`Error sending invitation mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPasswordResetMail = async (to, token, name) => {
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/reset-password/${token}`;
  try {
    await sendTemplateMail('reset', to, { link, surname: name });
  } catch (err) {
    logger.error(`Error sending password reset mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendTestMail = async (to, override, name) => {
  const settings = override || await db.mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  try {
    const userName = name || to.split('@')[0];
    const placeholders = {
      surname: userName,
      date: new Date().toLocaleString('de-DE')
    };
    const body = replacePlaceholders('<p>Dies ist eine Testmail.</p>', 'test', placeholders);
    await transporter.sendMail({
      from: getFromAddress(settings),
      to,
      subject: 'Testmail',
      html: body
    });
  } catch (err) {
    logger.error(`Error sending test mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendTemplatePreviewMail = async (to, type, name) => {
  try {
    const placeholders = {
      choir: 'Beispielchor',
      choirname: 'Beispielchor',
      invitor: 'Max Mustermann',
      link: 'https://nak-chorleiter.de',
      expiry: new Date(Date.now() + 86400000).toLocaleString('de-DE'),
      surname: name
    };
    await sendTemplateMail(type, to, placeholders);
  } catch (err) {
    logger.error(`Error sending template preview mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendMonthlyPlanMail = async (recipients, pdfBuffer, year, month) => {
  const settings = await db.mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  const linkBase = process.env.FRONTEND_URL || 'https://nak-chorleiter.de';
  const link = `${linkBase}/dienstplan?year=${year}&month=${month}`;
  try {
    await transporter.sendMail({
      from: getFromAddress(settings),
      to: recipients,
      subject: `Dienstplan ${month}/${year}`,
      text: `Im Anhang befindet sich der aktuelle Dienstplan. ${link}`,
      html: `<p>Im Anhang befindet sich der aktuelle Dienstplan.<br>` +
            `<a href="${link}">Dienstplan online ansehen</a></p>`,
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

exports.sendAvailabilityRequestMail = async (to, name, year, month, dates) => {
  const settings = await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type: 'availability-request' } });
  const transporter = await createTransporter(settings);
  const linkBase = await getFrontendUrl();
  const link = `${linkBase}/dienstplan?year=${year}&month=${month}&tab=avail`;
  try {
    const list = '<ul>' + dates.map(d => `<li>${d.date}: ${statusText(d.status)}</li>`).join('') + '</ul>';
    await sendTemplateMail('availability-request', to, {
      month: String(month),
      year: String(year),
      list,
      link,
      surname: name
    });
  } catch (err) {
    logger.error(`Error sending availability request mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPieceChangeProposalMail = async (to, piece, proposer, link) => {
  if (emailDisabled()) return;
  try {
    await sendTemplateMail('piece-change', to, { piece, proposer, link });
  } catch (err) {
    logger.error(`Error sending piece change mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};
