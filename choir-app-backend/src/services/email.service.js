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

exports.sendInvitationMail = async (to, token, choirName, expiry) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/register/${token}`;
  const settings = await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type: 'invite' } });
  const transporter = await createTransporter(settings);
  try {
    const subject = template?.subject.replace('{{choir}}', choirName) || `Invitation to join ${choirName}`;
    let body = template?.body || `<p>You have been invited to join <b>{{choir}}</b>.<br>Click <a href="{{link}}">here</a> to complete your registration. This link is valid until {{expiry}}.</p>`;
    body = body.replace('{{choir}}', choirName).replace('{{link}}', link).replace('{{expiry}}', expiry.toLocaleString());
    await transporter.sendMail({
      from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de',
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

exports.sendPasswordResetMail = async (to, token) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/reset-password/${token}`;
  const settings = await db.mail_setting.findByPk(1);
  const template = await db.mail_template.findOne({ where: { type: 'reset' } });
  const transporter = await createTransporter(settings);
  try {
    const subject = template?.subject || 'Password Reset';
    let body = template?.body || '<p>Click <a href="{{link}}">here</a> to set a new password.</p>';
    body = body.replace('{{link}}', link);
    await transporter.sendMail({
      from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de',
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

exports.sendTestMail = async (to, override) => {
  const settings = override || await db.mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  try {
    await transporter.sendMail({
      from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de',
      to,
      subject: 'Testmail',
      html: '<p>Dies ist eine Testmail.</p>'
    });
  } catch (err) {
    logger.error(`Error sending test mail to ${to}: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
};
