const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');
const tokenService = require('./choirApiToken.service');

const CODE_TTL_SEC = parseInt(process.env.OAUTH_CODE_TTL_SEC, 10) || 600;
const REFRESH_TTL_DAYS = parseInt(process.env.OAUTH_REFRESH_TTL_DAYS, 10) || 365;
const MAX_REDIRECT_URIS = 10;

class OAuthError extends Error {
    constructor(code, description, statusCode = 400) {
        super(description || code);
        this.name = 'OAuthError';
        this.oauthCode = code;
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

function sha256(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function randomSecret(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Loopback redirects are allowed for desktop clients (RFC 8252); everything
 * else must be https so an authorization code cannot travel in the clear.
 */
function isAllowedRedirectUri(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return false;
    }
    if (url.hash) return false;
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return true;
    return false;
}

function normalizeScopes(scopeString) {
    const requested = String(scopeString || '')
        .split(/[\s+]+/)
        .map(s => s.trim())
        .filter(Boolean);
    if (!requested.length) return { scopes: [...tokenService.READ_SCOPES], allowWrite: false };

    const known = requested.filter(s => tokenService.ALL_SCOPES.includes(s));
    if (!known.length) return { scopes: [...tokenService.READ_SCOPES], allowWrite: false };

    const wantsWrite = known.includes('events:write') && tokenService.WRITE_ENABLED;
    return {
        scopes: wantsWrite ? known : known.filter(s => s !== 'events:write'),
        allowWrite: wantsWrite,
    };
}

async function registerClient({ client_name, redirect_uris, client_uri }) {
    const name = String(client_name || '').trim();
    if (!name) throw new OAuthError('invalid_client_metadata', 'client_name is required.');

    const uris = Array.isArray(redirect_uris) ? redirect_uris.map(String) : [];
    if (!uris.length) throw new OAuthError('invalid_redirect_uri', 'At least one redirect_uri is required.');
    if (uris.length > MAX_REDIRECT_URIS) throw new OAuthError('invalid_redirect_uri', `At most ${MAX_REDIRECT_URIS} redirect URIs are supported.`);

    const invalid = uris.filter(uri => !isAllowedRedirectUri(uri));
    if (invalid.length) {
        throw new OAuthError('invalid_redirect_uri', `Redirect URIs must be https (or http on loopback): ${invalid.join(', ')}`);
    }

    const client = await db.oauth_client.create({
        clientId: `mcp_${randomSecret(18)}`,
        clientName: name.slice(0, 200),
        redirectUris: uris,
        clientUri: client_uri ? String(client_uri).slice(0, 500) : null,
    });

    logger.info(`[OAuth] Registered client "${client.clientName}" (${client.clientId})`);
    return client;
}

async function getClient(clientId) {
    if (!clientId) return null;
    const client = await db.oauth_client.findOne({ where: { clientId: String(clientId) } });
    if (!client || client.disabledAt) return null;
    return client;
}

/**
 * Validates everything that must be checked before the user sees a consent
 * screen. Errors here must NOT redirect - a bad redirect_uri is exactly what
 * an attacker would supply.
 */
async function validateAuthorizationRequest(query) {
    const {
        response_type, client_id, redirect_uri, code_challenge,
        code_challenge_method, scope, resource,
    } = query || {};

    const client = await getClient(client_id);
    if (!client) throw new OAuthError('invalid_client', 'Unknown client_id.', 400);

    const redirectUri = String(redirect_uri || '');
    if (!client.redirectUris.includes(redirectUri)) {
        throw new OAuthError('invalid_request', 'redirect_uri does not match the registered values.', 400);
    }

    if (response_type !== 'code') {
        throw new OAuthError('unsupported_response_type', 'Only response_type=code is supported.');
    }
    if (!code_challenge) {
        throw new OAuthError('invalid_request', 'PKCE code_challenge is required.');
    }
    if ((code_challenge_method || 'plain') !== 'S256') {
        throw new OAuthError('invalid_request', 'Only code_challenge_method=S256 is supported.');
    }

    const { scopes, allowWrite } = normalizeScopes(scope);
    return { client, redirectUri, codeChallenge: String(code_challenge), scopes, allowWrite, resource: resource ? String(resource) : null };
}

async function createAuthorizationCode({ client, redirectUri, codeChallenge, scopes, allowWrite, choirId, userId, resource }) {
    const code = randomSecret(32);
    await db.oauth_authorization_code.create({
        codeHash: sha256(code),
        clientId: client.clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod: 'S256',
        scopes,
        allowWrite,
        choirId,
        userId,
        resource,
        expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000),
    });
    return code;
}

function verifyPkce(codeVerifier, codeChallenge) {
    if (!codeVerifier) return false;
    const digest = crypto.createHash('sha256').update(String(codeVerifier), 'utf8').digest('base64url');
    const a = Buffer.from(digest);
    const b = Buffer.from(String(codeChallenge));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function issueRefreshToken(clientId, choirApiTokenId) {
    const refreshToken = randomSecret(32);
    await db.oauth_refresh_token.create({
        tokenHash: sha256(refreshToken),
        clientId,
        choirApiTokenId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
    return refreshToken;
}

function expiresInSeconds(expiresAt) {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/**
 * Exchanges an authorization code for a choir API token.
 *
 * The access token IS a regular choir API token, so every existing control
 * (expiry cap, renewal mail, quotas, revoke in the UI) applies unchanged.
 */
async function exchangeAuthorizationCode({ code, codeVerifier, clientId, redirectUri }) {
    const client = await getClient(clientId);
    if (!client) throw new OAuthError('invalid_client', 'Unknown client_id.', 401);

    const record = await db.oauth_authorization_code.findOne({ where: { codeHash: sha256(String(code || '')) } });
    if (!record) throw new OAuthError('invalid_grant', 'Unknown authorization code.');
    if (record.usedAt) {
        // Replay: revoke exactly the grant this code produced, nothing else.
        if (record.issuedApiTokenId) {
            await db.oauth_refresh_token.update({ revokedAt: new Date() }, { where: { choirApiTokenId: record.issuedApiTokenId, revokedAt: null } });
            await db.choir_api_token.update({ revokedAt: new Date() }, { where: { id: record.issuedApiTokenId, revokedAt: null } });
            logger.warn(`[OAuth] Authorization code replay detected - revoked API token ${record.issuedApiTokenId}`);
        }
        throw new OAuthError('invalid_grant', 'Authorization code was already used.');
    }
    if (new Date(record.expiresAt) <= new Date()) throw new OAuthError('invalid_grant', 'Authorization code expired.');
    if (record.clientId !== client.clientId) throw new OAuthError('invalid_grant', 'Authorization code was issued to another client.');
    if (record.redirectUri !== String(redirectUri || '')) throw new OAuthError('invalid_grant', 'redirect_uri does not match the authorization request.');
    if (!verifyPkce(codeVerifier, record.codeChallenge)) throw new OAuthError('invalid_grant', 'PKCE verification failed.');

    await record.update({ usedAt: new Date() });

    const { token, plaintext } = await tokenService.createToken({
        choirId: record.choirId,
        createdByUserId: record.userId,
        label: `OAuth: ${client.clientName}`,
        scopes: record.scopes,
        allowWrite: record.allowWrite,
        validDays: tokenService.MAX_DAYS,
    });

    const refreshToken = await issueRefreshToken(client.clientId, token.id);
    await record.update({ issuedApiTokenId: token.id });
    await client.update({ lastUsedAt: new Date() });
    logger.info(`[OAuth] Issued access token ${token.tokenPrefix}... to "${client.clientName}" for choir ${record.choirId}`);

    return {
        access_token: plaintext,
        token_type: 'Bearer',
        expires_in: expiresInSeconds(token.expiresAt),
        refresh_token: refreshToken,
        scope: token.scopes.join(' '),
    };
}

/** Rotates both the refresh token and the underlying API token secret. */
async function refreshAccessToken({ refreshToken, clientId }) {
    const client = await getClient(clientId);
    if (!client) throw new OAuthError('invalid_client', 'Unknown client_id.', 401);

    const record = await db.oauth_refresh_token.findOne({ where: { tokenHash: sha256(String(refreshToken || '')) } });
    if (!record) throw new OAuthError('invalid_grant', 'Unknown refresh token.');
    if (record.clientId !== client.clientId) throw new OAuthError('invalid_grant', 'Refresh token was issued to another client.');
    if (record.usedAt) {
        // Reuse of a rotated refresh token means it leaked - kill the whole grant.
        // Checked before revokedAt because rotation marks the old token as used.
        await db.oauth_refresh_token.update({ revokedAt: new Date() }, { where: { choirApiTokenId: record.choirApiTokenId, revokedAt: null } });
        await db.choir_api_token.update({ revokedAt: new Date() }, { where: { id: record.choirApiTokenId, revokedAt: null } });
        logger.warn(`[OAuth] Refresh token reuse detected for API token ${record.choirApiTokenId} - grant revoked`);
        throw new OAuthError('invalid_grant', 'Refresh token was already used.');
    }
    if (record.revokedAt) throw new OAuthError('invalid_grant', 'Refresh token was revoked.');
    if (new Date(record.expiresAt) <= new Date()) throw new OAuthError('invalid_grant', 'Refresh token expired.');

    const apiToken = await db.choir_api_token.findByPk(record.choirApiTokenId);
    if (!apiToken || apiToken.revokedAt) {
        await record.update({ revokedAt: new Date() });
        throw new OAuthError('invalid_grant', 'The underlying API token was revoked.');
    }

    const rotated = await tokenService.rotateToken({
        id: apiToken.id,
        choirId: apiToken.choirId,
        validDays: tokenService.MAX_DAYS,
    });

    // Only usedAt: revokedAt stays reserved for explicit revocation so reuse
    // of the rotated token is still detectable.
    await record.update({ usedAt: new Date() });
    const nextRefreshToken = await issueRefreshToken(client.clientId, apiToken.id);
    await client.update({ lastUsedAt: new Date() });

    return {
        access_token: rotated.plaintext,
        token_type: 'Bearer',
        expires_in: expiresInSeconds(rotated.token.expiresAt),
        refresh_token: nextRefreshToken,
        scope: rotated.token.scopes.join(' '),
    };
}

async function revokeGrant({ token, clientId }) {
    const client = await getClient(clientId);
    if (!client) return;

    const hash = sha256(String(token || ''));
    const refresh = await db.oauth_refresh_token.findOne({ where: { tokenHash: hash, clientId: client.clientId } });
    const apiToken = refresh
        ? await db.choir_api_token.findByPk(refresh.choirApiTokenId)
        : await db.choir_api_token.findOne({ where: { tokenHash: hash } });

    if (!apiToken) return;

    await db.oauth_refresh_token.update({ revokedAt: new Date() }, { where: { choirApiTokenId: apiToken.id, revokedAt: null } });
    if (!apiToken.revokedAt) {
        await apiToken.update({ revokedAt: new Date() });
    }
    logger.info(`[OAuth] Revoked grant for API token ${apiToken.id}`);
}

/** Drops expired codes and refresh tokens so the tables stay small. */
async function pruneExpired() {
    const now = new Date();
    const codes = await db.oauth_authorization_code.destroy({ where: { expiresAt: { [Op.lt]: now } } });
    const refresh = await db.oauth_refresh_token.destroy({ where: { expiresAt: { [Op.lt]: now } } });
    return { codes, refresh };
}

module.exports = {
    OAuthError,
    CODE_TTL_SEC,
    REFRESH_TTL_DAYS,
    sha256,
    isAllowedRedirectUri,
    normalizeScopes,
    registerClient,
    getClient,
    validateAuthorizationRequest,
    createAuthorizationCode,
    verifyPkce,
    exchangeAuthorizationCode,
    refreshAccessToken,
    revokeGrant,
    pruneExpired,
};
