const db = require("../models");
const { Sequelize } = require("sequelize");

exports.overview = async (req, res) => {
    const choirId = req.activeChoirId;
    try {
        // Top pieces in services
        const topServicePieces = await db.piece.findAll({
            attributes: [
                'id',
                'title',
                [Sequelize.fn('COUNT', Sequelize.col('events.id')), 'count']
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { choirId, type: 'SERVICE' },
                through: { attributes: [] }
            }],
            group: ['piece.id'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 3,
            subQuery: false
        });

        // Top pieces rehearsed
        const topRehearsalPieces = await db.piece.findAll({
            attributes: [
                'id',
                'title',
                [Sequelize.fn('COUNT', Sequelize.col('events.id')), 'count']
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { choirId, type: 'REHEARSAL' },
                through: { attributes: [] }
            }],
            group: ['piece.id'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 3,
            subQuery: false
        });

        // Count singable pieces
        const singableCount = await db.choir_repertoire.count({
            where: { choirId, status: 'CAN_BE_SUNG' }
        });

        res.status(200).send({
            topServicePieces,
            topRehearsalPieces,
            singableCount
        });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error generating statistics.' });
    }
};
