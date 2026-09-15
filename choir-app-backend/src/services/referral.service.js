const crypto = require('crypto');
const db = require('../models');
const emailService = require('./email.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

const REFERRAL_TTL_DAYS = 7;
const EMAIL_CODE_TTL_MINUTES = 15;
const PASSWORD_SETUP_TTL_HOURS = 24;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateNumericCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
}

function splitRequesterName(requesterName) {
  const cleaned = String(requesterName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { firstName: 'Neuer', lastName: 'Benutzer' };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

async function ensureReferralRateLimit(req, senderUserId, recipientEmail) {
  const now = Date.now();
  const ip = getClientIp(req);
  const sinceHour = new Date(now - ONE_HOUR_MS);
  const sinceDay = new Date(now - ONE_DAY_MS);

  const [byUserHour, byIpHour, byRecipientDay] = await Promise.all([
    db.referral_invitation.count({ where: { senderUserId, createdAt: { [db.Sequelize.Op.gt]: sinceHour } } }),
    db.referral_invitation.count({ where: { requestedByIp: ip, createdAt: { [db.Sequelize.Op.gt]: sinceHour } } }),
    db.referral_invitation.count({ where: { recipientEmail, createdAt: { [db.Sequelize.Op.gt]: sinceDay } } })
  ]);

  if (byUserHour >= 5 || byIpHour >= 10 || byRecipientDay >= 3) {
    const err = new Error('Zu viele Empfehlungsanfragen. Bitte später erneut versuchen.');
    err.statusCode = 429;
    throw err;
  }
}

async function createReferralInvitation(req, senderUser, payload) {
  const recipientEmail = normalizeEmail(payload.recipientEmail);
  const recipientName = String(payload.recipientName || '').trim();
  const invitationType = payload.invitationType === 'singer' ? 'singer' : 'choir-admin';

  if (!recipientEmail || !recipientName) {
    const err = new Error('Empfängername und E-Mail sind erforderlich.');
    err.statusCode = 400;
    throw err;
  }

  await ensureReferralRateLimit(req, senderUser.id, recipientEmail);

  let registrationLink;
  let choirName = '';
  if (invitationType === 'singer') {
    if (!req.activeChoirId) {
      const err = new Error('Sänger-Empfehlungen sind ohne aktiven Chor nicht möglich.');
      err.statusCode = 400;
      throw err;
    }

    const choir = await db.choir.findByPk(req.activeChoirId);
    if (!choir?.modules?.joinByLink || !choir?.joinHash) {
      const err = new Error('Dieser Chor hat die Sänger-Registrierung nicht freigegeben.');
      err.statusCode = 403;
      throw err;
    }

    choirName = choir.name || '';
    const frontendUrl = await getFrontendUrl();
    registrationLink = `${frontendUrl}/join/${choir.joinHash}`;
  }

  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + REFERRAL_TTL_DAYS * ONE_DAY_MS);

  const invite = await db.referral_invitation.create({
    senderUserId: senderUser.id,
    recipientName,
    recipientEmail,
    invitationType,
    tokenHash,
    expiresAt,
    requestedByIp: getClientIp(req),
    userAgent: req.get('User-Agent') || ''
  });

  if (!registrationLink) {
    const frontendUrl = await getFrontendUrl();
    registrationLink = `${frontendUrl}/register-choir/${rawToken}`;
  }

  await emailService.sendChoirRecommendationMail({
    to: recipientEmail,
    recipientName,
    senderName: [senderUser.firstName, senderUser.name].filter(Boolean).join(' ').trim() || senderUser.email,
    registrationLink,
    expiresAt,
    invitationType,
    choirName
  });

  return invite;
}

async function getInvitationByRawToken(rawToken) {
  const tokenHash = sha256(rawToken);
  const invitation = await db.referral_invitation.findOne({ where: { tokenHash } });
  if (!invitation) return null;
  if (invitation.usedAt) return null;
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return null;
  return invitation;
}

async function createChoirRegistrationRequest(req, rawToken, payload) {
  const invitation = await getInvitationByRawToken(rawToken);
  if (!invitation) {
    const err = new Error('Der Registrierungslink ist ungültig oder abgelaufen. Bitte registriere dich neu über die Startseite.');
    err.statusCode = 410;
    throw err;
  }

  const requesterName = String(payload.requesterName || '').trim();
  const requesterEmail = normalizeEmail(payload.requesterEmail);
  const requesterPhone = String(payload.requesterPhone || '').trim();
  const choirName = String(payload.choirName || '').trim();
  const city = String(payload.city || '').trim();
  const congregation = String(payload.congregation || '').trim();
  const district = String(payload.district || '').trim();

  if (!requesterName || !requesterEmail || !choirName || !city) {
    const err = new Error('Name, E-Mail, Chorname und Ort sind erforderlich.');
    err.statusCode = 400;
    throw err;
  }

  if (requesterEmail !== invitation.recipientEmail) {
    const err = new Error('Die E-Mail muss mit der Empfängeradresse der Einladung übereinstimmen.');
    err.statusCode = 403;
    throw err;
  }

  const code = generateNumericCode();
  const codeHash = sha256(code);
  const codeExpiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

  const registrationRequest = await db.choir_registration_request.create({
    referralInvitationId: invitation.id,
    requesterName,
    requesterEmail,
    requesterPhone: requesterPhone || null,
    choirName,
    city,
    congregation: congregation || null,
    district: district || null,
    emailVerificationCodeHash: codeHash,
    emailVerificationCodeExpiresAt: codeExpiresAt,
    requestedByIp: getClientIp(req),
    userAgent: req.get('User-Agent') || ''
  });

  await emailService.sendChoirRegistrationVerificationCodeMail({
    to: requesterEmail,
    requesterName,
    code,
    expiresAt: codeExpiresAt,
    choirName
  });

  return registrationRequest;
}

async function createPublicChoirRegistrationRequest(req, payload) {
  const requesterName = String(payload.requesterName || '').trim();
  const requesterEmail = normalizeEmail(payload.requesterEmail);
  const requesterPhone = String(payload.requesterPhone || '').trim();
  const choirName = String(payload.choirName || '').trim();
  const city = String(payload.city || '').trim();
  const congregation = String(payload.congregation || '').trim();
  const district = String(payload.district || '').trim();

  if (!requesterName || !requesterEmail || !choirName || !city) {
    const err = new Error('Name, E-Mail, Chorname und Ort sind erforderlich.');
    err.statusCode = 400;
    throw err;
  }

  const ip = getClientIp(req);
  const sinceHour = new Date(Date.now() - ONE_HOUR_MS);
  const [byIpHour, byEmailDay] = await Promise.all([
    db.choir_registration_request.count({ where: { requestedByIp: ip, createdAt: { [db.Sequelize.Op.gt]: sinceHour } } }),
    db.choir_registration_request.count({ where: { requesterEmail, createdAt: { [db.Sequelize.Op.gt]: new Date(Date.now() - ONE_DAY_MS) } } })
  ]);

  if (byIpHour >= 5 || byEmailDay >= 3) {
    const err = new Error('Zu viele Registrierungsanfragen. Bitte später erneut versuchen.');
    err.statusCode = 429;
    throw err;
  }

  const code = generateNumericCode();
  const codeHash = sha256(code);
  const codeExpiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);

  const registrationRequest = await db.choir_registration_request.create({
    referralInvitationId: null,
    requesterName,
    requesterEmail,
    requesterPhone: requesterPhone || null,
    choirName,
    city,
    congregation: congregation || null,
    district: district || null,
    emailVerificationCodeHash: codeHash,
    emailVerificationCodeExpiresAt: codeExpiresAt,
    requestedByIp: ip,
    userAgent: req.get('User-Agent') || ''
  });

  await emailService.sendChoirRegistrationVerificationCodeMail({
    to: requesterEmail,
    requesterName,
    code,
    expiresAt: codeExpiresAt,
    choirName
  });

  return registrationRequest;
}

async function verifyChoirRegistrationRequest(req, requestId, code) {
  const registrationRequest = await db.choir_registration_request.findByPk(requestId);
  if (!registrationRequest) {
    const err = new Error('Anfrage nicht gefunden.');
    err.statusCode = 404;
    throw err;
  }

  if (registrationRequest.status !== 'PENDING_REVIEW') {
    const err = new Error('Anfrage ist nicht mehr zur Verifikation verfügbar.');
    err.statusCode = 409;
    throw err;
  }

  if (registrationRequest.emailVerifiedAt) {
    return registrationRequest;
  }

  if (new Date(registrationRequest.emailVerificationCodeExpiresAt).getTime() < Date.now()) {
    await registrationRequest.update({ status: 'EXPIRED' });
    const err = new Error('Der Verifizierungscode ist abgelaufen. Bitte starte die Registrierung neu.');
    err.statusCode = 410;
    throw err;
  }

  if (sha256(code) !== registrationRequest.emailVerificationCodeHash) {
    const err = new Error('Ungültiger Verifizierungscode.');
    err.statusCode = 400;
    throw err;
  }

  await registrationRequest.update({
    emailVerifiedAt: new Date(),
    verifiedByIp: getClientIp(req)
  });

  if (registrationRequest.referralInvitationId) {
    const invitation = await db.referral_invitation.findByPk(registrationRequest.referralInvitationId);
    if (invitation && !invitation.usedAt) {
      await invitation.update({ usedAt: new Date() });
    }
  }

  await emailService.sendAdminChoirRegistrationRequestMail({
    requesterName: registrationRequest.requesterName,
    requesterEmail: registrationRequest.requesterEmail,
    requesterPhone: registrationRequest.requesterPhone,
    choirName: registrationRequest.choirName,
    city: registrationRequest.city,
    congregation: registrationRequest.congregation,
    district: registrationRequest.district,
    requestedAt: registrationRequest.createdAt
  });

  return registrationRequest;
}

async function approveChoirRegistrationRequest(adminUserId, requestId) {
  const registrationRequest = await db.choir_registration_request.findByPk(requestId);
  if (!registrationRequest) {
    const err = new Error('Anfrage nicht gefunden.');
    err.statusCode = 404;
    throw err;
  }
  if (registrationRequest.status !== 'PENDING_REVIEW' || !registrationRequest.emailVerifiedAt) {
    const err = new Error('Anfrage kann nicht freigegeben werden.');
    err.statusCode = 409;
    throw err;
  }

  const result = await db.sequelize.transaction(async (transaction) => {
    const choir = await db.choir.create({
      name: registrationRequest.choirName,
      location: registrationRequest.city
    }, { transaction });

    let createdNewUser = false;
    let passwordSetupToken = null;

    let user = await db.user.findOne({
      where: db.Sequelize.where(
        db.Sequelize.fn('lower', db.Sequelize.col('email')),
        registrationRequest.requesterEmail.toLowerCase()
      ),
      transaction
    });

    if (!user) {
      const passwordPlaceholder = generateToken();
      const parsedName = splitRequesterName(registrationRequest.requesterName);
      passwordSetupToken = generateToken();
      const passwordSetupExpiry = new Date(Date.now() + PASSWORD_SETUP_TTL_HOURS * ONE_HOUR_MS);

      user = await db.user.create({
        firstName: parsedName.firstName,
        name: parsedName.lastName,
        email: registrationRequest.requesterEmail,
        password: bcrypt.hashSync(passwordPlaceholder, 12),
        phone: registrationRequest.requesterPhone || undefined,
        city: registrationRequest.city || undefined,
        congregation: registrationRequest.congregation || undefined,
        district: registrationRequest.district || undefined,
        roles: ['user'],
        resetToken: passwordSetupToken,
        resetTokenExpiry: passwordSetupExpiry
      }, { transaction });

      createdNewUser = true;
    }

    await user.addChoir(choir, {
      through: { rolesInChoir: ['choir_admin'], registrationStatus: 'REGISTERED' },
      transaction
    });

    await registrationRequest.update({
      status: 'APPROVED',
      approvedByUserId: adminUserId,
      approvedAt: new Date(),
      createdChoirId: choir.id,
      createdUserId: user.id
    }, { transaction });

    return { choir, user, registrationRequest, createdNewUser, passwordSetupToken };
  });

  try {
    const frontendUrl = await getFrontendUrl();
    const setupPasswordLink = result.createdNewUser && result.passwordSetupToken
      ? `${frontendUrl}/reset-password/${result.passwordSetupToken}`
      : null;

    await emailService.sendChoirRegistrationDecisionMail({
      to: registrationRequest.requesterEmail,
      requesterName: registrationRequest.requesterName,
      choirName: registrationRequest.choirName,
      approved: true,
      setupPasswordLink
    });
  } catch (err) {
    logger.error(`Error sending choir registration approval mail to ${registrationRequest.requesterEmail}: ${err.message}`);
    logger.error(err.stack);
  }

  return result;
}

async function rejectChoirRegistrationRequest(adminUserId, requestId, reason) {
  const registrationRequest = await db.choir_registration_request.findByPk(requestId);
  if (!registrationRequest) {
    const err = new Error('Anfrage nicht gefunden.');
    err.statusCode = 404;
    throw err;
  }
  if (registrationRequest.status !== 'PENDING_REVIEW') {
    const err = new Error('Anfrage kann nicht abgelehnt werden.');
    err.statusCode = 409;
    throw err;
  }

  await registrationRequest.update({
    status: 'REJECTED',
    rejectedByUserId: adminUserId,
    rejectedAt: new Date(),
    rejectionReason: String(reason || '').trim() || null
  });

  try {
    await emailService.sendChoirRegistrationDecisionMail({
      to: registrationRequest.requesterEmail,
      requesterName: registrationRequest.requesterName,
      choirName: registrationRequest.choirName,
      approved: false,
      rejectionReason: registrationRequest.rejectionReason
    });
  } catch (err) {
    logger.error(`Error sending choir registration rejection mail to ${registrationRequest.requesterEmail}: ${err.message}`);
    logger.error(err.stack);
  }

  return registrationRequest;
}

module.exports = {
  createReferralInvitation,
  createChoirRegistrationRequest,
  createPublicChoirRegistrationRequest,
  verifyChoirRegistrationRequest,
  approveChoirRegistrationRequest,
  rejectChoirRegistrationRequest
};
