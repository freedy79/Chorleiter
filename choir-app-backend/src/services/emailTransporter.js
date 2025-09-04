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
  const mailOptions = { from: getFromAddress(settings), ...options };

  let recipients = [];
  if (Array.isArray(mailOptions.to)) {
    recipients = mailOptions.to;
  } else if (typeof mailOptions.to === 'string') {
    recipients = mailOptions.to.split(',').map(r => r.trim()).filter(Boolean);
  }

  if (recipients.length > 2) {
    const existingBcc = Array.isArray(mailOptions.bcc)
      ? mailOptions.bcc
      : mailOptions.bcc ? [mailOptions.bcc] : [];
    mailOptions.bcc = [...existingBcc, ...recipients];
    mailOptions.to = 'no-reply@nak-chorleiter.de';
  }

  const result = await transporter.sendMail(mailOptions);

  try {
    const db = require('../models');
    if (db && db.mail_log) {
      await db.mail_log.create({
        recipients: recipients.join(', '),
        subject: mailOptions.subject,
        body: mailOptions.text || mailOptions.html || ''
      }).catch(() => {});
    }
  } catch (err) {
    // Ignore logging errors
  }

  return result;
}

module.exports = { emailDisabled, createTransporter, getFromAddress, sendMail };
