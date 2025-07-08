const db = require('../models');

/**
 * Middleware to disallow actions for demo users.
 */
function requireNonDemo(req, res, next) {
    if (req.userRole === 'demo') {
        return res.status(403).send({ message: 'Demo user cannot perform this action.' });
    }
    next();
}

/**
 * Middleware that allows only global admins.
 */
function requireAdmin(req, res, next) {
    if (req.userRole === 'admin') {
        return next();
    }
    return res.status(403).send({ message: 'Require Admin Role!' });
}

/**
 * Middleware that allows choir admins or global admins.
 */
async function requireChoirAdmin(req, res, next) {
    if (req.userRole === 'admin') {
        return next();
    }
    try {
        const association = await db.user_choir.findOne({
            where: { userId: req.userId, choirId: req.activeChoirId }
        });
        if (association && association.roleInChoir === 'choir_admin') {
            return next();
        }
        return res.status(403).send({ message: 'Require Choir Admin Role!' });
    } catch (err) {
        return res.status(500).send({ message: 'Error checking permissions.' });
    }
}

module.exports = { requireNonDemo, requireAdmin, requireChoirAdmin };
