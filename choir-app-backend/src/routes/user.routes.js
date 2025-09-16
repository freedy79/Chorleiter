const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/user.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get("/me", wrap(controller.getMe));
router.put("/me", role.requireNonDemo, wrap(controller.updateMe));
router.post("/me/donate", wrap(controller.registerDonation));
router.get("/me/preferences", wrap(controller.getPreferences));
router.put("/me/preferences", wrap(controller.updatePreferences));
router.delete("/me/choirs/:choirId", role.requireNonDemo, wrap(controller.leaveChoir));
router.delete("/me", role.requireNonDemo, wrap(controller.deleteMe));

module.exports = router;