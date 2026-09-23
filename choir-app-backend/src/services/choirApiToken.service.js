const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');

const TOKEN_PREFIX = 'ckm';
const PREFIX_DISPLAY_LENGTH = 12;

const READ_SCOPES = ['events:read', 'repertoire:read', 'search:read', 'plan:read', 'stats:read'];
const WRITE_SCOPES = ['events:write'];
const ALL_SCOPES = [...READ_SCOPES, ...WRITE_SCOPES];

const MAX_DAYS = parseInt(process.env.API_TOKEN_MAX_DAYS, 10) || 90;
const MAX_PER_CHOIR = parseInt(process.env.API_TOKEN_MAX_PER_CHOIR, 10) || 5;
const WRITE_ENABLED = String(process.env.MCP_WRITE_ENABLED ?? 'true').toLowerCase() !== 'false';

function hashToken(plaintext) {
    return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

function generateToken() {
    const secret = crypto.randomBytes(32).toString('base64url');
    const scope = crypto.randomBytes(5).toString('base64url').slice(0, 6).toLowerCase();
    const plaintext = `${TOKEN_PREFIX}_${scope}_${secret}`;
    return {
        plaintext,
        tokenHash: hashToken(plaintext),
        tokenPrefix: plaintext.slice(0, PREFIX_DISPLAY_LENGTH),
    };
}

function normalizeScopes(requested) {
    const list = Array.isArray(requested) ? requested : [];
    const cleaned = list
        .map(s => String(s).trim())
        .filter(s => ALL_SCOPES.includes(s));
    const unique = [...new Set(cleaned)];
    return unique.length > 0 ? unique : [...READ_SCOPES];
}

function clampValidDays(validDays) {
    const parsed = parseInt(validDays, 10);
    if (Number.isNaN(parsed) || parsed < 1) return MAX_DAYS;
    return Math.min(parsed, MAX_DAYS);
}

function expiryFromNow(validDays) {
    const expires = new Date();
    expires.setDate(expires.getDate() + clampValidDays(validDays));
    return expires;
}

function isActive(token, now = new Date()) {
    return Boolean(token) && !token.revokedAt && new Date(token.expiresAt) > now;
}

/** Public representation - never contains the plaintext token or its hash. */
function serializeToken(token) {
    return {
        id: token.id,
        label: token.label,
        tokenPrefix: token.tokenPrefix,
        scopes: token.scopes || [],
        allowWrite: Boolean(token.allowWrite),
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        lastUsedIp: token.lastUsedIp,
        usageCount: token.usageCount,
        writeCount: token.writeCount,
        renewedAt: token.renewedAt,
        renewCount: token.renewCount,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
        active: isActive(token),
    };
}

async function listTokens(choirId) {
    const tokens = await db.choir_api_token.findAll({
        where: { choirId },
        order: [['createdAt', 'DESC']],
    });
    return tokens.map(serializeToken);
}

async function countActiveTokens(choirId) {
    return db.choir_api_token.count({
        where: {
            choirId,
            revokedAt: null,
            expiresAt: { [Op.gt]: new Date() },
        },
    });
}

async function createToken({ choirId, createdByUserId, label, scopes, validDays, allowWrite }) {
    const activeCount = await countActiveTokens(choirId);
    if (activeCount >= MAX_PER_CHOIR) {
        const err = new Error(`Maximum of ${MAX_PER_CHOIR} active API tokens per choir reached.`);
        err.statusCode = 409;
        throw err;
    }

    const normalizedScopes = normalizeScopes(scopes);
    const wantsWrite = Boolean(allowWrite) && normalizedScopes.some(s => WRITE_SCOPES.includes(s));
    const effectiveWrite = wantsWrite && WRITE_ENABLED;
    const effectiveScopes = effectiveWrite
        ? normalizedScopes
        : normalizedScopes.filter(s => !WRITE_SCOPES.includes(s));

    const { plaintext, tokenHash, tokenPrefix } = generateToken();

    const token = await db.choir_api_token.create({
        choirId,
        createdByUserId,
        label: String(label || '').trim() || 'API-Token',
        tokenHash,
        tokenPrefix,
        scopes: effectiveScopes.length > 0 ? effectiveScopes : [...READ_SCOPES],
        allowWrite: effectiveWrite,
        expiresAt: expiryFromNow(validDays),
    });

    logger.info(`[ApiToken] Created token ${tokenPrefix}... for choir ${choirId} by user ${createdByUserId}`);
    return { token: serializeToken(token), plaintext };
}

async function findTokenForChoir(id, choirId) {
    return db.choir_api_token.findOne({ where: { id, choirId } });
}

async function renewToken({ id, choirId, validDays }) {
    const token = await findTokenForChoir(id, choirId);
    if (!token) return null;
    if (token.revokedAt) {
        const err = new Error('Revoked tokens cannot be renewed.');
        err.statusCode = 409;
        throw err;
    }

    await token.update({
        expiresAt: expiryFromNow(validDays),
        renewedAt: new Date(),
        renewCount: (token.renewCount || 0) + 1,
        expiryNotifiedAt: null,
    });
    return serializeToken(token);
}

async function rotateToken({ id, choirId }) {
    const token = await findTokenForChoir(id, choirId);
    if (!token) return null;
    if (token.revokedAt) {
        const err = new Error('Revoked tokens cannot be rotated.');
        err.statusCode = 409;
        throw err;
    }

    const { plaintext, tokenHash, tokenPrefix } = generateToken();
    await token.update({ tokenHash, tokenPrefix, usageCount: 0, lastUsedAt: null, lastUsedIp: null });
    return { token: serializeToken(token), plaintext };
}

async function revokeToken({ id, choirId, revokedByUserId }) {
    const token = await findTokenForChoir(id, choirId);
    if (!token) return null;
    if (!token.revokedAt) {
        await token.update({ revokedAt: new Date(), revokedByUserId });
    }
    return serializeToken(token);
}

/** Revokes every token a user created for a choir - used when their role is removed. */
async function revokeTokensCreatedBy({ choirId, userId }) {
    const [count] = await db.choir_api_token.update(
        { revokedAt: new Date(), revokedByUserId: userId },
        { where: { choirId, createdByUserId: userId, revokedAt: null } }
    );
    if (count > 0) {
        logger.info(`[ApiToken] Revoked ${count} token(s) of user ${userId} in choir ${choirId}`);
    }
    return count;
}

async function resolveToken(plaintext) {
    if (typeof plaintext !== 'string' || plaintext.length < 20) return null;
    const token = await db.choir_api_token.findOne({ where: { tokenHash: hashToken(plaintext) } });
    return token || null;
}

module.exports = {
    READ_SCOPES,
    WRITE_SCOPES,
    ALL_SCOPES,
    MAX_DAYS,
    MAX_PER_CHOIR,
    WRITE_ENABLED,
    hashToken,
    generateToken,
    normalizeScopes,
    clampValidDays,
    isActive,
    serializeToken,
    listTokens,
    countActiveTokens,
    createToken,
    renewToken,
    rotateToken,
    revokeToken,
    revokeTokensCreatedBy,
    resolveToken,
};
