const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/choir-management.controller");
const router = require("express").Router();

// Zuerst stellen wir sicher, dass der Benutzer authentifiziert ist
router.use(verifyToken);

// Chor-Informationen können von allen Mitgliedern gelesen werden
router.get("/", controller.getMyChoirDetails);

// Ab hier: Member-Management und Einstellungen nur für Choir-Admins
router.put("/", role.requireChoirAdmin, role.requireNonDemo, controller.updateMyChoir);
router.get("/members", role.requireChoirAdmin, controller.getChoirMembers);
router.post("/members", role.requireChoirAdmin, role.requireNonDemo, controller.inviteUserToChoir);
router.put("/members/:userId", role.requireChoirAdmin, role.requireNonDemo, controller.updateMember);
router.delete("/members", role.requireChoirAdmin, role.requireNonDemo, controller.removeUserFromChoir);
// Sammlungen können von allen Mitgliedern eingesehen werden
router.get("/collections", controller.getChoirCollections);
router.delete("/collections/:id", role.requireChoirAdmin, role.requireNonDemo, controller.removeCollectionFromChoir);

module.exports = router;
