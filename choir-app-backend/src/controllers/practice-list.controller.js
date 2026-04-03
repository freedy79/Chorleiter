const db = require('../models');
const { Op } = require('sequelize');

const PracticeList = db.practice_list;
const PracticeListItem = db.practice_list_item;

function ensureChoirContext(req, res) {
    if (!req.activeChoirId) {
        res.status(400).send({ message: 'Kein aktiver Chor-Kontext verfügbar.' });
        return false;
    }
    return true;
}

async function findOwnedList(req, listId) {
    return PracticeList.findOne({
        where: {
            id: listId,
            userId: req.userId,
            choirId: req.activeChoirId
        }
    });
}

async function findOwnedItem(listId, itemId) {
    return PracticeListItem.findOne({
        where: {
            id: itemId,
            practiceListId: listId
        }
    });
}

async function touchList(listId) {
    await PracticeList.update(
        { updatedAt: new Date() },
        { where: { id: listId } }
    );
}

exports.list = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const lists = await PracticeList.findAll({
        where: { userId: req.userId, choirId: req.activeChoirId },
        include: [{
            model: PracticeListItem,
            as: 'items',
            attributes: ['id', 'isPinnedOffline']
        }],
        order: [['updatedAt', 'DESC']]
    });

    const payload = lists.map(list => {
        const json = list.toJSON();
        const itemCount = json.items?.length || 0;
        const pinnedCount = (json.items || []).filter(i => i.isPinnedOffline).length;
        return {
            ...json,
            itemCount,
            pinnedCount
        };
    });

    res.status(200).send(payload);
};

exports.create = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const { title, description = null, targetDate = null } = req.body || {};
    if (!title || !String(title).trim()) {
        return res.status(400).send({ message: 'title ist erforderlich.' });
    }

    const created = await PracticeList.create({
        userId: req.userId,
        choirId: req.activeChoirId,
        title: String(title).trim(),
        description,
        targetDate
    });

    res.status(201).send(created);
};

exports.membership = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const pieceId = Number(req.query?.pieceId);
    if (!pieceId) {
        return res.status(400).send({ message: 'pieceId ist erforderlich.' });
    }

    const pieceLinkIdRaw = req.query?.pieceLinkId;
    const hasPieceLinkId = pieceLinkIdRaw !== undefined && pieceLinkIdRaw !== null && String(pieceLinkIdRaw).trim() !== '';
    const pieceLinkId = hasPieceLinkId ? Number(pieceLinkIdRaw) : null;

    const ownedLists = await PracticeList.findAll({
        where: { userId: req.userId, choirId: req.activeChoirId },
        attributes: ['id', 'title', 'updatedAt'],
        order: [['updatedAt', 'DESC']]
    });

    if (!ownedLists.length) {
        return res.status(200).send({
            pieceId,
            pieceLinkId,
            listIds: [],
            memberships: []
        });
    }

    const listIds = ownedLists.map(l => Number(l.id));
    const itemWhere = {
        practiceListId: { [Op.in]: listIds },
        pieceId
    };
    if (pieceLinkId === null) {
        itemWhere.pieceLinkId = { [Op.is]: null };
    } else {
        itemWhere.pieceLinkId = pieceLinkId;
    }

    const matchingItems = await PracticeListItem.findAll({
        where: itemWhere,
        attributes: ['practiceListId', 'id']
    });

    const matchedSet = new Set(matchingItems.map(i => Number(i.practiceListId)));
    const memberships = ownedLists.map(list => ({
        listId: Number(list.id),
        title: list.title,
        included: matchedSet.has(Number(list.id))
    }));

    res.status(200).send({
        pieceId,
        pieceLinkId,
        listIds: Array.from(matchedSet),
        memberships
    });
};

exports.update = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const { title, description, targetDate } = req.body || {};
    const patch = {};

    if (title !== undefined) {
        const normalized = String(title || '').trim();
        if (!normalized) {
            return res.status(400).send({ message: 'title darf nicht leer sein.' });
        }
        patch.title = normalized;
    }
    if (description !== undefined) patch.description = description;
    if (targetDate !== undefined) patch.targetDate = targetDate;

    await list.update(patch);
    res.status(200).send(list);
};

exports.remove = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    await list.destroy();
    res.status(200).send({ message: 'Übungsliste gelöscht.' });
};

exports.getItems = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const items = await PracticeListItem.findAll({
        where: { practiceListId: listId },
        include: [
            {
                model: db.piece,
                as: 'piece',
                attributes: ['id', 'title', 'subtitle', 'durationSec'],
                include: [
                    { model: db.piece_link, as: 'links', attributes: ['id', 'description', 'url', 'downloadName', 'type'] },
                    {
                        model: db.collection,
                        through: { attributes: ['numberInCollection'] },
                        attributes: ['id', 'prefix', 'title', 'singleEdition']
                    }
                ]
            },
            { model: db.piece_link, as: 'pieceLink', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }
        ],
        order: [['orderIndex', 'ASC'], ['id', 'ASC']]
    });

    res.status(200).send(items);
};

exports.addItem = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const { pieceId, pieceLinkId = null, note = null, isPinnedOffline = false, orderIndex } = req.body || {};
    if (!pieceId) {
        return res.status(400).send({ message: 'pieceId ist erforderlich.' });
    }

    const piece = await db.piece.findByPk(pieceId);
    if (!piece) {
        return res.status(404).send({ message: 'Stück nicht gefunden.' });
    }

    let resolvedPieceLinkId = null;
    if (pieceLinkId !== null && pieceLinkId !== undefined) {
        const pieceLink = await db.piece_link.findByPk(pieceLinkId);
        if (!pieceLink) {
            return res.status(404).send({ message: 'Medienlink nicht gefunden.' });
        }
        if (Number(pieceLink.pieceId) !== Number(pieceId)) {
            return res.status(400).send({ message: 'pieceLinkId gehört nicht zum pieceId.' });
        }
        resolvedPieceLinkId = pieceLink.id;
    }

    let resolvedOrderIndex = Number.isInteger(orderIndex) ? orderIndex : null;
    if (resolvedOrderIndex === null) {
        const maxOrder = await PracticeListItem.max('orderIndex', { where: { practiceListId: listId } });
        resolvedOrderIndex = Number.isFinite(maxOrder) ? maxOrder + 1 : 0;
    }

    const idempotentWhere = {
        practiceListId: listId,
        pieceId,
        pieceLinkId: resolvedPieceLinkId === null ? { [Op.is]: null } : resolvedPieceLinkId
    };

    const existing = await PracticeListItem.findOne({
        where: idempotentWhere,
        include: [
            {
                model: db.piece,
                as: 'piece',
                attributes: ['id', 'title', 'subtitle', 'durationSec'],
                include: [{ model: db.piece_link, as: 'links', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }]
            },
            { model: db.piece_link, as: 'pieceLink', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }
        ]
    });

    if (existing) {
        if (note !== null && note !== undefined && existing.note !== note) {
            await existing.update({ note });
        }
        if (!!isPinnedOffline && !existing.isPinnedOffline) {
            await existing.update({ isPinnedOffline: true });
        }
        await touchList(listId);
        return res.status(200).send(existing);
    }

    const created = await PracticeListItem.create({
        practiceListId: listId,
        pieceId,
        pieceLinkId: resolvedPieceLinkId,
        note,
        isPinnedOffline: !!isPinnedOffline,
        orderIndex: resolvedOrderIndex
    });

    const withRelations = await PracticeListItem.findByPk(created.id, {
        include: [
            {
                model: db.piece,
                as: 'piece',
                attributes: ['id', 'title', 'subtitle', 'durationSec'],
                include: [{ model: db.piece_link, as: 'links', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }]
            },
            { model: db.piece_link, as: 'pieceLink', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }
        ]
    });

    await touchList(listId);

    res.status(201).send(withRelations);
};

exports.updateItem = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const item = await findOwnedItem(listId, itemId);
    if (!item) {
        return res.status(404).send({ message: 'Eintrag nicht gefunden.' });
    }

    const { note, isPinnedOffline, orderIndex } = req.body || {};
    const patch = {};

    if (note !== undefined) patch.note = note;
    if (isPinnedOffline !== undefined) patch.isPinnedOffline = !!isPinnedOffline;
    if (orderIndex !== undefined) patch.orderIndex = Number(orderIndex) || 0;

    await item.update(patch);

    const withRelations = await PracticeListItem.findByPk(item.id, {
        include: [
            {
                model: db.piece,
                as: 'piece',
                attributes: ['id', 'title', 'subtitle', 'durationSec'],
                include: [{ model: db.piece_link, as: 'links', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }]
            },
            { model: db.piece_link, as: 'pieceLink', attributes: ['id', 'description', 'url', 'downloadName', 'type'] }
        ]
    });

    await touchList(listId);

    res.status(200).send(withRelations);
};

exports.removeItem = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const item = await findOwnedItem(listId, itemId);
    if (!item) {
        return res.status(404).send({ message: 'Eintrag nicht gefunden.' });
    }

    await item.destroy();
    await touchList(listId);
    res.status(200).send({ message: 'Eintrag gelöscht.' });
};

exports.reorderItems = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds.map(Number) : [];
    if (!itemIds.length) {
        return res.status(400).send({ message: 'itemIds muss ein nicht-leeres Array sein.' });
    }

    const existing = await PracticeListItem.findAll({
        where: { practiceListId: listId }
    });

    if (existing.length !== itemIds.length) {
        return res.status(400).send({ message: 'itemIds muss alle Einträge der Liste enthalten.' });
    }

    const existingIds = new Set(existing.map(i => Number(i.id)));
    const allValid = itemIds.every(id => existingIds.has(id));
    if (!allValid) {
        return res.status(400).send({ message: 'itemIds enthält ungültige Einträge.' });
    }

    await db.sequelize.transaction(async (transaction) => {
        for (let index = 0; index < itemIds.length; index++) {
            await PracticeListItem.update(
                { orderIndex: index },
                { where: { id: itemIds[index], practiceListId: listId }, transaction }
            );
        }
    });

    await touchList(listId);

    res.status(200).send({ message: 'Reihenfolge aktualisiert.' });
};

exports.pinItem = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const item = await findOwnedItem(listId, itemId);
    if (!item) {
        return res.status(404).send({ message: 'Eintrag nicht gefunden.' });
    }

    await item.update({ isPinnedOffline: true });
    await touchList(listId);
    res.status(200).send({ message: 'Eintrag offline gepinnt.' });
};

exports.unpinItem = async (req, res) => {
    if (!ensureChoirContext(req, res)) return;

    const listId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const list = await findOwnedList(req, listId);
    if (!list) {
        return res.status(404).send({ message: 'Übungsliste nicht gefunden.' });
    }

    const item = await findOwnedItem(listId, itemId);
    if (!item) {
        return res.status(404).send({ message: 'Eintrag nicht gefunden.' });
    }

    await item.update({ isPinnedOffline: false });
    await touchList(listId);
    res.status(200).send({ message: 'Offline-Pin entfernt.' });
};
