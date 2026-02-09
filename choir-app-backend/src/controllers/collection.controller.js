const db = require("../models");
const Collection = db.collection;
const Choir = db.choir;
const Piece = db.piece;
const Composer = db.composer;
const logger = require("../config/logger");
const path = require('path');
const fs = require('fs').promises;
const BaseCrudController = require('./baseCrud.controller');
const base = new BaseCrudController(Collection);
const { Sequelize } = db; // access Sequelize error types
const jobs = require('../services/import-jobs.service');
const crypto = require('crypto');

exports.create = async (req, res, next) => {
    const { title, subtitle, publisher, prefix, description, publisherNumber, singleEdition, pieces } = req.body;
    try {
        if (singleEdition && pieces && pieces.length > 1) {
            return res.status(400).send({ message: 'Einzelausgabe kann nur ein Stück enthalten.' });
        }
        const collection = await base.service.create({ title, subtitle, publisher, prefix, description, publisherNumber, singleEdition });
        if (pieces && pieces.length > 0) {
            const seen = new Map();
            for (const pieceInfo of pieces) {
                if (seen.has(pieceInfo.pieceId)) {
                    const dupPiece = seen.get(pieceInfo.pieceId);
                    return res.status(400).send({ message: `Piece '${dupPiece.title}' (id=${pieceInfo.pieceId}) is duplicated.` });
                }
                const piece = await Piece.findByPk(pieceInfo.pieceId, { attributes: ['id', 'title'] });
                if (!piece) {
                    return res.status(400).send({ message: `Piece with id=${pieceInfo.pieceId} not found.` });
                }
                seen.set(pieceInfo.pieceId, piece);
                await collection.addPiece(pieceInfo.pieceId, {
                    through: { numberInCollection: pieceInfo.numberInCollection }
                });
            }
        }
        res.status(201).send(collection);
    } catch (err) {
        if (err instanceof Sequelize.ForeignKeyConstraintError) {
            const field = Object.keys(err.fields || {})[0];
            const value = err.fields ? err.fields[field] : '';
            return res.status(400).send({ message: `Invalid reference for ${field}: ${value}` });
        }
        next(err);
    }
};

const processCollectionUpdate = async (job, collection, data) => {
    try {
        const { title, subtitle, publisher, prefix, description, publisherNumber, singleEdition, pieces } = data;
        jobs.updateJobLog(job.id, 'Updating collection metadata...');
        await collection.update({ title, subtitle, publisher, prefix, description, publisherNumber, singleEdition });
        jobs.updateJobLog(job.id, 'Clearing existing pieces...');
        await collection.setPieces([]);
        if (pieces && pieces.length > 0) {
            const seen = new Map();
            for (const [index, pieceLink] of pieces.entries()) {
                jobs.updateJobProgress(job.id, index, pieces.length);
                if (seen.has(pieceLink.pieceId)) {
                    const dupPiece = seen.get(pieceLink.pieceId);
                    throw new Error(`Piece '${dupPiece.title}' (id=${pieceLink.pieceId}) is duplicated.`);
                }
                const piece = await Piece.findByPk(pieceLink.pieceId, { attributes: ['id', 'title'] });
                if (!piece) {
                    throw new Error(`Piece with id=${pieceLink.pieceId} not found.`);
                }
                seen.set(pieceLink.pieceId, piece);
                await collection.addPiece(pieceLink.pieceId, {
                    through: { numberInCollection: pieceLink.numberInCollection }
                });
                jobs.updateJobLog(job.id, `Linked piece '${piece.title}'.`);
            }
            jobs.updateJobProgress(job.id, pieces.length, pieces.length);
        }
        jobs.completeJob(job.id, { message: 'Collection updated successfully.' });
    } catch (err) {
        jobs.failJob(job.id, err.message);
    }
};

exports.update = async (req, res, next) => {
    const id = req.params.id;
    const { singleEdition, pieces } = req.body;
    try {
        const collection = await db.collection.findByPk(id);
        if (!collection) return res.status(404).send({ message: `Collection with id=${id} not found.` });

        if (singleEdition && pieces && pieces.length > 1) {
            return res.status(400).send({ message: 'Einzelausgabe kann nur ein Stück enthalten.' });
        }

        const jobId = crypto.randomUUID();
        const job = jobs.createJob(jobId);
        job.status = 'running';
        processCollectionUpdate(job, collection, req.body);
        res.status(202).send({ jobId });
    } catch (err) {
        if (err instanceof Sequelize.ForeignKeyConstraintError) {
            const field = Object.keys(err.fields || {})[0];
            const value = err.fields ? err.fields[field] : '';
            return res.status(400).send({ message: `Invalid reference for ${field}: ${value}` });
        }
        next(err);
    }
};

exports.getUpdateStatus = (req, res) => {
    const job = jobs.getJob(req.params.jobId);
    if (!job) return res.status(404).send({ message: 'Job not found.' });
    res.status(200).send(job);
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
                include: [{ model: Composer, as: 'composer', attributes: ['id', 'name'] }],
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
            for (const piece of missingPieces) {
                // add individually so one failure does not abort the entire batch
                await choir.addPiece(piece).catch(() => {});
            }
        }

        await db.choir_log.create({
            choirId: req.activeChoirId,
            userId: req.userId,
            action: 'repertoire_add_collection',
            details: { collectionId: collection.id, collectionTitle: collection.title, piecesAdded: missingPieces.length }
        });

        res.status(200).send({ message: `Collection '${collection.title}' synced with your repertoire.` });
    } catch (err) { next(err); }
};

// Synchronize multiple collections with the active choir in one request
// to avoid rate limiting issues when the frontend triggers many updates.
exports.bulkAddToChoir = async (req, res, next) => {
    try {
        const { collectionIds } = req.body;
        if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
            return res.status(400).send({ message: 'collectionIds array required.' });
        }

        const choir = await db.choir.findByPk(req.activeChoirId);
        if (!choir) {
            return res.status(404).send({ message: 'Choir not found.' });
        }

        // Cache existing choir pieces to avoid duplicate additions
        const choirPieces = await choir.getPieces({ attributes: ['id'] });
        const choirPieceIds = new Set(choirPieces.map(p => p.id));

        const addedCollections = [];
        for (const id of collectionIds) {
            const collection = await db.collection.findByPk(id);
            if (!collection) continue;

            await choir.addCollection(collection).catch(() => {});
            addedCollections.push({ id: collection.id, title: collection.title });

            const pieces = await collection.getPieces({ attributes: ['id'] });
            const missingPieces = pieces.filter(p => !choirPieceIds.has(p.id));
            if (missingPieces.length) {
                for (const piece of missingPieces) {
                    await choir.addPiece(piece).catch(() => {});
                    choirPieceIds.add(piece.id);
                }
            }
        }

        await db.choir_log.create({
            choirId: req.activeChoirId,
            userId: req.userId,
            action: 'repertoire_add_collections',
            details: { collections: addedCollections }
        });

        res.status(200).send({ message: 'Collections synced with your repertoire.' });
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
