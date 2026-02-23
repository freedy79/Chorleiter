const db = require('../models');
const PlanEntry = db.plan_entry;
const MonthlyPlan = db.monthly_plan;
const UserChoir = db.user_choir;
const User = db.user;
const { invalidateMonthlyPlanCacheById } = require('../services/monthlyPlanCache.service');

/**
 * Validates that a user has the required choir role to be assigned
 * as director or organist in a plan entry.
 *
 * @param {number} userId - The user ID to validate
 * @param {number} choirId - The choir ID for context
 * @param {string[]} allowedRoles - Roles that qualify (e.g. ['director', 'choir_admin'] or ['organist'])
 * @param {string} label - Human-readable label for error messages (e.g. 'Director' or 'Organist')
 * @returns {Promise<string|null>} Error message or null if valid
 */
async function validatePlanEntryRole(userId, choirId, allowedRoles, label) {
    if (!userId) return null;
    const membership = await UserChoir.findOne({ where: { userId, choirId } });
    if (!membership) {
        return `${label} (ID ${userId}) is not a member of this choir.`;
    }
    const roles = Array.isArray(membership.rolesInChoir) ? membership.rolesInChoir : [];
    if (!allowedRoles.some(r => roles.includes(r))) {
        return `${label} (ID ${userId}) does not have a valid role (${allowedRoles.join(', ')}).`;
    }
    return null;
}

exports.create = async (req, res) => {
    const { monthlyPlanId, date, notes, directorId, organistId } = req.body;
    if (!monthlyPlanId || !date) {
        return res.status(400).send({ message: 'monthlyPlanId and date are required.' });
    }

    // Validate director/organist roles
    const plan = await MonthlyPlan.findByPk(monthlyPlanId);
    if (!plan) {
        return res.status(404).send({ message: 'Monthly plan not found.' });
    }
    const dirErr = await validatePlanEntryRole(directorId, plan.choirId, ['director', 'choir_admin'], 'Director');
    if (dirErr) return res.status(400).send({ message: dirErr });
    const orgErr = await validatePlanEntryRole(organistId, plan.choirId, ['organist'], 'Organist');
    if (orgErr) return res.status(400).send({ message: orgErr });

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

    // Validate director/organist roles if they are being changed
    const { directorId, organistId } = req.body;
    if (directorId !== undefined || organistId !== undefined) {
        const plan = await MonthlyPlan.findByPk(entry.monthlyPlanId);
        if (!plan) {
            return res.status(404).send({ message: 'Monthly plan not found.' });
        }
        if (directorId !== undefined) {
            const dirErr = await validatePlanEntryRole(directorId, plan.choirId, ['director', 'choir_admin'], 'Director');
            if (dirErr) return res.status(400).send({ message: dirErr });
        }
        if (organistId !== undefined) {
            const orgErr = await validatePlanEntryRole(organistId, plan.choirId, ['organist'], 'Organist');
            if (orgErr) return res.status(400).send({ message: orgErr });
        }
    }

    // Whitelist allowed fields
    const allowedFields = ['date', 'notes', 'directorId', 'organistId', 'monthlyPlanId'];
    const updateData = {};
    for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
            updateData[key] = req.body[key];
        }
    }

    const previousMonthlyPlanId = entry.monthlyPlanId;
    await entry.update(updateData);
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
