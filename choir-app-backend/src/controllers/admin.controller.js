const db = require("../models");
const crypto = require('crypto');
const emailService = require('../services/email.service');

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

// Recalculate repertoire statuses for all choirs based on past events
exports.recalculatePieceStatuses = async (req, res) => {
    try {
        await db.sequelize.query(`
            UPDATE "choir_repertoires" cr
            SET status = CASE
                WHEN EXISTS (
                    SELECT 1 FROM "event_pieces" ep
                    JOIN "events" e ON ep."eventId" = e.id
                    WHERE ep."pieceId" = cr."pieceId"
                      AND e."choirId" = cr."choirId"
                      AND e.type = 'SERVICE'
                ) THEN 'CAN_BE_SUNG'
                WHEN EXISTS (
                    SELECT 1 FROM "event_pieces" ep
                    JOIN "events" e ON ep."eventId" = e.id
                    WHERE ep."pieceId" = cr."pieceId"
                      AND e."choirId" = cr."choirId"
                      AND e.type = 'REHEARSAL'
                ) THEN 'IN_REHEARSAL'
                ELSE 'NOT_READY'
            END
        `);
        res.status(200).send({ message: 'Piece statuses recalculated.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// --- Choir Membership Management for Admins ---
exports.getChoirMembers = async (req, res) => {
    const choirId = req.params.id;
    try {
        const choir = await db.choir.findByPk(choirId, {
            include: [{
                model: db.user,
                as: 'users',
                attributes: ['id', 'name', 'email'],
                through: { model: db.user_choir, attributes: ['roleInChoir', 'registrationStatus', 'isOrganist'] }
            }],
            order: [[db.user, 'name', 'ASC']]
        });

        if (!choir) return res.status(404).send({ message: 'Choir not found' });

        const members = choir.users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            membership: {
                roleInChoir: u.user_choir.roleInChoir,
                registrationStatus: u.user_choir.registrationStatus,
                isOrganist: u.user_choir.isOrganist
            }
        }));
        res.status(200).send(members);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.addUserToChoir = async (req, res) => {
    const choirId = req.params.id;
    const { email, roleInChoir, isOrganist } = req.body;

    if (!email || !roleInChoir) {
        return res.status(400).send({ message: 'Email and role are required.' });
    }

    try {
        let user = await db.user.findOne({ where: { email } });
        const choir = await db.choir.findByPk(choirId);
        if (!choir) return res.status(404).send({ message: 'Choir not found' });

        if (user) {
            await choir.addUser(user, { through: { roleInChoir, registrationStatus: 'REGISTERED', isOrganist: !!isOrganist } });
            res.status(200).send({ message: `User ${email} has been added to the choir.` });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            user = await db.user.create({ email });
            await choir.addUser(user, { through: { roleInChoir, registrationStatus: 'PENDING', inviteToken: token, inviteExpiry: expiry, isOrganist: !!isOrganist } });
            await emailService.sendInvitationMail(email, token, choir.name, expiry);
            res.status(200).send({ message: `An invitation has been sent to ${email}. Valid until ${expiry.toLocaleDateString()}.` });
        }
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: 'This user is already a member of the choir.' });
        }
        res.status(500).send({ message: err.message });
    }
};

exports.removeUserFromChoir = async (req, res) => {
    const choirId = req.params.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).send({ message: 'User ID is required.' });

    try {
        const choir = await db.choir.findByPk(choirId);
        if (!choir) return res.status(404).send({ message: 'Choir not found' });

        const admins = await db.user_choir.findAll({ where: { choirId, roleInChoir: 'choir_admin' } });
        if (admins.length <= 1) {
            const lastAdmin = admins[0];
            if (lastAdmin && lastAdmin.userId === userId) {
                return res.status(403).send({ message: 'You cannot remove the last Choir Admin.' });
            }
        }

        const result = await choir.removeUser(userId);
        if (result > 0) {
            res.status(200).send({ message: 'User removed from choir.' });
        } else {
            res.status(404).send({ message: 'User is not a member of this choir.' });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

const logService = require('../services/log.service');

exports.listLogs = async (req, res) => {
    try {
        const files = await logService.listLogFiles();
        res.status(200).send(files);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getLog = async (req, res) => {
    const { filename } = req.params;
    try {
        const data = await logService.readLogFile(filename);
        if (data === null) {
            return res.status(404).send({ message: 'Log file not found' });
        }
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getMailSettings = async (req, res) => {
    try {
        const settings = await db.mail_setting.findByPk(1);
        res.status(200).send(settings);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateMailSettings = async (req, res) => {
    try {
        const [settings] = await db.mail_setting.findOrCreate({
            where: { id: 1 },
            defaults: req.body
        });
        await settings.update(req.body);
        res.status(200).send(settings);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
