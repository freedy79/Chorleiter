const db = require("../models");

// Holt alle Entitäten eines bestimmten Typs für die Admin-Tabellen
exports.getAll = (model) => async (req, res) => {
    try {
        const items = await model.findAll({ order: [['name', 'ASC']] });
        res.status(200).send(items);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Spezielle Abfrage für Chöre mit zusätzlichen Statistiken
exports.getAllChoirs = async (req, res) => {
    try {
        const choirs = await db.choir.findAll({
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "user_choirs" AS uc WHERE uc."choirId" = "choir"."id")`), 'memberCount'],
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "events" AS e WHERE e."choirId" = "choir"."id")`), 'eventCount'],
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "choir_repertoires" AS cr WHERE cr."choirId" = "choir"."id")`), 'pieceCount']
                ]
            },
            order: [['name', 'ASC']],
            raw: true
        });

        const result = choirs.map(c => ({
            ...c,
            memberCount: parseInt(c.memberCount, 10) || 0,
            eventCount: parseInt(c.eventCount, 10) || 0,
            pieceCount: parseInt(c.pieceCount, 10) || 0
        }));

        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Erstellt ein neues Element eines gegebenen Modells
exports.create = (model) => async (req, res) => {
    try {
        const item = await model.create(req.body);
        res.status(201).send(item);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Aktualisiert ein bestehendes Element
exports.update = (model) => async (req, res) => {
    const { id } = req.params;
    try {
        const [num] = await model.update(req.body, { where: { id } });
        if (num === 1) {
            const item = await model.findByPk(id);
            res.status(200).send(item);
        } else {
            res.status(404).send({ message: 'Not found' });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Löscht ein Element
exports.remove = (model) => async (req, res) => {
    const { id } = req.params;
    try {
        const num = await model.destroy({ where: { id } });
        if (num === 1) {
            res.status(204).send();
        } else {
            res.status(404).send({ message: 'Not found' });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Spezielle Abfrage für Benutzer inklusive Chöre
exports.getAllUsers = async (req, res) => {
    try {
        const users = await db.user.findAll({
            order: [['name', 'ASC']],
            include: [{
                model: db.choir,
                as: 'choirs',
                attributes: ['id', 'name'],
                through: { attributes: ['roleInChoir', 'registrationStatus'] }
            }]
        });
        res.status(200).send(users);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const user = await db.user.create({
            name,
            email,
            role: role || 'director',
            password: password ? bcrypt.hashSync(password, 8) : null
        });
        res.status(201).send(user);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            res.status(409).send({ message: 'Email already in use.' });
        } else {
            res.status(500).send({ message: err.message });
        }
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    try {
        const user = await db.user.findByPk(id);
        if (!user) return res.status(404).send({ message: 'Not found' });
        await user.update({
            name: name ?? user.name,
            email: email ?? user.email,
            role: role ?? user.role,
            ...(password ? { password: bcrypt.hashSync(password, 8) } : {})
        });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const num = await db.user.destroy({ where: { id } });
        if (num === 1) {
            res.status(204).send();
        } else {
            res.status(404).send({ message: 'Not found' });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getUserByEmail = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await db.user.findOne({
            where: { email },
            include: [{
                model: db.choir,
                as: 'choirs',
                attributes: ['id', 'name'],
                through: { attributes: ['roleInChoir', 'registrationStatus'] }
            }]
        });
        if (!user) return res.status(404).send({ message: 'Not found' });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

const crypto = require('crypto');
const emailService = require('../services/email.service');

exports.sendPasswordReset = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db.user.findByPk(id);
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 60 * 60 * 1000);
            await user.update({ resetToken: token, resetTokenExpiry: expiry });
            await emailService.sendPasswordResetMail(user.email, token);
        }
        res.status(200).send({ message: 'Reset email sent if user exists.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getLoginAttempts = async (req, res) => {
    try {
        const attempts = await db.login_attempt.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).send(attempts);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
