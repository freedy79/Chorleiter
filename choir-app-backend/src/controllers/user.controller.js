const db = require("../models");
const User = db.user;
const Choir = db.choir;
const bcrypt = require("bcryptjs");

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: ['id', 'name', 'email', 'role', 'lastDonation', 'street', 'postalCode', 'city', 'shareWithChoir'],
            include: [{
                model: Choir,
                as: 'choirs', // Use the plural alias 'choirs' defined in the association
                attributes: ['id', 'name'],
                // We don't want the junction table's data in this response.
                through: { attributes: [] }
            }]
        });
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

/**
 * @description Update the profile of the currently logged-in user.
 */
exports.updateMe = async (req, res) => {
     const { name, email, street, postalCode, city, shareWithChoir, oldPassword, newPassword } = req.body;

    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        if (user.role === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot change profile.' });
        }

        // Prepare the data to be updated
        const updateData = {};
        if (name) {
            updateData.name = name;
        }
        if (email) {
            updateData.email = email;
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
        if (shareWithChoir !== undefined) {
            updateData.shareWithChoir = !!shareWithChoir;
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

        res.status(200).send({ message: "Profile updated successfully." });

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
