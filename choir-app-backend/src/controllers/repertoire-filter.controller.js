const db = require("../models");
const { Op } = require("sequelize");
const RepertoireFilter = db.repertoire_filter;

exports.list = async (req, res) => {
    try {
        const filters = await RepertoireFilter.findAll({
            where: {
                [Op.or]: [
                    { visibility: 'global' },
                    { visibility: 'local', choirId: req.activeChoirId },
                    { visibility: 'personal', userId: req.userId }
                ]
            },
            order: [['name','ASC']]
        });
        res.status(200).send(filters);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.save = async (req, res) => {
    const { name, data, visibility = 'personal' } = req.body;
    if (!name || !data) {
        return res.status(400).send({ message: 'Name and data are required.' });
    }
    try {
        if (visibility === 'global' && req.userRole !== 'admin') {
            return res.status(403).send({ message: 'Require Admin Role!' });
        }
        if (visibility === 'local' && req.userRole !== 'admin') {
            const assoc = await db.user_choir.findOne({ where: { userId: req.userId, choirId: req.activeChoirId } });
            if (!assoc || !Array.isArray(assoc.rolesInChoir) || !assoc.rolesInChoir.includes('choir_admin')) {
                return res.status(403).send({ message: 'Require Choir Admin Role!' });
            }
        }
        const where = { name, visibility };
        if (visibility === 'personal') where.userId = req.userId;
        if (visibility === 'local') where.choirId = req.activeChoirId;

        let preset = await RepertoireFilter.findOne({ where });
        if (preset) {
            await preset.update({ data });
        } else {
            preset = await RepertoireFilter.create({
                name,
                data,
                visibility,
                userId: visibility === 'personal' ? req.userId : null,
                choirId: visibility === 'local' ? req.activeChoirId : null
            });
        }
        res.status(200).send(preset);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;
    try {
        const preset = await RepertoireFilter.findByPk(id);
        if (!preset) return res.status(404).send({ message: 'Filter not found.' });

        if (preset.visibility === 'global') {
            if (req.userRole !== 'admin') return res.status(403).send({ message: 'Require Admin Role!' });
        } else if (preset.visibility === 'local') {
            if (req.userRole !== 'admin') {
                const assoc = await db.user_choir.findOne({ where: { userId: req.userId, choirId: preset.choirId } });
                if (!assoc || !Array.isArray(assoc.rolesInChoir) || !assoc.rolesInChoir.includes('choir_admin')) return res.status(403).send({ message: 'Require Choir Admin Role!' });
            }
        } else {
            if (preset.userId !== req.userId) return res.status(403).send({ message: 'Not allowed.' });
        }
        await preset.destroy();
        res.status(200).send({ message: 'Deleted' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
