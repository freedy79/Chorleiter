const db = require("../models");
const Collection = db.collection;
const Choir = db.choir;
const Piece = db.piece;
const { Op } = require("sequelize");
const logger = require("../config/logger"); // Importieren Sie den Logger für eine gute Fehlerbehandlung
const path = require('path');
const fs = require('fs').promises;

// Die create- und update-Funktionen bleiben unverändert, aber wir fügen eine Fehlerbehandlung hinzu.
exports.create = async (req, res, next) => {
    const { title, publisher, prefix, pieces } = req.body;
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify collections.' });
        }
        const collection = await Collection.create({ title, publisher, prefix });
        if (pieces && pieces.length > 0) {
            for (const pieceInfo of pieces) {
                await collection.addPiece(pieceInfo.pieceId, {
                    through: { numberInCollection: pieceInfo.numberInCollection }
                });
            }
        }
        res.status(201).send(collection);
    } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
    const id = req.params.id;
    const { title, publisher, prefix, pieces } = req.body;
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify collections.' });
        }
        const collection = await db.collection.findByPk(id);
        if (!collection) return res.status(404).send({ message: `Collection with id=${id} not found.` });

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
    } catch (err) { next(err); }
};

/**
 * @description Get all global collections, enriched with piece count and whether
 * the current choir has adopted the collection.
 */
exports.findAll = async (req, res, next) => {
    try {
        logger.info("Fetching all collections...");
        // Schritt 1: Holen Sie alle globalen Sammlungen mit der Stückzahl.
        // Die Subquery mit sequelize.literal ist der effizienteste Weg, dies in einer Abfrage zu tun.
        const allCollections = await Collection.findAll({
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "collection_pieces" AS "cp" WHERE "cp"."collectionId" = "collection"."id")`), 'pieceCount']
                ]
            },
            order: [['title', 'ASC']],
            raw: true // Wichtig für die manuelle Bearbeitung der Objekte
        });
        logger.info(`Found ${allCollections.length} global collections.`);

        // Schritt 2: Holen Sie die IDs der vom Chor adoptierten Sammlungen.
        const choir = await Choir.findByPk(req.activeChoirId);
        if (!choir) {
            // Dies ist ein möglicher Fehlerpunkt, den wir jetzt sicher abfangen.
            logger.warn(`Choir with id ${req.activeChoirId} not found for user ${req.userId}.`);
            // Wir können fortfahren und annehmen, dass keine Sammlungen adoptiert wurden.
            const adoptedCollectionIds = new Set();
            const results = allCollections.map(c => ({ ...c, isAdded: false }));
            return res.status(200).send(results);
        }

        const adoptedCollections = await choir.getCollections({ attributes: ['id'] });
        const adoptedCollectionIds = new Set(adoptedCollections.map(c => c.id));
        logger.info(`Choir has adopted ${adoptedCollectionIds.size} collections.`);

        // Schritt 3: Kombinieren Sie die Informationen.
        const results = allCollections.map(collection => ({
            ...collection,
            // Konvertieren Sie den pieceCount, der als String zurückkommen kann.
            pieceCount: parseInt(collection.pieceCount, 10) || 0,
            isAdded: adoptedCollectionIds.has(collection.id)
        }));

        logger.info("Successfully prepared collection list for response.");
        res.status(200).send(results);

    } catch (err) {
        // Leiten Sie jeden unerwarteten Fehler an die zentrale Fehler-Middleware weiter.
        err.message = `Error in findAll collections: ${err.message}`;
        next(err);
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const collection = await Collection.findByPk(req.params.id, {
            include: [{
                model: Piece,
                through: { attributes: ['numberInCollection'] }
            }]
        });
        if (!collection) return res.status(404).send({ message: "Collection not found." });
        res.status(200).send(collection);
    } catch (err) { next(err); }
};

exports.addToChoir = async (req, res, next) => {
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify collections.' });
        }
        const collectionId = req.params.id;
        const choir = await db.choir.findByPk(req.activeChoirId);
        const collection = await db.collection.findByPk(collectionId);

        if (!choir || !collection) {
            return res.status(404).send({ message: "Choir or Collection not found." });
        }

        await choir.addCollection(collection);
        const pieces = await collection.getPieces();
        await choir.addPieces(pieces);

        res.status(200).send({ message: `Collection '${collection.title}' and all its pieces added to your repertoire.` });
    } catch (err) { next(err); }
};

exports.uploadCover = async (req, res, next) => {
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify collections.' });
        }
        const id = req.params.id;
        if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

        const collection = await Collection.findByPk(id);
        if (!collection) return res.status(404).send({ message: 'Collection not found.' });

        await collection.update({ coverImage: req.file.filename });
        res.status(200).send({ filename: req.file.filename });
    } catch (err) { next(err); }
};

exports.getCover = async (req, res, next) => {
    try {
        const id = req.params.id;
        const collection = await Collection.findByPk(id);

        // If the collection or the cover image field is missing, simply return
        // an empty string so the frontend can show a blank image instead of an error.
        if (!collection || !collection.coverImage) {
            return res.status(200).json({ data: '' });
        }

        const filePath = path.join(__dirname, '../../uploads/collection-covers', collection.coverImage);

        try {
            await fs.access(filePath);
        } catch (err) {
            // File does not exist. Return an empty image instead of an error.
            return res.status(200).json({ data: '' });
        }

        const fileData = await fs.readFile(filePath);
        const base64 = fileData.toString('base64');
        const mimeType = 'image/' + (path.extname(filePath).slice(1) || 'jpeg');
        res.status(200).json({ data: `data:${mimeType};base64,${base64}` });
    } catch (err) { next(err); }
};
