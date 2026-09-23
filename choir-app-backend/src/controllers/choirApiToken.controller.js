const asyncHandler = require('express-async-handler');
const tokenService = require('../services/choirApiToken.service');
const { ValidationError, NotFoundError } = require('../utils/errors');

exports.list = asyncHandler(async (req, res) => {
    const tokens = await tokenService.listTokens(req.activeChoirId);
    res.status(200).send({
        tokens,
        limits: {
            maxDays: tokenService.MAX_DAYS,
            maxPerChoir: tokenService.MAX_PER_CHOIR,
            writeEnabled: tokenService.WRITE_ENABLED,
        },
        availableScopes: tokenService.ALL_SCOPES,
    });
});

exports.create = asyncHandler(async (req, res) => {
    const { label, scopes, validDays, allowWrite } = req.body || {};
    if (!label || String(label).trim().length < 3) {
        throw new ValidationError('A label with at least 3 characters is required.');
    }

    const { token, plaintext } = await tokenService.createToken({
        choirId: req.activeChoirId,
        createdByUserId: req.userId,
        label,
        scopes,
        validDays,
        allowWrite,
    });

    // The plaintext is returned exactly once and never stored.
    res.status(201).send({ ...token, token: plaintext });
});

exports.renew = asyncHandler(async (req, res) => {
    const token = await tokenService.renewToken({
        id: req.params.id,
        choirId: req.activeChoirId,
        validDays: req.body?.validDays,
    });
    if (!token) throw new NotFoundError('API token');
    res.status(200).send(token);
});

exports.rotate = asyncHandler(async (req, res) => {
    const result = await tokenService.rotateToken({
        id: req.params.id,
        choirId: req.activeChoirId,
    });
    if (!result) throw new NotFoundError('API token');
    res.status(200).send({ ...result.token, token: result.plaintext });
});

exports.revoke = asyncHandler(async (req, res) => {
    const token = await tokenService.revokeToken({
        id: req.params.id,
        choirId: req.activeChoirId,
        revokedByUserId: req.userId,
    });
    if (!token) throw new NotFoundError('API token');
    res.status(200).send(token);
});
