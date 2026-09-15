const db = require('../models');
const { Op } = db.Sequelize;
const { datesForRule, isoDateString } = require('../utils/date.utils');

const { isPublicHoliday } = require('../services/holiday.service');

const DIENSTPLAN_MANAGER_ROLES = ['choir_admin', 'director'];

/**
 * Resolves the choir scope for the request. Switching to another choir via
 * `?choirId=` requires the same role level there that the route demands.
 */
async function resolveChoirId(req, { requireManagerRole = false } = {}) {
    const requestedChoirId = req.query?.choirId ? Number(req.query.choirId) : null;
    if (!requestedChoirId || requestedChoirId === req.activeChoirId) {
        return req.activeChoirId;
    }

    if (req.userRoles?.includes('admin')) {
        return requestedChoirId;
    }

    const membership = await db.user_choir.findOne({
        where: { userId: req.userId, choirId: requestedChoirId },
        attributes: ['userId', 'rolesInChoir']
    });

    if (!membership) return req.activeChoirId;

    if (requireManagerRole) {
        const roles = Array.isArray(membership.rolesInChoir) ? membership.rolesInChoir : [];
        if (!DIENSTPLAN_MANAGER_ROLES.some(role => roles.includes(role))) {
            return req.activeChoirId;
        }
    }

    return requestedChoirId;
}

async function buildAvailabilitiesForUser({ choirId, userId, year, month }) {
    const rules = await db.plan_rule.findAll({ where: { choirId } });
    const dateSet = new Set();
    for (const rule of rules) {
        for (const d of datesForRule(year, month, rule)) {
            if (isPublicHoliday(d) && d.getUTCDay() !== 0) continue;
            dateSet.add(isoDateString(d));
        }
    }

    if (Number(month) === 12) {
        const dec25 = new Date(Date.UTC(year, 11, 25));
        const dec26 = new Date(Date.UTC(year, 11, 26));
        const hasRuleForDec25 = rules.some(r => r.dayOfWeek === dec25.getUTCDay());

        if (!hasRuleForDec25) {
            dateSet.add(isoDateString(dec25));
        }

        if (dec26.getUTCDay() === 0) {
            dateSet.delete(isoDateString(dec26));
        }
    }

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDate = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const events = await db.event.findAll({
        where: {
            choirId,
            date: { [Op.between]: [firstDate, lastDate] }
        },
        attributes: ['date']
    });
    for (const ev of events) {
        dateSet.add(isoDateString(ev.date));
    }

    const plans = await db.monthly_plan.findAll({
        where: { choirId, year: Number(year), month: Number(month) },
        attributes: ['id']
    });
    if (plans.length > 0) {
        const entries = await db.plan_entry.findAll({
            where: { monthlyPlanId: { [Op.in]: plans.map(plan => plan.id) } },
            attributes: ['date']
        });
        for (const entry of entries) {
            dateSet.add(isoDateString(entry.date));
        }
    }

    const dates = Array.from(dateSet).sort();
    const avail = await db.user_availability.findAll({
        where: {
            userId,
            choirId,
            date: { [Op.between]: [ firstDate, lastDate ] }
        }
    });
    const map = Object.fromEntries(avail.map(a => [a.date, a]));
    const user = await db.user.findByPk(userId);
    const defaultStatus = user?.preferences?.defaultAvailability;
    return dates.map(d => {
        if (map[d]) return map[d];
        return defaultStatus ? { date: d, status: defaultStatus } : { date: d };
    });
}


exports.findByMonth = async (req, res) => {
    const { year, month } = req.params;
    const choirId = await resolveChoirId(req);
    const result = await buildAvailabilitiesForUser({
        choirId,
        userId: req.userId,
        year,
        month
    });
    res.status(200).send(result);
};

exports.findByMonthForUser = async (req, res) => {
    const { year, month, userId } = req.params;
    const choirId = await resolveChoirId(req, { requireManagerRole: true });
    const result = await buildAvailabilitiesForUser({
        choirId,
        userId,
        year,
        month
    });
    res.status(200).send(result);
};

exports.setAvailability = async (req, res) => {
    const { date, status } = req.body;
    if (!date || !status) return res.status(400).send({ message: 'date and status required' });
    const choirId = await resolveChoirId(req);
    const [avail] = await db.user_availability.findOrCreate({
        where: { userId: req.userId, choirId, date },
        defaults: { status }
    });
    if (avail.status !== status) await avail.update({ status });
    res.status(200).send(avail);
};

exports.setUserAvailability = async (req, res) => {
    const { date, status } = req.body;
    const { userId } = req.params;
    if (!date || !status) return res.status(400).send({ message: 'date and status required' });
    const choirId = await resolveChoirId(req, { requireManagerRole: true });
    const [avail] = await db.user_availability.findOrCreate({
        where: { userId, choirId, date },
        defaults: { status }
    });
    if (avail.status !== status) await avail.update({ status });
    res.status(200).send(avail);
};

exports.findAllByMonth = async (req, res) => {
    const { year, month } = req.params;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const choirId = await resolveChoirId(req, { requireManagerRole: true });
    const avail = await db.user_availability.findAll({
        where: {
            choirId,
            date: { [Op.between]: [ `${year}-${String(month).padStart(2,'0')}-01`, `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}` ] }
        },
        attributes: ['userId', 'date', 'status']
    });
    res.status(200).send(avail);
};
