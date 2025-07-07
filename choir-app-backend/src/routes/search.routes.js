const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/search.controller');
const router = require('express').Router();

router.use(authJwt.verifyToken);
router.get('/', controller.search);

module.exports = router;
