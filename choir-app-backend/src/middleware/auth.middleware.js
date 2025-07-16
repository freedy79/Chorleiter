const jwt = require("jsonwebtoken");
const db = require("../models");

const optionalAuth = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) return next();
  token = token.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.userId = decoded.id;
      req.userRole = decoded.role;
      const choirParam = parseInt(req.query.choirId, 10);
      req.activeChoirId =
        decoded.role === 'admin' && !isNaN(choirParam)
          ? choirParam
          : decoded.activeChoirId;
    }
    next();
  });
};

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  // Expect "Bearer [token]"
  token = token.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    const choirParam = parseInt(req.query.choirId, 10);
    req.activeChoirId =
      decoded.role === 'admin' && !isNaN(choirParam)
        ? choirParam
        : decoded.activeChoirId;
    next();
  });
};

const isChoirAdminOrAdmin = async (req, res, next) => {
    // Der globale Admin darf alles
    if (req.userRole === 'admin') {
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

        res.status(403).send({ message: "Require Choir Admin or Admin Role!" });

    } catch (error) {
        res.status(500).send({ message: "Error checking permissions." });
    }
};

const isAdmin = (req, res, next) => {
    if (req.userRole === 'admin') {
        next();
        return;
    }
    res.status(403).send({ message: "Require Admin Role!" });
};

const authJwt = {
  verifyToken,
  isAdmin,
  isChoirAdminOrAdmin,
  optionalAuth
};
module.exports = authJwt;
