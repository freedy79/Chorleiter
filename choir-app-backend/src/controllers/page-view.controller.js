const pageViewService = require('../services/page-view.service');

/**
 * POST /api/page-views/track
 * Track a page view (called from frontend).
 */
exports.track = async (req, res) => {
    const { path, category, entityId, entityLabel, shareToken } = req.body;

    if (!path) {
        return res.status(400).send({ message: 'path is required' });
    }

    await pageViewService.trackPageView({
        path,
        category: category || 'page',
        entityId,
        entityLabel,
        shareToken,
        userId: req.userId || null,
        choirId: req.choirId || null,
        req
    });

    res.status(204).send();
};

/**
 * POST /api/page-views/track-public
 * Track a page view for public/unauthenticated endpoints (e.g. shared pieces).
 */
exports.trackPublic = async (req, res) => {
    const { path, category, entityId, entityLabel, shareToken } = req.body;

    if (!path) {
        return res.status(400).send({ message: 'path is required' });
    }

    await pageViewService.trackPageView({
        path,
        category: category || 'page',
        entityId,
        entityLabel,
        shareToken,
        userId: null,
        choirId: null,
        req
    });

    res.status(204).send();
};

/**
 * GET /api/admin/usage-stats/summary
 * Get usage summary statistics (admin only).
 */
exports.getSummary = async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await pageViewService.getSummary({ days });
    res.status(200).send(summary);
};

/**
 * GET /api/admin/usage-stats/shared-pieces
 * Get detailed shared piece statistics (admin only).
 */
exports.getSharedPieceStats = async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const stats = await pageViewService.getSharedPieceStats({ days });
    res.status(200).send(stats);
};

/**
 * GET /api/admin/usage-stats/entity/:category/:entityId
 * Get detailed view history for a specific entity (admin only).
 */
exports.getEntityViews = async (req, res) => {
    const { category, entityId } = req.params;
    const days = parseInt(req.query.days, 10) || 90;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    const data = await pageViewService.getEntityViews(category, parseInt(entityId, 10), { days, page, limit });
    res.status(200).send(data);
};

/**
 * DELETE /api/admin/usage-stats/cleanup
 * Clean up old page views (admin only).
 */
exports.cleanup = async (req, res) => {
    const retainDays = parseInt(req.query.retainDays, 10) || 365;
    const deleted = await pageViewService.cleanupOldViews(retainDays);
    res.status(200).send({ message: `Deleted ${deleted} old page views`, deleted });
};
