const nodemailer = require('nodemailer');

function emailDisabled() {
  return process.env.DISABLE_EMAIL === 'true';
}

async function createTransporter(existingSettings) {
  const settings = existingSettings || await require('../models').mail_setting.findByPk(1);
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

async function sendMail(options, overrideSettings) {
  if (emailDisabled()) return;
  const settings = overrideSettings || await require('../models').mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  return transporter.sendMail({ from: getFromAddress(settings), ...options });
}

module.exports = { emailDisabled, createTransporter, getFromAddress, sendMail };
