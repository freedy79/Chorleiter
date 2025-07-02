const { verifyToken, isChoirAdminOrAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/choir-management.controller");
const router = require("express").Router();

// Zuerst stellen wir sicher, dass der Benutzer authentifiziert ist
router.use(verifyToken);

// Chor-Informationen können von allen Mitgliedern gelesen werden
router.get("/", controller.getMyChoirDetails);

// Alle folgenden Routen erfordern Choir-Admin-Rechte
router.put("/", isChoirAdminOrAdmin, controller.updateMyChoir);
router.get("/members", isChoirAdminOrAdmin, controller.getChoirMembers);
router.post("/members", isChoirAdminOrAdmin, controller.inviteUserToChoir);
router.delete("/members", isChoirAdminOrAdmin, controller.removeUserFromChoir);
router.get("/collections", isChoirAdminOrAdmin, controller.getChoirCollections);
router.delete("/collections/:id", isChoirAdminOrAdmin, controller.removeCollectionFromChoir);

module.exports = router;
