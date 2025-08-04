const db = require("../models");
const { Sequelize, Op } = require("sequelize");

exports.overview = async (req, res) => {
    const choirId = req.activeChoirId;
    const { startDate, endDate } = req.query;

    const dateClause = {};
    if (startDate) {
        dateClause[Op.gte] = new Date(startDate);
    }
    if (endDate) {
        dateClause[Op.lte] = new Date(endDate);
    }
    const eventDateFilter = Object.keys(dateClause).length ? { date: dateClause } : {};

    try {
        // Top pieces in services
        const topServicePieces = await db.piece.findAll({
            attributes: [
                "id",
                "title",
                [Sequelize.fn("COUNT", Sequelize.col("events.id")), "count"],
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { choirId, type: "SERVICE", ...eventDateFilter },
                through: { attributes: [] }
            }],
            group: ["piece.id"],
            order: [[Sequelize.literal("count"), "DESC"]],
            limit: 3,
            subQuery: false
        });

        // Top pieces rehearsed
        const topRehearsalPieces = await db.piece.findAll({
            attributes: [
                "id",
                "title",
                [Sequelize.fn("COUNT", Sequelize.col("events.id")), "count"],
            ],
            include: [{
                model: db.event,
                attributes: [],
                where: { choirId, type: "REHEARSAL", ...eventDateFilter },
                through: { attributes: [] }
            }],
            group: ["piece.id"],
            order: [[Sequelize.literal("count"), "DESC"]],
            limit: 3,
            subQuery: false
        });

        // Count singable pieces
        const singableCount = await db.choir_repertoire.count({
            where: { choirId, status: "CAN_BE_SUNG" }
        });

        // Count pieces currently in rehearsal
        const rehearsalCount = await db.choir_repertoire.count({
            where: { choirId, status: "IN_REHEARSAL" }
        });

        // Pieces not sung for a long time
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 12);

        const leastUsedPieces = await db.piece.findAll({
            attributes: [
                "id",
                "title",
                [Sequelize.fn("COUNT", Sequelize.col("events.id")), "count"],
                [Sequelize.fn("MAX", Sequelize.col("events.date")), "lastUsed"]
            ],
            include: [
                {
                    model: db.event,
                    attributes: [],
                    required: false,
                    where: { choirId },
                    through: { attributes: [] }
                },
                {
                    model: db.choir,
                    attributes: [],
                    through: { attributes: [] },
                    where: { id: choirId }
                }
            ],
            group: ["piece.id"],
            having: Sequelize.literal(`MAX("events"."date") IS NULL OR MAX("events"."date") < '${cutoff.toISOString()}'`),
            order: [[Sequelize.literal("lastUsed"), "ASC"]],
            limit: 3,
            subQuery: false
        });

        // Distribution by voicing
        const voicingDistribution = await db.piece.findAll({
            attributes: [
                "voicing",
                [Sequelize.fn("COUNT", Sequelize.col("piece.id")), "count"]
            ],
            include: [{
                model: db.choir,
                attributes: [],
                through: { attributes: [] },
                where: { id: choirId }
            }],
            group: ["piece.voicing"]
        });

        res.status(200).send({
            topServicePieces,
            topRehearsalPieces,
            singableCount,
            rehearsalCount,
            leastUsedPieces,
            voicingDistribution
        });
    } catch (err) {
        res.status(500).send({ message: err.message || "Error generating statistics." });
    }
};

