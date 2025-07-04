const db = require('../models');
const PlanEntry = db.plan_entry;
const User = db.user;

exports.create = async (req, res) => {
    const { monthlyPlanId, date, type, notes, directorId, organistId } = req.body;
    if (!monthlyPlanId || !date || !type) {
        return res.status(400).send({ message: 'monthlyPlanId, date and type are required.' });
    }
    try {
        const entry = await PlanEntry.create({ monthlyPlanId, date, type, notes, directorId, organistId });
        const full = await PlanEntry.findByPk(entry.id, {
            include: [
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false }
            ]
        });
        res.status(201).send(full);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not create entry.' });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    try {
        const entry = await PlanEntry.findByPk(id);
        if (!entry) return res.status(404).send({ message: 'Entry not found.' });
        await entry.update(req.body);
        const full = await PlanEntry.findByPk(id, {
            include: [
                { model: User, as: 'director', attributes: ['id', 'name'] },
                { model: User, as: 'organist', attributes: ['id', 'name'], required: false }
            ]
        });
        res.status(200).send(full);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not update entry.' });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;
    try {
        const num = await PlanEntry.destroy({ where: { id } });
        if (num === 1) res.send({ message: 'Entry deleted.' });
        else res.status(404).send({ message: 'Entry not found.' });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not delete entry.' });
    }
};
