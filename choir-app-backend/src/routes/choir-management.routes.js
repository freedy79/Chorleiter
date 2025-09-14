const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/choir-management.controller");
const lendingController = require("../controllers/choir-lending.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

// Zuerst stellen wir sicher, dass der Benutzer authentifiziert ist
router.use(verifyToken);

// Chor-Informationen können von allen Mitgliedern gelesen werden
router.get("/", wrap(controller.getMyChoirDetails));

// Ab hier: Member-Management und Einstellungen nur für Choir-Admins
router.put("/", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.updateMyChoir));
router.get("/members/count", wrap(controller.getChoirMemberCount));
router.get("/members", role.requireDirectorOrHigher, wrap(controller.getChoirMembers));
router.post("/members", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.inviteUserToChoir));
router.put("/members/:userId", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.updateMember));
router.delete("/members", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.removeUserFromChoir));
router.get("/logs", role.requireChoirAdmin, wrap(controller.getChoirLogs));
router.get("/participation/pdf", role.requireChoirAdmin, wrap(controller.downloadParticipationPdf));
// Sammlungen können von allen Mitgliedern eingesehen werden
router.get("/collections", wrap(controller.getChoirCollections));
router.get("/borrowings", wrap(lendingController.listForUser));
router.delete("/collections/:id", role.requireChoirAdmin, wrap(controller.removeCollectionFromChoir));
router.get("/collections/:id/copies", role.requireChoirAdmin, wrap(lendingController.list));
router.post("/collections/:id/copies", role.requireChoirAdmin, role.requireNonDemo, wrap(lendingController.init));
router.put("/collections/:id/copies", role.requireChoirAdmin, role.requireNonDemo, wrap(lendingController.setCount));
router.put("/collections/copies/:id", role.requireChoirAdmin, role.requireNonDemo, wrap(lendingController.update));

module.exports = router;
