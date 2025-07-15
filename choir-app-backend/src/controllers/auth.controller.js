const db = require("../models");
const User = db.user;
const Choir = db.choir;
const LoginAttempt = db.login_attempt;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger");

async function ensureDemoAccount() {
    const [choir] = await Choir.findOrCreate({
        where: { name: "Demo-Chor" },
        defaults: { name: "Demo-Chor", location: "Demohausen" }
    });
    const [demoUser] = await User.findOrCreate({
        where: { email: "demo@nak-chorleiter.de" },
        defaults: {
            name: "Demo User",
            email: "demo@nak-chorleiter.de",
            password: bcrypt.hashSync("demo", 8),
            role: "demo"
        }
    });
    await demoUser.addChoir(choir).catch(() => {});

    const collection = await db.collection.findByPk(1);
    if (collection) {
        await choir.addCollection(collection).catch(() => {});
    }

    return { demoUser, choir };
}

async function resetDemoEvents(user, choir) {
    try {
        await db.event.destroy({ where: { choirId: choir.id } });

        const now = new Date();
        const rehearsal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
        const service = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0, 0);

        await db.event.create({ date: rehearsal, type: 'REHEARSAL', notes: 'Probe', choirId: choir.id, directorId: user.id });
        await db.event.create({ date: service, type: 'SERVICE', notes: 'Gottesdienst', choirId: choir.id, directorId: user.id });
    } catch (err) {
        logger.error('Error resetting demo events', err);
    }
}

exports.signup = async (req, res) => {
    try {
    const [choir] = await db.choir.findOrCreate({ where: { name: req.body.choirName }, defaults: { name: req.body.choirName }});
    const user = await db.user.create({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8)
    });
    // Ordnen Sie den Benutzer dem Chor zu (fügt einen Eintrag in 'user_choirs' hinzu)
    await user.addChoir(choir);
    res.status(201).send({ message: "User registered successfully!" });
  } catch (error) { res.status(500).send({ message: error.message }); }
};

exports.signin = async (req, res) => {
    logger.info("Sign-in request received:", req.body);
    const email = req.body.email;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    try {
    if (req.body.email === 'demo@nak-chorleiter.de') {
        await ensureDemoAccount();
    }
    const user = await User.findOne({
      where: { email: req.body.email },
      // Laden Sie alle Chöre, denen der Benutzer zugeordnet ist
      include: [{ model: Choir, attributes: ['id', 'name'] }]
    });

    if (!user || !user.choirs || user.choirs.length === 0) {
      await LoginAttempt.create({ email, success: false, ipAddress, userAgent });
      return res.status(404).send({ message: "User not found or not assigned to any choir." });
    }

    if (!user.password) {
      await LoginAttempt.create({ email, success: false, ipAddress, userAgent });
      return res.status(403).send({ message: "Registration not completed." });
    }

    const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    if (!passwordIsValid) {
      await LoginAttempt.create({ email, success: false, ipAddress, userAgent });
      return res.status(401).send({ message: "Invalid Password!" });
    }

    if (user.role === 'demo') {
      const choir = user.choirs[0];
      await resetDemoEvents(user, choir);
    }

    // Wählen Sie den ersten Chor in der Liste als Standard-Aktiv-Chor
    const activeChoirId = user.choirs[0].id;
    const rememberMe = req.body.rememberMe || false;
    const tokenExpiresIn = rememberMe ? '30d' : '8h';

    const token = jwt.sign(
        { id: user.id, activeChoirId: activeChoirId, role: user.role }, // Verwenden Sie 'activeChoirId'
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiresIn }
    );

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save().catch(() => {});

    await LoginAttempt.create({ email, success: true, ipAddress, userAgent });
    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: token,
      // Senden Sie die Liste aller Chöre und den aktuell aktiven
      activeChoir: user.choirs[0],
      availableChoirs: user.choirs
    });
  } catch (error) {
    await LoginAttempt.create({ email, success: false, ipAddress, userAgent }).catch(() => {});
    res.status(500).send({ message: error.message });
  }
};

exports.switchChoir = async (req, res) => {
    const newActiveChoirId = parseInt(req.params.choirId, 10);
    const userId = req.userId; // Aus dem alten Token

    try {
        const user = await User.findByPk(userId, { include: [Choir] });
        // Sicherheitsprüfung: Gehört der Chor dem Benutzer überhaupt?
        const hasChoir = user.choirs.some(choir => choir.id === newActiveChoirId);
        if (!hasChoir && user.role !== 'admin') {
            return res.status(403).send({ message: "Forbidden: User is not a member of this choir." });
        }

        const activeChoir = hasChoir
            ? user.choirs.find(choir => choir.id === newActiveChoirId)
            : await Choir.findByPk(newActiveChoirId);

        // Erstellen Sie ein neues Token mit der neuen aktiven Chor-ID
        const token = jwt.sign(
            { id: user.id, activeChoirId: newActiveChoirId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Oder die verbleibende Zeit des alten Tokens
        );

        res.status(200).send({
            message: "Switched choir successfully.",
            accessToken: token,
            activeChoir: activeChoir
        });
    } catch (error) { res.status(500).send({ message: error.message }); }
};

exports.checkChoirAdminStatus = async (req, res) => {
    try {
        const association = await db.user_choir.findOne({
            where: {
                userId: req.userId,
                choirId: req.activeChoirId // Prüft den aktiven Chor aus dem Token
            }
        });
        const isChoirAdmin = Array.isArray(association?.rolesInChoir) && association.rolesInChoir.includes('choir_admin');
        res.status(200).send({ isChoirAdmin: isChoirAdmin });
    } catch (error) {
        res.status(500).send({ message: "Could not verify role." });
    }
};
