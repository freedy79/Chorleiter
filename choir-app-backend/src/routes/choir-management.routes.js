const { verifyToken, isChoirAdminOrAdmin } = require("../middleware/auth.middleware");
const controller = require("../controllers/choir-management.controller");
const router = require("express").Router();

// Alle Routen hier erfordern mindestens "Choir Admin"-Rechte für den aktiven Chor
router.use(verifyToken, isChoirAdminOrAdmin);

router.get("/", controller.getMyChoirDetails);
router.put("/", controller.updateMyChoir);
router.get("/members", controller.getChoirMembers);
router.post("/members", controller.inviteUserToChoir);
router.delete("/members", controller.removeUserFromChoir);

module.exports = router;
