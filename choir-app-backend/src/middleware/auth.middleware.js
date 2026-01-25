const jwt = require("jsonwebtoken");
const db = require("../models");
const { getRequestContext } = require("../config/request-context");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");

const optionalAuth = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) return next();
  token = token.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.userId = decoded.id;
      req.userRoles = decoded.roles || [];
      const choirParam = parseInt(req.query.choirId, 10);
      req.activeChoirId =
        req.userRoles.includes('admin') && !isNaN(choirParam)
          ? choirParam
          : decoded.activeChoirId;
      const ctx = getRequestContext();
      if (ctx) {
        ctx.userId = req.userId;
        ctx.roles = req.userRoles;
      }
    }
    next();
  });
};

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];

  if (!token) {
    return next(new AuthenticationError("No token provided!"));
  }

  // Expect "Bearer [token]"
  token = token.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new AuthenticationError("Invalid or expired token!"));
    }
    req.userId = decoded.id;
    req.userRoles = decoded.roles || [];
    const choirParam = parseInt(req.query.choirId, 10);
    req.activeChoirId =
      req.userRoles.includes('admin') && !isNaN(choirParam)
        ? choirParam
        : decoded.activeChoirId;
    const ctx = getRequestContext();
    if (ctx) {
      ctx.userId = req.userId;
      ctx.roles = req.userRoles;
    }
    next();
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
