const db = require("../models");
const Collection = db.collection;
const Choir = db.choir;
const Piece = db.piece;
const logger = require("../config/logger");
const path = require('path');
const fs = require('fs').promises;
const BaseCrudController = require('./baseCrud.controller');
const base = new BaseCrudController(Collection);

exports.create = async (req, res, next) => {
    const { title, subtitle, publisher, prefix, description, publisherNumber, singleEdition, pieces } = req.body;
    try {
        if (singleEdition && pieces && pieces.length > 1) {
            return res.status(400).send({ message: 'Einzelausgabe kann nur ein Stück enthalten.' });
        }
        const collection = await base.service.create({ title, subtitle, publisher, prefix, description, publisherNumber, singleEdition });
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
    const { title, subtitle, publisher, prefix, description, publisherNumber, singleEdition, pieces } = req.body;
    try {
        const collection = await db.collection.findByPk(id);

        if (!collection) return res.status(404).send({ message: `Collection with id=${id} not found.` });

        if (singleEdition && pieces && pieces.length > 1) {
            return res.status(400).send({ message: 'Einzelausgabe kann nur ein Stück enthalten.' });
        }
        await base.service.update(id, { title, subtitle, publisher, prefix, description, publisherNumber, singleEdition });
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
        const allCollections = await base.service.findAll({
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "collection_pieces" AS "cp" WHERE "cp"."collectionId" = "collection"."id")`), 'pieceCount']
                ]
            },
            order: [['title', 'ASC']],
            raw: true
        });
        logger.info(`Found ${allCollections.length} global collections.`);

        const choir = await Choir.findByPk(req.activeChoirId);
        if (!choir) {
            logger.warn(`Choir with id ${req.activeChoirId} not found for user ${req.userId}.`);
            const adoptedCollectionIds = new Set();
            const results = allCollections.map(c => ({ ...c, isAdded: false }));
            return res.status(200).send(results);
        }

        const adoptedCollections = await choir.getCollections({ attributes: ['id'] });
        const adoptedCollectionIds = new Set(adoptedCollections.map(c => c.id));
        logger.info(`Choir has adopted ${adoptedCollectionIds.size} collections.`);

        const results = allCollections.map(collection => ({
            ...collection,
            pieceCount: parseInt(collection.pieceCount, 10) || 0,
            isAdded: adoptedCollectionIds.has(collection.id)
        }));

        logger.info("Successfully prepared collection list for response.");
        res.status(200).send(results);

    } catch (err) {
        err.message = `Error in findAll collections: ${err.message}`;
        next(err);
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const collection = await base.service.findById(req.params.id, {
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
        const collectionId = req.params.id;
        const choir = await db.choir.findByPk(req.activeChoirId);
        const collection = await db.collection.findByPk(collectionId);

        if (!choir || !collection) {
            return res.status(404).send({ message: "Choir or Collection not found." });
        }

        // Ensure the collection is linked to the choir, ignore if it already exists
        await choir.addCollection(collection).catch(() => {});

        // Add only those pieces that are not yet in the choir's repertoire
        const pieces = await collection.getPieces({ attributes: ['id'] });
        const choirPieces = await choir.getPieces({ attributes: ['id'] });
        const choirPieceIds = new Set(choirPieces.map(p => p.id));
        const missingPieces = pieces.filter(p => !choirPieceIds.has(p.id));

        if (missingPieces.length) {
            await choir.addPieces(missingPieces).catch(() => {});
        }

        res.status(200).send({ message: `Collection '${collection.title}' synced with your repertoire.` });
    } catch (err) { next(err); }
};

exports.uploadCover = async (req, res, next) => {
    try {
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

        if (!collection || !collection.coverImage) {
            return res.status(200).json({ data: '' });
        }

        const filePath = path.join(__dirname, '../../uploads/collection-covers', collection.coverImage);

        try {
            await fs.access(filePath);
        } catch (err) {
            return res.status(200).json({ data: '' });
        }

        const fileData = await fs.readFile(filePath);
        const base64 = fileData.toString('base64');
        const mimeType = 'image/' + (path.extname(filePath).slice(1) || 'jpeg');
        res.status(200).json({ data: `data:${mimeType};base64,${base64}` });
    } catch (err) { next(err); }
};

// expose delete handler in case it's needed
exports.delete = base.delete;
