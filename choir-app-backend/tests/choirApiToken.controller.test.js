const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');
const controller = require('../src/controllers/choirApiToken.controller');
const tokenService = require('../src/services/choirApiToken.service');
const { verifyChoirApiToken, requireScope, requireWriteAccess, resetUsageCacheForTests } = require('../src/middleware/apiToken.middleware');

function res() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(data) { this.data = data; return this; },
    json(data) { this.data = data; return this; }
  };
}

function capture() {
  const result = { error: null, called: false };
  result.next = (err) => { result.called = true; result.error = err || null; };
  return result;
}

async function run(handler, req, response) {
  const nextSpy = capture();
  await handler(req, response, nextSpy.next);
  if (nextSpy.error) throw nextSpy.error;
  return response;
}

async function setup() {
  await db.sequelize.sync({ force: true });
  const choir = await db.choir.create({ name: 'Test Choir' });
  const otherChoir = await db.choir.create({ name: 'Other Choir' });
  const director = await db.user.create({ name: 'Director', firstName: 'Dora', email: 'director@example.com', password: 'x' });
  await db.user_choir.create({ userId: director.id, choirId: choir.id, rolesInChoir: ['director'] });
  return { choir, otherChoir, director };
}

(async () => {
  try {
    const { choir, otherChoir, director } = await setup();
    const baseReq = { userId: director.id, activeChoirId: choir.id };

    // --- create: plaintext returned once, hash stored ---
    let response = res();
    await run(controller.create, { ...baseReq, body: { label: 'ChatGPT Desktop' } }, response);
    assert.strictEqual(response.statusCode, 201);
    const plaintext = response.data.token;
    assert.ok(plaintext.startsWith('ckm_'), 'token should carry the scannable prefix');
    assert.ok(response.data.tokenPrefix && plaintext.startsWith(response.data.tokenPrefix));
    const tokenId = response.data.id;

    const stored = await db.choir_api_token.findByPk(tokenId);
    assert.notStrictEqual(stored.tokenHash, plaintext, 'plaintext must not be stored');
    assert.strictEqual(stored.tokenHash, tokenService.hashToken(plaintext));
    assert.strictEqual(stored.allowWrite, false, 'write access must be opt-in');

    // --- lifetime is capped at the configured maximum ---
    response = res();
    await run(controller.create, { ...baseReq, body: { label: 'Too long', validDays: 3650 } }, response);
    const cappedDays = Math.round((new Date(response.data.expiresAt) - Date.now()) / 86400000);
    assert.ok(cappedDays <= tokenService.MAX_DAYS, `expected <= ${tokenService.MAX_DAYS} days, got ${cappedDays}`);
    await db.choir_api_token.destroy({ where: { id: response.data.id } });

    // --- list never leaks the secret ---
    response = res();
    await run(controller.list, { ...baseReq }, response);
    assert.strictEqual(response.data.tokens.length, 1);
    assert.ok(!('tokenHash' in response.data.tokens[0]));
    assert.ok(!('token' in response.data.tokens[0]));

    // --- middleware accepts the token and scopes the request to the choir ---
    resetUsageCacheForTests();
    let req = { headers: { authorization: `Bearer ${plaintext}` }, ip: '203.0.113.5' };
    await run(verifyChoirApiToken, req, res());
    assert.strictEqual(req.apiToken.choirId, choir.id);
    assert.strictEqual(req.activeChoirId, choir.id);
    assert.strictEqual(req.userId, null, 'API tokens must not carry a user identity');
    assert.notStrictEqual(req.activeChoirId, otherChoir.id);

    // --- scope enforcement ---
    await run(requireScope('events:read'), req, res());
    let scopeCheck = capture();
    await requireScope('events:write')(req, res(), scopeCheck.next);
    assert.strictEqual(scopeCheck.error?.statusCode, 403, 'missing scope must be rejected');

    let writeCheck = capture();
    await requireWriteAccess(req, res(), writeCheck.next);
    assert.strictEqual(writeCheck.error?.statusCode, 403, 'read-only token must not write');

    // --- unknown token ---
    let unknown = capture();
    await verifyChoirApiToken({ headers: { authorization: 'Bearer ckm_aaaaaa_deadbeefdeadbeefdeadbeef' }, ip: '::1' }, res(), unknown.next);
    assert.strictEqual(unknown.error?.statusCode, 401);

    // --- missing header ---
    let missing = capture();
    await verifyChoirApiToken({ headers: {}, ip: '::1' }, res(), missing.next);
    assert.strictEqual(missing.error?.statusCode, 401);

    // --- expired token ---
    await stored.update({ expiresAt: new Date(Date.now() - 1000) });
    let expired = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${plaintext}` }, ip: '::1' }, res(), expired.next);
    assert.strictEqual(expired.error?.statusCode, 401);

    // --- renew resets expiry and the notification flag ---
    await stored.update({ expiryNotifiedAt: new Date() });
    response = res();
    await run(controller.renew, { ...baseReq, params: { id: tokenId }, body: { validDays: 30 } }, response);
    assert.ok(new Date(response.data.expiresAt) > new Date());
    await stored.reload();
    assert.strictEqual(stored.expiryNotifiedAt, null, 'renewal must re-arm the expiry mail');
    assert.strictEqual(stored.renewCount, 1);

    // --- renewal keeps the same secret ---
    resetUsageCacheForTests();
    req = { headers: { authorization: `Bearer ${plaintext}` }, ip: '::1' };
    await run(verifyChoirApiToken, req, res());
    assert.strictEqual(req.apiToken.id, tokenId);

    // --- rotate invalidates the old secret ---
    response = res();
    await run(controller.rotate, { ...baseReq, params: { id: tokenId } }, response);
    const rotated = response.data.token;
    assert.notStrictEqual(rotated, plaintext);
    let oldSecret = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${plaintext}` }, ip: '::1' }, res(), oldSecret.next);
    assert.strictEqual(oldSecret.error?.statusCode, 401);

    // --- revoke blocks access ---
    response = res();
    await run(controller.revoke, { ...baseReq, params: { id: tokenId } }, response);
    let revoked = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${rotated}` }, ip: '::1' }, res(), revoked.next);
    assert.strictEqual(revoked.error?.statusCode, 401);

    // --- tokens of another choir are invisible and untouchable ---
    const foreign = await tokenService.createToken({
      choirId: otherChoir.id,
      createdByUserId: director.id,
      label: 'Foreign',
    });
    response = res();
    await run(controller.list, { ...baseReq }, response);
    assert.ok(!response.data.tokens.some(t => t.id === foreign.token.id), 'cross-tenant token must not be listed');

    let foreignRevoke = capture();
    await controller.revoke({ ...baseReq, params: { id: foreign.token.id } }, res(), foreignRevoke.next);
    assert.strictEqual(foreignRevoke.error?.statusCode, 404, 'cross-tenant revoke must fail');

    // --- active token limit ---
    await db.choir_api_token.destroy({ where: { choirId: choir.id } });
    for (let i = 0; i < tokenService.MAX_PER_CHOIR; i += 1) {
      await tokenService.createToken({ choirId: choir.id, createdByUserId: director.id, label: `T${i}` });
    }
    let overLimit = capture();
    await controller.create({ ...baseReq, body: { label: 'One too many' } }, res(), overLimit.next);
    assert.strictEqual(overLimit.error?.statusCode, 409);

    // --- role loss revokes the tokens that user created ---
    const revokedCount = await tokenService.revokeTokensCreatedBy({ choirId: choir.id, userId: director.id });
    assert.strictEqual(revokedCount, tokenService.MAX_PER_CHOIR);
    assert.strictEqual(await tokenService.countActiveTokens(choir.id), 0);

    console.log('choirApiToken.controller tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
