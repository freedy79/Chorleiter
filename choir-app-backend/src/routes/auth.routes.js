const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");
const role = require("../middleware/role.middleware");
const { signupValidation, resetPasswordValidation } = require("../validators/auth.validation");
const validate = require("../validators/validate");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");
const RateLimit = require("express-rate-limit");

const authLimiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 10, // max. 10 Versuche pro IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Zu viele Anmeldeversuche. Bitte versuche es in 15 Minuten erneut." },
});

router.post("/signup", role.requireNonDemo, authLimiter, signupValidation, validate, wrap(controller.signup));
router.post("/signin", role.requireNonDemo, authLimiter, wrap(controller.signin));

router.post("/switch-choir/:choirId", verifyToken, role.requireNonDemo, wrap(controller.switchChoir));
router.get("/check-choir-admin", verifyToken, wrap(controller.checkChoirAdminStatus));

// Returns 200 when the provided token is valid
router.get('/check-token', verifyToken, (req, res) => {
  res.status(200).send({ valid: true });
});

// Logout: clear httpOnly auth cookie
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  });
  res.status(200).send({ message: 'Logged out' });
});

module.exports = router;
