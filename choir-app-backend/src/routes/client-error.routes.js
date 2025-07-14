const router = require('express').Router();
const controller = require('../controllers/client-error.controller');

router.post('/', controller.reportError);

module.exports = router;
