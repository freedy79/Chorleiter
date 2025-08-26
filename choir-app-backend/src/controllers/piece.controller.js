const db = require("../models");
const Piece = db.piece;
const Composer = db.composer;
const Category = db.category;
const Author = db.author;
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs/promises');
const fileService = require('../services/file.service');
const pieceService = require('../services/piece.service');
const BaseCrudController = require('./baseCrud.controller');
const base = new BaseCrudController(Piece);
const emailService = require('../services/email.service');
const { getFrontendUrl } = require('../utils/frontend-url');

/**
 * @description Create a new global piece.
 * This piece is not associated with any choir yet. It's added to the master list.
 * It's expected that another action (like adding to a collection or repertoire)
 * will link this piece to a choir.
 */
exports.create = async (req, res) => {
    const {
        title,
        subtitle,
        composerCollection,
        composerId,
        origin,
        categoryId,
        voicing,
        key,
        timeSignature,
        durationSec,
        lyrics,
        imageIdentifier,
        license,
        opus,
        lyricsSource,
        authorName,
        authorId,
        arrangerIds,
        links,
        composers
    } = req.body;

    const { mainComposerId, error } = pieceService.validatePieceData({
        title,
        composerId,
        composers,
        origin
    });
    if (error) return res.status(400).send({ message: error });

    const resolvedAuthorId = await pieceService.resolveAuthor(authorId, authorName);

    const newPiece = await base.service.create({
        title,
        subtitle,
        composerCollection,
        composerId: mainComposerId || null,
        categoryId,
        voicing,
        key,
        timeSignature,
        durationSec,
        lyrics,
        imageIdentifier,
        license,
        opus,
        lyricsSource,
        origin,
        authorId: resolvedAuthorId
    });

    await pieceService.assignArrangers(newPiece, arrangerIds);
    await pieceService.assignComposers(newPiece.id, composers, mainComposerId);
    await pieceService.createLinks(newPiece.id, links);

    const result = await db.piece.findByPk(newPiece.id, {
        include: [
            { model: Composer, as: 'composers', through: { attributes: ['type'] } },
            { model: Composer, as: 'composer', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Author, as: 'author', attributes: ['id', 'name'] },
            { model: db.piece_link, as: 'links' }
        ]
    });

    res.status(201).send(result);
};


/**
 * @description Find all global pieces.
 * This is useful for administrative tasks or for populating a lookup/autocomplete
 * when adding pieces to a collection.
 */
exports.findAll = async (req, res) => {
    const { composerId, authorId, license } = req.query;
    const where = {};
    if (composerId) where.composerId = composerId;
    if (authorId) where.authorId = authorId;
    if (license) {
        const licenses = Array.isArray(license) ? license : String(license).split(',');
        where.license = { [Op.in]: licenses };
    }

    const pieces = await base.service.findAll({
            where,
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "collection_pieces" AS "cp" WHERE "cp"."pieceId" = "piece"."id")`), 'collectionCount']
                ]
            },
            include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Composer, as: 'composers', through: { attributes: ['type'] } },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] },
                { model: db.piece_link, as: 'links' }
            ],
            order: [['title', 'ASC']]
        });
    res.status(200).send(pieces);
};


/**
 * @description Find a single global piece by its ID.
 */
exports.findOne = async (req, res) => {
    const id = req.params.id;

    const piece = await base.service.findById(id, {
        include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Composer, as: 'composers', through: { attributes: ['type'] } },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] },
                { model: db.piece_link, as: 'links' }
            ]
        });

    if (piece) {
        res.status(200).send(piece);
    } else {
        res.status(404).send({
            message: `Cannot find Piece with id=${id}.`
        });
    }
};


/**
 * @description Update a global piece's details.
 * This would typically be an administrative function.
 */
exports.update = async (req, res) => {
    const id = req.params.id;

    if (!req.userRoles.includes('admin')) {
            await db.piece_change.create({ pieceId: id, userId: req.userId, data: req.body });
            const piece = await Piece.findByPk(id);
            const proposer = await db.user.findByPk(req.userId);
            const admins = (await db.user.findAll()).filter(u => Array.isArray(u.roles) && u.roles.includes('admin'));
            const linkBase = await getFrontendUrl();
            const link = `${linkBase}/admin/piece-changes`;
            await Promise.all(
                admins.filter(a => a.email).map(a =>
                    emailService.sendPieceChangeProposalMail(
                        a.email,
                        piece?.title || `Piece ${id}`,
                        proposer?.name || proposer?.email || 'Ein Benutzer',
                        link
                    )
                )
            );
            return res.status(202).send({ message: 'Change proposal created.' });
    }

    const { links, composers, ...pieceData } = req.body;

    if (composers) {
        await db.piece_composer.destroy({ where: { pieceId: id } });
        if (composers.length > 0) {
            await db.piece_composer.bulkCreate(
                composers.map(c => ({ pieceId: id, composerId: c.id, type: c.type }))
            );
            if (!pieceData.composerId) pieceData.composerId = composers[0].id;
        }
    }

    const num = await base.service.update(id, pieceData);

    if (links) {
        await db.piece_link.destroy({ where: { pieceId: id } });
        if (links.length > 0) {
            const linkObjects = links.map(link => ({ ...link, pieceId: id }));
            await db.piece_link.bulkCreate(linkObjects);
        }
    }

    if (num == 1) {
        res.send({ message: "Piece was updated successfully." });
    } else {
        res.send({ message: `Cannot update Piece with id=${id}. Maybe Piece was not found or req.body is empty!` });
    }
};


/**
 * @description Delete a global piece.
 * This is a destructive action and should be used with care, likely only by an admin.
 * The `beforeDelete` hook in the model would handle cascading deletes if set up.
 */
exports.delete = async (req, res) => {
    const id = req.params.id;

    const num = await base.service.delete(id);

    if (num == 1) {
        res.send({
            message: "Piece was deleted successfully!"
        });
    } else {
        res.send({
            message: `Cannot delete Piece with id=${id}. Maybe Piece was not found!`
        });
    }
};

exports.report = async (req, res) => {
    const { id } = req.params;
    const { category, reason } = req.body || {};
    if (!reason) {
        return res.status(400).send({ message: 'reason is required' });
    }
    try {
        const piece = await Piece.findByPk(id);
        if (!piece) return res.status(404).send({ message: 'Piece not found.' });
        const reporter = await db.user.findByPk(req.userId);
        const admins = (await db.user.findAll()).filter(u => Array.isArray(u.roles) && u.roles.includes('admin'));
        const recipients = admins.filter(a => a.email).map(a => a.email);
        const linkBase = await getFrontendUrl();
        const link = `${linkBase}/pieces/${id}`;
        await emailService.sendPieceReportMail(
            recipients,
            piece.title || `Piece ${id}`,
            reporter?.name || reporter?.email || 'Ein Benutzer',
            category || 'Sonstiges',
            reason,
            link
        );
        res.status(200).send({ message: 'Report sent' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.uploadImage = async (req, res, next) => {
    const id = req.params.id;
    if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

    const piece = await Piece.findByPk(id);
    if (!piece) return res.status(404).send({ message: 'Piece not found.' });

    await piece.update({ imageIdentifier: req.file.filename });
    res.status(200).send({ filename: req.file.filename });
};

exports.uploadLinkFile = async (req, res, next) => {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });
    res.status(200).send({ path: `/uploads/piece-files/${req.file.filename}` });
};

exports.deleteLinkFile = async (req, res, next) => {
    const { path: filePath } = req.body || {};
    if (!filePath) return res.status(400).send({ message: 'No file path provided.' });

    const filename = path.basename(filePath);
    const result = await fileService.deleteFile('files', filename);
    if (result.notFound) return res.status(404).send({ message: 'File not found.' });
    if (result.inUse) return res.status(400).send({ message: 'File in use.' });
    return res.status(200).send({ message: 'File deleted.' });
};

exports.getImage = async (req, res, next) => {
    const id = req.params.id;
    const piece = await Piece.findByPk(id);

        if (!piece || !piece.imageIdentifier) {
            return res.status(200).json({ data: '' });
        }

    const filePath = path.join(__dirname, '../../uploads/piece-images', piece.imageIdentifier);

    try {
        await fs.access(filePath);
    } catch (err) {
        return res.status(200).json({ data: '' });
    }

    const fileData = await fs.readFile(filePath);
    const base64 = fileData.toString('base64');
    const mimeType = 'image/' + (path.extname(filePath).slice(1) || 'jpeg');
    res.status(200).json({ data: `data:${mimeType};base64,${base64}` });
};
