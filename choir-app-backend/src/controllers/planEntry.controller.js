const db = require('../models');
const PlanEntry = db.plan_entry;
const User = db.user;

exports.create = async (req, res) => {
    const { monthlyPlanId, date, notes, directorId, organistId } = req.body;
    if (!monthlyPlanId || !date) {
        return res.status(400).send({ message: 'monthlyPlanId and date are required.' });
    }
    const entry = await PlanEntry.create({ monthlyPlanId, date, notes, directorId, organistId });
    const full = await PlanEntry.findByPk(entry.id, {
        include: [
            { model: User, as: 'director', attributes: ['id', 'name'] },
            { model: User, as: 'organist', attributes: ['id', 'name'], required: false }
        ]
    });
    res.status(201).send(full);
};

exports.update = async (req, res) => {
    const id = req.params.id;
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
};

exports.delete = async (req, res) => {
    const id = req.params.id;
    const num = await PlanEntry.destroy({ where: { id } });
    if (num === 1) res.send({ message: 'Entry deleted.' });
    else res.status(404).send({ message: 'Entry not found.' });
};
