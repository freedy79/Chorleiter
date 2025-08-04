const db = require("../models");
const { Sequelize, Op } = require("sequelize");

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

        // Pieces unused for at least 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const leastUsedPiecesRaw = await db.piece.findAll({
            attributes: [
                'id',
                'title',
                [Sequelize.fn('MAX', Sequelize.col('events.date')), 'lastDate'],
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { choirId },
                through: { attributes: [] }
            }],
            group: ['piece.id'],
            having: Sequelize.where(
                Sequelize.fn('MAX', Sequelize.col('events.date')),
                { [Op.lt]: twelveMonthsAgo }
            ),
            raw: true,
            subQuery: false
        });

        const leastUsedPieces = leastUsedPiecesRaw
            .sort((a, b) => new Date(a.lastDate) - new Date(b.lastDate))
            .map(p => ({
                id: p.id,
                title: p.title,
                count: Math.floor((Date.now() - new Date(p.lastDate)) / (1000 * 60 * 60 * 24 * 30))
            }));

        // Count singable pieces
        const singableCount = await db.choir_repertoire.count({
            where: { choirId, status: 'CAN_BE_SUNG' }
        });

        // Count pieces currently in rehearsal
        const rehearsalCount = await db.choir_repertoire.count({
            where: { choirId, status: 'IN_REHEARSAL' }
        });

        res.status(200).send({
            topServicePieces,
            topRehearsalPieces,
            leastUsedPieces,
            singableCount,
            rehearsalCount
        });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error generating statistics.' });
    }
};
