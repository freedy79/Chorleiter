const db = require("../models");
const User = db.user;
const Choir = db.choir;
const UserChoir = db.user_choir;
const Lending = db.lending;
const ChoirLog = db.choir_log;
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const emailService = require('../services/email.service');

async function countOpenBorrowings(userId) {
    return Lending.count({ where: { borrowerId: userId, status: 'borrowed' } });
}

async function isLastChoirAdmin(userId, choirId) {
    const memberships = await UserChoir.findAll({
        where: { choirId },
        attributes: ['userId', 'rolesInChoir', 'registrationStatus']
    });

    return !memberships.some(entry => {
        if (entry.userId === userId) return false;
        if (entry.registrationStatus !== 'REGISTERED') return false;
        const roles = Array.isArray(entry.rolesInChoir) ? entry.rolesInChoir : [];
        return roles.includes('choir_admin');
    });
}

function buildRestrictionMessage(reasons) {
    if (!reasons.length) {
        return null;
    }
    const prefix = 'Abmeldung nicht möglich: ';
    if (reasons.length === 1) {
        return `${prefix}${reasons[0]}`;
    }
    return `${prefix}${reasons.join(' ')}`;
}

function createAccessToken(user, activeChoirId) {
    return jwt.sign(
        { id: user.id, activeChoirId, roles: user.roles },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
}

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: ['id', 'firstName', 'name', 'email', 'phone', 'roles', 'lastDonation', 'street', 'postalCode', 'city', 'congregation', 'district', 'voice', 'shareWithChoir', 'helpShown', 'deletionRequestedAt'],
            include: [{
                model: Choir,
                as: 'choirs', // Use the plural alias 'choirs' defined in the association
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }]
        });

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const result = user.toJSON();
        result.availableChoirs = result.choirs || [];
        result.activeChoir = result.availableChoirs.find(c => c.id === req.activeChoirId) || result.availableChoirs[0] || null;
        delete result.choirs;

        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

/**
 * @description Update the profile of the currently logged-in user.
 */
exports.updateMe = async (req, res) => {
    const { firstName, name, email, phone, street, postalCode, city, congregation, district, voice, shareWithChoir, helpShown, oldPassword, newPassword, roles } = req.body;

    try {
        const VOICE_OPTIONS = User.rawAttributes.voice.values;
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        // Prepare the data to be updated
        const updateData = {};
        if (name) {
            updateData.name = name;
        }
        if (firstName) {
            updateData.firstName = firstName;
        }
        let emailMessage = null;
        if (email && email !== user.email) {
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(409).send({ message: "Diese E-Mail-Adresse wird bereits verwendet." });
            }
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
            updateData.pendingEmail = email;
            updateData.emailChangeToken = token;
            updateData.emailChangeTokenExpiry = expiry;
            emailMessage = 'Eine Bestätigungsmail wurde an die neue Adresse gesendet. Der Link ist 2 Stunden gültig.';
        }
        if (phone !== undefined) {
            updateData.phone = phone === '' ? null : phone;
        }
        if (street !== undefined) {
            updateData.street = street;
        }
        if (postalCode !== undefined) {
            updateData.postalCode = postalCode;
        }
        if (city !== undefined) {
            updateData.city = city;
        }
        if (congregation !== undefined) {
            updateData.congregation = congregation;
        }
        if (district !== undefined) {
            updateData.district = district;
        }
        if (voice !== undefined) {
            const normalizedVoice = voice === '' ? null : voice;
            if (normalizedVoice && !VOICE_OPTIONS.includes(normalizedVoice)) {
                return res.status(400).send({ message: 'Invalid voice value.' });
            }
            updateData.voice = normalizedVoice;
        }
        if (shareWithChoir !== undefined) {
            updateData.shareWithChoir = !!shareWithChoir;
        }
        if (helpShown !== undefined) {
            updateData.helpShown = !!helpShown;
        }
        if (Array.isArray(roles) && user.roles.includes('admin')) {
            const newRoles = roles.includes('admin') ? roles : [...roles, 'admin'];
            updateData.roles = newRoles;
        }

        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).send({ message: "To set a new password, the old password is required." });
            }
            const passwordIsValid = bcrypt.compareSync(oldPassword, user.password);
            if (!passwordIsValid) {
                return res.status(401).send({ message: "Invalid old password!" });
            }
            updateData.password = bcrypt.hashSync(newPassword, 8);
        }

        await user.update(updateData);

        if (email && email !== user.email) {
            try {
                await emailService.sendEmailChangeMail(email, updateData.emailChangeToken, user.name, user.firstName);
            } catch (e) {
                return res.status(500).send({ message: e.message });
            }
        }

        res.status(200).send({ message: emailMessage || "Profil erfolgreich aktualisiert." });

    } catch (err) {
        // Handle potential unique constraint violation for email
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "This email address is already in use." });
        }
        res.status(500).send({ message: err.message || "An error occurred while updating the profile." });
    }
};

exports.registerDonation = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        const donatedAt = new Date();
        await db.donation.create({ userId: req.userId, amount: parseFloat(amount) || 0, donatedAt });
        user.lastDonation = donatedAt;
        await user.save();
        res.status(200).send({ message: "Donation recorded." });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        res.status(200).send(user.preferences || {});
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        const prefs = Object.assign({}, user.preferences || {}, req.body || {});
        user.preferences = prefs;
        await user.save();
        res.status(200).send(prefs);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.confirmEmailChange = async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({
            where: {
                emailChangeToken: token,
                emailChangeTokenExpiry: { [Op.gt]: new Date() }
            }
        });
        if (!user || !user.pendingEmail) {
            return res.status(400).send({ message: 'Link ungültig oder abgelaufen.' });
        }
        await user.update({
            email: user.pendingEmail,
            pendingEmail: null,
            emailChangeToken: null,
            emailChangeTokenExpiry: null
        });
        res.status(200).send({ message: 'E-Mail-Adresse bestätigt.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.leaveChoir = async (req, res) => {
    const choirId = parseInt(req.params.choirId, 10);
    if (Number.isNaN(choirId)) {
        return res.status(400).send({ message: 'Ungültige Chor-ID.' });
    }

    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: 'User not found.' });
        }

        const membership = await UserChoir.findOne({
            where: { userId: req.userId, choirId },
            include: [{ model: Choir, attributes: ['id', 'name'] }]
        });

        if (!membership) {
            return res.status(404).send({ message: 'Du bist kein Mitglied dieses Chors.' });
        }

        const reasons = [];
        const roles = Array.isArray(membership.rolesInChoir) ? membership.rolesInChoir : [];
        if (roles.includes('choir_admin')) {
            const lastAdmin = await isLastChoirAdmin(req.userId, choirId);
            if (lastAdmin) {
                const choirName = membership.choir?.name || 'diesem Chor';
                reasons.push(`Im Chor ${choirName} bist du der letzte Chor-Admin. Bitte übertrage die Rolle, bevor du dich abmeldest.`);
            }
        }

        const restrictionMessage = buildRestrictionMessage(reasons);
        if (restrictionMessage) {
            return res.status(409).send({ message: restrictionMessage });
        }

        const openBorrowings = await countOpenBorrowings(req.userId);
        if (openBorrowings > 0) {
            const leaveRequestedAt = new Date();
            await membership.update({ leaveRequestedAt });
            const choirName = membership.choir?.name || 'dem Chor';
            const pendingText = openBorrowings === 1
                ? 'Du hast noch eine offene Ausleihe.'
                : `Du hast noch ${openBorrowings} offene Ausleihen.`;
            const message = `${pendingText} Deine Abmeldung aus dem Chor ${choirName} wurde vorgemerkt. Bitte gib die Noten zuerst zurück.`;
            return res.status(202).send({ message, accountDeleted: false });
        }

        const choirName = membership.choir?.name || 'dem Chor';
        await membership.destroy();

        await ChoirLog.create({ choirId, userId: req.userId, action: 'member_leave', details: { selfService: true } }).catch(() => {});

        const userDetails = user.toJSON();
        try {
            await emailService.sendMemberLeftNotification(choirId, userDetails, { accountDeleted: false });
        } catch (err) {
            // Fehler beim Mailversand werden im Service geloggt
        }

        const remainingMemberships = await UserChoir.findAll({
            where: { userId: req.userId },
            include: [{ model: Choir, attributes: ['id', 'name'] }]
        });

        if (remainingMemberships.length === 0) {
            await user.destroy();
            return res.status(200).send({ message: 'Dein Profil wurde gelöscht.', accountDeleted: true });
        }

        let activeChoirId = req.activeChoirId;
        const stillHasActiveChoir = remainingMemberships.some(entry => entry.choirId === activeChoirId);
        if (!stillHasActiveChoir || activeChoirId === choirId) {
            activeChoirId = remainingMemberships[0].choirId;
        }

        const activeMembership = remainingMemberships.find(entry => entry.choirId === activeChoirId) || remainingMemberships[0];
        const token = createAccessToken(user, activeChoirId);

        res.status(200).send({
            message: `Du hast den Chor ${choirName} verlassen.`,
            accessToken: token,
            activeChoir: activeMembership.choir || null,
            accountDeleted: false
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.deleteMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: 'User not found.' });
        }

        const memberships = await UserChoir.findAll({
            where: { userId: req.userId },
            include: [{ model: Choir, attributes: ['id', 'name'] }]
        });

        const reasons = [];
        for (const membership of memberships) {
            const roles = Array.isArray(membership.rolesInChoir) ? membership.rolesInChoir : [];
            if (!roles.includes('choir_admin')) {
                continue;
            }
            const lastAdmin = await isLastChoirAdmin(req.userId, membership.choirId);
            if (lastAdmin) {
                const choirName = membership.choir?.name || 'diesem Chor';
                reasons.push(`Im Chor ${choirName} bist du der letzte Chor-Admin. Bitte übertrage die Rolle, bevor du dich abmeldest.`);
            }
        }

        const restrictionMessage = buildRestrictionMessage(reasons);
        if (restrictionMessage) {
            return res.status(409).send({ message: restrictionMessage });
        }

        const openBorrowings = await countOpenBorrowings(req.userId);
        if (openBorrowings > 0) {
            const timestamp = new Date();
            await user.update({ deletionRequestedAt: timestamp });
            await Promise.all(memberships.map(m => m.update({ leaveRequestedAt: timestamp })));
            const pendingText = openBorrowings === 1
                ? 'Du hast noch eine offene Ausleihe. Deine Abmeldung wurde vorgemerkt.'
                : `Du hast noch ${openBorrowings} offene Ausleihen. Deine Abmeldung wurde vorgemerkt.`;
            return res.status(202).send({ message: `${pendingText} Bitte gib zuerst die ausgeliehenen Noten zurück.`, accountDeleted: false });
        }

        const userDetails = user.toJSON();
        for (const membership of memberships) {
            const choirId = membership.choirId;
            await membership.destroy();
            await ChoirLog.create({ choirId, userId: req.userId, action: 'member_leave', details: { selfService: true, systemExit: true } }).catch(() => {});
            try {
                await emailService.sendMemberLeftNotification(choirId, userDetails, { accountDeleted: true });
            } catch (err) {
                // Fehler beim Mailversand werden im Service geloggt
            }
        }

        await user.destroy();

        res.status(200).send({ message: 'Dein Profil wurde gelöscht.', accountDeleted: true });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
