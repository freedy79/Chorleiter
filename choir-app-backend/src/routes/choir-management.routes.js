const { verifyToken, isChoirAdminOrAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/choir-management.controller");
const router = require("express").Router();

// Zuerst stellen wir sicher, dass der Benutzer authentifiziert ist
router.use(verifyToken);

// Chor-Informationen können von allen Mitgliedern gelesen werden
router.get("/", controller.getMyChoirDetails);

// Ab hier: Member-Management und Einstellungen nur für Choir-Admins
router.put("/", isChoirAdminOrAdmin, controller.updateMyChoir);
router.get("/members", isChoirAdminOrAdmin, controller.getChoirMembers);
router.post("/members", isChoirAdminOrAdmin, controller.inviteUserToChoir);
router.put("/members/:userId", isChoirAdminOrAdmin, controller.updateMember);
router.delete("/members", isChoirAdminOrAdmin, controller.removeUserFromChoir);
// Sammlungen können von allen Mitgliedern eingesehen werden
router.get("/collections", controller.getChoirCollections);
router.delete("/collections/:id", isChoirAdminOrAdmin, controller.removeCollectionFromChoir);

module.exports = router;
