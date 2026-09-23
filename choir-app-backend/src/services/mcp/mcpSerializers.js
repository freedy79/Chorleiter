const crypto = require('crypto');

const MAX_TEXT_LENGTH = 2000;
const MAX_LYRICS_LENGTH = 4000;

/**
 * Field names that must never appear in an MCP payload.
 * The pii test walks every tool response and fails if one of these shows up.
 */
const DENIED_FIELDS = [
    'email', 'pendingEmail', 'normalizedEmail', 'phone', 'street', 'postalCode', 'city',
    'password', 'roles', 'rolesInChoir', 'resetToken', 'emailChangeToken', 'deletionRequestedAt',
    'joinHash', 'shareToken', 'tokenHash', 'token', 'apiKey', 'birthDate', 'shareWithChoir',
];

function personRefSecret() {
    return process.env.MCP_PERSON_REF_SECRET || process.env.JWT_SECRET || 'mcp-person-ref-fallback';
}

/**
 * Stable pseudonym for a user: lets a model correlate "same person" across
 * responses without ever exposing the database id.
 */
function personRef(userId) {
    if (!userId) return null;
    return crypto.createHmac('sha256', personRefSecret()).update(String(userId)).digest('hex').slice(0, 16);
}

/**
 * Free text from the database is untrusted input for the calling model.
 * HTML and markdown link syntax are removed so stored text cannot smuggle
 * instructions or clickable targets into the model context.
 */
function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
    if (value === null || value === undefined) return null;
    const text = String(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`{1,3}/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    if (!text) return null;
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function displayName(user) {
    if (!user) return null;
    const parts = [user.firstName, user.name].filter(Boolean).map(p => String(p).trim());
    const joined = parts.join(' ').trim();
    return joined || null;
}

/** Only the display name leaves the system - no id, no contact data. */
function serializePerson(user) {
    if (!user) return null;
    const name = displayName(user);
    if (!name) return null;
    return { ref: personRef(user.id), displayName: name };
}

function serializeCreator(entity) {
    if (!entity) return null;
    return {
        name: sanitizeText(entity.name, 200),
        birthYear: entity.birthYear ?? null,
        deathYear: entity.deathYear ?? null,
    };
}

function serializeCollectionRef(collection, numberInCollection) {
    if (!collection) return null;
    return {
        title: sanitizeText(collection.title, 300),
        prefix: collection.prefix || null,
        number: numberInCollection ?? null,
        reference: collection.prefix && numberInCollection ? `${collection.prefix}${numberInCollection}` : null,
    };
}

function serializePieceRef(piece) {
    if (!piece) return null;
    return {
        id: `piece:${piece.id}`,
        pieceId: piece.id,
        title: sanitizeText(piece.title, 300),
        composer: piece.composer?.name ? sanitizeText(piece.composer.name, 200) : null,
    };
}

function serializePiece(piece, options = {}) {
    if (!piece) return null;
    const { includeLyrics = false, repertoire = null, stats = null, collections = [] } = options;

    const result = {
        id: `piece:${piece.id}`,
        pieceId: piece.id,
        title: sanitizeText(piece.title, 300),
        subtitle: sanitizeText(piece.subtitle, 300),
        voicing: piece.voicing || null,
        key: piece.key || null,
        timeSignature: piece.timeSignature || null,
        durationSec: piece.durationSec ?? null,
        origin: sanitizeText(piece.origin, 300),
        composer: piece.composer?.name ? sanitizeText(piece.composer.name, 200) : null,
        composers: (piece.composers || []).map(c => sanitizeText(c.name, 200)).filter(Boolean),
        arrangers: (piece.arrangers || []).map(c => sanitizeText(c.name, 200)).filter(Boolean),
        author: piece.author?.name ? sanitizeText(piece.author.name, 200) : null,
        category: piece.category?.name ? sanitizeText(piece.category.name, 200) : null,
        collections: collections.map(c => serializeCollectionRef(c.collection, c.numberInCollection)).filter(Boolean),
    };

    if (includeLyrics) {
        result.lyrics = sanitizeText(piece.lyrics, MAX_LYRICS_LENGTH);
    }
    if (repertoire) {
        result.status = repertoire.status || null;
        result.rating = repertoire.rating ?? null;
        result.notes = sanitizeText(repertoire.notes, 500);
    }
    if (stats) {
        result.lastSung = stats.lastSung || null;
        result.lastRehearsed = stats.lastRehearsed || null;
        result.timesSung = Number(stats.timesSung || 0);
        result.timesRehearsed = Number(stats.timesRehearsed || 0);
    }

    return result;
}

function serializeEvent(event, options = {}) {
    if (!event) return null;
    const { includePieces = true } = options;
    const result = {
        id: `event:${event.id}`,
        eventId: event.id,
        date: event.date,
        type: event.type,
        notes: sanitizeText(event.notes, 1000),
        finalized: Boolean(event.finalized),
        director: serializePerson(event.director),
        organist: serializePerson(event.organist),
    };
    if (includePieces) {
        result.pieces = (event.pieces || []).map(serializePieceRef).filter(Boolean);
    }
    return result;
}

/** Shows who is scheduled - never who is available, that data stays private. */
function serializePlanEntry(entry) {
    if (!entry) return null;
    return {
        date: entry.date,
        eventType: entry.eventType || null,
        notes: sanitizeText(entry.notes, 1000),
        director: serializePerson(entry.director),
        organist: serializePerson(entry.organist),
        hasLinkedEvent: Boolean(entry.linkedEventId),
    };
}

function serializeCollection(collection) {
    if (!collection) return null;
    return {
        id: `collection:${collection.id}`,
        collectionId: collection.id,
        title: sanitizeText(collection.title, 300),
        subtitle: sanitizeText(collection.subtitle, 300),
        prefix: collection.prefix || null,
        publisher: sanitizeText(collection.publisher, 200),
        singleEdition: Boolean(collection.singleEdition),
    };
}

function serializeChoir(choir, extra = {}) {
    if (!choir) return null;
    return {
        name: sanitizeText(choir.name, 200),
        location: sanitizeText(choir.location, 200),
        modules: choir.modules || {},
        ...extra,
    };
}

module.exports = {
    DENIED_FIELDS,
    personRef,
    sanitizeText,
    displayName,
    serializePerson,
    serializeCreator,
    serializeCollectionRef,
    serializePieceRef,
    serializePiece,
    serializeEvent,
    serializePlanEntry,
    serializeCollection,
    serializeChoir,
};
