const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/admin.controller");
const db = require("../models");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

// Alle Admin-Routen erfordern Login UND Admin-Rolle
router.use(verifyToken, role.requireAdmin);

// Routen für Komponisten
router.get("/composers", wrap(controller.getAll(db.composer)));
// router.post("/composers", ...);

// Routen für Autoren
router.get("/authors", wrap(controller.getAll(db.author)));
// ...

// Routen für Chöre
router.get("/choirs", wrap(controller.getAllChoirs));
router.post("/choirs", wrap(controller.create(db.choir)));
router.put("/choirs/:id", wrap(controller.update(db.choir)));
router.delete("/choirs/:id", wrap(controller.remove(db.choir)));
router.get("/choirs/:id/members", wrap(controller.getChoirMembers));
router.post("/choirs/:id/members", wrap(controller.addUserToChoir));
router.put("/choirs/:id/members/:userId", wrap(controller.updateChoirMember));
router.delete("/choirs/:id/members", wrap(controller.removeUserFromChoir));

// Routen für Benutzer
router.get("/users", wrap(controller.getAllUsers));
router.get("/users/email/:email", wrap(controller.getUserByEmail));
router.post("/users", wrap(controller.createUser));
router.put("/users/:id", wrap(controller.updateUser));
router.delete("/users/:id", wrap(controller.deleteUser));
router.post("/users/:id/send-password-reset", wrap(controller.sendPasswordReset));
router.get("/login-attempts", wrap(controller.getLoginAttempts));
router.get('/mail-logs', wrap(controller.getMailLogs));
router.delete('/mail-logs', wrap(controller.clearMailLogs));

router.get('/logs', wrap(controller.listLogs));
router.get('/logs/:filename', wrap(controller.getLog));
router.delete('/logs/:filename', wrap(controller.deleteLog));
router.get('/uploads', wrap(controller.listUploads));
router.delete('/uploads/:category/:filename', wrap(controller.deleteUpload));
router.get('/mail-settings', wrap(controller.getMailSettings));
router.put('/mail-settings', wrap(controller.updateMailSettings));
router.post('/mail-settings/test', wrap(controller.sendTestMail));
router.get('/mail-templates', wrap(controller.getMailTemplates));
router.put('/mail-templates', wrap(controller.updateMailTemplates));
router.post('/mail-templates/test/:type', wrap(controller.sendMailTemplateTest));
router.get('/frontend-url', wrap(controller.getFrontendUrl));
router.put('/frontend-url', wrap(controller.updateFrontendUrl));
router.get('/system-admin-email', wrap(controller.getSystemAdminEmail));
router.put('/system-admin-email', wrap(controller.updateSystemAdminEmail));

// Entwicklertools
router.get('/develop/deploy', wrap(controller.pullAndDeploy));

module.exports = router;

