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
router.post("/choirs", role.requireNonDemo, wrap(controller.create(db.choir)));
router.put("/choirs/:id", role.requireNonDemo, wrap(controller.update(db.choir)));
router.delete("/choirs/:id", role.requireNonDemo, wrap(controller.remove(db.choir)));
router.get("/choirs/:id/members", wrap(controller.getChoirMembers));
router.post("/choirs/:id/members", role.requireNonDemo, wrap(controller.addUserToChoir));
router.put("/choirs/:id/members/:userId", role.requireNonDemo, wrap(controller.updateChoirMember));
router.delete("/choirs/:id/members", role.requireNonDemo, wrap(controller.removeUserFromChoir));

// Routen für Benutzer
router.get("/users", wrap(controller.getAllUsers));
router.get("/users/email/:email", wrap(controller.getUserByEmail));
router.post("/users", role.requireNonDemo, wrap(controller.createUser));
router.put("/users/:id", role.requireNonDemo, wrap(controller.updateUser));
router.delete("/users/:id", role.requireNonDemo, wrap(controller.deleteUser));
router.post("/users/:id/send-password-reset", role.requireNonDemo, wrap(controller.sendPasswordReset));
router.delete("/users/:id/reset-token", role.requireNonDemo, wrap(controller.clearResetToken));
router.get("/login-attempts", wrap(controller.getLoginAttempts));
router.get('/mail-logs', wrap(controller.getMailLogs));
router.delete('/mail-logs', role.requireNonDemo, wrap(controller.clearMailLogs));
router.get('/donations', wrap(controller.getDonations));
router.post('/donations', role.requireNonDemo, wrap(controller.createDonation));

router.get('/logs', wrap(controller.listLogs));
router.get('/logs/:filename', wrap(controller.getLog));
router.delete('/logs/:filename', role.requireNonDemo, wrap(controller.deleteLog));
router.get('/uploads', wrap(controller.listUploads));
router.delete('/uploads/:category/:filename', role.requireNonDemo, wrap(controller.deleteUpload));
router.get('/mail-settings', wrap(controller.getMailSettings));
router.put('/mail-settings', role.requireNonDemo, wrap(controller.updateMailSettings));
router.post('/mail-settings/test', role.requireNonDemo, wrap(controller.sendTestMail));
router.get('/mail-templates', wrap(controller.getMailTemplates));
router.put('/mail-templates', role.requireNonDemo, wrap(controller.updateMailTemplates));
router.post('/mail-templates/test/:type', role.requireNonDemo, wrap(controller.sendMailTemplateTest));
router.get('/frontend-url', wrap(controller.getFrontendUrl));
router.put('/frontend-url', role.requireNonDemo, wrap(controller.updateFrontendUrl));
router.get('/system-admin-email', wrap(controller.getSystemAdminEmail));
router.put('/system-admin-email', role.requireNonDemo, wrap(controller.updateSystemAdminEmail));
router.get('/paypal-settings', wrap(controller.getPayPalSettings));
router.put('/paypal-settings', role.requireNonDemo, wrap(controller.updatePayPalSettings));
router.get('/imprint-settings', wrap(controller.getImprintSettings));
router.put('/imprint-settings', role.requireNonDemo, wrap(controller.updateImprintSettings));

// Entwicklertools
router.get('/develop/deploy', wrap(controller.pullAndDeploy));

module.exports = router;
