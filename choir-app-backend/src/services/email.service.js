const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.sendInvitationMail = async (to, token, choirName, expiry) => {
  const linkBase = process.env.FRONTEND_URL || 'http://localhost:4200';
  const link = `${linkBase}/register/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: `Invitation to join ${choirName}`,
    html: `<p>You have been invited to join <b>${choirName}</b>.<br>Click <a href="${link}">here</a> to complete your registration. This link is valid until ${expiry.toLocaleString()}.</p>`
  });
};
