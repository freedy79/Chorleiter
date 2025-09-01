const db = require('../models');
const { Op } = db.Sequelize;
const { datesForRule, isoDateString } = require('../utils/date.utils');

const { isPublicHoliday } = require('../services/holiday.service');


exports.findByMonth = async (req, res) => {
    const { year, month } = req.params;
    const rules = await db.plan_rule.findAll({ where: { choirId: req.activeChoirId } });
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
    const dates = Array.from(dateSet).sort();
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const avail = await db.user_availability.findAll({
        where: {
            userId: req.userId,
            choirId: req.activeChoirId,
            date: { [Op.between]: [ `${year}-${String(month).padStart(2,'0')}-01`, `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}` ] }
        }
    });
    const map = Object.fromEntries(avail.map(a => [a.date, a]));
    const result = dates.map(d => map[d] ? map[d] : { date: d, status: 'AVAILABLE' });
    res.status(200).send(result);
};

exports.setAvailability = async (req, res) => {
    const { date, status } = req.body;
    if (!date || !status) return res.status(400).send({ message: 'date and status required' });
    const [avail] = await db.user_availability.findOrCreate({
        where: { userId: req.userId, choirId: req.activeChoirId, date },
        defaults: { status }
    });
    if (avail.status !== status) await avail.update({ status });
    res.status(200).send(avail);
};

exports.findAllByMonth = async (req, res) => {
    const { year, month } = req.params;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const avail = await db.user_availability.findAll({
        where: {
            choirId: req.activeChoirId,
            date: { [Op.between]: [ `${year}-${String(month).padStart(2,'0')}-01`, `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}` ] }
        },
        attributes: ['userId', 'date', 'status']
    });
    res.status(200).send(avail);
};
