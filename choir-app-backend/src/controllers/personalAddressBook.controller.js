const { Op } = require('sequelize');
const db = require('../models');
const { normalizeEmail, isValidEmail, normalizeEmailList } = require('../utils/email.utils');

function publicEntry(entry) {
    return {
        id: entry.id,
        firstName: entry.firstName || '',
        name: entry.name || '',
        email: entry.email
    };
}

function sanitizeName(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function findOwnedEntry(req, id) {
    return db.personal_address_book_entry.findOne({
        where: {
            id,
            userId: req.userId,
            choirId: req.activeChoirId
        }
    });
}

exports.list = async (req, res) => {
    const entries = await db.personal_address_book_entry.findAll({
        where: { userId: req.userId, choirId: req.activeChoirId },
        order: [['name', 'ASC'], ['firstName', 'ASC'], ['email', 'ASC']]
    });
    res.status(200).send(entries.map(publicEntry));
};

exports.create = async (req, res) => {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).send({ message: 'Valid email required.' });
    }

    const [entry, created] = await db.personal_address_book_entry.findOrCreate({
        where: {
            userId: req.userId,
            choirId: req.activeChoirId,
            normalizedEmail
        },
        defaults: {
            userId: req.userId,
            choirId: req.activeChoirId,
            firstName: sanitizeName(req.body.firstName),
            name: sanitizeName(req.body.name),
            email: normalizedEmail,
            normalizedEmail
        }
    });

    if (!created) {
        return res.status(409).send({ message: 'Address already exists.', entry: publicEntry(entry) });
    }

    res.status(201).send(publicEntry(entry));
};

exports.createBulk = async (req, res) => {
    const emails = normalizeEmailList(req.body.emails);
    const invalidEmails = emails.filter(email => !isValidEmail(email));
    if (invalidEmails.length > 0) {
        return res.status(400).send({ message: 'Invalid email address.', invalidEmails });
    }

    const entries = [];
    for (const email of emails) {
        const [entry] = await db.personal_address_book_entry.findOrCreate({
            where: {
                userId: req.userId,
                choirId: req.activeChoirId,
                normalizedEmail: email
            },
            defaults: {
                userId: req.userId,
                choirId: req.activeChoirId,
                firstName: null,
                name: null,
                email,
                normalizedEmail: email
            }
        });
        entries.push(entry);
    }

    res.status(201).send(entries.map(publicEntry));
};

exports.update = async (req, res) => {
    const entry = await findOwnedEntry(req, req.params.id);
    if (!entry) {
        return res.status(404).send({ message: 'Address book entry not found.' });
    }

    const normalizedEmail = normalizeEmail(req.body.email);
    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).send({ message: 'Valid email required.' });
    }

    const duplicate = await db.personal_address_book_entry.findOne({
        where: {
            userId: req.userId,
            choirId: req.activeChoirId,
            normalizedEmail,
            id: { [Op.ne]: entry.id }
        }
    });
    if (duplicate) {
        return res.status(409).send({ message: 'Address already exists.' });
    }

    await entry.update({
        firstName: sanitizeName(req.body.firstName),
        name: sanitizeName(req.body.name),
        email: normalizedEmail,
        normalizedEmail
    });

    res.status(200).send(publicEntry(entry));
};

exports.remove = async (req, res) => {
    const entry = await findOwnedEntry(req, req.params.id);
    if (!entry) {
        return res.status(404).send({ message: 'Address book entry not found.' });
    }

    await entry.destroy();
    res.status(204).send();
};

exports.check = async (req, res) => {
    const emails = normalizeEmailList(req.body.emails);
    const invalidEmails = emails.filter(email => !isValidEmail(email));
    const validEmails = emails.filter(email => isValidEmail(email));

    const personalEntries = validEmails.length > 0
        ? await db.personal_address_book_entry.findAll({
            where: {
                userId: req.userId,
                choirId: req.activeChoirId,
                normalizedEmail: validEmails
            }
        })
        : [];
    const knownPersonalEmails = personalEntries.map(entry => entry.normalizedEmail);

    const users = validEmails.length > 0
        ? await db.user.findAll({
            where: { email: validEmails },
            include: [{ model: db.choir, where: { id: req.activeChoirId } }]
        })
        : [];
    const knownUserEmails = users.map(user => normalizeEmail(user.email));
    const known = new Set([...knownPersonalEmails, ...knownUserEmails]);
    const newEmails = validEmails.filter(email => !known.has(email));

    res.status(200).send({
        knownUserEmails,
        knownPersonalEmails,
        newEmails,
        invalidEmails
    });
};
