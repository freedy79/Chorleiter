const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/search.controller');
const router = require('express').Router();
const { handler: wrap } = require('../utils/async');

router.use(authJwt.verifyToken);
router.get('/', wrap(controller.search));

module.exports = router;
