const db = require("../models");
const logger = require("../config/logger");
const crypto = require('crypto');
const emailService = require('../services/email.service');
const { Op } = require('sequelize');

async function cleanupExpiredInvitations() {
    const expired = await db.user_choir.findAll({
        where: {
            registrationStatus: 'PENDING',
            inviteExpiry: { [Op.lt]: new Date() }
        }
    });
    for (const entry of expired) {
        const userId = entry.userId;
        await entry.destroy();
        const count = await db.user_choir.count({ where: { userId } });
        if (count === 0) {
            await db.user.destroy({ where: { id: userId } });
        }
    }
}

// Details des aktiven Chors abrufen
exports.getMyChoirDetails = async (req, res, next) => {
    try {
        const choir = await db.choir.findByPk(req.activeChoirId);

        if (!choir) {
            // Dieser Fall sollte durch die Guards selten auftreten, ist aber eine gute Absicherung.
            return res.status(404).send({ message: "Active choir not found." });
        }

        res.status(200).send(choir);
    } catch (err) {
        err.message = `Error fetching details for choirId ${req.activeChoirId}: ${err.message}`;
        next(err); // Leiten Sie den Fehler an die zentrale Middleware weiter.
    }
};

// Details des aktiven Chors aktualisieren
exports.updateMyChoir = async (req, res, next) => {
    const { name, description, location, modules } = req.body;

    try {
        const choir = await db.choir.findByPk(req.activeChoirId);

        if (!choir) {
            return res.status(404).send({ message: "Active choir not found." });
        }

        if (!req.userRoles.includes('admin')) {
            const association = await db.user_choir.findOne({
                where: { userId: req.userId, choirId: req.activeChoirId }
            });
            if (!association || !Array.isArray(association.rolesInChoir) || !association.rolesInChoir.includes('choir_admin')) {
                return res.status(403).send({ message: 'Require Choir Admin Role!' });
            }
        }

        // Führen Sie das Update durch. `update` gibt ein Array mit der Anzahl der betroffenen Zeilen zurück.
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (location !== undefined) updateData.location = location;
        if (modules !== undefined) {
            updateData.modules = modules;
        }

        const [numberOfAffectedRows] = await db.choir.update(
            updateData,
            { where: { id: req.activeChoirId } }
        );

        if (numberOfAffectedRows > 0) {
            res.status(200).send({ message: "Choir details updated successfully." });
        } else {
            // Dieser Fall tritt auf, wenn der Chor zwar existiert, aber keine Daten geändert wurden.
            // Es ist kein Fehler, aber eine Information kann nützlich sein.
            res.status(200).send({ message: "No changes detected or choir not found." });
        }
    } catch (err) {
        err.message = `Error updating details for choirId ${req.activeChoirId}: ${err.message}`;
        next(err);
    }
};

// Alle Mitglieder (Direktoren) des aktiven Chors abrufen
exports.getChoirMembers = async (req, res, next) => {
    try {
        await cleanupExpiredInvitations();
        const choir = await db.choir.findByPk(req.activeChoirId, {
            // Binden Sie die zugehörigen Benutzer an die Chor-Abfrage.
            include: [{
                model: db.user,
                as: 'users',
                attributes: ['id', 'firstName', 'name', 'email', 'street', 'postalCode', 'city', 'voice', 'shareWithChoir'],
                // Wichtig: Holen Sie die Daten aus der Zwischentabelle.
                through: {
                    model: db.user_choir,
                    attributes: ['rolesInChoir','registrationStatus']
                }
            }],
            order: [[db.user, 'name', 'ASC']] // Sortieren Sie die Mitglieder alphabetisch nach Namen.
        });

        if (!choir) {
            return res.status(404).send({ message: "Active choir not found." });
        }

        // Sequelize fügt die 'through'-Daten in ein verschachteltes Objekt ein.
        // Wir formatieren die Antwort, um sie für das Frontend einfacher zu machen.
        const members = choir.users.map(user => {
            const base = {
                id: user.id,
                firstName: user.firstName,
                name: user.name,
                email: user.email,
                voice: user.voice,
                membership: {
                    rolesInChoir: user.user_choir.rolesInChoir,
                    registrationStatus: user.user_choir.registrationStatus
                }
            };
            if (req.userRoles.includes('admin') || user.shareWithChoir) {
                return Object.assign(base, {
                    street: user.street,
                    postalCode: user.postalCode,
                    city: user.city
                });
            }
            return base;
        });

        res.status(200).send(members);
    } catch (err) {
        err.message = `Error fetching members for choirId ${req.activeChoirId}: ${err.message}`;
        next(err);
    }
};

// Einen Benutzer zum aktiven Chor hinzufügen/einladen
exports.inviteUserToChoir = async (req, res, next) => {
    const { email, rolesInChoir } = req.body;
    const choirId = req.activeChoirId;

    if (!email || !rolesInChoir) {
        return res.status(400).send({ message: "Email and role are required." });
    }

    try {
        let user = await db.user.findOne({ where: { email: email } });
        const choir = await db.choir.findByPk(choirId);

        if (user) {
            await choir.addUser(user, { through: { rolesInChoir, registrationStatus: 'REGISTERED' } });
            res.status(200).send({ message: `User ${email} has been added to the choir.` });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            user = await db.user.create({ email });

            await choir.addUser(user, { through: { rolesInChoir, registrationStatus: 'PENDING', inviteToken: token, inviteExpiry: expiry } });

            const invitor = await db.user.findByPk(req.userId);
            await emailService.sendInvitationMail(email, token, choir.name, expiry, user.name, invitor?.name, user.firstName);

            res.status(200).send({ message: `An invitation has been sent to ${email}. Valid until ${expiry.toLocaleDateString()}.` });
        }
    } catch (err) {
        // Fangen Sie den Fall ab, dass der Benutzer bereits im Chor ist (Unique-Constraint-Fehler)
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: 'This user is already a member of the choir.' });
        }
        err.message = `Error inviting user to choirId ${choirId}: ${err.message}`;
        next(err);
    }
};

// Einen Benutzer aus dem Chor entfernen
exports.removeUserFromChoir = async (req, res, next) => {
    const { userId } = req.body;
    const choirId = req.activeChoirId;

    if (!userId) {
        return res.status(400).send({ message: "User ID is required." });
    }

    // Sicherheitsprüfung: Verhindern, dass sich der letzte Choir Admin selbst entfernt.
    if (req.userId === userId) {
        const members = await db.user_choir.findAll({ where: { choirId: choirId } });
        const adminCount = members.filter(m => Array.isArray(m.rolesInChoir) && m.rolesInChoir.includes('choir_admin')).length;
        if (adminCount <= 1) {
            return res.status(403).send({ message: "You cannot remove the last Choir Admin." });
        }
    }

    try {
        const choir = await db.choir.findByPk(choirId);
        // 'removeUser' ist ein weiterer Sequelize-Helfer, der die Verknüpfung löscht.
        const result = await choir.removeUser(userId);

        if (result > 0) {
            res.status(200).send({ message: "User removed from choir." });
        } else {
            res.status(404).send({ message: "User is not a member of this choir." });
        }
    } catch (err) {
        err.message = `Error removing user ${userId} from choirId ${choirId}: ${err.message}`;
        next(err);
    }
};

// Mitgliedsdaten aktualisieren (z.B. Organistenstatus)
exports.updateMember = async (req, res, next) => {
    const { userId } = req.params;
    const { rolesInChoir } = req.body;
    const choirId = req.activeChoirId;

    logger.debug(
        "Update member request:",
        JSON.stringify(req.params),
        JSON.stringify(req.body)
    );


    try {
        logger.debug("Updating member:", userId, "for choirId:", choirId);
        const association = await db.user_choir.findOne({ where: { userId, choirId } });
        if (!association) return res.status(412).send({ message: 'User is not a member of this choir.' });

        if (rolesInChoir && association.rolesInChoir.includes('choir_admin') && !rolesInChoir.includes('choir_admin')) {
            const admins = await db.user_choir.findAll({ where: { choirId } });
            const adminCount = admins.filter(a => Array.isArray(a.rolesInChoir) && a.rolesInChoir.includes('choir_admin')).length;
            if (adminCount <= 1) {
                return res.status(403).send({ message: 'You cannot remove the last Choir Admin.' });
            }
        }

        await association.update({
            ...(rolesInChoir ? { rolesInChoir } : {})
        });

        res.status(200).send({ message: 'Membership updated.' });
    } catch (err) {
        err.message = `Error updating member ${userId} for choirId ${choirId}: ${err.message}`;
        next(err);
    }
};

exports.getChoirCollections = async (req, res, next) => {
    try {
        logger.debug("Fetching collections for choirId:", req.activeChoirId);

        const choir = await db.choir.findByPk(req.activeChoirId);
        if (!choir) {
            return res.status(404).send({ message: "Active choir not found." });
        }

        logger.debug("Choir found: ", choir.name, " getting collections...");
        const collections = await choir.getCollections({
            attributes: {
                include: [
                    [db.sequelize.fn('COUNT', db.sequelize.col('pieces->collection_piece.collectionId')), 'pieceCount']
                ]
            },
            include: [{
                model: db.piece,
                attributes: [],
                through: { attributes: [] },
                required: false
            }],
            joinTableAttributes: [],
            group: ['collection.id'],
            order: [['title', 'ASC']]
        });

        logger.info(
            `Found ${collections.length} collections for choirId ${req.activeChoirId}.`
        );
        const result = collections.map(c => {
            const plain = c.get ? c.get() : c;
            return {
                ...plain,
                pieceCount: parseInt(plain.pieceCount, 10) || 0
            };
        });

        res.status(200).send(result);
    } catch (err) {
        err.message = `Error fetching collections for choirId ${req.activeChoirId}: ${err.message}`;
        next(err);
        //res.status(500).send(err);
    }
};

exports.removeCollectionFromChoir = async (req, res, next) => {
    try {

        const choir = await db.choir.findByPk(req.activeChoirId);
        const collection = await db.collection.findByPk(req.params.id);

        if (!choir || !collection) {
            return res.status(404).send({ message: 'Choir or Collection not found.' });
        }

        await choir.removeCollection(collection);
        const pieces = await collection.getPieces();
        if (pieces && pieces.length > 0) {
            await choir.removePieces(pieces);
        }

        res.status(200).send({ message: `Collection '${collection.title}' removed from choir.` });
    } catch (err) {
        err.message = `Error removing collection from choirId ${req.activeChoirId}: ${err.message}`;
        next(err);
    }
};
