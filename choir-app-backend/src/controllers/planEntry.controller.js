const db = require('../models');
const PlanEntry = db.plan_entry;
const User = db.user;
const { invalidateMonthlyPlanCacheById } = require('../services/monthlyPlanCache.service');

exports.create = async (req, res) => {
    const { monthlyPlanId, date, notes, directorId, organistId } = req.body;
    if (!monthlyPlanId || !date) {
        return res.status(400).send({ message: 'monthlyPlanId and date are required.' });
    }
    const entry = await PlanEntry.create({ monthlyPlanId, date, notes, directorId, organistId });
    const full = await PlanEntry.findByPk(entry.id, {
        include: [
            { model: User, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: User, as: 'organist', attributes: ['id', 'firstName', 'name'], required: false }
        ]
    });
    await invalidateMonthlyPlanCacheById(monthlyPlanId);
    res.status(201).send(full);
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const entry = await PlanEntry.findByPk(id);
    if (!entry) return res.status(404).send({ message: 'Entry not found.' });
    const previousMonthlyPlanId = entry.monthlyPlanId;
    await entry.update(req.body);
    const newMonthlyPlanId = entry.monthlyPlanId;
    const full = await PlanEntry.findByPk(id, {
        include: [
            { model: User, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: User, as: 'organist', attributes: ['id', 'firstName', 'name'], required: false }
        ]
    });
    await invalidateMonthlyPlanCacheById(previousMonthlyPlanId);
    if (newMonthlyPlanId && newMonthlyPlanId !== previousMonthlyPlanId) {
        await invalidateMonthlyPlanCacheById(newMonthlyPlanId);
    }
    res.status(200).send(full);
};

exports.delete = async (req, res) => {
    const id = req.params.id;
    const entry = await PlanEntry.findByPk(id);
    if (!entry) {
        return res.status(404).send({ message: 'Entry not found.' });
    }
    await entry.destroy();
    await invalidateMonthlyPlanCacheById(entry.monthlyPlanId);
    res.send({ message: 'Entry deleted.' });
};
