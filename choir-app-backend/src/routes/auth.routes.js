const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");
const { signupValidation } = require("../validators/auth.validation");
const validate = require("../validators/validate");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.post("/signup", signupValidation, validate, wrap(controller.signup));
router.post("/signin", wrap(controller.signin));

router.post("/switch-choir/:choirId", verifyToken, wrap(controller.switchChoir));
router.get("/check-choir-admin", verifyToken, wrap(controller.checkChoirAdminStatus));

// Returns 200 when the provided token is valid
router.get('/check-token', verifyToken, (req, res) => {
  res.status(200).send({ valid: true });
});

module.exports = router;
