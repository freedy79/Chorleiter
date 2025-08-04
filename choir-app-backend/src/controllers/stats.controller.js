const db = require("../models");
const { Sequelize, Op } = require("sequelize");

exports.overview = async (req, res) => {
    const choirId = req.activeChoirId;
    const { startDate, endDate } = req.query;
    const dateWhere = {};
    if (startDate || endDate) {
        dateWhere.date = {};
        if (startDate) {
            dateWhere.date[Op.gte] = new Date(startDate);
        }
        if (endDate) {
            dateWhere.date[Op.lte] = new Date(endDate);
        }
    }
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
                where: { choirId, type: 'SERVICE', ...dateWhere },
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
                where: { choirId, type: 'REHEARSAL', ...dateWhere },
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

        // Count pieces currently in rehearsal
        const rehearsalCount = await db.choir_repertoire.count({
            where: { choirId, status: 'IN_REHEARSAL' }
        });

        res.status(200).send({
            topServicePieces,
            topRehearsalPieces,
            singableCount,
            rehearsalCount
        });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error generating statistics.' });
    }
};
