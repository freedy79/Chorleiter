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
    const { name, description, location } = req.body;

    try {
        const choir = await db.choir.findByPk(req.activeChoirId);

        if (!choir) {
            return res.status(404).send({ message: "Active choir not found." });
        }

        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot change choir data.' });
        }

        // Führen Sie das Update durch. `update` gibt ein Array mit der Anzahl der betroffenen Zeilen zurück.
        const [numberOfAffectedRows] = await db.choir.update(
            { name, description, location },
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
exports.getChoirMembers = async (req, res) => {
    try {
        await cleanupExpiredInvitations();
        const choir = await db.choir.findByPk(req.activeChoirId, {
            // Binden Sie die zugehörigen Benutzer an die Chor-Abfrage.
            include: [{
                model: db.user,
                as: 'users', // 'as' muss mit der Definition in models/index.js übereinstimmen
                attributes: ['id', 'name', 'email'], // Nur die benötigten, nicht-sensitiven Felder
                // Wichtig: Holen Sie die Daten aus der Zwischentabelle.
                through: {
                    model: db.user_choir,
                    attributes: ['roleInChoir','registrationStatus']
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
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                membership: {
                    roleInChoir: user.user_choir.roleInChoir,
                    registrationStatus: user.user_choir.registrationStatus
                }
            };
        });

        res.status(200).send(members);
    } catch (err) {
        err.message = `Error fetching members for choirId ${req.activeChoirId}: ${err.message}`;
        next(err);
    }
};

// Einen Benutzer zum aktiven Chor hinzufügen/einladen
exports.inviteUserToChoir = async (req, res, next) => {
    const { email, roleInChoir } = req.body;
    const choirId = req.activeChoirId;

    if (req.userRole === 'demo') {
        return res.status(403).send({ message: 'Demo user cannot manage members.' });
    }

    if (!email || !roleInChoir) {
        return res.status(400).send({ message: "Email and role are required." });
    }

    try {
        let user = await db.user.findOne({ where: { email: email } });
        const choir = await db.choir.findByPk(choirId);

        if (user) {
            await choir.addUser(user, { through: { roleInChoir, registrationStatus: 'REGISTERED' } });
            res.status(200).send({ message: `User ${email} has been added to the choir.` });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            user = await db.user.create({ email });
            await choir.addUser(user, { through: { roleInChoir, registrationStatus: 'PENDING', inviteToken: token, inviteExpiry: expiry } });
            await emailService.sendInvitationMail(email, token, choir.name, expiry);
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

    if (req.userRole === 'demo') {
        return res.status(403).send({ message: 'Demo user cannot manage members.' });
    }

    if (!userId) {
        return res.status(400).send({ message: "User ID is required." });
    }

    // Sicherheitsprüfung: Verhindern, dass sich der letzte Choir Admin selbst entfernt.
    if (req.userId === userId) {
        const members = await db.user_choir.findAll({ where: { choirId: choirId, roleInChoir: 'choir_admin' }});
        if (members.length <= 1) {
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

exports.getChoirCollections = async (req, res, next) => {
    try {
        const choir = await db.choir.findByPk(req.activeChoirId);
        if (!choir) {
            return res.status(404).send({ message: "Active choir not found." });
        }

        const collections = await choir.getCollections({
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "collection_pieces" AS cp WHERE cp."collectionId" = "collection"."id")`), 'pieceCount']
                ]
            },
            order: [['title', 'ASC']]
        });

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
    }
};

exports.removeCollectionFromChoir = async (req, res, next) => {
    try {
        if (req.userRole === 'demo') {
            return res.status(403).send({ message: 'Demo user cannot modify collections.' });
        }

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
