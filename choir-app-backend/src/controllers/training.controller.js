const trainingService = require('../services/training.service');
const db = require('../models');
const { seedExercises, seedBadgeDefinitions } = require('../init/ensureTrainingSetup');

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
    // Delete all existing exercises and attempts
    await db.exercise_attempt.destroy({ where: {} });
    await db.exercise.destroy({ where: {} });
    await db.user_badge.destroy({ where: {} });
    await db.badge_definition.destroy({ where: {} });

    // Re-seed from ensureTrainingSetup
    await seedExercises();
    await seedBadgeDefinitions();

    const count = await db.exercise.count();
    const badgeCount = await db.badge_definition.count();
    res.json({ message: `Übungen neu erstellt: ${count} Übungen, ${badgeCount} Abzeichen.` });
};
