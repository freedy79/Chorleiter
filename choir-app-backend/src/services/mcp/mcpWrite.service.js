const crypto = require('crypto');
const { Op, fn, col, where: sqWhere } = require('sequelize');
const db = require('../../models');
const logger = require('../../config/logger');
const S = require('./mcpSerializers');
const { isoDateString, parseDateOnly } = require('../../utils/date.utils');

const CONFIRMATION_TTL_SEC = parseInt(process.env.MCP_CONFIRMATION_TTL_SEC, 10) || 300;
const WRITE_QUOTA_PER_DAY = parseInt(process.env.MCP_WRITE_QUOTA_PER_DAY, 10) || 20;
const MAX_PIECES_PER_EVENT = 60;

// confirmationToken -> pending change. Single use, short lived, bound to token + payload hash.
const pendingChanges = new Map();
const writeQuota = new Map();

function badRequest(message, details) {
    const err = new Error(message);
    err.statusCode = 400;
    err.details = details;
    return err;
}

function payloadHash(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function prunePending() {
    const now = Date.now();
    for (const [key, value] of pendingChanges.entries()) {
        if (value.expiresAt <= now) pendingChanges.delete(key);
    }
}

function quotaKey(apiTokenId) {
    return `${apiTokenId}:${new Date().toISOString().slice(0, 10)}`;
}

function assertQuota(apiTokenId) {
    const key = quotaKey(apiTokenId);
    const used = writeQuota.get(key) || 0;
    if (used >= WRITE_QUOTA_PER_DAY) {
        const err = new Error(`Daily write quota of ${WRITE_QUOTA_PER_DAY} changes is exhausted for this token.`);
        err.statusCode = 429;
        throw err;
    }
}

function consumeQuota(apiTokenId) {
    const key = quotaKey(apiTokenId);
    writeQuota.set(key, (writeQuota.get(key) || 0) + 1);
}

function normalizeTitle(title) {
    return String(title || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/**
 * Maps free-text titles to real piece ids inside the choir repertoire.
 *
 * Mandatory first step of the write flow: the model can only ever commit ids
 * that came out of here, so it cannot invent pieces.
 */
async function resolvePieces(choirId, titles) {
    const list = Array.isArray(titles) ? titles.slice(0, 30) : [];
    if (!list.length) return { resolved: [], unresolved: [] };

    const repertoireRows = await db.choir_repertoire.findAll({
        where: { choirId },
        attributes: ['pieceId'],
        raw: true,
    });
    const pieceIds = repertoireRows.map(r => r.pieceId);
    if (!pieceIds.length) {
        return { resolved: [], unresolved: list.map(t => ({ query: t, candidates: [] })) };
    }

    const pieces = await db.piece.findAll({
        where: { id: pieceIds },
        attributes: ['id', 'title', 'subtitle', 'composerId'],
        include: [{ model: db.composer, as: 'composer', attributes: ['id', 'name'] }],
    });

    const indexed = pieces.map(p => ({
        piece: p,
        normalized: normalizeTitle(p.title),
        normalizedSub: normalizeTitle(p.subtitle),
    }));

    const resolved = [];
    const unresolved = [];

    for (const rawTitle of list) {
        const needle = normalizeTitle(rawTitle);
        if (!needle) continue;

        const exact = indexed.filter(i => i.normalized === needle);
        const partial = exact.length
            ? exact
            : indexed.filter(i => i.normalized.includes(needle) || needle.includes(i.normalized) || (i.normalizedSub && i.normalizedSub.includes(needle)));

        if (partial.length === 1) {
            resolved.push({ query: rawTitle, ...S.serializePieceRef(partial[0].piece) });
        } else {
            unresolved.push({
                query: rawTitle,
                reason: partial.length === 0 ? 'not_in_repertoire' : 'ambiguous',
                candidates: partial.slice(0, 10).map(i => S.serializePieceRef(i.piece)),
            });
        }
    }

    return { resolved, unresolved };
}

async function findWritableEvent(choirId, { eventId, date, type }) {
    if (eventId) {
        const event = await db.event.findOne({ where: { id: eventId, choirId } });
        if (!event) throw badRequest('Event not found for this choir.');
        return event;
    }
    if (!date) throw badRequest('Either eventId or date is required.');

    const dateOnly = isoDateString(parseDateOnly(date));
    const candidates = await db.event.findAll({
        where: {
            choirId,
            ...(type ? { type } : {}),
            [Op.and]: [sqWhere(fn('date', col('date')), dateOnly)],
        },
    });
    if (candidates.length === 0) throw badRequest(`No event found on ${dateOnly}. Create it in the app first.`);
    if (candidates.length > 1) {
        throw badRequest(`Several events exist on ${dateOnly}. Pass an explicit eventId.`, {
            events: candidates.map(e => ({ id: `event:${e.id}`, eventId: e.id, type: e.type })),
        });
    }
    return candidates[0];
}

async function pieceTitles(pieceIds) {
    if (!pieceIds.length) return new Map();
    const pieces = await db.piece.findAll({ where: { id: pieceIds }, attributes: ['id', 'title'], raw: true });
    return new Map(pieces.map(p => [p.id, S.sanitizeText(p.title, 300)]));
}

/** Computes the diff and hands out a confirmation token. Never mutates anything. */
async function prepareEventPieces({ apiTokenId, choirId, eventId, date, type, pieceIds, mode = 'replace' }) {
    assertQuota(apiTokenId);

    if (!['replace', 'append'].includes(mode)) throw badRequest('mode must be "replace" or "append".');
    const requestedIds = [...new Set((Array.isArray(pieceIds) ? pieceIds : []).map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id)))];
    if (!requestedIds.length) throw badRequest('pieceIds must contain at least one id from resolve_pieces.');
    if (requestedIds.length > MAX_PIECES_PER_EVENT) throw badRequest(`At most ${MAX_PIECES_PER_EVENT} pieces per event.`);

    const event = await findWritableEvent(choirId, { eventId, date, type });
    if (event.finalized) throw badRequest('This event is finalized and can no longer be changed.');

    const owned = await db.choir_repertoire.findAll({
        where: { choirId, pieceId: requestedIds },
        attributes: ['pieceId'],
        raw: true,
    });
    const ownedIds = new Set(owned.map(o => o.pieceId));
    const foreign = requestedIds.filter(id => !ownedIds.has(id));
    if (foreign.length) {
        throw badRequest('Some pieces are not part of this choir repertoire. Use resolve_pieces first.', { unknownPieceIds: foreign });
    }

    const currentRows = await db.event_pieces.findAll({ where: { eventId: event.id }, attributes: ['pieceId'], raw: true });
    const currentIds = currentRows.map(r => r.pieceId);
    const nextIds = mode === 'append'
        ? [...new Set([...currentIds, ...requestedIds])]
        : requestedIds;

    const titles = await pieceTitles([...new Set([...currentIds, ...nextIds])]);
    const added = nextIds.filter(id => !currentIds.includes(id));
    const removed = currentIds.filter(id => !nextIds.includes(id));

    const payload = { eventId: event.id, choirId, mode, nextIds, version: event.version ?? 0 };
    const confirmationToken = crypto.randomBytes(24).toString('base64url');
    prunePending();
    pendingChanges.set(confirmationToken, {
        apiTokenId,
        hash: payloadHash(payload),
        payload,
        expiresAt: Date.now() + CONFIRMATION_TTL_SEC * 1000,
    });

    return {
        confirmationToken,
        expiresInSeconds: CONFIRMATION_TTL_SEC,
        applied: false,
        event: {
            id: `event:${event.id}`,
            eventId: event.id,
            date: event.date,
            type: event.type,
            version: event.version ?? 0,
        },
        mode,
        before: currentIds.map(id => ({ pieceId: id, title: titles.get(id) || null })),
        after: nextIds.map(id => ({ pieceId: id, title: titles.get(id) || null })),
        added: added.map(id => ({ pieceId: id, title: titles.get(id) || null })),
        removed: removed.map(id => ({ pieceId: id, title: titles.get(id) || null })),
        hint: 'Show this diff to the user and call commit_event_pieces with the confirmationToken to apply it.',
    };
}

/** Applies a prepared change exactly once. */
async function commitEventPieces({ apiTokenId, choirId, confirmationToken }) {
    prunePending();
    const pending = pendingChanges.get(confirmationToken);
    if (!pending) throw badRequest('Unknown or expired confirmationToken. Call prepare_event_pieces again.');
    if (pending.apiTokenId !== apiTokenId) throw badRequest('This confirmationToken belongs to a different API token.');
    if (pending.payload.choirId !== choirId) throw badRequest('This confirmationToken belongs to a different choir.');
    if (pending.hash !== payloadHash(pending.payload)) throw badRequest('Confirmation payload was tampered with.');

    assertQuota(apiTokenId);
    // Single use: drop it before doing any work so a retry cannot apply it twice.
    pendingChanges.delete(confirmationToken);

    const { eventId, nextIds, version } = pending.payload;
    const event = await db.event.findOne({ where: { id: eventId, choirId } });
    if (!event) throw badRequest('Event no longer exists.');
    if (event.finalized) throw badRequest('This event is finalized and can no longer be changed.');
    if ((event.version ?? 0) !== version) {
        const err = new Error('The event was changed in the meantime. Call prepare_event_pieces again.');
        err.statusCode = 409;
        throw err;
    }

    await db.sequelize.transaction(async (transaction) => {
        await db.event_pieces.destroy({ where: { eventId }, transaction });
        if (nextIds.length) {
            await db.event_pieces.bulkCreate(nextIds.map(pieceId => ({ eventId, pieceId })), { transaction });
        }
        await event.update({ version: (event.version ?? 0) + 1 }, { transaction });
    });

    // Keep repertoire status consistent with the app's own logic.
    const eventController = require('../../controllers/event.controller');
    await eventController.autoUpdatePieceStatuses(event.type, choirId, nextIds);

    consumeQuota(apiTokenId);
    await db.choir_api_token.increment('writeCount', { where: { id: apiTokenId } }).catch(() => {});

    const titles = await pieceTitles(nextIds);
    logger.info(`[MCP] Token ${apiTokenId} updated piece list of event ${eventId} (${nextIds.length} pieces)`);

    return {
        applied: true,
        event: { id: `event:${eventId}`, eventId, date: event.date, type: event.type, version: event.version },
        pieces: nextIds.map(id => ({ pieceId: id, title: titles.get(id) || null })),
    };
}

function resetForTests() {
    pendingChanges.clear();
    writeQuota.clear();
}

module.exports = {
    CONFIRMATION_TTL_SEC,
    WRITE_QUOTA_PER_DAY,
    resolvePieces,
    prepareEventPieces,
    commitEventPieces,
    resetForTests,
};
