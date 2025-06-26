const { verifyToken, isAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/admin.controller");
const db = require("../models");
const router = require("express").Router();

// Alle Admin-Routen erfordern Login UND Admin-Rolle
router.use(verifyToken, isAdmin);

// Routen für Komponisten
router.get("/composers", controller.getAll(db.composer));
// router.post("/composers", ...);

// Routen für Autoren
router.get("/authors", controller.getAll(db.author));
// ...

// Routen für Chöre
router.get("/choirs", controller.getAll(db.choir));
// ...

// Routen für Benutzer
router.get("/users", controller.getAll(db.user));
// ...

module.exports = router;
