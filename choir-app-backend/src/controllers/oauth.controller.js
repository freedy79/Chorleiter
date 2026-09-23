const asyncHandler = require('express-async-handler');
const db = require('../models');
const logger = require('../config/logger');
const oauthService = require('../services/oauth.service');
const tokenService = require('../services/choirApiToken.service');
const { getFrontendUrl } = require('../utils/frontend-url');

const MANAGER_ROLES = ['choir_admin', 'director'];

function baseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

function issuer(req) {
    return `${baseUrl(req)}/api/oauth`;
}

function resourceUrl(req) {
    return `${baseUrl(req)}/api/mcp`;
}

function sendOAuthError(res, err) {
    const status = err.statusCode || 400;
    return res.status(status).json({
        error: err.oauthCode || 'invalid_request',
        error_description: err.message,
    });
}

/** RFC 9728 - tells the client which authorization server protects /api/mcp. */
exports.protectedResourceMetadata = asyncHandler(async (req, res) => {
    res.status(200).json({
        resource: resourceUrl(req),
        authorization_servers: [issuer(req)],
        scopes_supported: tokenService.ALL_SCOPES,
        bearer_methods_supported: ['header'],
        resource_documentation: `${await getFrontendUrl()}/api-tokens`,
    });
});

/** RFC 8414 - authorization server metadata for the MCP OAuth facade. */
exports.authorizationServerMetadata = asyncHandler(async (req, res) => {
    const base = issuer(req);
    res.status(200).json({
        issuer: base,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        registration_endpoint: `${base}/register`,
        revocation_endpoint: `${base}/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: tokenService.ALL_SCOPES,
        service_documentation: `${await getFrontendUrl()}/api-tokens`,
    });
});

/** RFC 7591 dynamic client registration. Public clients only. */
exports.register = asyncHandler(async (req, res) => {
    try {
        const client = await oauthService.registerClient(req.body || {});
        res.status(201).json({
            client_id: client.clientId,
            client_id_issued_at: Math.floor(new Date(client.createdAt).getTime() / 1000),
            client_name: client.clientName,
            redirect_uris: client.redirectUris,
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none',
        });
    } catch (err) {
        if (err instanceof oauthService.OAuthError) return sendOAuthError(res, err);
        throw err;
    }
});

/**
 * Validates the request, then hands the user to the Angular consent screen.
 * Invalid client or redirect_uri must never be redirected back to.
 */
exports.authorize = asyncHandler(async (req, res) => {
    try {
        await oauthService.validateAuthorizationRequest(req.query);
    } catch (err) {
        if (err instanceof oauthService.OAuthError) return sendOAuthError(res, err);
        throw err;
    }

    const frontendUrl = await getFrontendUrl();
    const params = new URLSearchParams();
    for (const key of ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource']) {
        if (req.query[key]) params.set(key, String(req.query[key]));
    }
    res.redirect(302, `${frontendUrl}/oauth/consent?${params.toString()}`);
});

/** Data for the consent screen: who is asking, for what, and for which choir. */
exports.consentInfo = asyncHandler(async (req, res) => {
    let validated;
    try {
        validated = await oauthService.validateAuthorizationRequest(req.query);
    } catch (err) {
        if (err instanceof oauthService.OAuthError) return sendOAuthError(res, err);
        throw err;
    }

    const memberships = await db.user_choir.findAll({
        where: { userId: req.userId },
        include: [{ model: db.choir, attributes: ['id', 'name'] }],
    });

    const choirs = memberships
        .filter(m => Array.isArray(m.rolesInChoir) && m.rolesInChoir.some(role => MANAGER_ROLES.includes(role)))
        .map(m => ({ id: m.choirId, name: m.choir?.name || `Chor ${m.choirId}` }));

    res.status(200).json({
        client: { name: validated.client.clientName, uri: validated.client.clientUri },
        redirectUri: validated.redirectUri,
        scopes: validated.scopes,
        allowWrite: validated.allowWrite,
        choirs,
        maxDays: tokenService.MAX_DAYS,
    });
});

/** Consent decision. Requires a logged-in manager of the selected choir. */
exports.decide = asyncHandler(async (req, res) => {
    const { approved, choirId, state } = req.body || {};

    let validated;
    try {
        validated = await oauthService.validateAuthorizationRequest(req.body);
    } catch (err) {
        if (err instanceof oauthService.OAuthError) return sendOAuthError(res, err);
        throw err;
    }

    const buildRedirect = (params) => {
        const url = new URL(validated.redirectUri);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        }
        return url.toString();
    };

    if (!approved) {
        return res.status(200).json({ redirectTo: buildRedirect({ error: 'access_denied', state }) });
    }

    const targetChoirId = parseInt(choirId, 10);
    if (Number.isNaN(targetChoirId)) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'A choir must be selected.' });
    }

    const membership = await db.user_choir.findOne({ where: { userId: req.userId, choirId: targetChoirId } });
    const roles = Array.isArray(membership?.rolesInChoir) ? membership.rolesInChoir : [];
    const isGlobalAdmin = Array.isArray(req.userRoles) && req.userRoles.includes('admin');
    if (!isGlobalAdmin && !roles.some(role => MANAGER_ROLES.includes(role))) {
        return res.status(403).json({ error: 'access_denied', error_description: 'You may only grant access for a choir you manage.' });
    }

    const code = await oauthService.createAuthorizationCode({
        client: validated.client,
        redirectUri: validated.redirectUri,
        codeChallenge: validated.codeChallenge,
        scopes: validated.scopes,
        allowWrite: validated.allowWrite,
        choirId: targetChoirId,
        userId: req.userId,
        resource: validated.resource,
    });

    logger.info(`[OAuth] User ${req.userId} granted "${validated.client.clientName}" access to choir ${targetChoirId}`);
    res.status(200).json({ redirectTo: buildRedirect({ code, state }) });
});

exports.token = asyncHandler(async (req, res) => {
    const body = req.body || {};
    try {
        if (body.grant_type === 'authorization_code') {
            const result = await oauthService.exchangeAuthorizationCode({
                code: body.code,
                codeVerifier: body.code_verifier,
                clientId: body.client_id,
                redirectUri: body.redirect_uri,
            });
            res.set('Cache-Control', 'no-store');
            return res.status(200).json(result);
        }

        if (body.grant_type === 'refresh_token') {
            const result = await oauthService.refreshAccessToken({
                refreshToken: body.refresh_token,
                clientId: body.client_id,
            });
            res.set('Cache-Control', 'no-store');
            return res.status(200).json(result);
        }

        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Only authorization_code and refresh_token are supported.',
        });
    } catch (err) {
        if (err instanceof oauthService.OAuthError) return sendOAuthError(res, err);
        if (err.statusCode === 409) {
            return res.status(400).json({ error: 'invalid_scope', error_description: err.message });
        }
        throw err;
    }
});

exports.revoke = asyncHandler(async (req, res) => {
    await oauthService.revokeGrant({ token: req.body?.token, clientId: req.body?.client_id });
    // RFC 7009: always 200, regardless of whether the token existed.
    res.status(200).json({});
});
