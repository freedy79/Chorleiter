const trainingService = require('../services/training.service');
const db = require('../models');
const { seedExercises, seedBadgeDefinitions, seedTheoryTopics } = require('../init/ensureTrainingSetup');

exports.getProfile = async (req, res) => {
    const userId = req.userId;
    const choirId = req.activeChoirId;
    const profile = await trainingService.getProfile(userId, choirId);
    res.json(profile);
};

exports.updateProfile = async (req, res) => {
    const userId = req.userId;
    const choirId = req.activeChoirId;
    const profile = await trainingService.updateProfile(userId, choirId, req.body);
    res.json(profile);
};

exports.getExercises = async (req, res) => {
    const { module, difficulty, limit, offset } = req.query;
    const result = await trainingService.getExercises({
        module,
        difficulty,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        userId: req.userId,
        choirId: req.activeChoirId
    });
    res.json({
        exercises: result.rows,
        total: result.count
    });
};

exports.getExercise = async (req, res) => {
    const exercise = await trainingService.getExercise(req.params.id);
    if (!exercise) {
        return res.status(404).json({ message: 'Übung nicht gefunden' });
    }
    res.json(exercise);
};

exports.submitAttempt = async (req, res) => {
    const userId = req.userId;
    const choirId = req.activeChoirId;
    const exerciseId = req.params.id;
    const { score, accuracy, duration, details } = req.body;

    const result = await trainingService.submitAttempt(userId, choirId, exerciseId, {
        score,
        accuracy,
        duration,
        details
    });

    res.status(201).json(result);
};

exports.getHistory = async (req, res) => {
    const userId = req.userId;
    const choirId = req.activeChoirId;
    const { limit, offset } = req.query;

    const result = await trainingService.getHistory(userId, choirId, {
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
    });

    res.json({
        attempts: result.rows,
        total: result.count
    });
};

exports.getBadges = async (req, res) => {
    const badges = await trainingService.getBadges(req.userId);
    res.json(badges);
};

exports.getStats = async (req, res) => {
    const userId = req.userId;
    const choirId = req.activeChoirId;
    const stats = await trainingService.getStats(userId, choirId);
    res.json(stats);
};

exports.getWeeklyLeaderboard = async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const leaderboard = await trainingService.getWeeklyLeaderboard({ limit });
    res.json(leaderboard);
};

// Admin endpoints
exports.createExercise = async (req, res) => {
    const exercise = await db.exercise.create(req.body);
    res.status(201).json(exercise);
};

exports.updateExercise = async (req, res) => {
    const exercise = await db.exercise.findByPk(req.params.id);
    if (!exercise) {
        return res.status(404).json({ message: 'Übung nicht gefunden' });
    }
    await exercise.update(req.body);
    res.json(exercise);
};

exports.deleteExercise = async (req, res) => {
    const exercise = await db.exercise.findByPk(req.params.id);
    if (!exercise) {
        return res.status(404).json({ message: 'Übung nicht gefunden' });
    }
    await exercise.destroy();
    res.json({ message: 'Übung gelöscht' });
};

exports.reseedExercises = async (req, res) => {
    // SCOPE: Diese Operation betrifft ausschließlich Trainings-Daten.
    // Andere Tabellen (users, choirs, pieces, collections, training_profile, ...)
    // werden NICHT verändert. Die folgende Whitelist enthält genau die
    // training-spezifischen Tabellen, die zurückgesetzt werden.
    const TRAINING_TABLES_TO_RESET = [
        db.exercise_attempt,   // Versuchs-Historie der Übungen
        db.user_badge,         // Den Usern verliehene Abzeichen
        db.exercise,           // Übungs-Definitionen
        db.badge_definition,   // Abzeichen-Definitionen
        db.theory_topic        // Musiktheorie-Wissensbasis
    ];
    // Explizit NICHT angefasst:
    // - db.training_profile (XP, Level, Streak der User bleiben erhalten)
    // - db.user, db.choir, db.piece, db.collection, ... (komplett unberührt)

    const sequelize = db.sequelize;
    await sequelize.transaction(async (transaction) => {
        // Reihenfolge wichtig: Erst abhängige Datensätze (attempts, user_badges),
        // dann deren Eltern (exercise, badge_definition).
        for (const model of TRAINING_TABLES_TO_RESET) {
            await model.destroy({ where: {}, transaction });
        }
    });

    // Re-Seed aus ensureTrainingSetup (force=true, damit der Skip-Check
    // anhand existierender Zeilen nicht greift – ist nach dem Delete eh leer).
    await seedExercises(true);
    await seedBadgeDefinitions(true);
    await seedTheoryTopics(true);

    const count = await db.exercise.count();
    const badgeCount = await db.badge_definition.count();
    const theoryCount = await db.theory_topic.count();
    res.json({
        message: `Trainings-Inhalte neu erzeugt: ${count} Übungen, ${badgeCount} Abzeichen, ${theoryCount} Theorie-Themen.`,
        exercises: count,
        badges: badgeCount,
        theoryTopics: theoryCount
    });
};

exports.getTheoryTopics = async (_req, res) => {
    const topics = await db.theory_topic.findAll({
        where: { isActive: true },
        attributes: ['id', 'key', 'category', 'title', 'summary', 'orderIndex'],
        order: [['orderIndex', 'ASC'], ['title', 'ASC']]
    });
    res.json(topics);
};

exports.getTheoryTopic = async (req, res) => {
    const { key } = req.params;
    const topic = await db.theory_topic.findOne({ where: { key, isActive: true } });
    if (!topic) return res.status(404).json({ message: 'Theorie-Thema nicht gefunden' });
    res.json(topic);
};
