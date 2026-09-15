const crypto = require('crypto');

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function getSecret() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing token secret: ENCRYPTION_KEY or JWT_SECRET must be set.');
  }
  return secret;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('base64url');
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/**
 * Creates a short-lived capability token that authorizes updating exactly one
 * public form submission. Without this token the numeric submission ID alone
 * grants no access.
 */
function createSubmissionUpdateToken({ formId, submissionId, email, ttlMs = DEFAULT_TTL_MS }) {
  const expiresAt = Date.now() + ttlMs;
  const payload = [Number(formId), Number(submissionId), hashEmail(email), expiresAt].join('.');
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${sign(payload)}`;
}

/**
 * @returns {number|null} the submission ID the token authorizes, or null if invalid.
 */
function verifySubmissionUpdateToken(token, { formId }) {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const separatorIndex = token.lastIndexOf('.');
  const encodedPayload = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);
  if (!encodedPayload || !providedSignature) return null;

  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expectedSignature = sign(payload);
  const provided = Buffer.from(providedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  const [tokenFormId, tokenSubmissionId, , expiresAt] = payload.split('.');
  if (Number(tokenFormId) !== Number(formId)) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;

  const submissionId = Number(tokenSubmissionId);
  return Number.isInteger(submissionId) && submissionId > 0 ? submissionId : null;
}

module.exports = { createSubmissionUpdateToken, verifySubmissionUpdateToken };
