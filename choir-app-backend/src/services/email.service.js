const nodemailer = require('nodemailer');

const db = require('../models');

async function createTransporter(existingSettings) {
  const settings = existingSettings || await db.mail_setting.findByPk(1);
  return nodemailer.createTransport({
    host: settings?.host || process.env.SMTP_HOST,
    port: settings?.port || process.env.SMTP_PORT || 587,
    secure: settings?.secure || false,
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
  const transporter = await createTransporter(settings);
  await transporter.sendMail({
    from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: `Invitation to join ${choirName}`,
    html: `<p>You have been invited to join <b>${choirName}</b>.<br>Click <a href="${link}">here</a> to complete your registration. This link is valid until ${expiry.toLocaleString()}.</p>`
  });
};

exports.sendPasswordResetMail = async (to, token) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/reset-password/${token}`;
  const settings = await db.mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  await transporter.sendMail({
    from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: 'Password Reset',
    html: `<p>Click <a href="${link}">here</a> to set a new password.</p>`
  });
};

exports.sendTestMail = async (to) => {
  const settings = await db.mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  await transporter.sendMail({
    from: settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: 'Testmail',
    html: '<p>Dies ist eine Testmail.</p>'
  });
};
