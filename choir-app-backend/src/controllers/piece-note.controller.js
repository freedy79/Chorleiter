const db = require('../models');
const PieceNote = db.piece_note;

exports.findForPiece = async (req, res) => {
    const pieceId = req.params.id;
    try {
        const notes = await PieceNote.findAll({
            where: { pieceId, choirId: req.activeChoirId },
            include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).send(notes);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createForPiece = async (req, res) => {
    const pieceId = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).send({ message: 'Text is required' });
    try {
        const note = await PieceNote.create({
            text,
            pieceId,
            choirId: req.activeChoirId,
            userId: req.userId
        });
        const full = await PieceNote.findByPk(note.id, { include: [{ model: db.user, as: 'author', attributes: ['id','firstName','name'] }] });
        res.status(201).send(full);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.update = async (req, res) => {
    const noteId = req.params.noteId;
    const { text } = req.body;
    try {
        const note = await PieceNote.findByPk(noteId);
        if (!note) return res.status(404).send({ message: 'Note not found' });
        if (note.userId !== req.userId && !req.userRoles.includes('admin')) {
            return res.status(403).send({ message: 'Not allowed' });
        }
        await note.update({ text });
        const full = await PieceNote.findByPk(noteId, { include: [{ model: db.user, as: 'author', attributes: ['id','firstName','name'] }] });
        res.status(200).send(full);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    const noteId = req.params.noteId;
    try {
        const note = await PieceNote.findByPk(noteId);
        if (!note) return res.status(404).send({ message: 'Note not found' });
        if (note.userId !== req.userId && !req.userRoles.includes('admin')) {
            return res.status(403).send({ message: 'Not allowed' });
        }
        await note.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
