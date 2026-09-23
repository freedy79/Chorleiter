const express = require('express');
const RateLimit = require('express-rate-limit');
const { verifyToken } = require('../middleware/auth.middleware');
const controller = require('../controllers/oauth.controller');

const router = express.Router();

// Registration and token exchange are unauthenticated by design, so they get
// their own budget instead of relying on the global IP limiter.
const registerLimiter = RateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'temporarily_unavailable', error_description: 'Too many client registrations.' },
});

const tokenLimiter = RateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'temporarily_unavailable', error_description: 'Too many token requests.' },
});

router.get('/.well-known/oauth-authorization-server', controller.authorizationServerMetadata);
router.get('/.well-known/oauth-protected-resource', controller.protectedResourceMetadata);

router.post('/register', registerLimiter, controller.register);
router.get('/authorize', controller.authorize);
router.post('/token', tokenLimiter, controller.token);
router.post('/revoke', tokenLimiter, controller.revoke);

// Consent screen endpoints run on the normal session auth of the web app.
router.get('/consent-info', verifyToken, controller.consentInfo);
router.post('/authorize', verifyToken, controller.decide);

module.exports = router;
