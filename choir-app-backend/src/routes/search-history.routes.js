const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/search-history.controller');
const router = require('express').Router();
const { handler: wrap } = require('../utils/async');

router.use(authJwt.verifyToken);

router.post('/', wrap(controller.saveSearch));
router.get('/', wrap(controller.getHistory));
router.delete('/:id', wrap(controller.deleteEntry));
router.delete('/', wrap(controller.clearHistory));
router.get('/top', wrap(controller.getTopSearches));
router.get('/null-results', wrap(controller.getNullResultQueries));

module.exports = router;
