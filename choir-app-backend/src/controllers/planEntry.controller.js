const db = require('../models');
const PlanEntry = db.plan_entry;
const MonthlyPlan = db.monthly_plan;
const UserChoir = db.user_choir;
const User = db.user;
const { invalidateMonthlyPlanCacheById } = require('../services/monthlyPlanCache.service');
const { syncPlanEntryEvent, normalizeEventType } = require('../services/planEntryEventSync.service');

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

async function validateProgramForChoir(programId, choirId) {
    if (!programId) return null;
    const program = await db.program.findOne({
        where: { id: programId, choirId },
        attributes: ['id', 'title', 'status']
    });
    if (!program) {
        return 'Program not found for this choir.';
    }
    return null;
}

exports.create = async (req, res) => {
    const { monthlyPlanId, date, notes, directorId, organistId, programId, eventType } = req.body;
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
    const progErr = await validateProgramForChoir(programId, plan.choirId);
    if (progErr) return res.status(400).send({ message: progErr });

    const entry = await PlanEntry.create({
        monthlyPlanId,
        date,
        notes,
        directorId,
        organistId,
        programId: programId || null,
        eventType: normalizeEventType(eventType, notes)
    });
    await syncPlanEntryEvent(entry);
    const full = await PlanEntry.findByPk(entry.id, {
        include: [
            { model: User, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: User, as: 'organist', attributes: ['id', 'firstName', 'name'], required: false },
            { model: db.program, as: 'program', attributes: ['id', 'title', 'status'], required: false },
            { model: db.event, as: 'linkedEvent', attributes: ['id', 'type', 'date'], required: false }
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
    const { directorId, organistId, programId, eventType, notes } = req.body;
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
        if (programId !== undefined) {
            const progErr = await validateProgramForChoir(programId || null, plan.choirId);
            if (progErr) return res.status(400).send({ message: progErr });
        }
    }

    // Whitelist allowed fields
    const allowedFields = ['date', 'notes', 'directorId', 'organistId', 'monthlyPlanId', 'programId'];
    const updateData = {};
    for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
            updateData[key] = req.body[key];
        }
    }
    if (eventType !== undefined) {
        updateData.eventType = normalizeEventType(eventType, notes ?? entry.notes);
    }

    const previousMonthlyPlanId = entry.monthlyPlanId;
    await entry.update(updateData);
    await syncPlanEntryEvent(entry);
    const newMonthlyPlanId = entry.monthlyPlanId;
    const full = await PlanEntry.findByPk(id, {
        include: [
            { model: User, as: 'director', attributes: ['id', 'firstName', 'name'] },
            { model: User, as: 'organist', attributes: ['id', 'firstName', 'name'], required: false },
            { model: db.program, as: 'program', attributes: ['id', 'title', 'status'], required: false },
            { model: db.event, as: 'linkedEvent', attributes: ['id', 'type', 'date'], required: false }
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
    const linkedEventId = entry.linkedEventId;
    await entry.destroy();
    if (linkedEventId) {
        await db.event.destroy({ where: { id: linkedEventId } });
    }
    await invalidateMonthlyPlanCacheById(entry.monthlyPlanId);
    res.send({ message: 'Entry deleted.' });
};
