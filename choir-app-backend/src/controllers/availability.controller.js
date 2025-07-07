const db = require('../models');
const { Op } = db.Sequelize;

function datesForRule(year, month, rule) {
    const dates = [];
    const d = new Date(Date.UTC(year, month - 1, 1));
    while (d.getUTCMonth() === month - 1) {
        if (d.getUTCDay() === rule.dayOfWeek) {
            const week = Math.floor((d.getUTCDate() - 1) / 7) + 1;
            if (!Array.isArray(rule.weeks) || rule.weeks.length === 0 || rule.weeks.includes(week)) {
                dates.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
            }
        }
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
}

exports.findByMonth = async (req, res) => {
    const { year, month } = req.params;
    try {
        const rules = await db.plan_rule.findAll({ where: { choirId: req.activeChoirId } });
        const dateSet = new Set();
        for (const rule of rules) {
            for (const d of datesForRule(year, month, rule)) {
                dateSet.add(d.toISOString().split('T')[0]);
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
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not fetch availability.' });
    }
};

exports.setAvailability = async (req, res) => {
    const { date, status } = req.body;
    if (!date || !status) return res.status(400).send({ message: 'date and status required' });
    try {
        const [avail] = await db.user_availability.findOrCreate({
            where: { userId: req.userId, choirId: req.activeChoirId, date },
            defaults: { status }
        });
        if (avail.status !== status) await avail.update({ status });
        res.status(200).send(avail);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not save availability.' });
    }
};

exports.findAllByMonth = async (req, res) => {
    const { year, month } = req.params;
    try {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const avail = await db.user_availability.findAll({
            where: {
                choirId: req.activeChoirId,
                date: { [Op.between]: [ `${year}-${String(month).padStart(2,'0')}-01`, `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}` ] }
            },
            attributes: ['userId', 'date', 'status']
        });
        res.status(200).send(avail);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not fetch availability.' });
    }
};
