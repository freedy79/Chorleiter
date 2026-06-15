const { verifyToken } = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/feedback.controller');
const router = require('express').Router();
const { handler: wrap } = require('../utils/async');

router.use(verifyToken, role.requireNonDemo);

router.post('/improvement-suggestions', wrap(controller.submitImprovementSuggestion));

module.exports = router;
