const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';
process.env.API_TOKEN_EXPIRY_WARN_DAYS = '7';

const db = require('../src/models');
const emailService = require('../src/services/email.service');

const sentMails = [];
emailService.sendTemplateMail = async (type, to, replacements) => {
  sentMails.push({ type, to, replacements });
};

const notifier = require('../src/services/apiTokenExpiryNotifier.service');
const tokenService = require('../src/services/choirApiToken.service');

function inDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function setup() {
  await db.sequelize.sync({ force: true });
  const choir = await db.choir.create({ name: 'Test Choir' });
  const creator = await db.user.create({ name: 'Leiter', firstName: 'Dora', email: 'dora@example.com', password: 'x' });
  const admin = await db.user.create({ name: 'Admin', firstName: 'Anna', email: 'anna@example.com', password: 'x' });
  const singer = await db.user.create({ name: 'Sopran', firstName: 'Sina', email: 'sina@example.com', password: 'x' });
  await db.user_choir.create({ userId: creator.id, choirId: choir.id, rolesInChoir: ['director'] });
  await db.user_choir.create({ userId: admin.id, choirId: choir.id, rolesInChoir: ['choir_admin'] });
  await db.user_choir.create({ userId: singer.id, choirId: choir.id, rolesInChoir: ['singer'] });
  return { choir, creator, admin, singer };
}

(async () => {
  try {
    const { choir, creator } = await setup();

    const expiringSoon = await db.choir_api_token.create({
      choirId: choir.id, createdByUserId: creator.id, label: 'ChatGPT',
      tokenHash: 'a'.repeat(64), tokenPrefix: 'ckm_aaaaaa', scopes: ['events:read'],
      expiresAt: inDays(5),
    });
    const farOut = await db.choir_api_token.create({
      choirId: choir.id, createdByUserId: creator.id, label: 'Later',
      tokenHash: 'b'.repeat(64), tokenPrefix: 'ckm_bbbbbb', scopes: ['events:read'],
      expiresAt: inDays(40),
    });
    const alreadyExpired = await db.choir_api_token.create({
      choirId: choir.id, createdByUserId: creator.id, label: 'Gone',
      tokenHash: 'c'.repeat(64), tokenPrefix: 'ckm_cccccc', scopes: ['events:read'],
      expiresAt: inDays(-1),
    });
    const revoked = await db.choir_api_token.create({
      choirId: choir.id, createdByUserId: creator.id, label: 'Revoked',
      tokenHash: 'd'.repeat(64), tokenPrefix: 'ckm_dddddd', scopes: ['events:read'],
      expiresAt: inDays(3), revokedAt: new Date(),
    });

    // --- only the token inside the warning window is notified ---
    let sent = await notifier.notifyExpiringTokens();
    assert.strictEqual(sent, 1, 'exactly one warning expected');
    assert.strictEqual(sentMails.length, 1);
    assert.strictEqual(sentMails[0].type, 'api-token-expiry');
    assert.strictEqual(sentMails[0].to, 'dora@example.com', 'creator is the preferred recipient');
    assert.strictEqual(sentMails[0].replacements.label, 'ChatGPT');
    assert.strictEqual(sentMails[0].replacements.token_prefix, 'ckm_aaaaaa');
    assert.ok(sentMails[0].replacements.days_left <= 7);
    assert.ok(!JSON.stringify(sentMails[0].replacements).includes('a'.repeat(64)), 'hash must never be mailed');

    await expiringSoon.reload();
    assert.ok(expiringSoon.expiryNotifiedAt, 'notification must be recorded');
    await farOut.reload();
    assert.strictEqual(farOut.expiryNotifiedAt, null);
    await alreadyExpired.reload();
    assert.strictEqual(alreadyExpired.expiryNotifiedAt, null, 'already expired tokens are not warned');
    await revoked.reload();
    assert.strictEqual(revoked.expiryNotifiedAt, null, 'revoked tokens are not warned');

    // --- idempotent: a second run sends nothing ---
    sent = await notifier.notifyExpiringTokens();
    assert.strictEqual(sent, 0, 'second run must not resend');
    assert.strictEqual(sentMails.length, 1);

    // --- renewal re-arms the warning ---
    await tokenService.renewToken({ id: expiringSoon.id, choirId: choir.id, validDays: 90 });
    await expiringSoon.reload();
    assert.strictEqual(expiringSoon.expiryNotifiedAt, null);
    sent = await notifier.notifyExpiringTokens();
    assert.strictEqual(sent, 0, 'renewed token is outside the window again');

    // --- creator lost the role: choir admins get the warning instead ---
    await db.user_choir.destroy({ where: { userId: creator.id, choirId: choir.id } });
    await expiringSoon.update({ expiresAt: inDays(2), expiryNotifiedAt: null });
    sent = await notifier.notifyExpiringTokens();
    assert.strictEqual(sent, 1);
    assert.strictEqual(sentMails[1].to, 'anna@example.com', 'fallback goes to the remaining choir admin');

    console.log('apiTokenExpiryNotifier tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
