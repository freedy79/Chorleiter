const { handler: wrap } = require('../utils/async');
const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/page-view.controller');
const router = require('express').Router();

// Public tracking endpoint (no auth required, e.g. shared pieces)
router.post('/track-public', wrap(controller.trackPublic));

// Authenticated tracking endpoint
router.post('/track', authJwt.verifyToken, wrap(controller.track));

module.exports = router;
