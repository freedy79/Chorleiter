const db = require("../models");
const Event = db.event;
const Piece = db.piece;
const Composer = db.composer;
const Collection = db.collection;
const CollectionPiece = db.collection_piece;
const { Op } = require("sequelize");

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

        // Suchen Sie nach einem bestehenden Event für diesen Chor, an diesem Kalendertag, von diesem Typ.
        const existingEvent = await db.event.findOne({
            where: {
                choirId: choirId,
                type: type,
                date: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        let event;
        let wasUpdated = false;

        if (existingEvent) {
            console.log(`Event ${existingEvent.id} found for this day. Updating...`);
            await existingEvent.update({
                date: date, // Aktualisieren Sie auch das Datum, falls der Benutzer nur die Uhrzeit geändert hat
                notes: notes,
                directorId: userId
            });
            event = existingEvent;
            wasUpdated = true;
        } else {
            // --- NEUES EVENT ERSTELLEN ---
            console.log("No existing event found for this day. Creating new one...");
            event = await db.event.create({
                date: date,
                type: type,
                notes: notes,
                choirId: choirId,
                directorId: userId
            });
        }

        // Unabhängig davon, ob neu oder aktualisiert, setzen Sie die Liste der Stücke neu.
        if (pieceIds && pieceIds.length >= 0) {
            await event.setPieces(pieceIds);
        }

        // Senden Sie eine Antwort, die dem Frontend mitteilt, was passiert ist.
        res.status(200).send({
            message: wasUpdated ? "Event successfully updated." : "Event successfully created.",
            wasUpdated: wasUpdated,
            event: event
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
            order: [['date', 'DESC']]
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
            }]
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

        await event.update({ date, type, notes });

        if (Array.isArray(pieceIds)) {
            await event.setPieces(pieceIds);
        }

        const updated = await Event.findByPk(id, { include: [{ model: Piece, as: 'pieces', through: { attributes: [] } }] });
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
