const { Op } = require('sequelize');
const db = require('../../models');
const S = require('./mcpSerializers');

const MAX_LIMIT = 50;

function clampLimit(value, fallback = 20, max = MAX_LIMIT) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function likeOperator() {
    return db.sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
}

function likeValue(query) {
    return `%${String(query).trim().replace(/[%_]/g, '')}%`;
}

function pieceInclude(withLyrics = false) {
    const attributes = ['id', 'title', 'subtitle', 'voicing', 'key', 'timeSignature', 'durationSec', 'origin', 'composerId', 'authorId', 'categoryId'];
    if (withLyrics) attributes.push('lyrics');
    return {
        attributes,
        include: [
            { model: db.composer, as: 'composer', attributes: ['id', 'name'] },
            { model: db.author, as: 'author', attributes: ['id', 'name'] },
            { model: db.category, as: 'category', attributes: ['id', 'name'] },
            { model: db.composer, as: 'composers', attributes: ['id', 'name'], through: { attributes: [] } },
            { model: db.composer, as: 'arrangers', attributes: ['id', 'name'], through: { attributes: [] } },
        ],
    };
}

async function loadCollectionRefs(pieceIds) {
    const byPiece = new Map();
    if (!pieceIds.length) return byPiece;

    const rows = await db.collection_piece.findAll({
        where: { pieceId: pieceIds },
        attributes: ['pieceId', 'collectionId', 'numberInCollection'],
        order: [['id', 'ASC']],
        raw: true,
    });
    const collectionIds = [...new Set(rows.map(r => r.collectionId))];
    if (!collectionIds.length) return byPiece;

    const collections = await db.collection.findAll({
        where: { id: collectionIds },
        attributes: ['id', 'title', 'prefix', 'singleEdition'],
        raw: true,
    });
    const byId = new Map(collections.map(c => [c.id, c]));

    for (const row of rows) {
        const collection = byId.get(row.collectionId);
        if (!collection) continue;
        const list = byPiece.get(row.pieceId) || [];
        list.push({ collection, numberInCollection: row.numberInCollection });
        byPiece.set(row.pieceId, list);
    }
    return byPiece;
}

/**
 * Builds per-piece performance statistics for one choir.
 *
 * Aggregated in JS instead of raw SQL so the same code path works on the
 * PostgreSQL production database and the SQLite test database.
 */
async function loadPerformanceIndex(choirId) {
    const events = await db.event.findAll({
        where: { choirId },
        attributes: ['id', 'date', 'type', 'notes'],
        raw: true,
    });
    if (!events.length) return new Map();

    const eventById = new Map(events.map(e => [e.id, e]));
    const links = await db.event_pieces.findAll({
        where: { eventId: [...eventById.keys()] },
        attributes: ['eventId', 'pieceId'],
        raw: true,
    });

    const index = new Map();
    for (const link of links) {
        const event = eventById.get(link.eventId);
        if (!event) continue;
        const entry = index.get(link.pieceId) || {
            lastSung: null, lastRehearsed: null, timesSung: 0, timesRehearsed: 0, performances: [],
        };
        const date = event.date instanceof Date ? event.date.toISOString() : String(event.date);
        if (event.type === 'SERVICE') {
            entry.timesSung += 1;
            if (!entry.lastSung || date > entry.lastSung) entry.lastSung = date;
        } else if (event.type === 'REHEARSAL') {
            entry.timesRehearsed += 1;
            if (!entry.lastRehearsed || date > entry.lastRehearsed) entry.lastRehearsed = date;
        }
        entry.performances.push({ eventId: event.id, date, type: event.type, notes: S.sanitizeText(event.notes, 200) });
        index.set(link.pieceId, entry);
    }

    for (const entry of index.values()) {
        entry.performances.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return index;
}

async function getChoirInfo(choirId) {
    const choir = await db.choir.findByPk(choirId, { attributes: ['id', 'name', 'location', 'modules'] });
    if (!choir) return null;

    const [repertoireCount, singableCount, rehearsalCount, eventCount] = await Promise.all([
        db.choir_repertoire.count({ where: { choirId } }),
        db.choir_repertoire.count({ where: { choirId, status: 'CAN_BE_SUNG' } }),
        db.choir_repertoire.count({ where: { choirId, status: 'IN_REHEARSAL' } }),
        db.event.count({ where: { choirId } }),
    ]);

    return S.serializeChoir(choir, { repertoireCount, singableCount, rehearsalCount, eventCount });
}

async function loadEvents(choirId, { where = {}, order, limit }) {
    const events = await db.event.findAll({
        where: { choirId, ...where },
        attributes: ['id', 'date', 'type', 'notes', 'finalized', 'directorId', 'organistId'],
        include: [
            { model: db.user, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: db.user, as: 'organist', attributes: ['id', 'firstName', 'name'] },
            { model: db.piece, attributes: ['id', 'title', 'composerId'], through: { attributes: [] }, include: [{ model: db.composer, as: 'composer', attributes: ['id', 'name'] }] },
        ],
        order,
        limit,
    });
    return events.map(e => S.serializeEvent(e));
}

async function listUpcomingEvents(choirId, { from, to, type, limit } = {}) {
    const where = { date: { [Op.gte]: from ? new Date(from) : new Date() } };
    if (to) where.date[Op.lte] = new Date(to);
    if (type) where.type = type;
    return loadEvents(choirId, { where, order: [['date', 'ASC']], limit: clampLimit(limit) });
}

async function listRecentEvents(choirId, { type, limit, before } = {}) {
    const where = { date: { [Op.lte]: before ? new Date(before) : new Date() } };
    if (type) where.type = type;
    return loadEvents(choirId, { where, order: [['date', 'DESC']], limit: clampLimit(limit, 5, 20) });
}

async function getLastEvent(choirId, { type = 'REHEARSAL', before } = {}) {
    const events = await listRecentEvents(choirId, { type, limit: 1, before });
    return events[0] || null;
}

async function getEvent(choirId, eventId) {
    const events = await loadEvents(choirId, { where: { id: eventId }, limit: 1 });
    return events[0] || null;
}

async function listRepertoire(choirId, { status, voicing, minRating, query, limit, offset } = {}) {
    const repertoireWhere = { choirId };
    if (status) repertoireWhere.status = status;
    if (minRating) repertoireWhere.rating = { [Op.gte]: parseInt(minRating, 10) };

    const pieceWhere = {};
    if (voicing) pieceWhere.voicing = voicing;
    if (query) pieceWhere.title = { [likeOperator()]: likeValue(query) };

    const effectiveLimit = clampLimit(limit);
    const effectiveOffset = Math.max(0, parseInt(offset, 10) || 0);

    const rows = await db.choir_repertoire.findAll({
        where: repertoireWhere,
        attributes: ['pieceId', 'status', 'rating', 'notes'],
        raw: true,
    });
    const statusByPiece = new Map(rows.map(r => [r.pieceId, r]));
    if (!statusByPiece.size) return { items: [], total: 0, truncated: false };

    const base = pieceInclude(false);
    const { count, rows: pieces } = await db.piece.findAndCountAll({
        where: { id: [...statusByPiece.keys()], ...pieceWhere },
        attributes: base.attributes,
        include: base.include,
        order: [['title', 'ASC']],
        limit: effectiveLimit,
        offset: effectiveOffset,
        distinct: true,
        subQuery: false,
    });

    const collectionRefs = await loadCollectionRefs(pieces.map(p => p.id));
    const stats = await loadPerformanceIndex(choirId);

    return {
        items: pieces.map(p => S.serializePiece(p, {
            repertoire: statusByPiece.get(p.id),
            stats: stats.get(p.id) || null,
            collections: collectionRefs.get(p.id) || [],
        })),
        total: count,
        nextOffset: effectiveOffset + pieces.length < count ? effectiveOffset + pieces.length : null,
        truncated: effectiveOffset + pieces.length < count,
    };
}

async function choirPieceIds(choirId) {
    const rows = await db.choir_repertoire.findAll({ where: { choirId }, attributes: ['pieceId'], raw: true });
    return rows.map(r => r.pieceId);
}

async function search(choirId, { query, scope = 'all', limit } = {}) {
    const term = String(query || '').trim();
    if (term.length < 2) return { pieces: [], collections: [], events: [] };

    const op = likeOperator();
    const value = likeValue(term);
    const effectiveLimit = clampLimit(limit, 15);
    const pieceIds = await choirPieceIds(choirId);

    const result = { pieces: [], collections: [], events: [] };
    if (!pieceIds.length && scope !== 'event') return result;

    const titleClause = { title: { [op]: value } };
    const subtitleClause = { subtitle: { [op]: value } };
    const lyricsClause = { lyrics: { [op]: value } };

    let pieceWhere = null;
    if (scope === 'title') {
        pieceWhere = { [Op.or]: [titleClause, subtitleClause] };
    } else if (scope === 'lyrics') {
        pieceWhere = lyricsClause;
    } else if (scope === 'person') {
        const creators = await Promise.all([
            db.composer.findAll({ where: { name: { [op]: value } }, attributes: ['id'], raw: true }),
            db.author.findAll({ where: { name: { [op]: value } }, attributes: ['id'], raw: true }),
        ]);
        const composerIds = creators[0].map(c => c.id);
        const authorIds = creators[1].map(a => a.id);
        const arrangerRows = composerIds.length
            ? await db.piece_arranger.findAll({ where: { composerId: composerIds }, attributes: ['pieceId'], raw: true })
            : [];
        const coComposerRows = composerIds.length
            ? await db.piece_composer.findAll({ where: { composerId: composerIds }, attributes: ['pieceId'], raw: true })
            : [];
        const relatedPieceIds = [...new Set([...arrangerRows, ...coComposerRows].map(r => r.pieceId))];
        pieceWhere = {
            [Op.or]: [
                ...(composerIds.length ? [{ composerId: composerIds }] : []),
                ...(authorIds.length ? [{ authorId: authorIds }] : []),
                ...(relatedPieceIds.length ? [{ id: relatedPieceIds }] : []),
                { origin: { [op]: value } },
            ],
        };
    } else if (scope !== 'collection' && scope !== 'event') {
        pieceWhere = { [Op.or]: [titleClause, subtitleClause, lyricsClause, { origin: { [op]: value } }] };
    }

    if (pieceWhere) {
        const base = pieceInclude(false);
        const pieces = await db.piece.findAll({
            where: { id: pieceIds, ...pieceWhere },
            attributes: base.attributes,
            include: base.include,
            order: [['title', 'ASC']],
            limit: effectiveLimit,
            subQuery: false,
        });
        const collectionRefs = await loadCollectionRefs(pieces.map(p => p.id));
        result.pieces = pieces.map(p => S.serializePiece(p, { collections: collectionRefs.get(p.id) || [] }));
    }

    if (scope === 'all' || scope === 'collection') {
        const collectionRows = pieceIds.length
            ? await db.collection_piece.findAll({ where: { pieceId: pieceIds }, attributes: ['collectionId'], raw: true })
            : [];
        const ids = [...new Set(collectionRows.map(r => r.collectionId))];
        if (ids.length) {
            const collections = await db.collection.findAll({
                where: {
                    id: ids,
                    [Op.or]: [{ title: { [op]: value } }, { subtitle: { [op]: value } }, { prefix: { [op]: value } }],
                },
                limit: effectiveLimit,
            });
            result.collections = collections.map(S.serializeCollection);
        }
    }

    if (scope === 'all' || scope === 'event') {
        const events = await loadEvents(choirId, {
            where: { notes: { [op]: value } },
            order: [['date', 'DESC']],
            limit: clampLimit(limit, 10, 20),
        });
        result.events = events;
    }

    return result;
}

async function fetchById(choirId, id) {
    const [kind, rawId] = String(id || '').split(':');
    const numericId = parseInt(rawId, 10);
    if (!kind || Number.isNaN(numericId)) return null;

    if (kind === 'event') {
        return getEvent(choirId, numericId);
    }

    if (kind === 'piece') {
        const repertoire = await db.choir_repertoire.findOne({
            where: { choirId, pieceId: numericId },
            attributes: ['status', 'rating', 'notes'],
            raw: true,
        });
        if (!repertoire) return null;
        const base = pieceInclude(true);
        const piece = await db.piece.findByPk(numericId, { attributes: base.attributes, include: base.include });
        if (!piece) return null;
        const collectionRefs = await loadCollectionRefs([numericId]);
        const stats = await loadPerformanceIndex(choirId);
        return S.serializePiece(piece, {
            includeLyrics: true,
            repertoire,
            stats: stats.get(numericId) || null,
            collections: collectionRefs.get(numericId) || [],
        });
    }

    if (kind === 'collection') {
        const belongs = await db.collection_piece.findOne({
            where: { collectionId: numericId, pieceId: await choirPieceIds(choirId) },
            attributes: ['id'],
            raw: true,
        });
        if (!belongs) return null;
        const collection = await db.collection.findByPk(numericId);
        return S.serializeCollection(collection);
    }

    return null;
}

async function getServicePlan(choirId, year, month) {
    const plan = await db.monthly_plan.findOne({
        where: { choirId, year, month },
        include: [{
            model: db.plan_entry,
            as: 'entries',
            include: [
                { model: db.user, as: 'director', attributes: ['id', 'firstName', 'name'] },
                { model: db.user, as: 'organist', attributes: ['id', 'firstName', 'name'] },
            ],
        }],
        order: [[{ model: db.plan_entry, as: 'entries' }, 'date', 'ASC']],
    });
    if (!plan) return null;

    return {
        year: plan.year,
        month: plan.month,
        finalized: Boolean(plan.finalized),
        entries: (plan.entries || []).map(S.serializePlanEntry),
    };
}

async function getNextDuties(choirId, { limit } = {}) {
    const plans = await db.monthly_plan.findAll({ where: { choirId }, attributes: ['id'], raw: true });
    if (!plans.length) return [];

    const entries = await db.plan_entry.findAll({
        where: {
            monthlyPlanId: plans.map(p => p.id),
            date: { [Op.gte]: new Date() },
        },
        include: [
            { model: db.user, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: db.user, as: 'organist', attributes: ['id', 'firstName', 'name'] },
        ],
        order: [['date', 'ASC']],
        limit: clampLimit(limit, 10, 20),
    });
    return entries.map(S.serializePlanEntry);
}

async function getPieceHistory(choirId, { pieceId, title } = {}) {
    let resolvedId = parseInt(pieceId, 10);
    if (Number.isNaN(resolvedId) && title) {
        const piece = await db.piece.findOne({
            where: { id: await choirPieceIds(choirId), title: { [likeOperator()]: likeValue(title) } },
            attributes: ['id'],
            raw: true,
        });
        resolvedId = piece?.id;
    }
    if (!resolvedId) return null;

    const repertoire = await db.choir_repertoire.findOne({
        where: { choirId, pieceId: resolvedId },
        attributes: ['status', 'rating', 'notes'],
        raw: true,
    });
    if (!repertoire) return null;

    const base = pieceInclude(false);
    const piece = await db.piece.findByPk(resolvedId, { attributes: base.attributes, include: base.include });
    if (!piece) return null;

    const stats = (await loadPerformanceIndex(choirId)).get(resolvedId) || null;
    const collectionRefs = await loadCollectionRefs([resolvedId]);
    const serialized = S.serializePiece(piece, {
        repertoire,
        stats,
        collections: collectionRefs.get(resolvedId) || [],
    });
    serialized.performances = (stats?.performances || []).slice(0, 20);
    return serialized;
}

async function getRepertoireStats(choirId, { from, to, limit } = {}) {
    const effectiveLimit = clampLimit(limit, 10, 20);
    const index = await loadPerformanceIndex(choirId);
    const repertoire = await db.choir_repertoire.findAll({
        where: { choirId },
        attributes: ['pieceId', 'status'],
        raw: true,
    });
    const statusByPiece = new Map(repertoire.map(r => [r.pieceId, r.status]));

    const fromTs = from ? new Date(from).toISOString() : null;
    const toTs = to ? new Date(to).toISOString() : null;
    const inRange = (date) => (!fromTs || date >= fromTs) && (!toTs || date <= toTs);

    const aggregated = [];
    for (const [pieceId, entry] of index.entries()) {
        if (!statusByPiece.has(pieceId)) continue;
        const performances = entry.performances.filter(p => inRange(p.date));
        aggregated.push({
            pieceId,
            timesSung: performances.filter(p => p.type === 'SERVICE').length,
            timesRehearsed: performances.filter(p => p.type === 'REHEARSAL').length,
            lastSung: entry.lastSung,
            lastRehearsed: entry.lastRehearsed,
        });
    }

    const pieceIds = aggregated.map(a => a.pieceId);
    const pieces = pieceIds.length
        ? await db.piece.findAll({ where: { id: pieceIds }, attributes: ['id', 'title'], raw: true })
        : [];
    const titleById = new Map(pieces.map(p => [p.id, S.sanitizeText(p.title, 300)]));
    const decorate = (item) => ({ pieceId: item.pieceId, id: `piece:${item.pieceId}`, title: titleById.get(item.pieceId) || null, ...item });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const staleThreshold = twelveMonthsAgo.toISOString();

    return {
        singableCount: repertoire.filter(r => r.status === 'CAN_BE_SUNG').length,
        rehearsalCount: repertoire.filter(r => r.status === 'IN_REHEARSAL').length,
        topServicePieces: [...aggregated].sort((a, b) => b.timesSung - a.timesSung).filter(a => a.timesSung > 0).slice(0, effectiveLimit).map(decorate),
        topRehearsalPieces: [...aggregated].sort((a, b) => b.timesRehearsed - a.timesRehearsed).filter(a => a.timesRehearsed > 0).slice(0, effectiveLimit).map(decorate),
        longestUnsungPieces: [...aggregated]
            .filter(a => !a.lastSung || a.lastSung < staleThreshold)
            .sort((a, b) => String(a.lastSung || '').localeCompare(String(b.lastSung || '')))
            .slice(0, effectiveLimit)
            .map(decorate),
    };
}

async function suggestPieces(choirId, { count, status = 'CAN_BE_SUNG', notSungSinceMonths = 6 } = {}) {
    const effectiveCount = clampLimit(count, 5, 10);
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - (parseInt(notSungSinceMonths, 10) || 6));
    const thresholdIso = threshold.toISOString();

    const repertoire = await db.choir_repertoire.findAll({
        where: { choirId, ...(status ? { status } : {}) },
        attributes: ['pieceId', 'status', 'rating'],
        raw: true,
    });
    if (!repertoire.length) return [];

    const index = await loadPerformanceIndex(choirId);
    const candidates = repertoire
        .map(r => ({ ...r, lastSung: index.get(r.pieceId)?.lastSung || null }))
        .filter(r => !r.lastSung || r.lastSung < thresholdIso)
        .sort((a, b) => String(a.lastSung || '').localeCompare(String(b.lastSung || '')))
        .slice(0, effectiveCount);

    const pieceIds = candidates.map(c => c.pieceId);
    const base = pieceInclude(false);
    const pieces = await db.piece.findAll({ where: { id: pieceIds }, attributes: base.attributes, include: base.include });
    const byId = new Map(pieces.map(p => [p.id, p]));
    const collectionRefs = await loadCollectionRefs(pieceIds);

    return candidates
        .map(c => {
            const piece = byId.get(c.pieceId);
            if (!piece) return null;
            return S.serializePiece(piece, {
                repertoire: c,
                stats: index.get(c.pieceId) || null,
                collections: collectionRefs.get(c.pieceId) || [],
            });
        })
        .filter(Boolean);
}

module.exports = {
    MAX_LIMIT,
    clampLimit,
    loadPerformanceIndex,
    choirPieceIds,
    getChoirInfo,
    listUpcomingEvents,
    listRecentEvents,
    getLastEvent,
    getEvent,
    listRepertoire,
    search,
    fetchById,
    getServicePlan,
    getNextDuties,
    getPieceHistory,
    getRepertoireStats,
    suggestPieces,
};
