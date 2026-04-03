const crypto = require('crypto');
const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');

/**
 * Hash an IP address for privacy-preserving tracking.
 */
function hashIp(ip) {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip + 'chorleiter-salt').digest('hex').substring(0, 16);
}

/**
 * Record a page view.
 * @param {Object} data - { path, category, entityId, entityLabel, shareToken, userId, choirId, req }
 */
async function trackPageView(data) {
    try {
        const { path, category = 'page', entityId, entityLabel, shareToken, userId, choirId, req } = data;

        const ipHash = req ? hashIp(req.ip || req.connection?.remoteAddress) : null;
        const userAgent = req?.headers?.['user-agent']?.substring(0, 500) || null;
        const referrer = req?.headers?.referer?.substring(0, 500) || null;

        await db.page_view.create({
            path,
            category,
            entityId: entityId || null,
            entityLabel: entityLabel || null,
            shareToken: shareToken || null,
            userId: userId || null,
            choirId: choirId || null,
            ipHash,
            userAgent,
            referrer
        });
    } catch (err) {
        // Never let tracking errors break the main request
        logger.warn('[PageView] Failed to track page view:', err.message);
    }
}

/**
 * Get summary statistics for the admin dashboard.
 * @param {Object} options - { days, limit }
 */
async function getSummary(options = {}) {
    const { days = 30 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalViews, uniqueVisitors, topPieces, topSharedPieces, topCollections, topPages, viewsByDay, viewsByCategory] = await Promise.all([
        // Total views
        db.page_view.count({ where: { timestamp: { [Op.gte]: since } } }),

        // Unique visitors (by ipHash)
        db.page_view.count({
            where: { timestamp: { [Op.gte]: since }, ipHash: { [Op.ne]: null } },
            distinct: true,
            col: 'ipHash'
        }),

        // Top pieces
        db.page_view.findAll({
            where: { category: 'piece', timestamp: { [Op.gte]: since } },
            attributes: [
                'entityId',
                [fn('MAX', col('entityLabel')), 'entityLabel'],
                [fn('COUNT', col('id')), 'viewCount']
            ],
            group: ['entityId'],
            order: [[literal('viewCount'), 'DESC']],
            limit: 20,
            raw: true
        }),

        // Top shared pieces
        db.page_view.findAll({
            where: { category: 'shared-piece', timestamp: { [Op.gte]: since } },
            attributes: [
                'entityId',
                'shareToken',
                [fn('MAX', col('entityLabel')), 'entityLabel'],
                [fn('COUNT', col('id')), 'viewCount'],
                [fn('COUNT', fn('DISTINCT', col('ipHash'))), 'uniqueVisitors']
            ],
            group: ['entityId', 'shareToken'],
            order: [[literal('viewCount'), 'DESC']],
            limit: 20,
            raw: true
        }),

        // Top collections
        db.page_view.findAll({
            where: { category: 'collection', timestamp: { [Op.gte]: since } },
            attributes: [
                'entityId',
                [fn('MAX', col('entityLabel')), 'entityLabel'],
                [fn('COUNT', col('id')), 'viewCount']
            ],
            group: ['entityId'],
            order: [[literal('viewCount'), 'DESC']],
            limit: 20,
            raw: true
        }),

        // Top pages (non-entity views)
        db.page_view.findAll({
            where: { category: 'page', timestamp: { [Op.gte]: since } },
            attributes: [
                'path',
                [fn('COUNT', col('id')), 'viewCount']
            ],
            group: ['path'],
            order: [[literal('viewCount'), 'DESC']],
            limit: 20,
            raw: true
        }),

        // Views by day
        getViewsByDay(since),

        // Views by category
        db.page_view.findAll({
            where: { timestamp: { [Op.gte]: since } },
            attributes: [
                'category',
                [fn('COUNT', col('id')), 'viewCount']
            ],
            group: ['category'],
            order: [[literal('viewCount'), 'DESC']],
            raw: true
        })
    ]);

    return {
        period: { days, since: since.toISOString() },
        totalViews,
        uniqueVisitors,
        topPieces,
        topSharedPieces,
        topCollections,
        topPages,
        viewsByDay,
        viewsByCategory
    };
}

/**
 * Get views grouped by day.
 */
async function getViewsByDay(since) {
    const dialect = db.sequelize.getDialect();

    let dateExpression;
    if (dialect === 'postgres') {
        dateExpression = [fn('DATE', col('timestamp')), 'date'];
    } else {
        // SQLite
        dateExpression = [fn('DATE', col('timestamp')), 'date'];
    }

    return db.page_view.findAll({
        where: { timestamp: { [Op.gte]: since } },
        attributes: [
            dateExpression,
            [fn('COUNT', col('id')), 'viewCount']
        ],
        group: [fn('DATE', col('timestamp'))],
        order: [[fn('DATE', col('timestamp')), 'ASC']],
        raw: true
    });
}

/**
 * Get detailed view history for a specific entity.
 * @param {string} category
 * @param {number} entityId
 * @param {Object} options - { days, page, limit }
 */
async function getEntityViews(category, entityId, options = {}) {
    const { days = 90, page = 1, limit = 50 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = { category, entityId, timestamp: { [Op.gte]: since } };

    const [total, views, viewsByDay] = await Promise.all([
        db.page_view.count({ where }),
        db.page_view.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            raw: true
        }),
        db.page_view.findAll({
            where,
            attributes: [
                [fn('DATE', col('timestamp')), 'date'],
                [fn('COUNT', col('id')), 'viewCount']
            ],
            group: [fn('DATE', col('timestamp'))],
            order: [[fn('DATE', col('timestamp')), 'ASC']],
            raw: true
        })
    ]);

    return {
        total,
        views,
        viewsByDay,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}

/**
 * Get shared piece statistics.
 */
async function getSharedPieceStats(options = {}) {
    const { days = 90 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // All shared pieces with view counts
    const stats = await db.page_view.findAll({
        where: { category: 'shared-piece', timestamp: { [Op.gte]: since } },
        attributes: [
            'entityId',
            'shareToken',
            [fn('MAX', col('entityLabel')), 'entityLabel'],
            [fn('COUNT', col('id')), 'totalViews'],
            [fn('COUNT', fn('DISTINCT', col('ipHash'))), 'uniqueVisitors'],
            [fn('MIN', col('timestamp')), 'firstView'],
            [fn('MAX', col('timestamp')), 'lastView']
        ],
        group: ['entityId', 'shareToken'],
        order: [[literal('totalViews'), 'DESC']],
        raw: true
    });

    return stats;
}

/**
 * Clean up old page views (data retention).
 * @param {number} retainDays - Days to retain (default: 365)
 */
async function cleanupOldViews(retainDays = 365) {
    const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);
    const deleted = await db.page_view.destroy({
        where: { timestamp: { [Op.lt]: cutoff } }
    });
    logger.info(`[PageView] Cleaned up ${deleted} page views older than ${retainDays} days`);
    return deleted;
}

module.exports = {
    trackPageView,
    getSummary,
    getEntityViews,
    getSharedPieceStats,
    cleanupOldViews
};
