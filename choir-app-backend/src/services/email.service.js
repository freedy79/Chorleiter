const nodemailer = require('nodemailer');

const db = require('../models');
const logger = require('../config/logger');

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

function replacePlaceholders(text, replacements) {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

exports.sendInvitationMail = async (to, token, choirName, expiry, name, invitorName) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/register/${token}`;
  const settings = await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type: 'invite' } });
  const transporter = await createTransporter(settings);
  try {

    const userName = name || to.split('@')[0];
  const placeholders = {
    choir: choirName,
    choirname: choirName,
    invitor: invitorName,
    link: link,
    expiry: expiry.toLocaleString(),
    surname: userName,
    date: new Date().toLocaleString()
  };
  const subjectTemplate = template?.subject || 'Invitation to join {{choir}}';
  const subject = replacePlaceholders(subjectTemplate, placeholders);
  let bodyTemplate = template?.body || `<p>You have been invited to join <b>{{choir}}</b>.<br>Click <a href="{{link}}">here</a> to complete your registration. This link is valid until {{expiry}}.</p>`;
  const body = replacePlaceholders(bodyTemplate, placeholders);

    await transporter.sendMail({
      from: getFromAddress(settings),
      to,
      subject,
      html: body
    });
  } catch (err) {
    logger.error(`Error sending invitation mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};

exports.sendPasswordResetMail = async (to, token, name) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/reset-password/${token}`;
  const settings = await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type: 'reset' } });
  const transporter = await createTransporter(settings);
  try {

    const userName = name || to.split('@')[0];
    const placeholders = {
      link,
      surname: userName,
      date: new Date().toLocaleString()
    };
    const subjectTemplate = template?.subject || 'Password Reset';
    const subject = replacePlaceholders(subjectTemplate, placeholders);
    let bodyTemplate = template?.body || '<p>Click <a href="{{link}}">here</a> to set a new password.</p>';
    const body = replacePlaceholders(bodyTemplate, placeholders);

    await transporter.sendMail({
      from: getFromAddress(settings),
      to,
      subject,
      html: body
    });
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
      date: new Date().toLocaleString()
    };
    const body = replacePlaceholders('<p>Dies ist eine Testmail.</p>', placeholders);
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
