const db = require('../models');
const MonthlyPlan = db.monthly_plan;
const { datesForRule, isoDateString } = require('../utils/date.utils');
const { monthlyPlanPdf } = require('../services/pdf.service');
const emailService = require('../services/email.service');
const { emailDisabled } = require('../services/emailTransporter');
const { isPublicHoliday } = require('../services/holiday.service');

async function createEntriesFromRules(plan) {
    const rules = await db.plan_rule.findAll({ where: { choirId: plan.choirId } });
    for (const rule of rules) {
        const dates = datesForRule(plan.year, plan.month, rule);
        for (const date of dates) {
            if (date.getUTCMonth() === 11 && date.getUTCDate() === 26 && date.getUTCDay() === 0) {
                continue;
            }
            await db.plan_entry.create({
                monthlyPlanId: plan.id,
                date,
                notes: rule.notes || null
            });
        }
    }

    if (plan.month === 12) {
        const dec25 = new Date(Date.UTC(plan.year, 11, 25));
        const hasRuleForDec25 = rules.some(r => r.dayOfWeek === dec25.getUTCDay());
        if (!hasRuleForDec25) {
            await db.plan_entry.create({ monthlyPlanId: plan.id, date: dec25, notes: null });
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
            }, { model: db.choir, as: 'choir', attributes: ['id', 'name'] }],
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

exports.downloadPdf = async (req, res) => {
    const id = req.params.id;
    try {
        const plan = await MonthlyPlan.findOne({
            where: { id, choirId: req.activeChoirId },
            include: [{
                model: db.plan_entry,
                as: 'entries',
                include: [
                    { model: db.user, as: 'director', attributes: ['id', 'name'] },
                    { model: db.user, as: 'organist', attributes: ['id', 'name'], required: false }
                ]
            }, { model: db.choir, as: 'choir', attributes: ['id', 'name'] }],
            order: [[{ model: db.plan_entry, as: 'entries' }, 'date', 'ASC']]
        });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });
        const buffer = monthlyPlanPdf(plan.toJSON());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="dienstplan-${plan.year}-${plan.month}.pdf"`);
        res.send(buffer);
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not generate PDF.' });
    }
};

exports.emailPdf = async (req, res) => {
    const id = req.params.id;
    const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];
    const extraEmails = Array.isArray(req.body.emails) ? req.body.emails.filter(e => typeof e === 'string' && e) : [];
    if (recipients.length === 0 && extraEmails.length === 0) {
        return res.status(400).send({ message: 'recipients required' });
    }
    try {
        const plan = await MonthlyPlan.findOne({
            where: { id, choirId: req.activeChoirId },
            include: [{
                model: db.plan_entry,
                as: 'entries',
                include: [
                    { model: db.user, as: 'director', attributes: ['id', 'name'] },
                    { model: db.user, as: 'organist', attributes: ['id', 'name'], required: false }
                ]
            }, { model: db.choir, as: 'choir', attributes: ['id', 'name'] }],
            order: [[{ model: db.plan_entry, as: 'entries' }, 'date', 'ASC']]
        });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });

        let emails = [];
        if (recipients.length > 0) {
            const users = await db.user.findAll({
                where: { id: recipients },
                include: [{ model: db.choir, where: { id: req.activeChoirId } }]
            });
            emails = users.map(u => u.email);
        }
        emails = emails.concat(extraEmails);
        const buffer = monthlyPlanPdf(plan.toJSON());
        if (!emailDisabled()) {
            await emailService.sendMonthlyPlanMail(emails, buffer, plan.year, plan.month, plan.choir?.name);
        }
        res.status(200).send({ message: 'Mail sent.' });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not send mail.' });
    }
};

exports.requestAvailability = async (req, res) => {
    const id = req.params.id;
    const recipients = req.body.recipients;
    if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).send({ message: 'recipients required' });
    }
    try {
        const plan = await MonthlyPlan.findOne({
            where: { id, choirId: req.activeChoirId }
        });
        if (!plan) return res.status(404).send({ message: 'Plan not found.' });

        const rules = await db.plan_rule.findAll({ where: { choirId: req.activeChoirId } });
        const dateSet = new Set();
        for (const rule of rules) {
            for (const d of datesForRule(plan.year, plan.month, rule)) {
                if (isPublicHoliday(d) && d.getUTCDay() !== 0) continue;
                dateSet.add(isoDateString(d));
            }
        }
        if (plan.month === 12) {
            const dec25 = new Date(Date.UTC(plan.year, 11, 25));
            const dec26 = new Date(Date.UTC(plan.year, 11, 26));
            const hasRuleForDec25 = rules.some(r => r.dayOfWeek === dec25.getUTCDay());
            if (!hasRuleForDec25) dateSet.add(isoDateString(dec25));
            if (dec26.getUTCDay() === 0) dateSet.delete(isoDateString(dec26));
        }
        const dates = Array.from(dateSet).sort();

        const users = await db.user.findAll({
            where: { id: recipients },
            include: [{ model: db.choir, where: { id: req.activeChoirId } }]
        });

        for (const user of users) {
            const avail = await db.user_availability.findAll({
                where: {
                    userId: user.id,
                    choirId: req.activeChoirId,
                    date: dates
                }
            });
            const map = Object.fromEntries(avail.map(a => [a.date, a.status]));
            const list = dates.map(d => ({ date: d, status: map[d] || 'AVAILABLE' }));
            await emailService.sendAvailabilityRequestMail(user.email, user.name, plan.year, plan.month, list);
        }
        res.status(200).send({ message: 'Mail sent.' });
    } catch (err) {
        res.status(500).send({ message: err.message || 'Could not send mail.' });
    }
};
