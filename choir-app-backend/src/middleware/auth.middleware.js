const jwt = require("jsonwebtoken");
const db = require("../models");
const { getRequestContext } = require("../config/request-context");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");
const logger = require('../config/logger');

const DEBUG_AUTH = (process.env.DEBUG_AUTH || '').toLowerCase() === 'true'
  || (process.env.DEBUG_CSRF || '').toLowerCase() === 'true';

async function resolveActiveChoirId(userId, userRoles, choirParam, decodedActiveChoirId) {
  if (Array.isArray(userRoles) && userRoles.includes('admin') && !Number.isNaN(choirParam)) {
    return choirParam;
  }

  if (decodedActiveChoirId) {
    return decodedActiveChoirId;
  }

  const membership = await db.user_choir.findOne({
    where: { userId },
    attributes: ['choirId'],
    order: [['createdAt', 'ASC']],
  });

  return membership?.choirId || null;
}

async function applyAuthContext(req, decoded) {
  req.userId = decoded.id;
  req.userRoles = decoded.roles || [];
  const choirParam = parseInt(req.query.choirId, 10);
  req.activeChoirId = await resolveActiveChoirId(req.userId, req.userRoles, choirParam, decoded.activeChoirId);

  const ctx = getRequestContext();
  if (ctx) {
    ctx.userId = req.userId;
    ctx.roles = req.userRoles;
    ctx.activeChoirId = req.activeChoirId;
  }
}

const optionalAuth = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token && req.cookies?.['auth-token']) {
    token = 'Bearer ' + req.cookies['auth-token'];
  }
  if (!token) return next();
  token = token.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (!err) {
      try {
        await applyAuthContext(req, decoded);
      } catch (contextErr) {
        if (DEBUG_AUTH) {
          logger.warn('Optional auth context resolution failed', {
            method: req.method,
            path: req.originalUrl,
            error: contextErr.message,
            ip: req.ip,
          });
        }
      }
    }
    return next();
  });
};

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token && req.cookies?.['auth-token']) {
    token = 'Bearer ' + req.cookies['auth-token'];
  }

  if (!token) {
    if (DEBUG_AUTH) {
      logger.warn('Auth token missing', {
        method: req.method,
        path: req.originalUrl,
        hasCookieToken: Boolean(req.cookies?.['auth-token']),
        hasAuthHeader: Boolean(req.headers['authorization']),
        ip: req.ip
      });
    }
    return next(new AuthenticationError("No token provided!"));
  }

  // Expect "Bearer [token]"
  token = token.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (DEBUG_AUTH) {
        logger.warn('Auth token invalid/expired', {
          method: req.method,
          path: req.originalUrl,
          error: err.message,
          ip: req.ip
        });
      }
      return next(new AuthenticationError("Invalid or expired token!"));
    }
    try {
      await applyAuthContext(req, decoded);
    } catch (contextErr) {
      if (DEBUG_AUTH) {
        logger.warn('Auth context resolution failed', {
          method: req.method,
          path: req.originalUrl,
          error: contextErr.message,
          ip: req.ip,
        });
      }
      return next(new AuthenticationError('Unable to resolve active choir context'));
    }
    return next();
  });
};

const isChoirAdminOrAdmin = async (req, res, next) => {
    // Der globale Admin darf alles
    if (req.userRoles.includes('admin')) {
        return next();
    }

    // Prüfen, ob der Benutzer ein Choir Admin für den aktuell aktiven Chor ist
    try {
        const association = await db.user_choir.findOne({
            where: {
                userId: req.userId,
                choirId: req.activeChoirId
            }
        });

        if (association && Array.isArray(association.rolesInChoir) && association.rolesInChoir.includes('choir_admin')) {
            return next();
        }

        return next(new AuthorizationError("Require Choir Admin or Admin Role!"));

    } catch (error) {
        return next(error); // Pass database errors to error handler
    }
};

const isAdmin = (req, res, next) => {
    if (req.userRoles.includes('admin')) {
        return next();
    }
    return next(new AuthorizationError("Require Admin Role!"));
};

const authJwt = {
  verifyToken,
  isAdmin,
  isChoirAdminOrAdmin,
  optionalAuth
};
module.exports = authJwt;
