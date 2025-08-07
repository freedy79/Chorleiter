const db = require('../models');

function validatePieceData({ title, composerId, composers, origin }) {
    const mainComposerId = composerId || (composers && composers[0]?.id);
    if (!title || (!mainComposerId && !origin)) {
        return { error: 'Title and either Composer or Origin are required.' };
    }
    return { mainComposerId };
}

async function resolveAuthor(authorId, authorName) {
    if (authorId) return authorId;
    if (authorName) {
        const [author] = await db.author.findOrCreate({ where: { name: authorName }, defaults: { name: authorName } });
        return author.id;
    }
    return null;
}

async function assignArrangers(piece, arrangerIds) {
    if (arrangerIds && arrangerIds.length > 0) {
        await piece.setArrangers(arrangerIds);
    }
}

async function assignComposers(pieceId, composers, mainComposerId) {
    const composerEntries = composers && composers.length > 0
        ? composers
        : (mainComposerId ? [{ id: mainComposerId, type: null }] : []);
    if (composerEntries.length > 0) {
        await db.piece_composer.bulkCreate(
            composerEntries.map(c => ({ pieceId, composerId: c.id, type: c.type }))
        );
    }
}

async function createLinks(pieceId, links) {
    if (links && links.length > 0) {
        const linkObjects = links.map(link => ({ ...link, pieceId }));
        await db.piece_link.bulkCreate(linkObjects);
    }
}

module.exports = {
    validatePieceData,
    resolveAuthor,
    assignArrangers,
    assignComposers,
    createLinks,
};
