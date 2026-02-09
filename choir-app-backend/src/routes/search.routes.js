const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/search.controller');
const router = require('express').Router();
const { handler: wrap } = require('../utils/async');

router.use(authJwt.verifyToken);
router.get('/suggestions', wrap(controller.suggestions));
router.get('/history', wrap(controller.getHistory));
router.post('/history', wrap(controller.saveHistory));
router.delete('/history/:id', wrap(controller.deleteHistoryEntry));
router.delete('/history', wrap(controller.clearHistory));
router.get('/', wrap(controller.search));

module.exports = router;
