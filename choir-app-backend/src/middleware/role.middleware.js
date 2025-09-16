const db = require('../models');

const DIRECTOR_ROLES = ['choirleiter', 'director'];

async function getActiveChoirMembership(req) {
    if (!req.userId || !req.activeChoirId) {
        return null;
    }

    if (!req._activeChoirMembership) {
        req._activeChoirMembership = db.user_choir.findOne({
            where: { userId: req.userId, choirId: req.activeChoirId }
        });
    }

    return req._activeChoirMembership;
}

async function userHasChoirRole(req, choirRoles) {
    const membership = await getActiveChoirMembership(req);
    if (!membership || !Array.isArray(membership.rolesInChoir)) {
        return false;
    }

    return choirRoles.some(role => membership.rolesInChoir.includes(role));
}

/**
 * Middleware to disallow actions for demo users.
 *
 * Checks the global roles provided in {@link req.userRoles}.
 */
function requireNonDemo(req, res, next) {
    if (req.userRoles.includes('demo')) {
        return res.status(403).send({ message: 'Demo user cannot perform this action.' });
    }
    next();
}

/**
 * Middleware that allows only global admins.
 *
 * Relies solely on the global roles listed in {@link req.userRoles}.
 */
function requireAdmin(req, res, next) {
    if (req.userRoles.includes('admin')) {
        return next();
    }
    return res.status(403).send({ message: 'Require Admin Role!' });
}

/**
 * Middleware that allows choir admins for the active choir or global admins.
 *
 * Global access is granted via {@link req.userRoles}; choir-level access is
 * resolved against {@link db.user_choir} for the current {@link req.activeChoirId}.
 */
async function requireChoirAdmin(req, res, next) {
    if (req.userRoles.includes('admin')) {
        return next();
    }
    try {
        const hasChoirAdminRole = await userHasChoirRole(req, ['choir_admin']);
        if (hasChoirAdminRole) {
            return next();
        }
        return res.status(403).send({ message: 'Require Choir Admin Role!' });
    } catch (err) {
        return res.status(500).send({ message: 'Error checking permissions.' });
    }
}

/**
 * Middleware that allows directors (choirleiter) or choir admins of the active
 * choir as well as global librarians and admins.
 *
 * Global access is validated through {@link req.userRoles}; choir-specific
 * permissions are read from {@link user_choir.rolesInChoir}.
 */
async function requireDirector(req, res, next) {
    if (['admin', 'librarian'].some(r => req.userRoles.includes(r))) {
        return next();
    }
    try {
        const hasDirectorRole = await userHasChoirRole(req, ['choir_admin', ...DIRECTOR_ROLES]);
        if (hasDirectorRole) {
            return next();
        }
        return res.status(403).send({ message: 'Require Choirleiter Role!' });
    } catch (err) {
        return res.status(500).send({ message: 'Error checking permissions.' });
    }
}

/**
 * Middleware that allows only global librarians or admins.
 */
function requireLibrarian(req, res, next) {
    if (['librarian', 'admin'].some(r => req.userRoles.includes(r))) {
        return next();
    }
    return res.status(403).send({ message: 'Require Librarian Role!' });
}

/**
 * Middleware that allows directors (choirleiter) or choir admins of the active
 * choir in addition to global admins.
 *
 * Global access is validated through {@link req.userRoles}; choir-specific
 * permissions are read from {@link user_choir.rolesInChoir}.
 */
async function requireDirectorOrHigher(req, res, next) {
    if (req.userRoles.includes('admin')) {
        return next();
    }
    try {
        const hasDirectorRole = await userHasChoirRole(req, ['choir_admin', ...DIRECTOR_ROLES]);
        if (hasDirectorRole) {
            return next();
        }
        return res.status(403).send({ message: 'Require Choirleiter Role!' });
    } catch (err) {
        return res.status(500).send({ message: 'Error checking permissions.' });
    }
}

module.exports = { requireNonDemo, requireAdmin, requireChoirAdmin, requireDirector, requireLibrarian, requireDirectorOrHigher };
