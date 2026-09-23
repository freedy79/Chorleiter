const express = require('express');
const RateLimit = require('express-rate-limit');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireDirectorOrHigher } = require('../middleware/role.middleware');
const controller = require('../controllers/choirApiToken.controller');

const router = express.Router();

// Minting a secret is cheap for the server but expensive if abused, so it gets its own budget.
const mintLimiter = RateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many token operations, please try again later.' },
});

router.use(verifyToken, requireDirectorOrHigher);

router.get('/', controller.list);
router.post('/', mintLimiter, controller.create);
router.post('/:id/renew', controller.renew);
router.post('/:id/rotate', mintLimiter, controller.rotate);
router.delete('/:id', controller.revoke);

module.exports = router;
