const db = require("../models");
const Collection = db.collection;
const Choir = db.choir;
const Piece = db.piece;
const { Op } = require("sequelize");

// Create a new global collection and optionally link pieces
exports.create = async (req, res) => {
     const { title, publisher, prefix, pieces } = req.body;
    try {
        const collection = await Collection.create({ title, publisher, prefix });

        if (pieces && pieces.length > 0) {
            for (const pieceInfo of pieces) {
                // 'addPiece' is a Sequelize helper method.
                // The second argument is an object with the extra data for the junction table.
                await collection.addPiece(pieceInfo.pieceId, {
                    through: { numberInCollection: pieceInfo.numberInCollection }
                });
            }
        }
        res.status(201).send(collection);
    } catch (err) { res.status(500).send({ message: err.message }); }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const { title, publisher, prefix, pieces } = req.body;

    try {
        const collection = await db.collection.findByPk(id);
        if (!collection) {
            return res.status(404).send({ message: `Collection with id=${id} not found.` });
        }

        await collection.update({ title, publisher, prefix });
        await collection.setPieces([]);

        if (pieces && pieces.length > 0) {
            for (const pieceLink of pieces) {
                await collection.addPiece(pieceLink.pieceId, {
                    through: { numberInCollection: pieceLink.numberInCollection }
                });
            }
        }

        res.status(200).send({ message: "Collection updated successfully." });

    } catch (err) {
        res.status(500).send({ message: err.message || `Error updating collection with id=${id}` });
    }
};

// Get all global collections
/**
 * @description Get all global collections.
 * We will also determine which of these collections the current choir has already
 * added to their repertoire.
 */
exports.findAll = async (req, res) => {
    try {
        // Fetch collections and choir information concurrently
        const [allCollections, choirCollections] = await Promise.all([
            Collection.findAll({
                attributes: {
                    include: [
                        [
                            db.sequelize.literal(`(
                                SELECT COUNT(*) FROM collection_pieces AS cp
                                WHERE cp.collectionId = collection.id
                            )`),
                            'pieceCount'
                        ]
                    ]
                },
                order: [['title', 'ASC']],
                raw: true
            }),
            Choir.findByPk(req.activeChoirId).then(choir =>
                choir.getCollections({ attributes: ['id'], joinTableAttributes: [], raw: true })
            )
        ]);

        const adoptedIds = new Set(choirCollections.map(c => c.id));

        const results = allCollections.map(c => ({
            ...c,
            isAdded: adoptedIds.has(c.id)
        }));

        res.status(200).send(results);
    } catch (err) {
        res.status(500).send({ message: err.message || 'An error occurred while retrieving collections.' });
    }
};

 exports.findOne = async (req, res) => {
    const collection = await Collection.findByPk(req.params.id, {
        include: [{
            model: Piece,
            // Explicitly ask for the junction table attributes
            through: { attributes: ['numberInCollection'] }
        }]
    });
    res.status(200).send(collection);
};

// Adds all pieces from a collection to the current choir's repertoire
exports.addToChoir = async (req, res) => {
    const collectionId = req.params.id;
    try {
        const choir = await db.choir.findByPk(req.activeChoirId);
        const collection = await db.collection.findByPk(collectionId);
        if (!choir || !collection) {
            return res.status(404).send({ message: "Not found." });
        }

        // 1. Markieren, dass der Chor diese Sammlung "adoptiert" hat.
        await choir.addCollection(collection);

        // 2. WICHTIG: Fügen Sie alle Stücke aus dieser Sammlung explizit
        // zum Repertoire des Chors hinzu (falls sie noch nicht vorhanden sind).
        const pieces = await collection.getPieces();
        // 'addPieces' ist ein Sequelize-Helfer, der die Einträge in der Zwischentabelle
        // 'choir_repertoire' erstellt und Duplikate ignoriert.
        await choir.addPieces(pieces);

        res.status(200).send({ message: `Collection '${collection.title}' and all its pieces added to your repertoire.` });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
