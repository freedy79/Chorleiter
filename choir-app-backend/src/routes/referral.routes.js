const router = require('express').Router();
const RateLimit = require('express-rate-limit');
const { handler: wrap } = require('../utils/async');
const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/referral.controller');

const recommendationLimiter = RateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Empfehlungsanfragen. Bitte versuche es später erneut.' }
});

const registrationLimiter = RateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Registrierungsanfragen. Bitte versuche es später erneut.' }
});

router.post('/recommend', authJwt.verifyToken, role.requireNonDemo, recommendationLimiter, wrap(controller.sendRecommendation));
router.post('/register-choir/public/start', registrationLimiter, wrap(controller.startPublicChoirRegistration));
router.post('/register-choir/:token/start', registrationLimiter, wrap(controller.startChoirRegistration));
router.post('/register-choir/:requestId/verify', registrationLimiter, wrap(controller.verifyChoirRegistration));

module.exports = router;
