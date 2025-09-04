const db = require("../models");
const User = db.user;
const Choir = db.choir;
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const { Op } = require('sequelize');
const emailService = require('../services/email.service');

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: ['id', 'firstName', 'name', 'email', 'roles', 'lastDonation', 'street', 'postalCode', 'city', 'voice', 'shareWithChoir', 'helpShown'],
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
    const { firstName, name, email, street, postalCode, city, voice, shareWithChoir, helpShown, oldPassword, newPassword, roles } = req.body;

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
        if (street !== undefined) {
            updateData.street = street;
        }
        if (postalCode !== undefined) {
            updateData.postalCode = postalCode;
        }
        if (city !== undefined) {
            updateData.city = city;
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
                await emailService.sendEmailChangeMail(email, updateData.emailChangeToken, user.name);
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
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        user.lastDonation = new Date();
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
