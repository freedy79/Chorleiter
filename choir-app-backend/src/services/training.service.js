const db = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// XP thresholds per level (level N requires xpForLevel[N] total XP)
const XP_PER_LEVEL = [
    0, 0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
    5200, 6600, 8200, 10000, 12000, 14500, 17500, 21000, 25000, 30000
];

function getLevelForXp(totalXp) {
    for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
        if (totalXp >= XP_PER_LEVEL[i]) return i;
    }
    return 1;
}

function getXpForNextLevel(currentLevel) {
    if (currentLevel >= XP_PER_LEVEL.length - 1) return null; // max level
    return XP_PER_LEVEL[currentLevel + 1];
}

/**
 * Returns the start of the current ISO-style training week (Monday 00:00 local time).
 * Used for the weekly leaderboard which resets every Monday at 0:00.
 */
function getStartOfTrainingWeek(reference = new Date()) {
    const d = new Date(reference);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const diffToMonday = (day + 6) % 7; // Sunday -> 6, Monday -> 0, ...
    d.setDate(d.getDate() - diffToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getEndOfTrainingWeek(reference = new Date()) {
    const start = getStartOfTrainingWeek(reference);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return end;
}

/**
 * Derive a privacy-safe display name (first name only).
 */
function firstNameOf(user) {
    if (!user) return 'Anonym';
    if (user.firstName && user.firstName.trim()) return user.firstName.trim();
    if (user.name && user.name.trim()) {
        // Fallback: erste Wortgruppe aus dem Anzeigenamen
        return user.name.trim().split(/\s+/)[0];
    }
    return 'Anonym';
}

/**
 * Get or create training profile for a user in a choir
 */
async function getOrCreateProfile(userId, choirId) {
    const [profile] = await db.training_profile.findOrCreate({
        where: { userId, choirId },
        defaults: {
            activeModules: ['rhythm', 'note_reading', 'ear_training'],
            totalXp: 0,
            currentLevel: 1,
            currentStreak: 0,
            longestStreak: 0,
            weeklyGoalMinutes: 15
        }
    });
    return profile;
}

/**
 * Get training profile with computed stats
 */
async function getProfile(userId, choirId) {
    const profile = await getOrCreateProfile(userId, choirId);

    // Compute weekly practice minutes (Woche ab Montag 00:00)
    const weekStart = getStartOfTrainingWeek();

    const weekAttempts = await db.exercise_attempt.findAll({
        where: {
            userId,
            choirId,
            completedAt: { [Op.gte]: weekStart }
        },
        attributes: ['duration']
    });

    const weeklyMinutes = Math.round(weekAttempts.reduce((sum, a) => sum + a.duration, 0) / 60);

    // Compute total exercise count
    const totalExercises = await db.exercise_attempt.count({ where: { userId, choirId } });

    // Get earned badges count
    const badgeCount = await db.user_badge.count({ where: { userId } });

    const nextLevelXp = getXpForNextLevel(profile.currentLevel);

    return {
        ...profile.toJSON(),
        weeklyMinutes,
        totalExercises,
        badgeCount,
        nextLevelXp,
        xpForCurrentLevel: XP_PER_LEVEL[profile.currentLevel] || 0
    };
}

/**
 * Update training profile settings
 */
async function updateProfile(userId, choirId, updates) {
    const profile = await getOrCreateProfile(userId, choirId);

    const allowedFields = ['activeModules', 'weeklyGoalMinutes'];
    const filteredUpdates = {};
    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key];
        }
    }

    await profile.update(filteredUpdates);
    return profile;
}

/**
 * Get exercises filtered by module and difficulty, with user progress
 */
async function getExercises({ module, difficulty, limit = 50, offset = 0, userId, choirId }) {
    const where = { isActive: true };
    if (module) where.module = module;
    if (difficulty) where.difficulty = difficulty;

    const result = await db.exercise.findAndCountAll({
        where,
        order: [['orderIndex', 'ASC'], ['difficulty', 'ASC']],
        limit,
        offset
    });

    // Attach user progress if userId is available
    if (userId && choirId) {
        const attempts = await db.exercise_attempt.findAll({
            where: { userId, choirId },
            attributes: [
                'exerciseId',
                [db.sequelize.fn('MAX', db.sequelize.col('score')), 'bestScore'],
                [db.sequelize.fn('COUNT', db.sequelize.col('exercise_attempt.id')), 'attemptCount'],
                [db.sequelize.fn('SUM', db.sequelize.col('xpEarned')), 'totalXpEarned']
            ],
            group: ['exerciseId'],
            raw: true
        });

        const progressMap = new Map(attempts.map(a => [a.exerciseId, a]));

        result.rows = result.rows.map(ex => {
            const json = ex.toJSON();
            const progress = progressMap.get(json.id);
            json.bestScore = progress ? parseInt(progress.bestScore) : null;
            json.attemptCount = progress ? parseInt(progress.attemptCount) : 0;
            json.totalXpEarned = progress ? parseInt(progress.totalXpEarned) : 0;
            json.completed = json.bestScore !== null && json.bestScore >= 80;
            return json;
        });
    }

    return result;
}

/**
 * Get a single exercise by ID
 */
async function getExercise(exerciseId) {
    return db.exercise.findByPk(exerciseId);
}

/**
 * Submit an exercise attempt and update profile (XP, streak, level)
 */
async function submitAttempt(userId, choirId, exerciseId, { score, accuracy, duration, details }) {
    const exercise = await db.exercise.findByPk(exerciseId);
    if (!exercise) {
        const error = new Error('Übung nicht gefunden');
        error.status = 404;
        throw error;
    }

    // Calculate XP earned based on score, capped at exercise max
    const scoreMultiplier = score / 100;
    let xpEarned = Math.round(exercise.xpReward * scoreMultiplier);

    // Cap XP: total earned for this exercise must not exceed xpReward
    const previousXp = await db.exercise_attempt.sum('xpEarned', {
        where: { userId, choirId, exerciseId }
    }) || 0;
    const remainingXp = Math.max(0, exercise.xpReward - previousXp);
    xpEarned = Math.min(xpEarned, remainingXp);

    // Create attempt record
    const attempt = await db.exercise_attempt.create({
        userId,
        choirId,
        exerciseId,
        score,
        accuracy,
        duration,
        xpEarned,
        details,
        completedAt: new Date()
    });

    // Update profile: XP, level, streak
    const profile = await getOrCreateProfile(userId, choirId);
    const newTotalXp = profile.totalXp + xpEarned;
    const newLevel = getLevelForXp(newTotalXp);
    const leveledUp = newLevel > profile.currentLevel;

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = profile.currentStreak;

    if (profile.lastPracticeDate !== today) {
        if (profile.lastPracticeDate === yesterday) {
            newStreak = profile.currentStreak + 1;
        } else {
            newStreak = 1; // Reset streak if gap > 1 day
        }
    }

    const longestStreak = Math.max(profile.longestStreak, newStreak);

    await profile.update({
        totalXp: newTotalXp,
        currentLevel: newLevel,
        currentStreak: newStreak,
        longestStreak,
        lastPracticeDate: today
    });

    // Check badges asynchronously (non-blocking)
    checkAndAwardBadges(userId, profile).catch(err =>
        logger.error('[Training] Badge check error:', err)
    );

    return {
        attempt: attempt.toJSON(),
        xpEarned,
        totalXp: newTotalXp,
        currentLevel: newLevel,
        leveledUp,
        currentStreak: newStreak,
        longestStreak
    };
}

/**
 * Get exercise history for a user
 */
async function getHistory(userId, choirId, { limit = 20, offset = 0 }) {
    return db.exercise_attempt.findAndCountAll({
        where: { userId, choirId },
        include: [{
            model: db.exercise,
            as: 'exercise',
            attributes: ['id', 'title', 'module', 'difficulty', 'type']
        }],
        order: [['completedAt', 'DESC']],
        limit,
        offset
    });
}

/**
 * Get all badge definitions with earned status for user
 */
async function getBadges(userId) {
    const allBadges = await db.badge_definition.findAll({
        order: [['orderIndex', 'ASC']]
    });

    const earnedBadges = await db.user_badge.findAll({
        where: { userId },
        attributes: ['badgeDefinitionId', 'earnedAt']
    });

    const earnedMap = new Map(earnedBadges.map(b => [b.badgeDefinitionId, b.earnedAt]));

    return allBadges.map(badge => ({
        ...badge.toJSON(),
        earned: earnedMap.has(badge.id),
        earnedAt: earnedMap.get(badge.id) || null
    }));
}

/**
 * Get personal stats (module breakdown, recent activity)
 */
async function getStats(userId, choirId) {
    const profile = await getOrCreateProfile(userId, choirId);

    // Module breakdown
    const modules = ['rhythm', 'note_reading', 'ear_training'];
    const moduleStats = {};

    for (const mod of modules) {
        const attempts = await db.exercise_attempt.findAll({
            where: { userId, choirId },
            include: [{
                model: db.exercise,
                as: 'exercise',
                where: { module: mod },
                attributes: []
            }],
            attributes: [
                [db.sequelize.fn('COUNT', db.sequelize.col('exercise_attempt.id')), 'count'],
                [db.sequelize.fn('AVG', db.sequelize.col('score')), 'avgScore'],
                [db.sequelize.fn('SUM', db.sequelize.col('duration')), 'totalSeconds']
            ],
            raw: true
        });

        moduleStats[mod] = {
            attempts: parseInt(attempts[0]?.count || 0),
            avgScore: Math.round(parseFloat(attempts[0]?.avgScore || 0)),
            totalMinutes: Math.round(parseInt(attempts[0]?.totalSeconds || 0) / 60)
        };
    }

    // Recent 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAttempts = await db.exercise_attempt.findAll({
        where: {
            userId,
            choirId,
            completedAt: { [Op.gte]: sevenDaysAgo }
        },
        attributes: [
            [db.sequelize.fn('DATE', db.sequelize.col('completedAt')), 'day'],
            [db.sequelize.fn('COUNT', db.sequelize.col('exercise_attempt.id')), 'count'],
            [db.sequelize.fn('SUM', db.sequelize.col('xpEarned')), 'xp']
        ],
        group: [db.sequelize.fn('DATE', db.sequelize.col('completedAt'))],
        raw: true
    });

    return {
        profile: profile.toJSON(),
        moduleStats,
        recentActivity: recentAttempts
    };
}

/**
 * Check badge conditions and award if met
 */
async function checkAndAwardBadges(userId, profile) {
    const allBadges = await db.badge_definition.findAll();
    const earnedIds = new Set(
        (await db.user_badge.findAll({ where: { userId }, attributes: ['badgeDefinitionId'] }))
            .map(b => b.badgeDefinitionId)
    );

    for (const badge of allBadges) {
        if (earnedIds.has(badge.id)) continue;

        const met = await evaluateBadgeCondition(badge.condition, userId, profile);
        if (met) {
            await db.user_badge.create({ userId, badgeDefinitionId: badge.id });

            // Award bonus XP
            if (badge.xpBonus > 0) {
                await profile.increment('totalXp', { by: badge.xpBonus });
            }

            logger.info(`[Training] Badge "${badge.key}" awarded to user ${userId}`);
        }
    }
}

async function evaluateBadgeCondition(condition, userId, profile) {
    if (!condition || !condition.type) return false;

    switch (condition.type) {
        case 'first_exercise':
            return (await db.exercise_attempt.count({ where: { userId } })) >= 1;

        case 'exercise_count': {
            const count = await db.exercise_attempt.count({ where: { userId } });
            return count >= (condition.value || 1);
        }

        case 'streak':
            return profile.currentStreak >= (condition.value || 1);

        case 'longest_streak':
            return profile.longestStreak >= (condition.value || 1);

        case 'total_xp':
            return profile.totalXp >= (condition.value || 0);

        case 'level':
            return profile.currentLevel >= (condition.value || 1);

        case 'module_mastery': {
            const modAttempts = await db.exercise_attempt.findAll({
                where: { userId },
                include: [{
                    model: db.exercise,
                    as: 'exercise',
                    where: { module: condition.module, difficulty: 'advanced' },
                    attributes: []
                }],
                attributes: [[db.sequelize.fn('AVG', db.sequelize.col('score')), 'avg']],
                raw: true
            });
            return parseFloat(modAttempts[0]?.avg || 0) >= (condition.minAvgScore || 80);
        }

        case 'perfect_score': {
            const perfects = await db.exercise_attempt.count({
                where: { userId, score: 100 }
            });
            return perfects >= (condition.value || 1);
        }

        default:
            return false;
    }
}

/**
 * Cross-choir weekly leaderboard.
 * Returns two ranked lists for the current training week (Monday 00:00 - next Monday 00:00):
 *   - byTime: fastest single attempt that reached score = 100 (lowest duration wins)
 *   - byXp:   total XP earned during the week (highest wins)
 *
 * Only first names are returned for privacy reasons.
 * The "weekly reset" happens implicitly because the query filters by completedAt >= weekStart.
 */
async function getWeeklyLeaderboard({ limit = 10 } = {}) {
    const weekStart = getStartOfTrainingWeek();
    const weekEnd = getEndOfTrainingWeek();

    // --- 1) Fastest time to 100% per user (best single attempt) ---
    const fastestAttempts = await db.exercise_attempt.findAll({
        where: {
            score: 100,
            completedAt: { [Op.gte]: weekStart, [Op.lt]: weekEnd }
        },
        attributes: [
            'userId',
            [db.sequelize.fn('MIN', db.sequelize.col('duration')), 'bestDuration']
        ],
        group: ['userId'],
        order: [[db.sequelize.literal('"bestDuration"'), 'ASC']],
        limit,
        raw: true
    });

    // --- 2) Total XP earned per user during the week ---
    const xpTotals = await db.exercise_attempt.findAll({
        where: {
            completedAt: { [Op.gte]: weekStart, [Op.lt]: weekEnd }
        },
        attributes: [
            'userId',
            [db.sequelize.fn('SUM', db.sequelize.col('xpEarned')), 'totalXp']
        ],
        group: ['userId'],
        having: db.sequelize.where(
            db.sequelize.fn('SUM', db.sequelize.col('xpEarned')),
            { [Op.gt]: 0 }
        ),
        order: [[db.sequelize.literal('"totalXp"'), 'DESC']],
        limit,
        raw: true
    });

    // Collect all unique userIds and load their first names in one query
    const userIds = Array.from(new Set([
        ...fastestAttempts.map(r => r.userId),
        ...xpTotals.map(r => r.userId)
    ]));

    const users = userIds.length
        ? await db.user.findAll({
            where: { id: userIds },
            attributes: ['id', 'firstName', 'name']
        })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const byTime = fastestAttempts.map((row, idx) => ({
        rank: idx + 1,
        firstName: firstNameOf(userMap.get(row.userId)),
        durationSeconds: Number(row.bestDuration)
    }));

    const byXp = xpTotals.map((row, idx) => ({
        rank: idx + 1,
        firstName: firstNameOf(userMap.get(row.userId)),
        xp: Number(row.totalXp)
    }));

    return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        byTime,
        byXp
    };
}

module.exports = {
    getOrCreateProfile,
    getProfile,
    updateProfile,
    getExercises,
    getExercise,
    submitAttempt,
    getHistory,
    getBadges,
    getStats,
    getWeeklyLeaderboard,
    getLevelForXp,
    getXpForNextLevel,
    getStartOfTrainingWeek,
    getEndOfTrainingWeek,
    XP_PER_LEVEL
};
