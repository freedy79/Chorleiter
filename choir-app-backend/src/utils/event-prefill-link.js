const crypto = require('crypto');

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

function buildKey() {
  const source = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) {
    throw new Error('Missing encryption source: ENCRYPTION_KEY or JWT_SECRET must be set.');
  }
  return crypto.createHash('sha256').update(String(source)).digest();
}

function encodeEventPrefillToken(payload) {
  const key = buildKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${toBase64Url(iv)}.${toBase64Url(encrypted)}.${toBase64Url(authTag)}`;
}

function decodeEventPrefillToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid prefill token format.');
  }

  const [ivPart, encryptedPart, tagPart] = parts;
  const iv = fromBase64Url(ivPart);
  const encrypted = fromBase64Url(encryptedPart);
  const authTag = fromBase64Url(tagPart);

  const key = buildKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = {
  encodeEventPrefillToken,
  decodeEventPrefillToken
};
