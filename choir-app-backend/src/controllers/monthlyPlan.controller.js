const db = require('../models');
const MonthlyPlan = db.monthly_plan;

exports.findByMonth = async (req, res) => {
    const { year, month } = req.params;
    try {
        const plan = await MonthlyPlan.findOne({
            where: { choirId: req.activeChoirId, year, month },
            include: [{
                model: db.event,
                as: 'events',
                order: [['date', 'ASC']],
                include: [
                    { model: db.user, as: 'director', attributes: ['name'] },
                    { model: db.user, as: 'organist', attributes: ['name'], required: false }
                ]
            }]
        });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });
        res.status(200).send(plan);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not fetch plan.' });
    }
};

exports.create = async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) {
        return res.status(400).send({ message: 'year and month required' });
    }
    try {
        const [plan, created] = await MonthlyPlan.findOrCreate({
            where: { choirId: req.activeChoirId, year, month },
            defaults: { choirId: req.activeChoirId, year, month }
        });
        res.status(created ? 201 : 200).send(plan);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not create plan.' });
    }
};

exports.finalize = async (req, res) => {
    const id = req.params.id;
    try {
        const plan = await MonthlyPlan.findOne({ where: { id, choirId: req.activeChoirId } });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });
        await plan.update({ finalized: true, version: plan.version + 1 });
        res.status(200).send(plan);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not finalize plan.' });
    }
};

exports.reopen = async (req, res) => {
    const id = req.params.id;
    try {
        const plan = await MonthlyPlan.findOne({ where: { id, choirId: req.activeChoirId } });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });
        await plan.update({ finalized: false });
        res.status(200).send(plan);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not reopen plan.' });
    }
};
