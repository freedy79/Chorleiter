const db = require("../models");
const { Sequelize, Op } = require("sequelize");

exports.overview = async (req, res) => {
    const choirId = req.activeChoirId;
    const { startDate, endDate, activeMonths, global } = req.query;
    const requestedGlobal = String(global).toLowerCase() === 'true';
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
    let activeThreshold;
    if (activeMonths) {
        activeThreshold = new Date();
        activeThreshold.setMonth(activeThreshold.getMonth() - Number(activeMonths));
    }
    try {
        const choirCount = await db.choir.count();
        const allowGlobal = choirCount > 3;
        const useGlobal = requestedGlobal && allowGlobal;
        const choirFilter = useGlobal ? {} : { choirId };
        // Top pieces in services
        const topServiceQuery = {
            attributes: [
                'id',
                'title',
                [Sequelize.fn('COUNT', Sequelize.col('events.id')), 'count'],
                [Sequelize.fn('MAX', Sequelize.col('events.date')), 'lastDate']
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { ...choirFilter, type: 'SERVICE', ...dateWhere },
                through: { attributes: [] }
            }],
            group: ['piece.id'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 3,
            subQuery: false,
            raw: true
        };
        if (activeThreshold) {
            topServiceQuery.having = Sequelize.where(
                Sequelize.fn('MAX', Sequelize.col('events.date')),
                { [Op.gte]: activeThreshold }
            );
        }
        const topServicePieces = await db.piece.findAll(topServiceQuery);

        // Top pieces rehearsed
        const topRehearsalQuery = {
            attributes: [
                'id',
                'title',
                [Sequelize.fn('COUNT', Sequelize.col('events.id')), 'count'],
                [Sequelize.fn('MAX', Sequelize.col('events.date')), 'lastDate']
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { ...choirFilter, type: 'REHEARSAL', ...dateWhere },
                through: { attributes: [] }
            }],
            group: ['piece.id'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 3,
            subQuery: false,
            raw: true
        };
        if (activeThreshold) {
            topRehearsalQuery.having = Sequelize.where(
                Sequelize.fn('MAX', Sequelize.col('events.date')),
                { [Op.gte]: activeThreshold }
            );
        }
        const topRehearsalPieces = await db.piece.findAll(topRehearsalQuery);

        // Pieces unused for at least 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const leastUsedPiecesRaw = await db.piece.findAll({
            attributes: [
                'id',
                'title',
                [Sequelize.fn('MAX', Sequelize.col('events.date')), 'lastDate'],
            ],
            include: [
                {
                    model: db.event,
                    attributes: [],
                    where: { ...choirFilter },
                    through: { attributes: [] }
                },
                {
                    model: db.choir_repertoire,
                    attributes: [],
                    where: { ...choirFilter, status: { [Op.in]: ['IN_REHEARSAL', 'CAN_BE_SUNG'] } },
                    required: true
                }
            ],
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
            where: { ...choirFilter, status: 'CAN_BE_SUNG' }
        });

        // Count pieces currently in rehearsal
        const rehearsalCount = await db.choir_repertoire.count({
            where: { ...choirFilter, status: 'IN_REHEARSAL' }
        });

        res.status(200).send({
            topServicePieces,
            topRehearsalPieces,
            leastUsedPieces,
            singableCount,
            rehearsalCount,
            globalAvailable: allowGlobal,
            isGlobal: useGlobal
        });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Error generating statistics.' });
    }
};
