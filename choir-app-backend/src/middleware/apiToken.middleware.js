const db = require('../models');
const logger = require('../config/logger');
const { getRequestContext } = require('../config/request-context');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const tokenService = require('../services/choirApiToken.service');

// Usage counters are flushed at most once per minute per token to keep MCP calls cheap.
const USAGE_FLUSH_MS = 60 * 1000;
const lastUsageFlush = new Map();

function extractBearerToken(req) {
    const header = req.headers['authorization'];
    if (typeof header !== 'string') return null;
    const [scheme, value] = header.split(' ');
    if (!value || String(scheme).toLowerCase() !== 'bearer') return null;
    return value.trim();
}

function touchUsage(token, ip) {
    const now = Date.now();
    const last = lastUsageFlush.get(token.id) || 0;
    if (now - last < USAGE_FLUSH_MS) return;
    lastUsageFlush.set(token.id, now);

    db.choir_api_token.update(
        { lastUsedAt: new Date(), lastUsedIp: ip || null, usageCount: (token.usageCount || 0) + 1 },
        { where: { id: token.id } }
    ).catch(err => logger.warn(`[ApiToken] Failed to persist usage for token ${token.id}: ${err.message}`));
}

/**
 * Authenticates a choir-scoped API token.
 *
 * Deliberately separate from {@link verifyToken}: this middleware is only mounted
 * on the MCP router, so an API token can never reach a regular JWT-protected route.
 * No user identity is established - `req.userId` stays null on purpose.
 */
async function verifyChoirApiToken(req, res, next) {
    const plaintext = extractBearerToken(req);
    if (!plaintext) {
        return next(new AuthenticationError('API token required.'));
    }

    let token;
    try {
        token = await tokenService.resolveToken(plaintext);
    } catch (err) {
        return next(err);
    }

    if (!token) {
        logger.warn(`[ApiToken] Unknown token presented from ${req.ip}`);
        return next(new AuthenticationError('Invalid API token.'));
    }
    if (token.revokedAt) {
        return next(new AuthenticationError('API token has been revoked.'));
    }
    if (new Date(token.expiresAt) <= new Date()) {
        return next(new AuthenticationError('API token has expired.'));
    }

    const choir = await db.choir.findByPk(token.choirId, { attributes: ['id', 'name', 'location', 'modules'] });
    if (!choir) {
        return next(new AuthenticationError('Choir for this API token no longer exists.'));
    }

    req.apiToken = {
        id: token.id,
        choirId: token.choirId,
        label: token.label,
        scopes: Array.isArray(token.scopes) ? token.scopes : [],
        allowWrite: Boolean(token.allowWrite) && tokenService.WRITE_ENABLED,
        createdByUserId: token.createdByUserId,
    };
    req.apiChoir = choir;
    req.activeChoirId = token.choirId;
    req.userId = null;
    req.userRoles = ['api'];

    const ctx = getRequestContext();
    if (ctx) {
        ctx.userId = null;
        ctx.roles = ['api'];
        ctx.activeChoirId = token.choirId;
        ctx.apiTokenId = token.id;
    }

    touchUsage(token, req.ip);
    return next();
}

function requireScope(scope) {
    return (req, res, next) => {
        if (!req.apiToken) {
            return next(new AuthenticationError('API token required.'));
        }
        if (!req.apiToken.scopes.includes(scope)) {
            return next(new AuthorizationError(`API token is missing the required scope "${scope}".`));
        }
        return next();
    };
}

function requireWriteAccess(req, res, next) {
    if (!req.apiToken) {
        return next(new AuthenticationError('API token required.'));
    }
    if (!tokenService.WRITE_ENABLED) {
        return next(new AuthorizationError('Write access is disabled on this server.'));
    }
    if (!req.apiToken.allowWrite || !req.apiToken.scopes.includes('events:write')) {
        return next(new AuthorizationError('API token is not allowed to write.'));
    }
    return next();
}

function resetUsageCacheForTests() {
    lastUsageFlush.clear();
}

module.exports = {
    verifyChoirApiToken,
    requireScope,
    requireWriteAccess,
    resetUsageCacheForTests,
};
