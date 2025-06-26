const db = require("../models");
const Event = db.event;
const Piece = db.piece;
const Composer = db.composer;
const Collection = db.collection;
const CollectionPiece = db.collection_piece;

exports.create = async (req, res) => {
    const { date, type, notes, pieceIds } = req.body;
    const { choirId, userId } = req;

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
