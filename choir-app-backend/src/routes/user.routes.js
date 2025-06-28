const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/user.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/me", controller.getMe);
router.put("/me", controller.updateMe);
router.post("/me/donate", controller.registerDonation);

module.exports = router;