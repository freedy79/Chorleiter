const db = require('../models');
const PieceChange = db.piece_change;
const Piece = db.piece;
const emailService = require('../services/email.service');
const { getFrontendUrl } = require('../utils/frontend-url');

exports.create = async (req, res) => {
    const { pieceId, data } = req.body;
    if (!pieceId || !data) {
        return res.status(400).send({ message: 'pieceId and data are required' });
    }
    try {
        const change = await PieceChange.create({ pieceId, data, userId: req.userId });
        const piece = await Piece.findByPk(pieceId);
        const proposer = await db.user.findByPk(req.userId);

        const admins = (await db.user.findAll()).filter(u => Array.isArray(u.roles) && u.roles.includes('admin'));
        const linkBase = await getFrontendUrl();
        const link = `${linkBase}/admin/piece-changes`;
        const promises = admins
            .filter(a => a.email)
            .map(a => emailService.sendPieceChangeProposalMail(
                a.email,
                piece?.title || `Piece ${pieceId}`,
                proposer?.name || proposer?.email || 'Ein Benutzer',
                link
            ));
        await Promise.all(promises);

        res.status(201).send(change);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.findAll = async (req, res) => {
    try {
        const changes = await PieceChange.findAll({
            include: [
                {
                    model: Piece, as: 'piece',
                    include: [
                        { model: db.composer, as: 'composer', attributes: ['id', 'name'] },
                        { model: db.category, as: 'category', attributes: ['id', 'name'] },
                        { model: db.author, as: 'author', attributes: ['id', 'name'] },
                        { model: db.piece_link, as: 'links' }
                    ]
                },
                { model: db.user, as: 'proposer', attributes: ['id', 'name', 'firstName', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Resolve FK IDs in proposed data to human-readable names
        const fkResolvers = {
            composerId: { model: db.composer, field: 'name' },
            categoryId: { model: db.category, field: 'name' },
            authorId:   { model: db.author,   field: 'name' }
        };

        const results = await Promise.all(changes.map(async (change) => {
            const json = change.toJSON();
            const resolvedNames = {};
            for (const [fkField, { model, field }] of Object.entries(fkResolvers)) {
                const proposedId = json.data?.[fkField];
                if (proposedId != null) {
                    const record = await model.findByPk(proposedId, { attributes: ['id', field] });
                    if (record) {
                        resolvedNames[fkField] = record[field];
                    }
                }
            }
            json.resolvedNames = resolvedNames;
            return json;
        }));

        res.status(200).send(results);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.findOne = async (req, res) => {
    const { id } = req.params;
    try {
        const change = await PieceChange.findByPk(id, { include: [{ model: Piece, as: 'piece' }] });
        if (!change) return res.status(404).send({ message: 'Change not found' });
        res.status(200).send(change);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.approve = async (req, res) => {
    const { id } = req.params;
    try {
        const change = await PieceChange.findByPk(id);
        if (!change) return res.status(404).send({ message: 'Change not found' });
        await Piece.update(change.data, { where: { id: change.pieceId } });
        await change.destroy();
        res.status(200).send({ message: 'Change applied' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const change = await PieceChange.findByPk(id);
        if (!change) return res.status(404).send({ message: 'Change not found' });
        await change.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
