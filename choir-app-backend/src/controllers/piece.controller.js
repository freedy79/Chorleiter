const db = require("../models");
const Piece = db.piece;
const Composer = db.composer;
const Category = db.category;
const Author = db.author;
const path = require('path');
const fs = require('fs/promises');
const CrudService = require("../services/crud.service");
const pieceService = new CrudService(Piece);

/**
 * @description Create a new global piece.
 * This piece is not associated with any choir yet. It's added to the master list.
 * It's expected that another action (like adding to a collection or repertoire)
 * will link this piece to a choir.
 */
exports.create = async (req, res) => {
    if (req.userRole === 'demo') {
        return res.status(403).send({ message: 'Demo user cannot create pieces.' });
    }
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

    try {
        let resolvedAuthorId = authorId || null;
        if (!resolvedAuthorId && authorName) {
            const [author] = await db.author.findOrCreate({ where: { name: authorName }, defaults: { name: authorName }});
            resolvedAuthorId = author.id;
        }

        const newPiece = await db.piece.create({
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

    } catch (err) {
        console.error("Error creating piece:", err);
        res.status(500).send({ message: "An error occurred while creating the piece." });
    }
};


/**
 * @description Find all global pieces.
 * This is useful for administrative tasks or for populating a lookup/autocomplete
 * when adding pieces to a collection.
 */
exports.findAll = async (req, res) => {
    try {
        const pieces = await pieceService.findAll({
            include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ],
            order: [['title', 'ASC']]
        });
        res.status(200).send(pieces);
    } catch (err) {
        res.status(500).send({ message: err.message || "An error occurred while retrieving pieces." });
    }
};


/**
 * @description Find a single global piece by its ID.
 */
exports.findOne = async (req, res) => {
    const id = req.params.id;

    try {
        const piece = await pieceService.findById(id, {
            include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] }
            ]
        });

        if (piece) {
            res.status(200).send(piece);
        } else {
            res.status(404).send({
                message: `Cannot find Piece with id=${id}.`
            });
        }
    } catch (err) {
        res.status(500).send({ message: "Error retrieving Piece with id=" + id });
    }
};


/**
 * @description Update a global piece's details.
 * This would typically be an administrative function.
 */
exports.update = async (req, res) => {
    const id = req.params.id;

    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot update pieces.' });
        }
        if (req.userRole !== 'admin') {
            await db.piece_change.create({ pieceId: id, userId: req.userId, data: req.body });
            return res.status(202).send({ message: 'Change proposal created.' });
        }

        const num = await pieceService.update(id, req.body);

        if (num == 1) {
            res.send({ message: "Piece was updated successfully." });
        } else {
            res.send({ message: `Cannot update Piece with id=${id}. Maybe Piece was not found or req.body is empty!` });
        }
    } catch (err) {
        res.status(500).send({ message: "Error updating Piece with id=" + id });
    }
};


/**
 * @description Delete a global piece.
 * This is a destructive action and should be used with care, likely only by an admin.
 * The `beforeDelete` hook in the model would handle cascading deletes if set up.
 */
exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot delete pieces.' });
        }
        const num = await pieceService.delete(id);

        if (num == 1) {
            res.send({
                message: "Piece was deleted successfully!"
            });
        } else {
            res.send({
                message: `Cannot delete Piece with id=${id}. Maybe Piece was not found!`
            });
        }
    } catch (err) {
        res.status(500).send({ message: "Could not delete Piece with id=" + id });
    }
};

exports.uploadImage = async (req, res, next) => {
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify pieces.' });
        }
        const id = req.params.id;
        if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

        const piece = await Piece.findByPk(id);
        if (!piece) return res.status(404).send({ message: 'Piece not found.' });

        await piece.update({ imageIdentifier: req.file.filename });
        res.status(200).send({ filename: req.file.filename });
    } catch (err) { next(err); }
};

exports.getImage = async (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};
