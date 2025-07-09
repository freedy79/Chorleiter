const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/user.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/me", controller.getMe);
router.put("/me", role.requireNonDemo, controller.updateMe);
router.post("/me/donate", controller.registerDonation);
router.get("/me/preferences", controller.getPreferences);
router.put("/me/preferences", controller.updatePreferences);module.exports = router;