const db = require("../models");
const Piece = db.piece;
const Composer = db.composer;
const Category = db.category;
const Author = db.author;
const path = require('path');
const fs = require('fs/promises');
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
        title, composerId, categoryId, voicing,
        key, timeSignature, lyrics, imageIdentifier, license, opus, lyricsSource,
        authorName, authorId,
        arrangerIds, // e.g., [12, 15]
        links        // e.g., [{ description: 'YouTube', url: '...' }]
    } = req.body;

    if (!title || !composerId) {
        return res.status(400).send({ message: "Title and Composer are required." });
    }

    let resolvedAuthorId = authorId || null;
        if (!resolvedAuthorId && authorName) {
            const [author] = await db.author.findOrCreate({ where: { name: authorName }, defaults: { name: authorName }});
            resolvedAuthorId = author.id;
        }

        const newPiece = await base.service.create({
            title, composerId, categoryId, voicing, key, timeSignature,
            lyrics, imageIdentifier, license, opus,
            lyricsSource,
            authorId: resolvedAuthorId
        });

        if (arrangerIds && arrangerIds.length > 0) {
            await newPiece.setArrangers(arrangerIds);
        }

        if (links && links.length > 0) {
            const linkObjects = links.map(link => ({ ...link, pieceId: newPiece.id }));
            await db.piece_link.bulkCreate(linkObjects);
        }

        // Fetch the full new piece to return it
    const result = await db.piece.findByPk(newPiece.id, {
            include: [ /* all associations */ ]
        });

    res.status(201).send(result);
};


/**
 * @description Find all global pieces.
 * This is useful for administrative tasks or for populating a lookup/autocomplete
 * when adding pieces to a collection.
 */
exports.findAll = async (req, res) => {
    const { composerId, authorId } = req.query;
    const where = {};
    if (composerId) where.composerId = composerId;
    if (authorId) where.authorId = authorId;

    const pieces = await base.service.findAll({
            where,
            include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
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

    if (req.userRole !== 'admin') {
            await db.piece_change.create({ pieceId: id, userId: req.userId, data: req.body });
            const piece = await Piece.findByPk(id);
            const proposer = await db.user.findByPk(req.userId);
            const admins = await db.user.findAll({ where: { role: 'admin' } });
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

    const { links, ...pieceData } = req.body;
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

exports.uploadImage = async (req, res, next) => {
    const id = req.params.id;
    if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

    const piece = await Piece.findByPk(id);
    if (!piece) return res.status(404).send({ message: 'Piece not found.' });

    await piece.update({ imageIdentifier: req.file.filename });
    res.status(200).send({ filename: req.file.filename });
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
