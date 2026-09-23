const assert = require('assert');
const crypto = require('crypto');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';
process.env.PUBLIC_BASE_URL = 'https://example.test';

const db = require('../src/models');
const controller = require('../src/controllers/oauth.controller');
const oauthService = require('../src/services/oauth.service');
const tokenService = require('../src/services/choirApiToken.service');
const { verifyChoirApiToken, resetUsageCacheForTests } = require('../src/middleware/apiToken.middleware');

function res() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    send(data) { this.data = data; return this; },
    json(data) { this.data = data; return this; },
    redirect(code, url) { this.statusCode = code; this.redirectedTo = url; return this; },
  };
}

function capture() {
  const result = { error: null };
  result.next = (err) => { result.error = err || null; };
  return result;
}

async function run(handler, req, response) {
  const spy = capture();
  await handler(req, response, spy.next);
  if (spy.error) throw spy.error;
  return response;
}

function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function setup() {
  await db.sequelize.sync({ force: true });
  const choir = await db.choir.create({ name: 'OAuth Chor' });
  const otherChoir = await db.choir.create({ name: 'Fremder Chor' });
  const director = await db.user.create({ name: 'Leiter', firstName: 'Dora', email: 'dora@example.com', password: 'x' });
  const singer = await db.user.create({ name: 'Sopran', firstName: 'Sina', email: 'sina@example.com', password: 'x' });
  await db.user_choir.create({ userId: director.id, choirId: choir.id, rolesInChoir: ['director'] });
  await db.user_choir.create({ userId: singer.id, choirId: choir.id, rolesInChoir: ['singer'] });
  await db.user_choir.create({ userId: director.id, choirId: otherChoir.id, rolesInChoir: ['singer'] });
  return { choir, otherChoir, director, singer };
}

(async () => {
  try {
    const ctx = await setup();
    const REDIRECT = 'https://chatgpt.com/connector_platform_oauth_redirect';

    // --- metadata ---
    let r = await run(controller.authorizationServerMetadata, {}, res());
    const meta = r.data;
    assert.strictEqual(meta.issuer, 'https://example.test/api/oauth');
    assert.strictEqual(meta.authorization_endpoint, 'https://example.test/api/oauth/authorize');
    assert.deepStrictEqual(meta.code_challenge_methods_supported, ['S256'], 'PKCE S256 must be advertised');
    assert.deepStrictEqual(meta.token_endpoint_auth_methods_supported, ['none'], 'public clients only');

    r = await run(controller.protectedResourceMetadata, {}, res());
    assert.strictEqual(r.data.resource, 'https://example.test/api/mcp');
    assert.deepStrictEqual(r.data.authorization_servers, ['https://example.test/api/oauth']);

    // --- dynamic client registration ---
    r = await run(controller.register, { body: { client_name: 'ChatGPT', redirect_uris: [REDIRECT] } }, res());
    assert.strictEqual(r.statusCode, 201);
    assert.ok(r.data.client_id.startsWith('mcp_'));
    assert.strictEqual(r.data.token_endpoint_auth_method, 'none');
    assert.ok(!('client_secret' in r.data), 'no client secret may be issued');
    const clientId = r.data.client_id;

    // --- registration rejects insecure redirect URIs ---
    r = await run(controller.register, { body: { client_name: 'Evil', redirect_uris: ['http://evil.example.com/cb'] } }, res());
    assert.strictEqual(r.statusCode, 400);
    assert.strictEqual(r.data.error, 'invalid_redirect_uri');

    // --- loopback is allowed for desktop clients ---
    r = await run(controller.register, { body: { client_name: 'Desktop', redirect_uris: ['http://127.0.0.1:33418/callback'] } }, res());
    assert.strictEqual(r.statusCode, 201);

    const { verifier, challenge } = pkce();
    const authQuery = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: REDIRECT,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      scope: 'events:read repertoire:read plan:read stats:read search:read',
    };

    // --- authorize redirects to the consent screen ---
    r = await run(controller.authorize, { query: authQuery }, res());
    assert.strictEqual(r.statusCode, 302);
    assert.ok(r.redirectedTo.includes('/oauth/consent?'), r.redirectedTo);
    assert.ok(r.redirectedTo.includes(`client_id=${clientId}`));

    // --- a tampered redirect_uri must not be redirected to ---
    r = await run(controller.authorize, { query: { ...authQuery, redirect_uri: 'https://attacker.example/cb' } }, res());
    assert.strictEqual(r.statusCode, 400);
    assert.strictEqual(r.data.error, 'invalid_request');
    assert.ok(!r.redirectedTo, 'must not redirect on an invalid redirect_uri');

    // --- PKCE is mandatory ---
    const noPkce = { ...authQuery };
    delete noPkce.code_challenge;
    r = await run(controller.authorize, { query: noPkce }, res());
    assert.strictEqual(r.data.error, 'invalid_request');

    r = await run(controller.authorize, { query: { ...authQuery, code_challenge_method: 'plain' } }, res());
    assert.strictEqual(r.data.error, 'invalid_request', 'plain PKCE must be rejected');

    // --- consent info only lists choirs the user manages ---
    r = await run(controller.consentInfo, { query: authQuery, userId: ctx.director.id, userRoles: [] }, res());
    assert.strictEqual(r.data.client.name, 'ChatGPT');
    assert.deepStrictEqual(r.data.choirs.map(c => c.id), [ctx.choir.id], 'only managed choirs may be offered');
    assert.strictEqual(r.data.allowWrite, false);

    r = await run(controller.consentInfo, { query: authQuery, userId: ctx.singer.id, userRoles: [] }, res());
    assert.strictEqual(r.data.choirs.length, 0, 'a singer manages no choir');

    // --- a singer cannot grant access ---
    r = await run(controller.decide, {
      body: { ...authQuery, approved: true, choirId: ctx.choir.id },
      userId: ctx.singer.id,
      userRoles: [],
    }, res());
    assert.strictEqual(r.statusCode, 403);

    // --- a director cannot grant a choir they only sing in ---
    r = await run(controller.decide, {
      body: { ...authQuery, approved: true, choirId: ctx.otherChoir.id },
      userId: ctx.director.id,
      userRoles: [],
    }, res());
    assert.strictEqual(r.statusCode, 403, 'cross-choir grant must be refused');

    // --- denial redirects with access_denied ---
    r = await run(controller.decide, {
      body: { ...authQuery, approved: false },
      userId: ctx.director.id,
      userRoles: [],
    }, res());
    assert.ok(r.data.redirectTo.includes('error=access_denied'));
    assert.ok(r.data.redirectTo.includes('state=xyz'));

    // --- approval issues a code ---
    r = await run(controller.decide, {
      body: { ...authQuery, approved: true, choirId: ctx.choir.id },
      userId: ctx.director.id,
      userRoles: [],
    }, res());
    const redirect = new URL(r.data.redirectTo);
    assert.strictEqual(redirect.origin + redirect.pathname, REDIRECT);
    assert.strictEqual(redirect.searchParams.get('state'), 'xyz');
    const code = redirect.searchParams.get('code');
    assert.ok(code);

    const stored = await db.oauth_authorization_code.findOne({ where: { codeHash: oauthService.sha256(code) } });
    assert.ok(stored, 'code must be stored as a hash');
    assert.strictEqual(stored.choirId, ctx.choir.id);

    // --- wrong code_verifier is rejected ---
    r = await run(controller.token, {
      body: { grant_type: 'authorization_code', code, code_verifier: 'wrong-verifier-value', client_id: clientId, redirect_uri: REDIRECT },
    }, res());
    assert.strictEqual(r.data.error, 'invalid_grant');

    // --- correct exchange ---
    r = await run(controller.token, {
      body: { grant_type: 'authorization_code', code, code_verifier: verifier, client_id: clientId, redirect_uri: REDIRECT },
    }, res());
    assert.strictEqual(r.statusCode, 200);
    const grant = r.data;
    assert.strictEqual(grant.token_type, 'Bearer');
    assert.ok(grant.access_token.startsWith('ckm_'), 'access token is a regular choir API token');
    assert.ok(grant.refresh_token);
    // Calendar-based expiry can differ from 90*24h by an hour across a DST change.
    assert.ok(grant.expires_in > 0 && grant.expires_in <= (tokenService.MAX_DAYS + 1) * 86400, `expires_in=${grant.expires_in}`);

    // --- the access token actually works against the MCP middleware ---
    resetUsageCacheForTests();
    const mcpReq = { headers: { authorization: `Bearer ${grant.access_token}` }, ip: '::1', protocol: 'https', get: () => 'example.test' };
    await run(verifyChoirApiToken, mcpReq, res());
    assert.strictEqual(mcpReq.apiToken.choirId, ctx.choir.id);
    assert.strictEqual(mcpReq.apiToken.allowWrite, false);
    assert.strictEqual(mcpReq.userId, null);

    // --- the grant shows up in the normal token list ---
    const listed = await tokenService.listTokens(ctx.choir.id);
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].label, 'OAuth: ChatGPT');

    // --- refresh rotates both secrets ---
    r = await run(controller.token, {
      body: { grant_type: 'refresh_token', refresh_token: grant.refresh_token, client_id: clientId },
    }, res());
    assert.strictEqual(r.statusCode, 200, `refresh failed: ${JSON.stringify(r.data)}`);
    const refreshed = r.data;
    assert.notStrictEqual(refreshed.access_token, grant.access_token, 'access token must rotate');
    assert.notStrictEqual(refreshed.refresh_token, grant.refresh_token, 'refresh token must rotate');

    resetUsageCacheForTests();
    const oldTokenCheck = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${grant.access_token}` }, ip: '::1', protocol: 'https', get: () => 'example.test' }, res(), oldTokenCheck.next);
    assert.strictEqual(oldTokenCheck.error?.statusCode, 401, 'the previous access token must stop working');

    // --- reusing a rotated refresh token kills the whole grant ---
    r = await run(controller.token, {
      body: { grant_type: 'refresh_token', refresh_token: grant.refresh_token, client_id: clientId },
    }, res());
    assert.strictEqual(r.data.error, 'invalid_grant');

    resetUsageCacheForTests();
    const afterReuse = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${refreshed.access_token}` }, ip: '::1', protocol: 'https', get: () => 'example.test' }, res(), afterReuse.next);
    assert.strictEqual(afterReuse.error?.statusCode, 401, 'refresh token reuse must revoke the access token too');

    // --- the WWW-Authenticate challenge points at the resource metadata ---
    const challengeRes = res();
    const challengeNext = capture();
    await verifyChoirApiToken({ headers: {}, ip: '::1', protocol: 'https', get: () => 'example.test' }, challengeRes, challengeNext.next);
    assert.ok(
      challengeRes.headers['WWW-Authenticate']?.includes('resource_metadata="https://example.test/api/oauth/.well-known/oauth-protected-resource"'),
      challengeRes.headers['WWW-Authenticate']
    );

    // --- revoke endpoint kills a grant ---
    const { verifier: v2, challenge: c2 } = pkce();
    const q2 = { ...authQuery, code_challenge: c2, state: 'abc' };
    await db.choir_api_token.destroy({ where: {} });
    r = await run(controller.decide, { body: { ...q2, approved: true, choirId: ctx.choir.id }, userId: ctx.director.id, userRoles: [] }, res());
    const code2 = new URL(r.data.redirectTo).searchParams.get('code');
    r = await run(controller.token, {
      body: { grant_type: 'authorization_code', code: code2, code_verifier: v2, client_id: clientId, redirect_uri: REDIRECT },
    }, res());
    const grant2 = r.data;

    await run(controller.revoke, { body: { token: grant2.refresh_token, client_id: clientId } }, res());
    resetUsageCacheForTests();
    const revokedCheck = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${grant2.access_token}` }, ip: '::1', protocol: 'https', get: () => 'example.test' }, res(), revokedCheck.next);
    assert.strictEqual(revokedCheck.error?.statusCode, 401, 'revoked grant must lose access');

    // --- unsupported grant type ---
    r = await run(controller.token, { body: { grant_type: 'password' } }, res());
    assert.strictEqual(r.data.error, 'unsupported_grant_type');

    // --- replaying an authorization code is refused and kills its own grant ---
    const { verifier: v3, challenge: c3 } = pkce();
    const q3 = { ...authQuery, code_challenge: c3, state: 'rep' };
    await db.choir_api_token.destroy({ where: {} });
    r = await run(controller.decide, { body: { ...q3, approved: true, choirId: ctx.choir.id }, userId: ctx.director.id, userRoles: [] }, res());
    const code3 = new URL(r.data.redirectTo).searchParams.get('code');
    r = await run(controller.token, {
      body: { grant_type: 'authorization_code', code: code3, code_verifier: v3, client_id: clientId, redirect_uri: REDIRECT },
    }, res());
    const grant3 = r.data;
    assert.strictEqual(r.statusCode, 200);

    r = await run(controller.token, {
      body: { grant_type: 'authorization_code', code: code3, code_verifier: v3, client_id: clientId, redirect_uri: REDIRECT },
    }, res());
    assert.strictEqual(r.data.error, 'invalid_grant');

    resetUsageCacheForTests();
    const replayCheck = capture();
    await verifyChoirApiToken({ headers: { authorization: `Bearer ${grant3.access_token}` }, ip: '::1', protocol: 'https', get: () => 'example.test' }, res(), replayCheck.next);
    assert.strictEqual(replayCheck.error?.statusCode, 401, 'code replay must revoke the grant it produced');

    // --- expired records are pruned ---
    await db.oauth_authorization_code.create({
      codeHash: 'f'.repeat(64), clientId, redirectUri: REDIRECT, codeChallenge: 'x',
      scopes: [], choirId: ctx.choir.id, userId: ctx.director.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const pruned = await oauthService.pruneExpired();
    assert.ok(pruned.codes >= 1);

    console.log('oauth.controller tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
