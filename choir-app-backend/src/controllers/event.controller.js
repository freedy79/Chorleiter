const db = require("../models");
const Event = db.event;
const Piece = db.piece;
const Composer = db.composer;
const Collection = db.collection;
const CollectionPiece = db.collection_piece;
const User = db.user;
const logger = require("../config/logger");
const { Op, fn, col, where } = require("sequelize");
const { isoDateString } = require('../utils/date.utils');

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
    const { date, type, notes, pieceIds, organistId, directorId, finalized, version, monthlyPlanId } = req.body;
    const choirId = req.activeChoirId;
    const creatorId = req.userId;

    if (!date || !type) {
        return res.status(400).send({ message: "Date and Type are required." });
    }

    try {
        const targetDate = new Date(date);
        const dateOnly = isoDateString(targetDate);

        // Prüfen, ob für diesen Chor an diesem Tag bereits Events existieren
        const eventsSameDay = await db.event.findAll({
            where: {
                choirId: choirId,
                [Op.and]: [where(fn('date', col('date')), dateOnly)]
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
            directorId: directorId !== undefined ? directorId : creatorId,
            organistId: organistId || null,
            finalized: finalized || false,
            version: version || 1,
            monthlyPlanId: monthlyPlanId || null
        });

        // Unabhängig davon, ob neu oder aktualisiert, setzen Sie die Liste der Stücke neu.
        if (Array.isArray(pieceIds) && pieceIds.length > 0) {
            await event.setPieces(pieceIds);
            await autoUpdatePieceStatuses(type.toUpperCase(), choirId, pieceIds);
        }

        // Event inklusive Director neu laden, um den Namen zurückzugeben
        const fullEvent = await Event.findByPk(event.id, {
            include: [
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false },
                { model: db.monthly_plan, as: 'monthlyPlan', attributes: ['month', 'year', 'finalized', 'version'], required: false }
            ]
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
            }, { model: User, as: 'director', attributes: ['id', 'name'] }, { model: User, as: 'organist', attributes: ['id', 'name'], required: false }]
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
            include: [
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false },
                { model: db.monthly_plan, as: 'monthlyPlan', attributes: ['month', 'year', 'finalized', 'version'], required: false }
            ]
        });
        res.status(200).send(events);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error fetching events.' });
    }
};

exports.findNext = async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 3;
    const mine = req.query.mine === 'true';
    const where = {
        choirId: req.activeChoirId,
        date: { [Op.gte]: new Date() }
    };
    if (mine) {
        where[Op.or] = [
            { directorId: req.userId },
            { organistId: req.userId }
        ];
    }
    try {
        const events = await Event.findAll({
            where,
            order: [['date', 'ASC']],
            limit,
            include: [
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false },
                { model: db.monthly_plan, as: 'monthlyPlan', attributes: ['month', 'year', 'finalized', 'version'], required: false }
            ]
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
            }, { model: User, as: 'director', attributes: ['id', 'name'] }, { model: db.monthly_plan, as: 'monthlyPlan', attributes: ['month', 'year', 'finalized', 'version'], required: false }]
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
    const { date, type, notes, pieceIds, organistId, directorId, finalized, version, monthlyPlanId } = req.body;

    try {
        const event = await Event.findOne({
            where: { id, choirId: req.activeChoirId },
            include: [{ model: Piece, as: 'pieces', through: { attributes: [] } }]
        });
        if (!event) {
            return res.status(404).send({ message: 'Event not found.' });
        }


        // Determine if anything has changed
        const dateChanged = new Date(date).getTime() !== new Date(event.date).getTime();
        const typeChanged = type !== event.type;
        const notesChanged = (notes || '') !== (event.notes || '');

        const incomingPieces = Array.isArray(pieceIds) ? [...pieceIds].sort() : [];
        const existingPieces = event.pieces.map(p => p.id).sort();
        const piecesChanged = JSON.stringify(incomingPieces) !== JSON.stringify(existingPieces);

        if (!dateChanged && !typeChanged && !notesChanged && !piecesChanged) {
            const full = await Event.findByPk(id, {
                include: [
                    { model: Piece, as: 'pieces', through: { attributes: [] } },
                    { model: User, as: 'director', attributes: ['id', 'name'] }
                ]
            });
            return res.status(200).send(full);
        }

        await event.update({ date, type, notes, directorId: directorId !== undefined ? directorId : req.userId, organistId, finalized, version, monthlyPlanId });

        if (Array.isArray(pieceIds)) {
            await event.setPieces(pieceIds);
            await autoUpdatePieceStatuses(type.toUpperCase(), req.activeChoirId, pieceIds);
        }

        const updated = await Event.findByPk(id, {
            include: [
                { model: Piece, as: 'pieces', through: { attributes: [] } },
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false },
                { model: db.monthly_plan, as: 'monthlyPlan', attributes: ['month', 'year', 'finalized', 'version'], required: false }
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

/**
 * Delete multiple events by date range and optional type.
 * Query params:
 *  - start: ISO date string (inclusive)
 *  - end: ISO date string (inclusive)
 *  - type: optional event type (REHEARSAL or SERVICE)
 */
exports.deleteRange = async (req, res) => {
    const { start, end, type } = req.query;
    if (!start || !end) {
        return res.status(400).send({ message: 'start and end parameters required.' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).send({ message: 'Invalid start or end date.' });
    }

    const where = {
        choirId: req.activeChoirId,
        date: { [Op.between]: [startDate, endDate] }
    };
    if (type) {
        const upper = String(type).toUpperCase();
        if (!['REHEARSAL', 'SERVICE'].includes(upper)) {
            return res.status(400).send({ message: 'Invalid event type.' });
        }
        where.type = upper;
    }

    try {
        const num = await Event.destroy({ where });
        res.send({ message: `${num} events deleted.` });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not delete events.' });
    }
};

// Recalculate repertoire statuses for all choirs based on past events
exports.recalculatePieceStatuses = async (req, res) => {
    try {
        await db.sequelize.query(`
            UPDATE "choir_repertoires" cr
            SET status = CASE
                WHEN EXISTS (
                    SELECT 1 FROM "event_pieces" ep
                    JOIN "events" e ON ep."eventId" = e.id
                    WHERE ep."pieceId" = cr."pieceId"
                      AND e."choirId" = cr."choirId"
                      AND e.type = 'SERVICE'
                ) THEN 'CAN_BE_SUNG'
                WHEN EXISTS (
                    SELECT 1 FROM "event_pieces" ep
                    JOIN "events" e ON ep."eventId" = e.id
                    WHERE ep."pieceId" = cr."pieceId"
                      AND e."choirId" = cr."choirId"
                      AND e.type = 'REHEARSAL'
                ) THEN 'IN_REHEARSAL'
                ELSE 'NOT_READY'
            END
        `);
        res.status(200).send({ message: 'Piece statuses recalculated.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
