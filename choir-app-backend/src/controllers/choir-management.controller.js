const db = require("../models");

// Details des aktiven Chors abrufen
exports.getMyChoirDetails = async (req, res) => { /* ... findet den Chor mit req.activeChoirId ... */ };

// Details des aktiven Chors aktualisieren
exports.updateMyChoir = async (req, res) => { /* ... findet den Chor, prüft Berechtigung (implizit durch Route) und aktualisiert ihn ... */ };

// Alle Mitglieder (Direktoren) des aktiven Chors abrufen
exports.getChoirMembers = async (req, res) => {
    const choir = await db.choir.findByPk(req.activeChoirId, {
        include: [{
            model: db.user,
            attributes: ['id', 'name', 'email'],
            through: {
                as: 'membership', // Alias für die Zwischentabelle
                attributes: ['roleInChoir']
            }
        }]
    });
    res.send(choir.users);
};

// Einen Benutzer zum aktiven Chor hinzufügen/einladen
exports.inviteUserToChoir = async (req, res) => {
    const { email, roleInChoir } = req.body;
    const choirId = req.activeChoirId;

    try {
        let user = await db.user.findOne({ where: { email: email } });
        const choir = await db.choir.findByPk(choirId);

        if (user) {
            // Benutzer existiert bereits, fügen Sie ihn einfach zum Chor hinzu
            await choir.addUser(user, { through: { roleInChoir: roleInChoir }});
            res.status(200).send({ message: `User ${email} has been added to the choir.` });
        } else {
            // Benutzer existiert nicht -> Einladungslogik
            // Hier würde die Logik zum Senden einer E-Mail mit einem Registrierungs-Token stehen.
            // Fürs Erste simulieren wir dies.
            console.log(`SIMULATING INVITATION EMAIL to ${email} for choir ${choir.name} with role ${roleInChoir}.`);
            res.status(200).send({ message: `An invitation has been sent to ${email}.` });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Einen Benutzer aus dem Chor entfernen
exports.removeUserFromChoir = async (req, res) => {
    const { userId } = req.body;
    const choirId = req.activeChoirId;

    try {
        const choir = await db.choir.findByPk(choirId);
        await choir.removeUser(userId); // Sequelize-Helfer zum Entfernen der Assoziation
        res.status(200).send({ message: "User removed from choir." });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
