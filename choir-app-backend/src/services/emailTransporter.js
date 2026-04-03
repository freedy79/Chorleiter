const nodemailer = require('nodemailer');
const logger = require('../config/logger');

function emailDisabled() {
  return process.env.DISABLE_EMAIL === 'true';
}

/**
 * Checks if email content is empty or only contains whitespace/HTML tags
 * @param {string} content - The email content (text or html)
 * @returns {boolean} true if empty
 */
function isContentEmpty(content) {
  if (!content) return true;
  const stripped = content.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0;
}

/**
 * Validates if email has valid subject and body content
 * @param {Object} mailOptions - The mail options object
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateEmailContent(mailOptions) {
  const hasSubject = mailOptions.subject && mailOptions.subject.trim().length > 0;
  const hasTextContent = !isContentEmpty(mailOptions.text);
  const hasHtmlContent = !isContentEmpty(mailOptions.html);
  const hasBody = hasTextContent || hasHtmlContent;

  if (!hasSubject && !hasBody) {
    return { valid: false, reason: 'Kein Betreff und kein Bodytext vorhanden' };
  }
  if (!hasSubject) {
    return { valid: false, reason: 'Kein Betreff vorhanden' };
  }
  if (!hasBody) {
    return { valid: false, reason: 'Kein Bodytext vorhanden' };
  }
  return { valid: true };
}

/**
 * Notifies admins about prevented empty email
 * @param {Object} mailOptions - The original mail options
 * @param {string} reason - Why the email was blocked
 * @param {string} callStack - Stack trace of the call
 */
async function notifyAdminsAboutEmptyEmail(mailOptions, reason, callStack) {
  try {
    const db = require('../models');

    // Get all users and filter admins in-memory (works with both MySQL and SQLite)
    const allUsers = await db.user.findAll({
      attributes: ['email', 'roles']
    });

    const admins = allUsers.filter(user =>
      Array.isArray(user.roles) && user.roles.includes('admin')
    );

    if (admins.length === 0) {
      logger.warn('Leere E-Mail verhindert, aber keine Admins zum Benachrichtigen gefunden');
      return;
    }

    const adminEmails = admins.map(a => a.email).filter(Boolean);
    if (adminEmails.length === 0) return;

    // Extract calling location from stack trace
    const stackLines = callStack.split('\n');
    const callerLine = stackLines.find(line =>
      line.includes('.js:') &&
      !line.includes('emailTransporter.js') &&
      !line.includes('node_modules')
    ) || stackLines[2] || 'Unbekannt';

    const subject = '⚠️ Leere E-Mail wurde verhindert';
    const html = `
      <h2>Warnung: Leere E-Mail verhindert</h2>
      <p><strong>Grund:</strong> ${reason}</p>
      <p><strong>Empfänger:</strong> ${mailOptions.to || 'Nicht angegeben'}</p>
      <p><strong>Betreff:</strong> ${mailOptions.subject || '(leer)'}</p>
      <p><strong>Text:</strong> ${mailOptions.text || '(leer)'}</p>
      <p><strong>HTML:</strong> ${mailOptions.html || '(leer)'}</p>
      <hr>
      <p><strong>Auslösende Stelle:</strong></p>
      <pre>${callerLine.trim()}</pre>
      <p><strong>Vollständiger Stack Trace:</strong></p>
      <pre>${callStack}</pre>
    `;
    const text = `
Warnung: Leere E-Mail verhindert

Grund: ${reason}
Empfänger: ${mailOptions.to || 'Nicht angegeben'}
Betreff: ${mailOptions.subject || '(leer)'}
Text: ${mailOptions.text || '(leer)'}
HTML: ${mailOptions.html || '(leer)'}

------ Auslösende Stelle ------
${callerLine.trim()}

------ Vollständiger Stack Trace ------
${callStack}
`;

    // Send directly without validation to avoid recursion
    const settings = await db.mail_setting.findByPk(1);
    const transporter = await createTransporter(settings);
    await transporter.sendMail({
      from: getFromAddress(settings),
      to: adminEmails,
      subject,
      html,
      text
    });

    logger.info(`Admin-Benachrichtigung über leere E-Mail an ${adminEmails.join(', ')} gesendet`);
  } catch (err) {
    logger.error(`Fehler beim Benachrichtigen der Admins über leere E-Mail: ${err.message}`);
  }
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

function getFromAddress(settings, choirName) {
  const address = settings?.fromAddress || process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de';

  let name;
  if (address.includes('@')) {
    const localPart = address.split('@')[0];
    name = localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'NAK Chorleiter';
  } else {
    name = address;
  }

  const emailAddress = address.includes('@') ? address : 'no-reply@nak-chorleiter.de';

  if (choirName) {
    name = `nak-chorleiter.de im Auftrag von ${choirName}`;
  }

  return { name, address: emailAddress };
}

async function sendMail(options, overrideSettings) {
  if (emailDisabled()) return;

  let recipients = [];
  if (Array.isArray(options.to)) {
    recipients = options.to;
  } else if (typeof options.to === 'string') {
    recipients = options.to.split(',').map(r => r.trim()).filter(Boolean);
  }

  const logMailAttempt = async (status, errorMessage = null) => {
    try {
      const db = require('../models');
      if (db && db.mail_log) {
        await db.mail_log.create({
          recipients: recipients.join(', '),
          subject: options.subject,
          body: options.text || options.html || '',
          status,
          errorMessage
        }).catch(() => {});
      }
    } catch (err) {
      // Ignore logging errors
    }
  };

  // Validate email content before sending
  const validation = validateEmailContent(options);
  if (!validation.valid) {
    const callStack = new Error().stack;
    logger.warn(`E-Mail-Versand verhindert: ${validation.reason}. Empfänger: ${options.to}`);

    await logMailAttempt('BLOCKED', validation.reason);

    // Notify admins asynchronously (don't wait)
    notifyAdminsAboutEmptyEmail(options, validation.reason, callStack)
      .catch(err => logger.error(`Fehler bei Admin-Benachrichtigung: ${err.message}`));

    return; // Don't send the email
  }

  const settings = overrideSettings || await require('../models').mail_setting.findByPk(1);
  const transporter = await createTransporter(settings);
  const { choirName, ...mailOpts } = options;
  const mailOptions = { from: getFromAddress(settings, choirName), ...mailOpts };

  if (recipients.length > 2) {
    const existingBcc = Array.isArray(mailOptions.bcc)
      ? mailOptions.bcc
      : mailOptions.bcc ? [mailOptions.bcc] : [];
    mailOptions.bcc = [...existingBcc, ...recipients];
    mailOptions.to = 'no-reply@nak-chorleiter.de';
  }

  try {
    const result = await transporter.sendMail(mailOptions);
    await logMailAttempt('SENT', null);
    return result;
  } catch (err) {
    const message = err?.message || String(err);
    await logMailAttempt('FAILED', message);
    throw err;
  }
}

module.exports = { emailDisabled, createTransporter, getFromAddress, sendMail };
