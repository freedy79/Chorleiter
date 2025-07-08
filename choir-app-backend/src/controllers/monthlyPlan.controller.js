const db = require('../models');
const MonthlyPlan = db.monthly_plan;
const { datesForRule } = require('../utils/date.utils');

async function createEntriesFromRules(plan) {
    const rules = await db.plan_rule.findAll({ where: { choirId: plan.choirId } });
    for (const rule of rules) {
        const dates = datesForRule(plan.year, plan.month, rule);
        for (const date of dates) {
            await db.plan_entry.create({
                monthlyPlanId: plan.id,
                date,
                notes: rule.notes || null
            });
        }
    }
}

exports.findByMonth = async (req, res) => {
    const { year, month } = req.params;
    try {
        const plan = await MonthlyPlan.findOne({
            where: { choirId: req.activeChoirId, year, month },
            include: [{
                model: db.plan_entry,
                as: 'entries',
                include: [
                    { model: db.user, as: 'director', attributes: ['id', 'name'] },
                    { model: db.user, as: 'organist', attributes: ['id', 'name'], required: false }
                ]
            }],
            order: [[{ model: db.plan_entry, as: 'entries' }, 'date', 'ASC']]
        });
        if (!plan) return res.status(204).send();
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
        const choir = await db.choir.findByPk(req.activeChoirId);
        if (!choir.modules || !choir.modules.dienstplan) {
            return res.status(403).send({ message: 'Dienstplan module not enabled.' });
        }

        const [plan, created] = await MonthlyPlan.findOrCreate({
            where: { choirId: req.activeChoirId, year, month },
            defaults: { choirId: req.activeChoirId, year, month }
        });
        if (created) {
            await createEntriesFromRules(plan);
        }
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
