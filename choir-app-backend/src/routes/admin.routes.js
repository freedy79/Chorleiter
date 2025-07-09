const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/admin.controller");
const db = require("../models");
const router = require("express").Router();

// Alle Admin-Routen erfordern Login UND Admin-Rolle
router.use(verifyToken, role.requireAdmin);

// Routen für Komponisten
router.get("/composers", controller.getAll(db.composer));
// router.post("/composers", ...);

// Routen für Autoren
router.get("/authors", controller.getAll(db.author));
// ...

// Routen für Chöre
router.get("/choirs", controller.getAllChoirs);
router.post("/choirs", controller.create(db.choir));
router.put("/choirs/:id", controller.update(db.choir));
router.delete("/choirs/:id", controller.remove(db.choir));
router.get("/choirs/:id/members", controller.getChoirMembers);
router.post("/choirs/:id/members", controller.addUserToChoir);
router.put("/choirs/:id/members/:userId", controller.updateChoirMember);
router.delete("/choirs/:id/members", controller.removeUserFromChoir);

// Routen für Benutzer
router.get("/users", controller.getAllUsers);
router.get("/users/email/:email", controller.getUserByEmail);
router.post("/users", controller.createUser);
router.put("/users/:id", controller.updateUser);
router.delete("/users/:id", controller.deleteUser);
router.post("/users/:id/send-password-reset", controller.sendPasswordReset);
router.get("/login-attempts", controller.getLoginAttempts);

router.get('/logs', controller.listLogs);
router.get('/logs/:filename', controller.getLog);
router.delete('/logs/:filename', controller.deleteLog);
router.get('/mail-settings', controller.getMailSettings);
router.put('/mail-settings', controller.updateMailSettings);

module.exports = router;

