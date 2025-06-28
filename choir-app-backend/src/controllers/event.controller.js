const db = require("../models");
const Event = db.event;
const Piece = db.piece;
const Composer = db.composer;
const Collection = db.collection;
const CollectionPiece = db.collection_piece;
const User = db.user;
const logger = require("../config/logger");
const { Op } = require("sequelize");

async function autoUpdatePieceStatuses(eventType, choirId, pieceIds) {
    if (!Array.isArray(pieceIds) || pieceIds.length === 0) return;

    if (eventType === 'REHEARSAL') {
        await db.choir_repertoire.update(
            { status: 'IN_REHEARSAL' },
            {
                where: {
                    choirId,
                    pieceId: { [Op.in]: pieceIds },
                    status: 'NOT_READY'
                }
            }
        );
    } else if (eventType === 'SERVICE') {
        await db.choir_repertoire.update(
            { status: 'CAN_BE_SUNG' },
            {
                where: {
                    choirId,
                    pieceId: { [Op.in]: pieceIds },
                    status: { [Op.in]: ['NOT_READY', 'IN_REHEARSAL'] }
                }
            }
        );
    }
}

exports.create = async (req, res) => {
    const { date, type, notes, pieceIds } = req.body;
    const choirId = req.activeChoirId;
    const userId = req.userId;

    if (!date || !type) {
        return res.status(400).send({ message: "Date and Type are required." });
    }

    try {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

        // Prüfen, ob für diesen Chor an diesem Tag bereits Events existieren
        const eventsSameDay = await db.event.findAll({
            where: {
                choirId: choirId,
                date: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        // Gibt es bereits ein Event gleicher Art an diesem Tag?
        const sameTypeEvent = eventsSameDay.find(e => e.type === type);
        if (sameTypeEvent) {
            return res.status(409).send({
                message: `An event of type ${type} already exists on this date.`
            });
        }

        // Falls ein anderes Event existiert, geben wir einen Hinweis zurück
        const diffTypeEvent = eventsSameDay.find(e => e.type !== type);
        let warningMessage;
        if (diffTypeEvent) {
            warningMessage = `Note: There is already a ${diffTypeEvent.type.toLowerCase()} on this date.`;
        }

        // --- NEUES EVENT ERSTELLEN ---
        logger.info("Creating new event ...");
        const event = await db.event.create({
            date: date,
            type: type,
            notes: notes,
            choirId: choirId,
            directorId: userId
        });

        // Unabhängig davon, ob neu oder aktualisiert, setzen Sie die Liste der Stücke neu.
        if (Array.isArray(pieceIds) && pieceIds.length > 0) {
            await event.setPieces(pieceIds);
            await autoUpdatePieceStatuses(type.toUpperCase(), choirId, pieceIds);
        }

        // Event inklusive Director neu laden, um den Namen zurückzugeben
        const fullEvent = await Event.findByPk(event.id, {
            include: [{ model: User, as: 'director', attributes: ['name'] }]
        });

        // Senden Sie eine Antwort, die dem Frontend mitteilt, was passiert ist.
        res.status(201).send({
            message: "Event successfully created.",
            wasUpdated: false,
            warning: warningMessage,
            event: fullEvent
        });

    } catch (err) {
        console.error("Error in create/update event:", err);
        res.status(500).send({ message: err.message || "Some error occurred while saving the event." });
    }
};


/**
 * @description Findet das letzte Event eines bestimmten Typs für den eingeloggten Chor.
 * Dies ist die korrigierte Funktion für das Dashboard.
 */
exports.findLast = async (req, res) => {
    const { type } = req.query;

    if (!type) {
        return res.status(400).send({ message: "Event type is required." });
    }

    try {
        const lastEvent = await Event.findOne({
            where: {
                choirId: req.activeChoirId,
                type: type.toUpperCase()
            },
            order: [['date', 'DESC']],
            // --- DIE ANPASSUNG IST HIER ---
            // Wir erweitern die Include-Anweisung, um alle notwendigen Daten zu erhalten.
            include: [{
                model: Piece,
                as: 'pieces',
                attributes: ['id', 'title'],
                through: { attributes: [] },
                include: [
                    { // Binde den Komponisten an jedes Stück
                        model: Composer,
                        as: 'composer',
                        attributes: ['name']
                    },
                    { // Binde die Sammlungsdaten an jedes Stück
                        model: Collection,
                        as: 'collections',
                        attributes: ['prefix'], // Wir brauchen nur den Präfix
                        through: {
                            model: CollectionPiece,
                            as: 'collection_piece', // Stellen Sie sicher, dass dieser Alias korrekt ist
                            attributes: ['numberInCollection'] // und die Nummer
                        }
                    }
                ]
            }]
        });

        if (!lastEvent) {
            return res.status(200).send(null);
        }

        res.status(200).send(lastEvent);

    } catch (err) {
        console.error("ERROR in findLast event:", err);
        res.status(500).send({ message: err.message || "An error occurred while finding the last event." });
    }
};

/**
 * Get all events for the active choir. Optionally filter by type.
 */
exports.findAll = async (req, res) => {
    const { type } = req.query;
    const where = { choirId: req.activeChoirId };
    if (type) {
        where.type = type.toUpperCase();
    }

    try {
        const events = await Event.findAll({
            where,
            order: [['date', 'DESC']],
            include: [{ model: User, as: 'director', attributes: ['name'] }]
        });
        res.status(200).send(events);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error fetching events.' });
    }
};

/**
 * Find a single event with its pieces by ID
 */
exports.findOne = async (req, res) => {
    const id = req.params.id;

    try {
        const event = await Event.findOne({
            where: { id: id, choirId: req.activeChoirId },
            include: [{
                model: Piece,
                as: 'pieces',
                attributes: ['id', 'title'],
                through: { attributes: [] },
                include: [
                    { model: Composer, as: 'composer', attributes: ['name'] },
                    {
                        model: Collection,
                        as: 'collections',
                        attributes: ['prefix'],
                        through: {
                            model: CollectionPiece,
                            as: 'collection_piece',
                            attributes: ['numberInCollection']
                        }
                    }
                ]
            }, { model: User, as: 'director', attributes: ['name'] }]
        });

        if (!event) {
            return res.status(404).send({ message: 'Event not found.' });
        }

        res.status(200).send(event);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error retrieving event.' });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const { date, type, notes, pieceIds } = req.body;

    try {
        const event = await Event.findOne({ where: { id, choirId: req.activeChoirId } });
        if (!event) {
            return res.status(404).send({ message: 'Event not found.' });
        }

        await event.update({ date, type, notes, directorId: req.userId });

        if (Array.isArray(pieceIds)) {
            await event.setPieces(pieceIds);
            await autoUpdatePieceStatuses(type.toUpperCase(), req.activeChoirId, pieceIds);
        }

        const updated = await Event.findByPk(id, {
            include: [
                { model: Piece, as: 'pieces', through: { attributes: [] } },
                { model: User, as: 'director', attributes: ['name'] }
            ]
        });
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not update event.' });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const num = await Event.destroy({ where: { id, choirId: req.activeChoirId } });
        if (num === 1) {
            res.send({ message: 'Event deleted successfully!' });
        } else {
            res.status(404).send({ message: 'Event not found.' });
        }
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not delete event.' });
    }
};
